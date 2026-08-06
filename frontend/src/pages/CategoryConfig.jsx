import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import {
  Ruler, Sliders, PlusCircle, Layers, CalendarRange, MapPin, Settings2,
} from "lucide-react";
import { toast, Toaster } from "sonner";
import {
  today, fmtDate, StatusPill, SimpleTable, FormModal, Input, Select, Toggle,
} from "../components/adminUi";

/* ============================================================
   FN-01 — DANH MỤC VÀ CẤU HÌNH HỆ THỐNG
   Màn hình riêng, độc lập với FN-12 (Giám sát & Vận hành).
   6 nhóm danh mục/cấu hình theo BRD (Luồng xử lý chính B2):
   Khâu sản xuất · Tên vụ · Đơn vị hành chính ·
   Định mức năng suất · Ngưỡng cảnh báo · Tham số hệ thống
   ============================================================ */
export default function CategoryConfig() {
  return (
    <div className="p-6 lg:p-8 space-y-6" data-testid="category-config-page">
      <Toaster position="top-right" richColors />
      <div>
        <h1 className="font-display font-bold text-3xl text-slate-900">Danh mục & Cấu hình hệ thống</h1>
        <p className="text-sm text-slate-500 mt-1">
          Nền tảng dữ liệu cho các chức năng khác. Chỉ Admin truy cập (BR-03); không xóa cứng giá trị đang tham chiếu, chỉ ngừng hiệu lực.
        </p>
      </div>

      <Tabs defaultValue="stages">
        <TabsList>
          <TabsTrigger value="stages" data-testid="tab-stages"><Layers className="w-4 h-4 mr-1.5" /> Khâu sản xuất</TabsTrigger>
          <TabsTrigger value="seasons" data-testid="tab-seasons"><CalendarRange className="w-4 h-4 mr-1.5" /> Tên vụ</TabsTrigger>
          <TabsTrigger value="units" data-testid="tab-units"><MapPin className="w-4 h-4 mr-1.5" /> Đơn vị hành chính</TabsTrigger>
          <TabsTrigger value="norms" data-testid="tab-norms"><Ruler className="w-4 h-4 mr-1.5" /> Định mức năng suất</TabsTrigger>
          <TabsTrigger value="thresholds" data-testid="tab-thresholds"><Sliders className="w-4 h-4 mr-1.5" /> Ngưỡng cảnh báo</TabsTrigger>
          <TabsTrigger value="params" data-testid="tab-params"><Settings2 className="w-4 h-4 mr-1.5" /> Tham số hệ thống</TabsTrigger>
        </TabsList>
        <TabsContent value="stages"><StagesTab /></TabsContent>
        <TabsContent value="seasons"><SeasonsTab /></TabsContent>
        <TabsContent value="units"><UnitsTab /></TabsContent>
        <TabsContent value="norms"><NormsTab /></TabsContent>
        <TabsContent value="thresholds"><ThresholdsTab /></TabsContent>
        <TabsContent value="params"><ParamsTab /></TabsContent>
      </Tabs>
    </div>
  );
}

/* --- Nhóm 1: Khâu sản xuất --- */
function StagesTab() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(null);
  const load = () => api.get("/stages").then((r) => setItems(r.data));
  useEffect(() => { load(); }, []);
  const save = async () => {
    try {
      if (form.isNew) await api.post("/stages", form);
      else await api.patch(`/stages/${form.code}`, { name: form.name, active: form.active });
      toast.success("Đã lưu khâu sản xuất");
      setForm(null); load();
    } catch (e) { toast.error(e?.response?.data?.detail || "Lỗi"); }
  };
  return (
    <div className="mt-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">Trường dữ liệu: Tên khâu sản xuất.</p>
        <button onClick={() => setForm({ isNew: true, code: "", name: "", active: true })}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#00A82D] text-white text-xs font-medium">
          <PlusCircle className="w-3.5 h-3.5" /> Thêm khâu
        </button>
      </div>
      <SimpleTable
        cols={["Mã", "Tên khâu sản xuất", "Trạng thái", ""]}
        rows={items.map((s) => [
          <span className="font-mono text-xs">{s.code}</span>,
          <span className="font-medium">{s.name}</span>,
          <StatusPill active={s.active} />,
          <button onClick={() => setForm({ ...s, isNew: false })} className="text-[#00A3E0] text-sm">Sửa</button>,
        ])}
      />
      {form && (
        <FormModal title={form.isNew ? "Thêm khâu sản xuất" : "Sửa khâu sản xuất"} onClose={() => setForm(null)} onSave={save}>
          {form.isNew && <Input label="Mã khâu" value={form.code} onChange={(v) => setForm({ ...form, code: v })} />}
          <Input label="Tên khâu sản xuất" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
          <Toggle label="Đang hoạt động" checked={form.active} onChange={(v) => setForm({ ...form, active: v })} />
        </FormModal>
      )}
    </div>
  );
}

