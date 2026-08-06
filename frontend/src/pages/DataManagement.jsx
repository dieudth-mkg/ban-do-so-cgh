import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams, Navigate } from "react-router-dom";
import { api, API } from "../lib/api";
import { Building2, PlusCircle, Search, UploadCloud, Trash2, PencilLine, FileSpreadsheet, CheckCircle2, XCircle, AlertTriangle, Download, Loader2, Eye, X, MapPin, Phone, Ruler, Hash, Tractor } from "lucide-react";
import { toast } from "sonner";
import XA_PHUONG from "../data/xaphuong.json";

const OTHER_COMMUNE = "__KHAC__";

const STATUS_LABEL = {
  hoat_dong: "Hoạt động",
  bao_tri: "Bảo trì",
  hong: "Hỏng",
  chua_co_du_lieu: "Chưa có dữ liệu",
};

// FN-03: loại chủ sở hữu máy
const OWNER_TYPE_LABEL = {
  THANH_VIEN_HTX: "Thành viên HTX",
  HTX: "HTX",
  DOANH_NGHIEP: "Doanh nghiệp",
  DON_VI_KHAC: "Đơn vị khác",
};

const STAGE_LABEL = {
  LAM_DAT: "Làm đất",
  GIEO_SA: "Gieo sạ",
  CHAM_SOC: "Chăm sóc",
  THU_HOACH: "Thu hoạch",
  SAU_THU_HOACH: "Sau thu hoạch",
};

// BR-04: nhãn nguồn tình trạng máy
const SOURCE_LABEL = {
  app_htx: "[App HTX]",
  manual: "[Nhập tay]",
  no_data: "[Chưa có dữ liệu]",
};

const todayISO = () => new Date().toISOString().slice(0, 10);
const fmtDateTime = (s) => (s ? new Date(s).toLocaleString("vi-VN") : "—");

const HISTORY_TYPE_LABEL = {
  create: "Thêm mới",
  update: "Cập nhật",
  status: "Đổi tình trạng",
  deactivate: "Vô hiệu hóa",
  reactivate: "Kích hoạt lại",
  import_create: "Nhập Excel — tạo mới",
  import_update: "Nhập Excel — cập nhật",
};


export function PageHeader({ title, desc }) {
  return (
    <div>
      <h1 className="font-display font-bold text-3xl text-slate-900">{title}</h1>
      {desc && <p className="text-sm text-slate-500 mt-1">{desc}</p>}
    </div>
  );
}

export function ReadOnlyBanner({ readOnly }) {
  if (!readOnly) return null;
  return (
    <div className="flex items-center gap-2 text-sm bg-[#00A3E0]/10 border border-[#00A3E0]/30 text-[#0089BE] px-4 py-2.5 rounded-md" data-testid="readonly-banner">
      <Eye className="w-4 h-4 shrink-0" />
      <span>Chế độ chỉ xem — tài khoản Cán bộ Cục không có quyền thêm/sửa/xóa dữ liệu.</span>
    </div>
  );
}

// Điều hướng cũ /data-management → màn Quản lý HTX
export default function DataManagement() {
  return <Navigate to="/htx-management" replace />;
}

