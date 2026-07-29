import { useEffect, useState, useRef } from "react";
import { api, API } from "../lib/api";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import { Building2, Wrench, PlusCircle, Search, UploadCloud, Trash2, PencilLine, FileSpreadsheet, CheckCircle2, XCircle, AlertTriangle, Download, Loader2 } from "lucide-react";
import { toast, Toaster } from "sonner";

const STATUS_LABEL = {
  hoat_dong: "Hoạt động",
  bao_tri: "Bảo trì",
  hong: "Hỏng",
  chua_co_du_lieu: "Chưa có dữ liệu",
};

export default function DataManagement() {
  return (
    <div className="p-6 lg:p-8 space-y-6" data-testid="data-management-page">
      <Toaster position="top-right" richColors />
      <div>
        <h1 className="font-display font-bold text-3xl text-slate-900">Quản lý Dữ liệu Nền</h1>
        <p className="text-sm text-slate-500 mt-1">Quản lý HTX và Máy móc thiết bị (FN-02, FN-03)</p>
      </div>
      <Tabs defaultValue="htx">
        <TabsList>
          <TabsTrigger value="htx" data-testid="tab-htx"><Building2 className="w-4 h-4 mr-1.5" /> HTX & Chủ sở hữu</TabsTrigger>
          <TabsTrigger value="machines" data-testid="tab-machines"><Wrench className="w-4 h-4 mr-1.5" /> Máy móc & Thiết bị</TabsTrigger>
        </TabsList>
        <TabsContent value="htx"><HTXTab /></TabsContent>
        <TabsContent value="machines"><MachinesTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function HTXTab() {
  const [items, setItems] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [q, setQ] = useState("");
  const [province, setProvince] = useState("ALL");
  const [form, setForm] = useState(null);
  const [importer, setImporter] = useState(false);

  const load = async () => {
    const { data } = await api.get("/htx", { params: { q: q || undefined, province: province === "ALL" ? undefined : province } });
    setItems(data);
  };

  useEffect(() => { api.get("/provinces").then((r) => setProvinces(r.data)); }, []);
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [q, province]);

  const save = async () => {
    try {
      if (form.__isNew) {
        await api.post("/htx", form);
        toast.success("Đã thêm HTX");
      } else {
        await api.patch(`/htx/${form.code}`, form);
        toast.success("Đã cập nhật HTX");
      }
      setForm(null);
      load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Lỗi");
    }
  };

  const remove = async (code) => {
    if (!window.confirm(`Vô hiệu hóa HTX ${code}?`)) return;
    await api.delete(`/htx/${code}`);
    toast.success("Đã vô hiệu hóa");
    load();
  };

  return (
    <div className="mt-4 space-y-4">
      <div className="flex flex-wrap gap-2 items-center bg-white p-3 rounded-lg border border-slate-200">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            data-testid="htx-search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm mã / tên / chủ sở hữu…"
            className="pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-md w-64"
          />
        </div>
        <select value={province} onChange={(e) => setProvince(e.target.value)} className="px-3 py-2 text-sm border border-slate-300 rounded-md">
          <option value="ALL">Tất cả tỉnh</option>
          {provinces.map((p) => <option key={p.code} value={p.code}>{p.name}</option>)}
        </select>
        <button
          data-testid="htx-add"
          onClick={() => setForm({ __isNew: true, code: "", name: "", owner_name: "", province_code: "CT", district: "", commune: "", lat: 10, lng: 105, cultivated_area_ha: 500, phone: "", owner_type: "HTX" })}
          className="ml-auto flex items-center gap-1.5 px-4 py-2 rounded-md bg-[#00A82D] hover:bg-[#008E26] text-white text-sm font-medium"
        >
          <PlusCircle className="w-4 h-4" /> Thêm HTX
        </button>
        <button
          data-testid="htx-upload"
          className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-white border border-slate-300 text-slate-700 text-sm hover:bg-slate-50"
          onClick={() => setImporter(true)}
        >
          <UploadCloud className="w-4 h-4" /> Tải Excel
        </button>
      </div>

      {importer && (
        <ImportModal
          kind="htx"
          title="Nhập danh bạ HTX từ Excel"
          columnsHint="code, name, owner_name, province_code, district, commune, lat, lng, cultivated_area_ha, phone"
          templateEndpoint="/htx/import-template"
          importEndpoint="/htx/import-excel"
          templateFilename="htx-import-template.xlsx"
          entityLabel="HTX"
          onClose={() => setImporter(false)}
          onDone={() => { setImporter(false); load(); }}
        />
      )}

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-2.5">Mã</th>
              <th className="text-left px-4 py-2.5">Tên HTX</th>
              <th className="text-left px-4 py-2.5">Chủ sở hữu</th>
              <th className="text-left px-4 py-2.5">Tỉnh</th>
              <th className="text-right px-4 py-2.5">Diện tích (ha)</th>
              <th className="text-center px-4 py-2.5">Trạng thái</th>
              <th className="text-right px-4 py-2.5">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {items.map((h) => (
              <tr key={h.code} className="border-t border-slate-100 hover:bg-slate-50" data-testid={`htx-row-${h.code}`}>
                <td className="px-4 py-2.5 font-mono text-xs">{h.code}</td>
                <td className="px-4 py-2.5 font-medium">{h.name}</td>
                <td className="px-4 py-2.5 text-slate-600">{h.owner_name}</td>
                <td className="px-4 py-2.5">{provinces.find((p) => p.code === h.province_code)?.name}</td>
                <td className="px-4 py-2.5 text-right">{h.cultivated_area_ha.toLocaleString("vi-VN")}</td>
                <td className="px-4 py-2.5 text-center">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium text-white ${h.active ? "bg-[#00A82D]" : "bg-slate-400"}`}>
                    {h.active ? "Hoạt động" : "Tắt"}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right">
                  <button onClick={() => setForm({ ...h })} className="text-[#00A3E0] hover:text-[#0089BE] mr-3" data-testid={`htx-edit-${h.code}`}>
                    <PencilLine className="w-4 h-4 inline" />
                  </button>
                  <button onClick={() => remove(h.code)} className="text-[#E74C3C]" data-testid={`htx-delete-${h.code}`}>
                    <Trash2 className="w-4 h-4 inline" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {form && <HTXForm form={form} setForm={setForm} provinces={provinces} onSave={save} onCancel={() => setForm(null)} />}
    </div>
  );
}

function HTXForm({ form, setForm, provinces, onSave, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center p-6" onClick={onCancel}>
      <div className="bg-white rounded-lg w-full max-w-2xl p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-display font-bold text-xl mb-4">{form.__isNew ? "Thêm HTX mới" : `Chỉnh sửa ${form.code}`}</h3>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Mã HTX" value={form.code} onChange={(v) => setForm({ ...form, code: v })} disabled={!form.__isNew} />
          <Field label="Tên HTX" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
          <Field label="Chủ sở hữu" value={form.owner_name} onChange={(v) => setForm({ ...form, owner_name: v })} />
          <SelectField label="Tỉnh" value={form.province_code} onChange={(v) => setForm({ ...form, province_code: v })}
            options={provinces.map((p) => [p.code, p.name])} />
          <Field label="Latitude" type="number" value={form.lat} onChange={(v) => setForm({ ...form, lat: parseFloat(v) })} />
          <Field label="Longitude" type="number" value={form.lng} onChange={(v) => setForm({ ...form, lng: parseFloat(v) })} />
          <Field label="Diện tích (ha)" type="number" value={form.cultivated_area_ha} onChange={(v) => setForm({ ...form, cultivated_area_ha: parseFloat(v) })} />
          <Field label="Điện thoại" value={form.phone || ""} onChange={(v) => setForm({ ...form, phone: v })} />
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onCancel} className="px-4 py-2 rounded-md text-sm bg-slate-100 hover:bg-slate-200" data-testid="htx-form-cancel">Hủy</button>
          <button onClick={onSave} className="px-4 py-2 rounded-md text-sm bg-[#00A82D] hover:bg-[#008E26] text-white font-medium" data-testid="htx-form-save">Lưu</button>
        </div>
      </div>
    </div>
  );
}

function MachinesTab() {
  const [items, setItems] = useState([]);
  const [cats, setCats] = useState([]);
  const [htxs, setHtxs] = useState([]);
  const [category, setCategory] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [form, setForm] = useState(null);
  const [importer, setImporter] = useState(false);

  const load = async () => {
    const { data } = await api.get("/machines", { params: { category: category === "ALL" ? undefined : category, status: status === "ALL" ? undefined : status } });
    setItems(data);
  };

  useEffect(() => {
    api.get("/machine-categories").then((r) => setCats(r.data));
    api.get("/htx").then((r) => setHtxs(r.data));
  }, []);
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [category, status]);

  const save = async () => {
    try {
      if (form.__isNew) {
        await api.post("/machines", form);
        toast.success("Đã thêm máy");
      } else {
        await api.patch(`/machines/${form.id}`, form);
        toast.success("Đã cập nhật máy");
      }
      setForm(null);
      load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Lỗi");
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Xóa máy này?")) return;
    await api.delete(`/machines/${id}`);
    toast.success("Đã xóa");
    load();
  };

  return (
    <div className="mt-4 space-y-4">
      <div className="flex flex-wrap gap-2 items-center bg-white p-3 rounded-lg border border-slate-200">
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="px-3 py-2 text-sm border border-slate-300 rounded-md" data-testid="filter-machine-category">
          <option value="ALL">Tất cả chủng loại</option>
          {cats.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="px-3 py-2 text-sm border border-slate-300 rounded-md" data-testid="filter-machine-status">
          <option value="ALL">Tất cả tình trạng</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <button
          data-testid="machine-add"
          onClick={() => setForm({ __isNew: true, htx_id: htxs[0]?.id || "", category_code: cats[0]?.code || "", serial_no: "", horsepower: 50, status: "hoat_dong", condition_notes: "" })}
          className="ml-auto flex items-center gap-1.5 px-4 py-2 rounded-md bg-[#00A82D] hover:bg-[#008E26] text-white text-sm font-medium"
        >
          <PlusCircle className="w-4 h-4" /> Thêm máy
        </button>
        <button
          data-testid="machine-upload"
          onClick={() => setImporter(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-white border border-slate-300 text-slate-700 text-sm hover:bg-slate-50"
        >
          <UploadCloud className="w-4 h-4" /> Tải Excel máy
        </button>
      </div>

      {importer && (
        <ImportModal
          kind="machines"
          title="Nhập Máy móc từ Excel"
          columnsHint="htx_code, category_code, serial_no, horsepower, status, condition_notes"
          templateEndpoint="/machines/import-template"
          importEndpoint="/machines/import-excel"
          templateFilename="machines-import-template.xlsx"
          entityLabel="máy"
          onClose={() => setImporter(false)}
          onDone={() => { setImporter(false); load(); }}
        />
      )}

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-2.5">Mã máy</th>
              <th className="text-left px-4 py-2.5">HTX / Chủ sở hữu</th>
              <th className="text-left px-4 py-2.5">Chủng loại</th>
              <th className="text-right px-4 py-2.5">Công suất (HP)</th>
              <th className="text-center px-4 py-2.5">Trạng thái</th>
              <th className="text-right px-4 py-2.5">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {items.slice(0, 500).map((m) => (
              <tr key={m.id} className="border-t border-slate-100 hover:bg-slate-50" data-testid={`machine-row-${m.id}`}>
                <td className="px-4 py-2.5 font-mono text-xs">{m.serial_no}</td>
                <td className="px-4 py-2.5">{m.owner_name}</td>
                <td className="px-4 py-2.5">{cats.find((c) => c.code === m.category_code)?.name}</td>
                <td className="px-4 py-2.5 text-right">{m.horsepower}</td>
                <td className="px-4 py-2.5 text-center">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs text-white ${m.status === "hoat_dong" ? "bg-[#00A82D]" : m.status === "bao_tri" ? "bg-[#F5A623]" : "bg-[#E74C3C]"}`}>
                    {STATUS_LABEL[m.status]}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right">
                  <button onClick={() => setForm({ ...m })} className="text-[#00A3E0] mr-3" data-testid={`machine-edit-${m.id}`}>
                    <PencilLine className="w-4 h-4 inline" />
                  </button>
                  <button onClick={() => remove(m.id)} className="text-[#E74C3C]" data-testid={`machine-delete-${m.id}`}>
                    <Trash2 className="w-4 h-4 inline" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length > 500 && <div className="px-4 py-2 text-xs text-slate-500 border-t border-slate-100">Hiển thị 500 dòng đầu · Tổng {items.length} máy. Lọc để xem thêm.</div>}
      </div>

      {form && (
        <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center p-6" onClick={() => setForm(null)}>
          <div className="bg-white rounded-lg w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display font-bold text-xl mb-4">{form.__isNew ? "Thêm máy mới" : "Chỉnh sửa máy"}</h3>
            <div className="grid grid-cols-2 gap-3">
              <SelectField label="HTX chủ sở hữu" value={form.htx_id} onChange={(v) => setForm({ ...form, htx_id: v })} options={htxs.map((h) => [h.id, `${h.code} - ${h.name}`])} disabled={!form.__isNew} />
              <SelectField label="Chủng loại" value={form.category_code} onChange={(v) => setForm({ ...form, category_code: v })} options={cats.map((c) => [c.code, c.name])} />
              <Field label="Số khung/Biển số" value={form.serial_no} onChange={(v) => setForm({ ...form, serial_no: v })} />
              <Field label="Công suất (HP)" type="number" value={form.horsepower} onChange={(v) => setForm({ ...form, horsepower: parseFloat(v) })} />
              <SelectField label="Trạng thái" value={form.status} onChange={(v) => setForm({ ...form, status: v })} options={Object.entries(STATUS_LABEL)} />
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setForm(null)} className="px-4 py-2 rounded-md text-sm bg-slate-100" data-testid="machine-form-cancel">Hủy</button>
              <button onClick={save} className="px-4 py-2 rounded-md text-sm bg-[#00A82D] text-white font-medium" data-testid="machine-form-save">Lưu</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, type = "text", disabled }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-slate-700 uppercase tracking-wide">{label}</span>
      <input
        type={type}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#00C4B4] disabled:bg-slate-100"
      />
    </label>
  );
}

function SelectField({ label, value, onChange, options, disabled }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-slate-700 uppercase tracking-wide">{label}</span>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#00C4B4] disabled:bg-slate-100"
      >
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  );
}

function ImportModal({ kind, title, columnsHint, templateEndpoint, importEndpoint, templateFilename, entityLabel, onClose, onDone }) {
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);

  const handleFile = (f) => {
    if (!f) return;
    if (!f.name.toLowerCase().endsWith(".xlsx")) {
      toast.error("Chỉ chấp nhận tệp .xlsx");
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      toast.error("Tệp vượt quá 10MB");
      return;
    }
    setFile(f);
    setResult(null);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files?.[0]);
  };

  const doUpload = async (dryRun) => {
    if (!file) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const token = localStorage.getItem("mkg_token");
      const resp = await fetch(`${API}${importEndpoint}?dry_run=${dryRun}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.detail || "Lỗi tải lên");
      setResult(data);
      if (!dryRun && data.inserted > 0) {
        toast.success(`Đã nhập ${data.inserted} ${entityLabel} vào hệ thống`);
        setTimeout(() => onDone(), 500);
      } else if (dryRun) {
        toast.info(`Kiểm tra hoàn tất · ${data.ok_count} hợp lệ, ${data.error_count} lỗi`);
      }
    } catch (e) {
      toast.error(e.message || "Lỗi");
    } finally {
      setBusy(false);
    }
  };

  const downloadTemplate = async () => {
    const token = localStorage.getItem("mkg_token");
    const resp = await fetch(`${API}${templateEndpoint}`, { headers: { Authorization: `Bearer ${token}` } });
    const blob = await resp.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = templateFilename; a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-6" onClick={onClose} data-testid={`import-modal-${kind}`}>
      <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-slate-200 flex items-center gap-3 bg-gradient-to-r from-[#00A82D]/5 to-[#00A3E0]/5">
          <div className="w-10 h-10 rounded-md bg-[#00A82D] text-white flex items-center justify-center">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <div className="font-display font-bold text-xl">{title}</div>
            <div className="text-xs text-slate-500">Kéo thả tệp .xlsx (tối đa 10MB)</div>
          </div>
          <button onClick={downloadTemplate} className="ml-auto flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md bg-white border border-slate-300 hover:bg-slate-50" data-testid={`download-template-${kind}`}>
            <Download className="w-3.5 h-3.5" /> Tải mẫu
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <div className="text-[11px] text-slate-500 mb-3">
            Cột yêu cầu: <code className="bg-slate-100 px-1 rounded font-mono">{columnsHint}</code>
          </div>
          {!result && (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => inputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
                dragging ? "border-[#00A82D] bg-[#00A82D]/5" : "border-slate-300 hover:border-[#00A3E0] hover:bg-slate-50"
              }`}
              data-testid={`dropzone-${kind}`}
            >
              <UploadCloud className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              {file ? (
                <div>
                  <div className="font-medium text-slate-800">{file.name}</div>
                  <div className="text-xs text-slate-500 mt-1">{(file.size / 1024).toFixed(1)} KB · Nhấp để thay tệp</div>
                </div>
              ) : (
                <div>
                  <div className="font-medium text-slate-700">Kéo thả tệp .xlsx vào đây</div>
                  <div className="text-xs text-slate-500 mt-1">hoặc nhấp để chọn tệp từ máy</div>
                </div>
              )}
              <input ref={inputRef} type="file" accept=".xlsx" className="hidden"
                data-testid={`file-input-${kind}`} onChange={(e) => handleFile(e.target.files?.[0])} />
            </div>
          )}

          {result && (
            <div className="space-y-4" data-testid={`import-result-${kind}`}>
              <div className="grid grid-cols-3 gap-3">
                <ResultStat icon={CheckCircle2} color="#00A82D" label="Hợp lệ" value={result.ok_count} />
                <ResultStat icon={XCircle} color="#E74C3C" label="Lỗi" value={result.error_count} />
                <ResultStat icon={AlertTriangle} color="#F5A623" label="Đã tồn tại" value={result.skipped_count} />
              </div>

              {result.dry_run && result.ok_count > 0 && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-md p-3 text-xs text-emerald-800">
                  Kiểm tra hoàn tất. Nhấn <b>Xác nhận nhập</b> để lưu {result.ok_count} {entityLabel} hợp lệ vào hệ thống.
                </div>
              )}
              {!result.dry_run && (
                <div className="bg-green-50 border border-green-200 rounded-md p-3 text-xs text-green-800">
                  Đã nhập thành công <b>{result.inserted}</b> {entityLabel} vào hệ thống.
                </div>
              )}

              {result.errors?.length > 0 && (
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-600 mb-1">Chi tiết lỗi</div>
                  <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-md">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50 sticky top-0">
                        <tr>
                          <th className="text-left px-3 py-2">Dòng</th>
                          <th className="text-left px-3 py-2">Mã / Serial</th>
                          <th className="text-left px-3 py-2">Lỗi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.errors.map((e, i) => (
                          <tr key={i} className="border-t border-slate-100">
                            <td className="px-3 py-1.5 font-mono">{e.row}</td>
                            <td className="px-3 py-1.5">{e.code || e.serial_no || "—"}</td>
                            <td className="px-3 py-1.5 text-[#E74C3C]">{e.errors.join(" · ")}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {result.skipped?.length > 0 && (
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-600 mb-1">Đã bỏ qua (trùng)</div>
                  <div className="max-h-32 overflow-y-auto text-xs text-slate-600">
                    {result.skipped.map((s, i) => (
                      <div key={i} className="border-t border-slate-100 py-1">
                        Dòng {s.row} · <span className="font-mono">{s.code || s.serial_no}</span> — {s.reason}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-200 flex items-center gap-2 bg-slate-50">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-md bg-white border border-slate-300" data-testid={`import-cancel-${kind}`}>
            {result && !result.dry_run ? "Đóng" : "Hủy"}
          </button>
          {file && !result && (
            <button onClick={() => doUpload(true)} disabled={busy}
              className="ml-auto flex items-center gap-1.5 px-4 py-2 text-sm rounded-md bg-[#00A3E0] hover:bg-[#0089BE] text-white font-medium disabled:opacity-60"
              data-testid={`import-validate-${kind}`}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Kiểm tra dữ liệu
            </button>
          )}
          {result && result.dry_run && result.ok_count > 0 && (
            <button onClick={() => doUpload(false)} disabled={busy}
              className="ml-auto flex items-center gap-1.5 px-4 py-2 text-sm rounded-md bg-[#00A82D] hover:bg-[#008E26] text-white font-medium disabled:opacity-60"
              data-testid={`import-confirm-${kind}`}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Xác nhận nhập {result.ok_count} {entityLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Backwards-compatible alias used by earlier phase tests
const ImportExcelModal = ImportModal;

function ResultStat({ icon: Icon, color, label, value }) {
  return (
    <div className="border border-slate-200 rounded-md p-3 flex items-center gap-3">
      <div className="w-8 h-8 rounded-md flex items-center justify-center" style={{ background: `${color}15`, color }}>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-widest text-slate-500">{label}</div>
        <div className="font-display font-bold text-2xl">{value}</div>
      </div>
    </div>
  );
}