/* --- Nhóm 2: Tên vụ sản xuất --- */
function SeasonsTab() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(null);
  const load = () => api.get("/seasons").then((r) => setItems(r.data));
  useEffect(() => { load(); }, []);
  const save = async () => {
    try {
      if (form.isNew) await api.post("/seasons", form);
      else await api.patch(`/seasons/${form.code}`, { name: form.name, active: form.active });
      toast.success("Đã lưu tên vụ"); setForm(null); load();
    } catch (e) { toast.error(e?.response?.data?.detail || "Lỗi"); }
  };
  return (
    <div className="mt-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">Trường dữ liệu: Tên vụ (Đông Xuân/Hè Thu/Thu Đông…) — làm nhãn/bộ lọc, không gồm ngày bắt đầu–kết thúc.</p>
        <button onClick={() => setForm({ isNew: true, code: "", name: "", active: true })}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#00A82D] text-white text-xs font-medium">
          <PlusCircle className="w-3.5 h-3.5" /> Thêm vụ
        </button>
      </div>
      <SimpleTable
        cols={["Mã", "Tên vụ", "Trạng thái", ""]}
        rows={items.map((s) => [
          <span className="font-mono text-xs">{s.code}</span>,
          <span className="font-medium">{s.name}</span>,
          <StatusPill active={s.active} />,
          <button onClick={() => setForm({ ...s, isNew: false })} className="text-[#00A3E0] text-sm">Sửa</button>,
        ])}
      />
      {form && (
        <FormModal title={form.isNew ? "Thêm tên vụ" : "Sửa tên vụ"} onClose={() => setForm(null)} onSave={save}>
          {form.isNew && <Input label="Mã vụ" value={form.code} onChange={(v) => setForm({ ...form, code: v })} />}
          <Input label="Tên vụ" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
          <Toggle label="Đang hoạt động" checked={form.active} onChange={(v) => setForm({ ...form, active: v })} />
        </FormModal>
      )}
    </div>
  );
}