export function HTXTab({ readOnly }) {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [machines, setMachines] = useState([]);
  const [cats, setCats] = useState([]);
  const [q, setQ] = useState("");
  const [province, setProvince] = useState("ALL");
  const [form, setForm] = useState(null);
  const [importer, setImporter] = useState(false);
  const [detail, setDetail] = useState(null);

  const machineCount = {};
  machines.forEach((m) => { machineCount[m.htx_id] = (machineCount[m.htx_id] || 0) + 1; });

  const load = async () => {
    const { data } = await api.get("/htx", { params: { q: q || undefined, province: province === "ALL" ? undefined : province } });
    setItems(data);
  };

  useEffect(() => { api.get("/provinces").then((r) => setProvinces(r.data)); }, []);
  useEffect(() => {
    api.get("/machines").then((r) => setMachines(r.data));
    api.get("/machine-categories").then((r) => setCats(r.data));
  }, []);
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
        {!readOnly && (
          <>
            <button
              data-testid="htx-add"
              onClick={() => setForm({ __isNew: true, code: "", name: "", owner_name: "", province_code: "CT", commune: "", lat: 10.0452, lng: 105.7469, cultivated_area_ha: 500, phone: "", address: "", tax_code: "", owner_type: "HTX" })}
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
          </>
        )}
      </div>

      {importer && (
        <ImportModal
          kind="htx"
          title="Nhập danh bạ HTX từ Excel"
          columnsHint="code, name, owner_name, province_code, commune, lat, lng, cultivated_area_ha, phone, address, tax_code"
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
              <th className="text-left px-4 py-2.5">Người đại diện</th>
              <th className="text-left px-4 py-2.5">Điện thoại</th>
              <th className="text-left px-4 py-2.5">Tỉnh</th>
              <th className="text-left px-4 py-2.5">Xã/Phường</th>
              <th className="text-right px-4 py-2.5">Diện tích (ha)</th>
              <th className="text-right px-4 py-2.5">Số máy</th>
              <th className="text-center px-4 py-2.5">Trạng thái</th>
              {!readOnly && <th className="text-right px-4 py-2.5">Thao tác</th>}
            </tr>
          </thead>
          <tbody>
            {items.map((h) => (
              <tr
                key={h.code}
                className="border-t border-slate-100 hover:bg-slate-50 cursor-pointer"
                data-testid={`htx-row-${h.code}`}
                onClick={() => setDetail(h)}
              >
                <td className="px-4 py-2.5 font-mono text-xs">{h.code}</td>
                <td className="px-4 py-2.5 font-medium">{h.name}</td>
                <td className="px-4 py-2.5 text-slate-600">{h.owner_name}</td>
                <td className="px-4 py-2.5 text-slate-600">{h.phone}</td>
                <td className="px-4 py-2.5">{provinces.find((p) => p.code === h.province_code)?.name}</td>
                <td className="px-4 py-2.5 text-slate-600">{h.commune}</td>
                <td className="px-4 py-2.5 text-right">{h.cultivated_area_ha.toLocaleString("vi-VN")}</td>
                <td className="px-4 py-2.5 text-right">
                  <button
                    onClick={(e) => { e.stopPropagation(); navigate(`/machine-management?htx=${h.code}`); }}
                    className="text-[#00A3E0] font-semibold hover:underline"
                    data-testid={`htx-machine-count-${h.code}`}
                    title="Xem chi tiết máy của HTX này"
                  >
                    {machineCount[h.id] || 0}
                  </button>
                </td>
                <td className="px-4 py-2.5 text-center">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium text-white ${h.active ? "bg-[#00A82D]" : "bg-slate-400"}`}>
                    {h.active ? "Hoạt động" : "Tắt"}
                  </span>
                </td>
                {!readOnly && (
                  <td className="px-4 py-2.5 text-right">
                    <button onClick={(e) => { e.stopPropagation(); setForm({ ...h }); }} className="text-[#00A3E0] hover:text-[#0089BE] mr-3" data-testid={`htx-edit-${h.code}`}>
                      <PencilLine className="w-4 h-4 inline" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); remove(h.code); }} className="text-[#E74C3C]" data-testid={`htx-delete-${h.code}`}>
                      <Trash2 className="w-4 h-4 inline" />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {form && <HTXForm form={form} setForm={setForm} provinces={provinces} onSave={save} onCancel={() => setForm(null)} />}
      {detail && (
        <HTXDetailModal
          htx={detail}
          province={provinces.find((p) => p.code === detail.province_code)?.name}
          machines={machines.filter((m) => m.htx_id === detail.id)}
          cats={cats}
          onClose={() => setDetail(null)}
        />
      )}
    </div>
  );
}

function HTXDetailModal({ htx, province, machines, cats, onClose }) {
  // Đếm số máy theo từng khâu (stage) dựa trên chủng loại máy
  const stageCounts = Object.keys(STAGE_LABEL).reduce((acc, s) => ({ ...acc, [s]: 0 }), {});
  machines.forEach((m) => {
    const cat = cats.find((c) => c.code === m.category_code);
    if (cat && stageCounts[cat.stage] !== undefined) stageCounts[cat.stage] += 1;
  });

  return (
    <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center p-6" onClick={onClose} data-testid="htx-detail-modal">
      <div className="bg-white rounded-lg w-full max-w-xl p-6 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="text-xs font-mono text-slate-400">{htx.code}</div>
            <h3 className="font-display font-bold text-xl text-slate-900">{htx.name}</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700" data-testid="htx-detail-close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-2.5 text-sm mb-5">
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-[#00A3E0] mt-0.5 shrink-0" />
            <div>
              <div className="text-slate-800">{htx.address || "Chưa cập nhật địa chỉ"}</div>
              <div className="text-slate-500 text-xs">
                {[htx.commune, province].filter(Boolean).join(", ")}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-[#00A3E0] shrink-0" />
            <span className="text-slate-800">{htx.phone || "—"}</span>
            <span className="text-slate-400 text-xs ml-1">· Người đại diện: {htx.owner_name}</span>
          </div>
          <div className="flex items-center gap-2">
            <Ruler className="w-4 h-4 text-[#00A3E0] shrink-0" />
            <span className="text-slate-800">{htx.cultivated_area_ha.toLocaleString("vi-VN")} ha canh tác</span>
          </div>
          <div className="flex items-center gap-2">
            <Hash className="w-4 h-4 text-[#00A3E0] shrink-0" />
            <span className="text-slate-800">MST: {htx.tax_code || "—"}</span>
          </div>
        </div>

        <div className="border-t border-slate-200 pt-4">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">
            <Tractor className="w-4 h-4" /> Máy móc theo khâu · Tổng {machines.length} máy
          </div>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(STAGE_LABEL).map(([code, label]) => (
              <div key={code} className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-md px-3 py-2">
                <span className="text-xs text-slate-600">{label}</span>
                <span className="font-display font-bold text-slate-900">{stageCounts[code]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* BR-09: số máy hoạt động của HTX tại một thời điểm bất kỳ trong quá khứ */}
        <div className="border-t border-slate-200 pt-4 mt-4">
          <PointInTimeCount htxId={htx.id} />
        </div>
      </div>
    </div>
  );
}

function PointInTimeCount({ htxId }) {
  const [at, setAt] = useState(todayISO());
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const query = async () => {
    setBusy(true);
    try {
      const { data } = await api.get(`/htx/${htxId}/active-count`, { params: { at: `${at}T23:59:59Z` } });
      setResult(data);
    } catch {
      setResult(null);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">
        <Hash className="w-4 h-4" /> Số máy tại thời điểm
      </div>
      <div className="flex items-center gap-2">
        <input type="date" value={at} onChange={(e) => setAt(e.target.value)} className="px-2 py-1.5 text-sm border border-slate-300 rounded-md" data-testid="pit-date" />
        <button onClick={query} disabled={busy} className="px-3 py-1.5 text-sm rounded-md bg-[#00A3E0] text-white font-medium disabled:opacity-60" data-testid="pit-query">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Truy vấn"}
        </button>
        {result && (
          <span className="text-sm text-slate-700">
            <b>{result.count}</b> máy tại {at}
          </span>
        )}
      </div>
      <div className="text-[10px] text-slate-400 mt-1">Đếm máy có Ngày HTX sở hữu ≤ thời điểm và chưa vô hiệu hóa (hoặc vô hiệu hóa sau thời điểm đó).</div>
    </div>
  );
}

function HTXForm({ form, setForm, provinces, onSave, onCancel }) {
  const communeOptions = XA_PHUONG.filter((x) => x.province === form.province_code);
  const isKnownCommune = !form.commune || communeOptions.some((x) => x.name === form.commune);

  const onProvinceChange = (v) => {
    const p = provinces.find((pr) => pr.code === v);
    setForm({
      ...form,
      province_code: v,
      commune: "",
      // Tự động định vị theo trung tâm tỉnh vừa chọn; có thể chỉnh lại nếu biết chính xác vị trí HTX
      lat: p?.lat ?? form.lat,
      lng: p?.lng ?? form.lng,
    });
  };

  const onCommuneSelect = (v) => {
    if (v === OTHER_COMMUNE) {
      setForm({ ...form, commune: "" });
    } else {
      setForm({ ...form, commune: v });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center p-6" onClick={onCancel}>
      <div className="bg-white rounded-lg w-full max-w-2xl p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-display font-bold text-xl mb-4">{form.__isNew ? "Thêm HTX mới" : `Chỉnh sửa ${form.code}`}</h3>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Mã HTX" value={form.code} onChange={(v) => setForm({ ...form, code: v })} disabled={!form.__isNew} />
          <Field label="Tên HTX" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
          <Field label="Người đại diện / Chủ sở hữu" value={form.owner_name} onChange={(v) => setForm({ ...form, owner_name: v })} />
          <Field label="Điện thoại" value={form.phone || ""} onChange={(v) => setForm({ ...form, phone: v })} />

          <SelectField label="Tỉnh" value={form.province_code} onChange={onProvinceChange}
            options={provinces.map((p) => [p.code, p.name])} />

          <label className="block">
            <span className="text-xs font-medium text-slate-700 uppercase tracking-wide">Xã/Phường</span>
            <select
              value={isKnownCommune ? (form.commune || "") : OTHER_COMMUNE}
              onChange={(e) => onCommuneSelect(e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#00C4B4]"
              data-testid="htx-form-commune-select"
            >
              <option value="">— Chọn xã/phường —</option>
              {communeOptions.map((x) => <option key={x.code} value={x.name}>{x.name}</option>)}
              <option value={OTHER_COMMUNE}>Khác (không có trong danh sách)…</option>
            </select>
            {!isKnownCommune && (
              <input
                value={form.commune || ""}
                onChange={(e) => setForm({ ...form, commune: e.target.value })}
                placeholder="Nhập tên xã/phường"
                className="mt-1.5 w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#00C4B4]"
                data-testid="htx-form-commune-other"
              />
            )}
          </label>

          <Field
            label="Địa chỉ chi tiết (số nhà, ấp/khóm/thôn…)"
            value={form.address || ""}
            onChange={(v) => setForm({ ...form, address: v })}
          />
          <Field label="Diện tích (ha)" type="number" value={form.cultivated_area_ha} onChange={(v) => setForm({ ...form, cultivated_area_ha: parseFloat(v) })} />

          <Field label="Vĩ độ trên bản đồ (tự động theo tỉnh)" type="number" value={form.lat} onChange={(v) => setForm({ ...form, lat: parseFloat(v) })} />
          <Field label="Kinh độ trên bản đồ (tự động theo tỉnh)" type="number" value={form.lng} onChange={(v) => setForm({ ...form, lng: parseFloat(v) })} />

          <Field label="Mã số thuế" value={form.tax_code || ""} onChange={(v) => setForm({ ...form, tax_code: v })} />
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onCancel} className="px-4 py-2 rounded-md text-sm bg-slate-100 hover:bg-slate-200" data-testid="htx-form-cancel">Hủy</button>
          <button onClick={onSave} className="px-4 py-2 rounded-md text-sm bg-[#00A82D] hover:bg-[#008E26] text-white font-medium" data-testid="htx-form-save">Lưu</button>
        </div>
      </div>
    </div>
  );
}

export function OwnersTab({ readOnly }) {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [htxs, setHtxs] = useState([]);
  const [q, setQ] = useState("");
  const [includeInactive, setIncludeInactive] = useState(false);
  const [form, setForm] = useState(null);

  const load = async () => {
    const { data } = await api.get("/owners", { params: { include_inactive: includeInactive || undefined } });
    setItems(data);
  };
  useEffect(() => { api.get("/htx").then((r) => setHtxs(r.data)); }, []);
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [includeInactive]);

  const save = async () => {
    if (!form.name?.trim()) { toast.error("Vui lòng nhập tên chủ sở hữu"); return; }
    try {
      if (form.__isNew) { await api.post("/owners", form); toast.success("Đã thêm chủ sở hữu"); }
      else { await api.patch(`/owners/${form.id}`, form); toast.success("Đã cập nhật"); }
      setForm(null); load();
    } catch (e) { toast.error(e?.response?.data?.detail || "Lỗi"); }
  };
  const deactivate = async (o) => {
    if (!window.confirm(`Vô hiệu hóa chủ sở hữu ${o.name}?`)) return;
    await api.delete(`/owners/${o.id}`); toast.success("Đã vô hiệu hóa"); load();
  };
  const reactivate = async (o) => { await api.post(`/owners/${o.id}/reactivate`); toast.success("Đã kích hoạt lại"); load(); };

  const filtered = items.filter((o) =>
    !q || o.name.toLowerCase().includes(q.toLowerCase()) ||
    (o.code || "").toLowerCase().includes(q.toLowerCase()) || (o.phone || "").includes(q));

  return (
    <div className="mt-4 space-y-4">
      <div className="flex flex-wrap gap-2 items-center bg-white p-3 rounded-lg border border-slate-200">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm mã / tên / SĐT…" className="pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-md w-64" data-testid="owner-search" />
        </div>
        <label className="flex items-center gap-1.5 text-sm text-slate-600 cursor-pointer">
          <input type="checkbox" checked={includeInactive} onChange={(e) => setIncludeInactive(e.target.checked)} />
          Hiện đã vô hiệu hóa
        </label>
        {!readOnly && (
          <button
            data-testid="owner-add"
            onClick={() => setForm({ __isNew: true, name: "", owner_type: "THANH_VIEN_HTX", phone: "", htx_id: htxs[0]?.id || "" })}
            className="ml-auto flex items-center gap-1.5 px-4 py-2 rounded-md bg-[#00A82D] hover:bg-[#008E26] text-white text-sm font-medium"
          >
            <PlusCircle className="w-4 h-4" /> Thêm chủ sở hữu
          </button>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto">
        <table className="w-full text-sm min-w-[820px]">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-2.5">Mã CSH</th>
              <th className="text-left px-4 py-2.5">Tên</th>
              <th className="text-left px-4 py-2.5">Loại</th>
              <th className="text-left px-4 py-2.5">SĐT</th>
              <th className="text-left px-4 py-2.5">HTX liên kết</th>
              <th className="text-right px-4 py-2.5">Số máy</th>
              <th className="text-center px-4 py-2.5">Trạng thái</th>
              {!readOnly && <th className="text-right px-4 py-2.5">Thao tác</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map((o) => (
              <tr key={o.id} className={`border-t border-slate-100 hover:bg-slate-50 ${o.active === false ? "opacity-50" : ""}`} data-testid={`owner-row-${o.id}`}>
                <td className="px-4 py-2.5 font-mono text-xs font-semibold text-slate-700">{o.code}</td>
                <td className="px-4 py-2.5 font-medium">{o.name}</td>
                <td className="px-4 py-2.5">{OWNER_TYPE_LABEL[o.owner_type] || o.owner_type}</td>
                <td className="px-4 py-2.5 text-slate-600">{o.phone || "—"}</td>
                <td className="px-4 py-2.5 text-slate-600">{htxs.find((h) => h.id === o.htx_id)?.name || "—"}</td>
                <td className="px-4 py-2.5 text-right">
                  <button onClick={() => navigate(`/machine-management?owner=${o.id}`)} className="text-[#00A3E0] font-semibold hover:underline" data-testid={`owner-machine-count-${o.id}`}>
                    {o.machine_count ?? 0}
                  </button>
                </td>
                <td className="px-4 py-2.5 text-center">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs text-white ${o.active === false ? "bg-slate-400" : "bg-[#00A82D]"}`}>
                    {o.active === false ? "Đã vô hiệu hóa" : "Hoạt động"}
                  </span>
                </td>
                {!readOnly && (
                  <td className="px-4 py-2.5 text-right whitespace-nowrap">
                    {o.active === false ? (
                      <button onClick={() => reactivate(o)} className="text-[#00A82D] text-xs font-medium" data-testid={`owner-reactivate-${o.id}`}>Kích hoạt lại</button>
                    ) : (
                      <>
                        <button onClick={() => setForm({ ...o })} className="text-[#00A3E0] mr-3" data-testid={`owner-edit-${o.id}`}><PencilLine className="w-4 h-4 inline" /></button>
                        <button onClick={() => deactivate(o)} className="text-[#E74C3C]" data-testid={`owner-delete-${o.id}`} title="Vô hiệu hóa"><Trash2 className="w-4 h-4 inline" /></button>
                      </>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {form && (
        <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center p-6" onClick={() => setForm(null)}>
          <div className="bg-white rounded-lg w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display font-bold text-xl mb-1">{form.__isNew ? "Thêm chủ sở hữu" : "Chỉnh sửa chủ sở hữu"}</h3>
            {!form.__isNew && form.code && <div className="text-xs font-mono text-slate-400 mb-4">Mã CSH: {form.code} · hệ thống tự sinh</div>}
            {form.__isNew && <div className="mb-4" />}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Tên chủ sở hữu *" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
              <SelectField label="Loại" value={form.owner_type} onChange={(v) => setForm({ ...form, owner_type: v })} options={Object.entries(OWNER_TYPE_LABEL)} />
              <Field label="SĐT" value={form.phone || ""} onChange={(v) => setForm({ ...form, phone: v })} />
              <SelectField label="HTX liên kết" value={form.htx_id || ""} onChange={(v) => setForm({ ...form, htx_id: v || null })} options={[["", "— Không liên kết —"], ...htxs.map((h) => [h.id, `${h.code} - ${h.name}`])]} />
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setForm(null)} className="px-4 py-2 rounded-md text-sm bg-slate-100" data-testid="owner-form-cancel">Hủy</button>
              <button onClick={save} className="px-4 py-2 rounded-md text-sm bg-[#00A82D] text-white font-medium" data-testid="owner-form-save">Lưu</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function MachinesTab({ readOnly }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState([]);
  const [cats, setCats] = useState([]);
  const [htxs, setHtxs] = useState([]);
  const [owners, setOwners] = useState([]);
  const [category, setCategory] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [htxFilter, setHtxFilter] = useState(searchParams.get("htx") || "ALL");
  const ownerFilter = searchParams.get("owner") || "";
  const [includeInactive, setIncludeInactive] = useState(false);
  const [form, setForm] = useState(null);
  const [importer, setImporter] = useState(false);
  const [detail, setDetail] = useState(null);

  const load = async () => {
    const { data } = await api.get("/machines", { params: {
      category: category === "ALL" ? undefined : category,
      status: status === "ALL" ? undefined : status,
      htx_id: htxFilter === "ALL" ? undefined : htxFilter,
      owner_id: ownerFilter || undefined,
      include_inactive: includeInactive || undefined,
    } });
    setItems(data);
  };

  const changeHtxFilter = (v) => {
    setHtxFilter(v);
    const p = Object.fromEntries(searchParams);
    if (v === "ALL") delete p.htx; else p.htx = v;
    delete p.owner;
    setSearchParams(p);
  };

  useEffect(() => {
    api.get("/machine-categories").then((r) => setCats(r.data));
    api.get("/htx").then((r) => setHtxs(r.data));
    api.get("/owners").then((r) => setOwners(r.data));
  }, []);
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [category, status, htxFilter, ownerFilter, includeInactive]);

  const newForm = () => setForm({
    __isNew: true, htx_id: htxs[0]?.id || "", category_code: cats[0]?.code || "",
    owner_name: "", brand: "", model: "", year_made: "", fuel: "",
    horsepower: 50, productivity: 0, serial_no: "", chassis_no: "",
    owned_since: todayISO(), status: "hoat_dong", condition_notes: "",
  });

  const save = async () => {
    if (!form.owned_since) { toast.error("Vui lòng nhập Ngày HTX sở hữu máy"); return; }
    if (!form.serial_no && !form.chassis_no) { toast.error("Cần Số máy/SN hoặc Số khung"); return; }
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

  // BR-05: vô hiệu hóa (soft-delete) thay vì xóa cứng
  const deactivate = async (m) => {
    if (!window.confirm(`Vô hiệu hóa máy ${m.code || m.serial_no}? Máy sẽ ẩn khỏi bản đồ & không tính cân đối, nhưng vẫn giữ lịch sử.`)) return;
    await api.delete(`/machines/${m.id}`);
    toast.success("Đã vô hiệu hóa"); load();
  };
  const reactivate = async (m) => {
    await api.post(`/machines/${m.id}/reactivate`);
    toast.success("Đã kích hoạt lại"); load();
  };

  return (
    <div className="mt-4 space-y-4">
      <div className="flex flex-wrap gap-2 items-center bg-white p-3 rounded-lg border border-slate-200">
        <select value={htxFilter} onChange={(e) => changeHtxFilter(e.target.value)} className="px-3 py-2 text-sm border border-slate-300 rounded-md max-w-[220px]" data-testid="filter-machine-htx">
          <option value="ALL">Tất cả HTX</option>
          {htxs.map((h) => <option key={h.id} value={h.id}>{h.code} - {h.name}</option>)}
        </select>
        {ownerFilter && (
          <span className="flex items-center gap-1.5 text-xs bg-[#00A3E0]/10 text-[#0089BE] px-2.5 py-1.5 rounded-md">
            Lọc theo chủ sở hữu: {owners.find((o) => o.id === ownerFilter)?.name || ownerFilter}
            <button onClick={() => { const p = Object.fromEntries(searchParams); delete p.owner; setSearchParams(p); }} className="hover:text-[#E74C3C]"><X className="w-3 h-3" /></button>
          </span>
        )}
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="px-3 py-2 text-sm border border-slate-300 rounded-md" data-testid="filter-machine-category">
          <option value="ALL">Tất cả chủng loại</option>
          {cats.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="px-3 py-2 text-sm border border-slate-300 rounded-md" data-testid="filter-machine-status">
          <option value="ALL">Tất cả tình trạng</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <label className="flex items-center gap-1.5 text-sm text-slate-600 select-none cursor-pointer">
          <input type="checkbox" checked={includeInactive} onChange={(e) => setIncludeInactive(e.target.checked)} data-testid="filter-include-inactive" />
          Hiện máy đã vô hiệu hóa
        </label>
        {!readOnly && (
          <>
            <button
              data-testid="machine-add"
              onClick={newForm}
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
          </>
        )}
      </div>

      {importer && (
        <ImportModal
          kind="machines"
          title="Nhập Máy móc từ Excel"
          columnsHint="htx_code, category_code, brand, model, year_made, fuel, horsepower, productivity, owner_name, serial_no, chassis_no, owned_since, status, condition_notes"
          templateEndpoint="/machines/import-template"
          importEndpoint="/machines/import-excel"
          templateFilename="machines-import-template.xlsx"
          entityLabel="máy"
          onClose={() => setImporter(false)}
          onDone={() => { setImporter(false); load(); }}
        />
      )}

      <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto">
        <table className="w-full text-sm min-w-[1100px]">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
            <tr>
              <th className="text-left px-3 py-2.5">Mã máy</th>
              <th className="text-left px-3 py-2.5">HTX</th>
              <th className="text-left px-3 py-2.5">Chủng loại · Khâu</th>
              <th className="text-left px-3 py-2.5">Hãng · Model</th>
              <th className="text-left px-3 py-2.5">Số máy/SN</th>
              <th className="text-left px-3 py-2.5">Số khung</th>
              <th className="text-center px-3 py-2.5">Năm SX</th>
              <th className="text-right px-3 py-2.5">HP</th>
              <th className="text-left px-3 py-2.5">Chủ sở hữu</th>
              <th className="text-center px-3 py-2.5">Ngày sở hữu</th>
              <th className="text-left px-3 py-2.5">Tình trạng</th>
              {!readOnly && <th className="text-right px-3 py-2.5">Thao tác</th>}
            </tr>
          </thead>
          <tbody>
            {items.slice(0, 500).map((m) => {
              const cat = cats.find((c) => c.code === m.category_code);
              const srcLabel = m.status_source_label || SOURCE_LABEL[m.status_source] || "";
              return (
              <tr
                key={m.id}
                className={`border-t border-slate-100 hover:bg-slate-50 cursor-pointer ${m.active === false ? "opacity-50" : ""}`}
                data-testid={`machine-row-${m.id}`}
                onClick={() => setDetail(m)}
              >
                <td className="px-3 py-2.5 font-mono text-xs font-semibold text-slate-700">{m.code || "—"}</td>
                <td className="px-3 py-2.5">{htxs.find((h) => h.id === m.htx_id)?.name || "—"}</td>
                <td className="px-3 py-2.5">
                  <div>{cat?.name || m.category_code}</div>
                  <div className="text-[11px] text-slate-400">{STAGE_LABEL[m.stage || cat?.stage] || ""}</div>
                </td>
                <td className="px-3 py-2.5">{[m.brand, m.model].filter(Boolean).join(" · ") || "—"}</td>
                <td className="px-3 py-2.5 font-mono text-xs">{m.serial_no || "—"}</td>
                <td className="px-3 py-2.5 font-mono text-xs">{m.chassis_no || "—"}</td>
                <td className="px-3 py-2.5 text-center">{m.year_made || "—"}</td>
                <td className="px-3 py-2.5 text-right">{m.horsepower}</td>
                <td className="px-3 py-2.5">{m.owner_name || "—"}</td>
                <td className="px-3 py-2.5 text-center text-xs">{m.owned_since || "—"}</td>
                <td className="px-3 py-2.5">
                  {m.active === false ? (
                    <span className="inline-block px-2 py-0.5 rounded text-xs bg-slate-200 text-slate-600">Đã vô hiệu hóa</span>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs text-white ${m.status === "hoat_dong" ? "bg-[#00A82D]" : m.status === "bao_tri" ? "bg-[#F5A623]" : m.status === "hong" ? "bg-[#E74C3C]" : "bg-slate-400"}`}>
                        {STATUS_LABEL[m.status]}
                      </span>
                      <span className="text-[10px] text-slate-400">{srcLabel}</span>
                    </div>
                  )}
                </td>
                {!readOnly && (
                  <td className="px-3 py-2.5 text-right whitespace-nowrap">
                    {m.active === false ? (
                      <button onClick={(e) => { e.stopPropagation(); reactivate(m); }} className="text-[#00A82D] text-xs font-medium" data-testid={`machine-reactivate-${m.id}`}>
                        Kích hoạt lại
                      </button>
                    ) : (
                      <>
                        <button onClick={(e) => { e.stopPropagation(); setForm({ ...m }); }} className="text-[#00A3E0] mr-3" data-testid={`machine-edit-${m.id}`}>
                          <PencilLine className="w-4 h-4 inline" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); deactivate(m); }} className="text-[#E74C3C]" data-testid={`machine-delete-${m.id}`} title="Vô hiệu hóa">
                          <Trash2 className="w-4 h-4 inline" />
                        </button>
                      </>
                    )}
                  </td>
                )}
              </tr>
            );})}
          </tbody>
        </table>
        {items.length > 500 && <div className="px-4 py-2 text-xs text-slate-500 border-t border-slate-100">Hiển thị 500 dòng đầu · Tổng {items.length} máy. Lọc để xem thêm.</div>}
      </div>

      {detail && (
        <MachineDetailModal
          machine={detail}
          htx={htxs.find((h) => h.id === detail.htx_id)}
          category={cats.find((c) => c.code === detail.category_code)}
          onClose={() => setDetail(null)}
        />
      )}

      {form && (
        <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center p-6" onClick={() => setForm(null)}>
          <div className="bg-white rounded-lg w-full max-w-2xl p-6 max-h-[88vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display font-bold text-xl mb-1">{form.__isNew ? "Thêm máy mới" : "Chỉnh sửa máy"}</h3>
            {!form.__isNew && form.code && (
              <div className="text-xs font-mono text-slate-400 mb-4">Mã máy: {form.code} · hệ thống tự sinh</div>
            )}
            {form.__isNew && <div className="mb-4" />}
            <div className="grid grid-cols-2 gap-3">
              <SelectField label="HTX chủ sở hữu *" value={form.htx_id} onChange={(v) => setForm({ ...form, htx_id: v })} options={htxs.map((h) => [h.id, `${h.code} - ${h.name}`])} disabled={!form.__isNew} />
              <SelectField label="Chủng loại (khâu tự gán) *" value={form.category_code} onChange={(v) => setForm({ ...form, category_code: v })} options={cats.map((c) => [c.code, c.name])} />
              <Field label="Số máy / SN" value={form.serial_no || ""} onChange={(v) => setForm({ ...form, serial_no: v })} />
              <Field label="Số khung" value={form.chassis_no || ""} onChange={(v) => setForm({ ...form, chassis_no: v })} />
              <Field label="Hãng" value={form.brand || ""} onChange={(v) => setForm({ ...form, brand: v })} />
              <Field label="Model" value={form.model || ""} onChange={(v) => setForm({ ...form, model: v })} />
              <Field label="Năm SX" type="number" value={form.year_made || ""} onChange={(v) => setForm({ ...form, year_made: v ? parseInt(v, 10) : null })} />
              <Field label="Nhiên liệu" value={form.fuel || ""} onChange={(v) => setForm({ ...form, fuel: v })} />
              <Field label="Công suất (HP)" type="number" value={form.horsepower} onChange={(v) => setForm({ ...form, horsepower: parseFloat(v) || 0 })} />
              <Field label="Năng suất" type="number" value={form.productivity || 0} onChange={(v) => setForm({ ...form, productivity: parseFloat(v) || 0 })} />
              <SelectField
                label="Chủ sở hữu"
                value={form.owner_id || ""}
                onChange={(v) => { const o = owners.find((x) => x.id === v); setForm({ ...form, owner_id: v || null, owner_name: o ? o.name : "" }); }}
                options={[["", "— Chọn chủ sở hữu —"], ...owners.filter((o) => !form.htx_id || o.htx_id === form.htx_id).map((o) => [o.id, `${o.name} · ${OWNER_TYPE_LABEL[o.owner_type]}`])]}
              />
              <Field label="Ngày HTX sở hữu / tiếp nhận *" type="date" value={form.owned_since || ""} onChange={(v) => setForm({ ...form, owned_since: v })} />
              <div>
                <SelectField
                  label="Tình trạng"
                  value={form.status}
                  onChange={(v) => setForm({ ...form, status: v })}
                  options={Object.entries(STATUS_LABEL)}
                  disabled={!form.__isNew && form.status_source === "app_htx"}
                />
                {!form.__isNew && form.status_source === "app_htx" && (
                  <div className="text-[10px] text-slate-400 mt-1">[App HTX] — chỉ đọc sau khi bật đồng bộ</div>
                )}
              </div>
              <div className="col-span-2">
                <Field label="Ghi chú tình trạng" value={form.condition_notes || ""} onChange={(v) => setForm({ ...form, condition_notes: v })} />
              </div>
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

function MachineDetailModal({ machine, htx, category, onClose }) {
  const [history, setHistory] = useState([]);
  const [loadingHist, setLoadingHist] = useState(true);
  useEffect(() => {
    api.get(`/machines/${machine.id}/history`)
      .then((r) => setHistory(r.data))
      .catch(() => setHistory([]))
      .finally(() => setLoadingHist(false));
  }, [machine.id]);

  const srcLabel = machine.status_source_label || SOURCE_LABEL[machine.status_source] || "";
  return (
    <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center p-6" onClick={onClose} data-testid="machine-detail-modal">
      <div className="bg-white rounded-lg w-full max-w-lg p-6 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="text-xs font-mono text-slate-400">{machine.code || machine.serial_no}</div>
            <h3 className="font-display font-bold text-xl text-slate-900">{category?.name || "Máy móc"}</h3>
            {category?.stage && <div className="text-xs text-slate-500">{STAGE_LABEL[category.stage] || category.stage}</div>}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700" data-testid="machine-detail-close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-3 flex items-center gap-2 flex-wrap">
          {machine.active === false ? (
            <span className="inline-block px-2 py-0.5 rounded text-xs bg-slate-200 text-slate-600">Đã vô hiệu hóa · {machine.deactivated_at ? fmtDateTime(machine.deactivated_at) : ""}</span>
          ) : (
            <>
              <span className={`inline-block px-2 py-0.5 rounded text-xs text-white ${machine.status === "hoat_dong" ? "bg-[#00A82D]" : machine.status === "bao_tri" ? "bg-[#F5A623]" : machine.status === "hong" ? "bg-[#E74C3C]" : "bg-slate-400"}`}>
                {STATUS_LABEL[machine.status]}
              </span>
              <span className="text-[11px] text-slate-500">{srcLabel}</span>
              {machine.status_updated_at && <span className="text-[11px] text-slate-400">· cập nhật {fmtDateTime(machine.status_updated_at)}</span>}
            </>
          )}
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm mb-5">
          <DetailRow label="Số máy / SN" value={machine.serial_no || "—"} />
          <DetailRow label="Số khung" value={machine.chassis_no || "—"} />
          <DetailRow label="Hãng" value={machine.brand || "—"} />
          <DetailRow label="Model" value={machine.model || "—"} />
          <DetailRow label="Năm SX" value={machine.year_made || "—"} />
          <DetailRow label="Nhiên liệu" value={machine.fuel || "—"} />
          <DetailRow label="Công suất" value={`${machine.horsepower} HP`} />
          <DetailRow label="Năng suất" value={machine.productivity || "—"} />
          <DetailRow label="Chủ sở hữu" value={machine.owner_name || "—"} />
          <DetailRow label="Ngày HTX sở hữu" value={machine.owned_since || "—"} />
          {machine.condition_notes && <DetailRow label="Ghi chú tình trạng" value={machine.condition_notes} span />}
        </div>

        {htx && (
          <div className="border-t border-slate-200 pt-4">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">
              <Building2 className="w-4 h-4" /> HTX quản lý
            </div>
            <div className="text-sm font-medium text-slate-800">{htx.name} <span className="text-slate-400 font-normal text-xs">({htx.code})</span></div>
            <div className="flex items-start gap-2 mt-1.5">
              <MapPin className="w-4 h-4 text-[#00A3E0] mt-0.5 shrink-0" />
              <div className="text-slate-600 text-sm">
                {htx.address || "Chưa cập nhật địa chỉ"}
                <div className="text-xs text-slate-400">{htx.commune}</div>
              </div>
            </div>
            {htx.phone && (
              <div className="flex items-center gap-2 mt-1.5">
                <Phone className="w-4 h-4 text-[#00A3E0] shrink-0" />
                <span className="text-slate-600 text-sm">{htx.phone}</span>
              </div>
            )}
          </div>
        )}

        {/* BR-07: Lịch sử biến động */}
        <div className="border-t border-slate-200 pt-4 mt-4">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">
            <Hash className="w-4 h-4" /> Lịch sử biến động
          </div>
          {loadingHist ? (
            <div className="text-xs text-slate-400 flex items-center gap-1.5"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Đang tải…</div>
          ) : history.length === 0 ? (
            <div className="text-xs text-slate-400">Chưa có bản ghi.</div>
          ) : (
            <ul className="space-y-2">
              {history.map((h) => (
                <li key={h.id} className="text-xs border-l-2 border-slate-200 pl-3 py-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-700">{HISTORY_TYPE_LABEL[h.change_type] || h.change_type}</span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 text-[10px]">{SOURCE_LABEL[h.source] || h.source}</span>
                    <span className="text-slate-400 ml-auto">{fmtDateTime(h.ts)}</span>
                  </div>
                  {h.field && (
                    <div className="text-slate-500 mt-0.5">
                      {h.field}: <span className="line-through text-slate-400">{h.before ?? "∅"}</span> → <span className="text-slate-700">{h.after ?? "∅"}</span>
                    </div>
                  )}
                  {h.owned_since && <div className="text-slate-400 mt-0.5">Ngày sở hữu: {h.owned_since}</div>}
                  {h.deactivated_at && <div className="text-slate-400 mt-0.5">Ngày vô hiệu hóa: {fmtDateTime(h.deactivated_at)}</div>}
                  {h.actor && <div className="text-slate-400 mt-0.5">Bởi: {h.actor}</div>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value, span }) {
  return (
    <div className={span ? "col-span-2" : ""}>
      <div className="text-[10px] uppercase tracking-wide text-slate-400">{label}</div>
      <div className="text-slate-800">{value}</div>
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
      const committed = (data.created || 0) + (data.updated || 0) + (data.inserted || 0);
      if (!dryRun && committed > 0) {
        toast.success(`Đã xử lý ${committed} ${entityLabel} trong hệ thống`);
        setTimeout(() => onDone(), 800);
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
                {result.skipped_count != null
                  ? <ResultStat icon={AlertTriangle} color="#F5A623" label="Đã tồn tại" value={result.skipped_count} />
                  : <ResultStat icon={AlertTriangle} color="#94A3B8" label="Sẽ vô hiệu hóa" value={result.deactivated ?? 0} />}
              </div>

              {result.dry_run && result.ok_count > 0 && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-md p-3 text-xs text-emerald-800">
                  Kiểm tra hoàn tất. Nhấn <b>Xác nhận nhập</b> để lưu {result.ok_count} {entityLabel} hợp lệ vào hệ thống.
                </div>
              )}
              {!result.dry_run && (
                <div className="bg-green-50 border border-green-200 rounded-md p-3 text-xs text-green-800">
                  {result.created != null ? (
                    <>Đã <b>tạo mới {result.created}</b>, <b>cập nhật {result.updated || 0}</b>, <b>vô hiệu hóa {result.deactivated || 0}</b> {entityLabel}.</>
                  ) : (
                    <>Đã nhập thành công <b>{result.inserted}</b> {entityLabel} vào hệ thống.</>
                  )}
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