/* --- Nhóm 3: Đơn vị hành chính --- */
function UnitsTab() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(null);
  const load = () => api.get("/provinces").then((r) => setItems(r.data));
  useEffect(() => { load(); }, []);
  const save = async () => {
    try {
      if (form.isNew) {
        await api.post("/provinces", {
          code: form.code, name: form.name,
          lat: parseFloat(form.lat) || 0, lng: parseFloat(form.lng) || 0,
          effective_from: form.effective_from, active: true,
        });
      } else {
        await api.patch(`/provinces/${form.code}`, {
          name: form.name, lat: parseFloat(form.lat), lng: parseFloat(form.lng),
          effective_from: form.effective_from, active: form.active,
        });
      }
      toast.success("Đã lưu đơn vị hành chính"); setForm(null); load();
    } catch (e) { toast.error(e?.response?.data?.detail || "Lỗi"); }
  };
  return (
    <div className="mt-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">
          Trường: Tỉnh; Mã đơn vị; Ngày hiệu lực; Toạ độ. Đổi địa giới → đóng hiệu lực bản ghi cũ (BR-02), không xóa cứng.
        </p>
        <button onClick={() => setForm({ isNew: true, code: "", name: "", lat: "", lng: "", effective_from: today(), active: true })}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#00A82D] text-white text-xs font-medium">
          <PlusCircle className="w-3.5 h-3.5" /> Thêm đơn vị
        </button>
      </div>
      <SimpleTable
        cols={["Mã đơn vị", "Tỉnh", "Toạ độ", "Ngày hiệu lực", "Trạng thái", ""]}
        rows={items.map((p) => [
          <span className="font-mono text-xs">{p.code}</span>,
          <span className="font-medium">{p.name}</span>,
          <span className="text-xs text-slate-500">{p.lat?.toFixed?.(3)}, {p.lng?.toFixed?.(3)}</span>,
          <span className="text-xs">{fmtDate(p.effective_from)}</span>,
          <StatusPill active={p.active} onLabel="Hiệu lực" offLabel="Ngừng hiệu lực" />,
          <button onClick={() => setForm({ ...p, isNew: false })} className="text-[#00A3E0] text-sm">Sửa</button>,
        ])}
      />
      {form && (
        <FormModal title={form.isNew ? "Thêm đơn vị hành chính" : "Sửa đơn vị hành chính"} onClose={() => setForm(null)} onSave={save}>
          {form.isNew && <Input label="Mã đơn vị" value={form.code} onChange={(v) => setForm({ ...form, code: v })} />}
          <Input label="Tên Tỉnh" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
          <div className="grid grid-cols-2 gap-2">
            <Input label="Vĩ độ (lat)" type="number" value={form.lat} onChange={(v) => setForm({ ...form, lat: v })} />
            <Input label="Kinh độ (lng)" type="number" value={form.lng} onChange={(v) => setForm({ ...form, lng: v })} />
          </div>
          <Input label="Ngày hiệu lực" type="date" value={form.effective_from?.slice(0, 10)} onChange={(v) => setForm({ ...form, effective_from: v })} />
          {!form.isNew && <Toggle label="Đang hiệu lực" checked={form.active} onChange={(v) => setForm({ ...form, active: v })} />}
        </FormModal>
      )}
    </div>
  );
}

/* --- Chủng loại máy (danh mục chuẩn dùng validate import) --- */
/* --- Nhóm 4: Định mức diện tích/máy/vụ (Chủng loại × Khâu × Ngày hiệu lực) --- */
function NormsTab() {
  const [items, setItems] = useState([]);
  const [cats, setCats] = useState([]);
  const [stages, setStages] = useState([]);
  const [form, setForm] = useState(null);
  const load = async () => {
    const [n, c, s] = await Promise.all([
      api.get("/productivity-norms"), api.get("/machine-categories"), api.get("/stages"),
    ]);
    setItems(n.data); setCats(c.data); setStages(s.data);
  };
  useEffect(() => { load(); }, []);
  const save = async () => {
    try {
      await api.post("/productivity-norms", {
        category_code: form.category_code, stage_code: form.stage_code,
        ha_per_machine_per_season: parseFloat(form.ha_per_machine_per_season),
        document_ref: form.document_ref,
        effective_from: form.effective_from, effective_to: form.effective_to || null,
      });
      toast.success("Đã cập nhật định mức (căn cứ văn bản DCRD)");
      setForm(null); load();
    } catch (e) { toast.error(e?.response?.data?.detail || "Lỗi"); }
  };
  const stopEffect = async (n) => {
    await api.patch(`/productivity-norms/${n.id}`, { active: false, effective_to: today() });
    toast.success("Đã ngừng hiệu lực định mức");
    load();
  };
  return (
    <div className="mt-4 space-y-4">
      <div className="text-xs bg-amber-50 border-l-4 border-[#F5A623] p-3 rounded">
        <strong>Bắt buộc (BR-01):</strong> Định mức là DỮ LIỆU do DCRD ban hành bằng văn bản, khoá theo <em>Chủng loại × Khâu</em>,
        kèm Ngày hiệu lực và Số/ngày văn bản làm căn cứ pháp lý. Hệ thống KHÔNG tự sinh định mức.
      </div>
      <div className="flex justify-end">
        <button
          onClick={() => setForm({
            category_code: cats[0]?.code || "", stage_code: stages[0]?.code || "",
            ha_per_machine_per_season: "", document_ref: "", effective_from: today(), effective_to: "",
          })}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#00A82D] text-white text-xs font-medium">
          <PlusCircle className="w-3.5 h-3.5" /> Thêm / cập nhật định mức
        </button>
      </div>
      <SimpleTable
        cols={["Chủng loại máy", "Khâu", "Ha / máy / vụ", "Hiệu lực (từ–đến)", "Số hiệu văn bản", "Trạng thái", ""]}
        rows={items.map((n) => [
          <span className="font-medium">{cats.find((c) => c.code === n.category_code)?.name || n.category_code}</span>,
          <span>{stages.find((s) => s.code === n.stage_code)?.name || n.stage_code || "—"}</span>,
          <span className="text-right block">{n.ha_per_machine_per_season}</span>,
          <span className="text-xs">{fmtDate(n.effective_from)} – {n.effective_to ? fmtDate(n.effective_to) : "nay"}</span>,
          <span className="text-slate-600 text-xs">{n.document_ref}</span>,
          <StatusPill active={n.active !== false} onLabel="Hiệu lực" offLabel="Ngừng hiệu lực" />,
          <div className="flex gap-3 justify-end">
            <button onClick={() => setForm({ ...n, effective_to: n.effective_to || "" })} className="text-[#00A3E0] text-sm">Sửa</button>
            {n.active !== false && <button onClick={() => stopEffect(n)} className="text-[#E74C3C] text-sm">Ngừng h.lực</button>}
          </div>,
        ])}
      />
      {form && (
        <FormModal title="Cập nhật định mức năng suất" onClose={() => setForm(null)} onSave={save}>
          <Select label="Chủng loại máy" value={form.category_code} onChange={(v) => setForm({ ...form, category_code: v })}
            options={cats.map((c) => ({ value: c.code, label: c.name }))} />
          <Select label="Khâu sản xuất" value={form.stage_code} onChange={(v) => setForm({ ...form, stage_code: v })}
            options={stages.map((s) => ({ value: s.code, label: s.name }))} />
          <Input label="Ha/máy/vụ" type="number" value={form.ha_per_machine_per_season} onChange={(v) => setForm({ ...form, ha_per_machine_per_season: v })} />
          <Input label="Số hiệu văn bản DCRD" value={form.document_ref} onChange={(v) => setForm({ ...form, document_ref: v })} />
          <div className="grid grid-cols-2 gap-2">
            <Input label="Hiệu lực từ" type="date" value={form.effective_from?.slice(0, 10)} onChange={(v) => setForm({ ...form, effective_from: v })} />
            <Input label="Hiệu lực đến (tuỳ chọn)" type="date" value={form.effective_to?.slice?.(0, 10) || ""} onChange={(v) => setForm({ ...form, effective_to: v })} />
          </div>
        </FormModal>
      )}
    </div>
  );
}

/* --- Nhóm 5: Ngưỡng cảnh báo cung–cầu (4 mốc, có ngày hiệu lực) --- */
function ThresholdsTab() {
  const [t, setT] = useState({ sufficient_min: 0.85, slight_min: 0.60, excess_min: 1.20, effective_from: "" });
  useEffect(() => { api.get("/admin/thresholds").then((r) => setT({ ...t, ...r.data })); }, []); // eslint-disable-line
  const save = async () => {
    await api.patch("/admin/thresholds", {
      sufficient_min: t.sufficient_min, slight_min: t.slight_min, excess_min: t.excess_min,
    });
    toast.success("Đã lưu ngưỡng cảnh báo cung–cầu");
  };
  return (
    <div className="mt-4 max-w-2xl space-y-4">
      <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
        <h3 className="font-display font-bold text-sm uppercase tracking-wide flex items-center gap-2">
          <Sliders className="w-4 h-4 text-[#00A3E0]" /> Ngưỡng cảnh báo cung–cầu (QT-02)
        </h3>
        <div className="grid grid-cols-3 gap-3">
          <Input label="Thừa (tỷ lệ ≥)" type="number" step="0.01" value={t.excess_min} onChange={(v) => setT({ ...t, excess_min: parseFloat(v) })} />
          <Input label="Đủ (tỷ lệ ≥)" type="number" step="0.01" value={t.sufficient_min} onChange={(v) => setT({ ...t, sufficient_min: parseFloat(v) })} />
          <Input label="Cần chú ý (tỷ lệ ≥)" type="number" step="0.01" value={t.slight_min} onChange={(v) => setT({ ...t, slight_min: parseFloat(v) })} />
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <Legend color="bg-[#00A3E0]" label={`Thừa ≥ ${pct(t.excess_min)}`} />
          <Legend color="bg-[#00A82D]" label={`Đủ ${pct(t.sufficient_min)}–${pct(t.excess_min)}`} />
          <Legend color="bg-[#F5A623]" label={`Cần chú ý ${pct(t.slight_min)}–${pct(t.sufficient_min)}`} />
          <Legend color="bg-[#E74C3C]" label={`Thiếu < ${pct(t.slight_min)}`} />
        </div>
        <p className="text-xs text-slate-500">
          Đổi ngưỡng chỉ ảnh hưởng lần tính cân đối kế tiếp (AC-01); cân đối vụ cũ vẫn dùng đúng ngưỡng hiệu lực tại thời điểm đó (AC-02).
        </p>
        <button onClick={save} data-testid="threshold-save" className="px-4 py-2 rounded-md text-sm bg-[#00A82D] text-white font-medium">Lưu thay đổi</button>
      </div>
    </div>
  );
}

function Legend({ color, label }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-slate-50 border border-slate-200">
      <span className={`w-2.5 h-2.5 rounded-full ${color}`} /> {label}
    </span>
  );
}
function pct(v) { return `${Math.round((v || 0) * 100)}%`; }

/* --- Nhóm 6: Tham số hệ thống --- */
function ParamsTab() {
  const [p, setP] = useState(null);
  useEffect(() => { api.get("/admin/system-params").then((r) => setP(r.data)); }, []);
  if (!p) return <div className="mt-4 text-sm text-slate-500">Đang tải…</div>;
  const save = async () => {
    await api.patch("/admin/system-params", p);
    toast.success("Đã lưu tham số hệ thống");
  };
  return (
    <div className="mt-4 max-w-2xl bg-white border border-slate-200 rounded-lg p-5 space-y-4">
      <h3 className="font-display font-bold text-sm uppercase tracking-wide flex items-center gap-2">
        <Settings2 className="w-4 h-4 text-[#00A3E0]" /> Tham số hệ thống
      </h3>
      <Input label="Nguồn bản đồ nền" value={p.basemap_source} onChange={(v) => setP({ ...p, basemap_source: v })} />
      <div className="grid grid-cols-2 gap-3">
        <Input label="Định dạng import cho phép" value={p.import_allowed_extensions} onChange={(v) => setP({ ...p, import_allowed_extensions: v })} />
        <Input label="Giới hạn số dòng import" type="number" value={p.import_max_rows} onChange={(v) => setP({ ...p, import_max_rows: parseInt(v) || 0 })} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input label="Giới hạn dung lượng file (MB)" type="number" value={p.import_max_file_size_mb} onChange={(v) => setP({ ...p, import_max_file_size_mb: parseFloat(v) })} />
        <Input label="Ngưỡng 'độ tươi' dữ liệu App HTX (giờ)" type="number" value={p.data_freshness_threshold_hours} onChange={(v) => setP({ ...p, data_freshness_threshold_hours: parseInt(v) || 0 })} />
      </div>
      <button onClick={save} className="px-4 py-2 rounded-md text-sm bg-[#00A82D] text-white font-medium">Lưu thay đổi</button>
    </div>
  );
}
