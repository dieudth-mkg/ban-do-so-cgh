import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import { Users, ShieldCheck, Tractor, Ruler, Sliders, RefreshCw, Activity, PlusCircle, KeyRound } from "lucide-react";
import { toast, Toaster } from "sonner";

export default function Admin() {
  return (
    <div className="p-6 lg:p-8 space-y-6" data-testid="admin-page">
      <Toaster position="top-right" richColors />
      <div>
        <h1 className="font-display font-bold text-3xl text-slate-900">Quản trị Hệ thống & Cấu hình</h1>
        <p className="text-sm text-slate-500 mt-1">Chỉ dành cho Quản trị viên · FN-07, FN-08, FN-09, FN-10</p>
      </div>
      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users" data-testid="tab-users"><Users className="w-4 h-4 mr-1.5" /> Tài khoản</TabsTrigger>
          <TabsTrigger value="categories" data-testid="tab-categories"><Tractor className="w-4 h-4 mr-1.5" /> Chủng loại máy</TabsTrigger>
          <TabsTrigger value="norms" data-testid="tab-norms"><Ruler className="w-4 h-4 mr-1.5" /> Định mức năng suất</TabsTrigger>
          <TabsTrigger value="thresholds" data-testid="tab-thresholds"><Sliders className="w-4 h-4 mr-1.5" /> Ngưỡng cảnh báo</TabsTrigger>
          <TabsTrigger value="sync" data-testid="tab-sync"><RefreshCw className="w-4 h-4 mr-1.5" /> Đồng bộ HTX App</TabsTrigger>
          <TabsTrigger value="logs" data-testid="tab-logs"><Activity className="w-4 h-4 mr-1.5" /> Nhật ký hệ thống</TabsTrigger>
        </TabsList>
        <TabsContent value="users"><UsersTab /></TabsContent>
        <TabsContent value="categories"><CategoriesTab /></TabsContent>
        <TabsContent value="norms"><NormsTab /></TabsContent>
        <TabsContent value="thresholds"><ThresholdsTab /></TabsContent>
        <TabsContent value="sync"><SyncTab /></TabsContent>
        <TabsContent value="logs"><LogsTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function UsersTab() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(null);

  const load = async () => {
    const { data } = await api.get("/admin/users");
    setUsers(data);
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="mt-4 space-y-4">
      <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-slate-200">
        <h3 className="font-display font-bold text-sm uppercase tracking-wide flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#00A82D]" /> Quản lý tài khoản nội bộ
        </h3>
        <button
          data-testid="user-add"
          onClick={() => setForm({ email: "", full_name: "", role: "staff", password: "" })}
          className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-[#00A82D] hover:bg-[#008E26] text-white text-sm"
        >
          <PlusCircle className="w-4 h-4" /> Thêm tài khoản
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-2.5">Email</th>
              <th className="text-left px-4 py-2.5">Họ tên</th>
              <th className="text-left px-4 py-2.5">Vai trò</th>
              <th className="text-center px-4 py-2.5">Trạng thái</th>
              <th className="text-right px-4 py-2.5">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.email} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-2.5 font-mono text-xs">{u.email}</td>
                <td className="px-4 py-2.5 font-medium">{u.full_name}</td>
                <td className="px-4 py-2.5">
                  <span className={`text-xs px-2 py-0.5 rounded ${u.role === "admin" ? "bg-[#00A3E0]/15 text-[#00A3E0]" : "bg-slate-100 text-slate-600"}`}>
                    {u.role === "admin" ? "Quản trị viên" : "Cán bộ Cục"}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-center">
                  <span className={`text-xs px-2 py-0.5 rounded text-white ${u.active ? "bg-[#00A82D]" : "bg-slate-400"}`}>
                    {u.active ? "Hoạt động" : "Khóa"}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right">
                  <button
                    onClick={async () => {
                      await api.patch(`/admin/users/${u.email}`, { active: !u.active });
                      toast.success(`Đã ${!u.active ? "mở khóa" : "khóa"} tài khoản`);
                      load();
                    }}
                    className="text-[#00A3E0] text-sm"
                  >
                    {u.active ? "Khóa" : "Mở khóa"}
                  </button>
                  <button
                    onClick={async () => {
                      const p = prompt(`Mật khẩu mới cho ${u.email}:`);
                      if (!p) return;
                      await api.patch(`/admin/users/${u.email}`, { reset_password: p });
                      toast.success("Đã cấp lại mật khẩu");
                    }}
                    className="text-[#F5A623] text-sm ml-3"
                  >
                    <KeyRound className="w-4 h-4 inline" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {form && (
        <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center p-6" onClick={() => setForm(null)}>
          <div className="bg-white rounded-lg w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display font-bold text-xl mb-4">Thêm tài khoản</h3>
            <div className="space-y-3">
              <Input label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
              <Input label="Họ tên" value={form.full_name} onChange={(v) => setForm({ ...form, full_name: v })} />
              <div>
                <div className="text-xs uppercase font-medium text-slate-700 mb-1">Vai trò</div>
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm">
                  <option value="staff">Cán bộ Cục</option>
                  <option value="admin">Quản trị viên</option>
                </select>
              </div>
              <Input label="Mật khẩu tạm" value={form.password} type="text" onChange={(v) => setForm({ ...form, password: v })} />
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setForm(null)} className="px-4 py-2 rounded-md text-sm bg-slate-100">Hủy</button>
              <button
                data-testid="user-save"
                onClick={async () => {
                  try {
                    await api.post("/admin/users", form);
                    toast.success("Đã tạo tài khoản");
                    setForm(null);
                    load();
                  } catch (e) {
                    toast.error(e?.response?.data?.detail || "Lỗi");
                  }
                }}
                className="px-4 py-2 rounded-md text-sm bg-[#00A82D] text-white font-medium"
              >Lưu</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CategoriesTab() {
  const [items, setItems] = useState([]);
  useEffect(() => { api.get("/machine-categories").then((r) => setItems(r.data)); }, []);
  const toggle = async (c) => {
    await api.patch(`/machine-categories/${c.code}`, { active: !c.active });
    toast.success("Đã cập nhật");
    api.get("/machine-categories").then((r) => setItems(r.data));
  };
  return (
    <div className="mt-4 bg-white border border-slate-200 rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
          <tr>
            <th className="text-left px-4 py-2.5">Mã</th>
            <th className="text-left px-4 py-2.5">Tên chủng loại</th>
            <th className="text-left px-4 py-2.5">Khâu sản xuất</th>
            <th className="text-center px-4 py-2.5">Trạng thái</th>
          </tr>
        </thead>
        <tbody>
          {items.map((c) => (
            <tr key={c.code} className="border-t border-slate-100">
              <td className="px-4 py-2.5 font-mono text-xs">{c.code}</td>
              <td className="px-4 py-2.5 font-medium">{c.name}</td>
              <td className="px-4 py-2.5">{c.stage}</td>
              <td className="px-4 py-2.5 text-center">
                <button onClick={() => toggle(c)} className={`text-xs px-2 py-0.5 rounded text-white ${c.active ? "bg-[#00A82D]" : "bg-slate-400"}`}>
                  {c.active ? "Hoạt động" : "Khóa"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="p-3 text-xs text-slate-500 border-t border-slate-100">
        Danh mục Khâu sản xuất, Mùa vụ, Loại chủ sở hữu được đồng bộ tự động từ API Ứng dụng HTX.
      </div>
    </div>
  );
}

function NormsTab() {
  const [items, setItems] = useState([]);
  const [cats, setCats] = useState([]);
  const [form, setForm] = useState(null);
  const load = async () => {
    const [n, c] = await Promise.all([api.get("/productivity-norms"), api.get("/machine-categories")]);
    setItems(n.data); setCats(c.data);
  };
  useEffect(() => { load(); }, []);
  const save = async () => {
    await api.post("/productivity-norms", form);
    toast.success("Đã cập nhật định mức");
    setForm(null); load();
  };
  return (
    <div className="mt-4 space-y-4">
      <div className="text-xs bg-amber-50 border-l-4 border-[#F5A623] p-3 rounded">
        <strong>Bắt buộc:</strong> Mỗi định mức phải kèm Số hiệu văn bản chính thức của Cục làm căn cứ pháp lý.
      </div>
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-2.5">Chủng loại máy</th>
              <th className="text-right px-4 py-2.5">Ha / máy / vụ</th>
              <th className="text-left px-4 py-2.5">Số hiệu văn bản</th>
              <th className="text-right px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((n) => (
              <tr key={n.category_code} className="border-t border-slate-100" data-testid={`norm-${n.category_code}`}>
                <td className="px-4 py-2.5 font-medium">{cats.find((c) => c.code === n.category_code)?.name || n.category_code}</td>
                <td className="px-4 py-2.5 text-right">{n.ha_per_machine_per_season}</td>
                <td className="px-4 py-2.5 text-slate-600 text-xs">{n.document_ref}</td>
                <td className="px-4 py-2.5 text-right">
                  <button onClick={() => setForm({ ...n })} className="text-[#00A3E0] text-sm">Chỉnh sửa</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {form && (
        <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center p-6" onClick={() => setForm(null)}>
          <div className="bg-white rounded-lg w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display font-bold text-xl mb-4">Cập nhật định mức</h3>
            <div className="space-y-3">
              <Input label="Ha/máy/vụ" type="number" value={form.ha_per_machine_per_season} onChange={(v) => setForm({ ...form, ha_per_machine_per_season: parseFloat(v) })} />
              <Input label="Số hiệu văn bản Cục" value={form.document_ref} onChange={(v) => setForm({ ...form, document_ref: v })} />
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setForm(null)} className="px-4 py-2 rounded-md text-sm bg-slate-100">Hủy</button>
              <button onClick={save} data-testid="norm-save" className="px-4 py-2 rounded-md text-sm bg-[#00A82D] text-white font-medium">Lưu</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ThresholdsTab() {
  const [t, setT] = useState({ sufficient_min: 0.95, slight_min: 0.7 });
  useEffect(() => { api.get("/admin/thresholds").then((r) => setT(r.data)); }, []);
  const save = async () => {
    await api.patch("/admin/thresholds", t);
    toast.success("Đã lưu ngưỡng cảnh báo");
  };
  return (
    <div className="mt-4 max-w-lg bg-white border border-slate-200 rounded-lg p-5 space-y-4">
      <h3 className="font-display font-bold text-sm uppercase tracking-wide flex items-center gap-2">
        <Sliders className="w-4 h-4 text-[#00A3E0]" /> Ngưỡng cảnh báo Thừa/Thiếu
      </h3>
      <Input label="Ngưỡng ĐỦ (tỷ lệ ≥)" type="number" value={t.sufficient_min} onChange={(v) => setT({ ...t, sufficient_min: parseFloat(v) })} />
      <Input label="Ngưỡng Thiếu nhẹ (tỷ lệ ≥)" type="number" value={t.slight_min} onChange={(v) => setT({ ...t, slight_min: parseFloat(v) })} />
      <p className="text-xs text-slate-500">Tỷ lệ dưới Ngưỡng Thiếu nhẹ sẽ được đánh dấu Thiếu nghiêm trọng (màu đỏ).</p>
      <button onClick={save} data-testid="threshold-save" className="px-4 py-2 rounded-md text-sm bg-[#00A82D] text-white font-medium">Lưu thay đổi</button>
    </div>
  );
}

function SyncTab() {
  const [logs, setLogs] = useState([]);
  const load = () => api.get("/admin/sync-logs").then((r) => setLogs(r.data));
  useEffect(() => { load(); }, []);
  const trigger = async () => {
    await api.post("/admin/sync-logs/trigger");
    toast.success("Đã kích hoạt đồng bộ (Mock)");
    load();
  };
  return (
    <div className="mt-4 space-y-4">
      <div className="bg-white border border-slate-200 rounded-lg p-4 flex items-center gap-3">
        <RefreshCw className="w-4 h-4 text-[#00A3E0]" />
        <div className="flex-1">
          <div className="font-display font-bold text-sm">Đồng bộ dữ liệu Ứng dụng HTX (Mock)</div>
          <div className="text-xs text-slate-500">Đồng bộ tự động theo lịch. Có thể kích hoạt thủ công phục vụ kiểm thử.</div>
        </div>
        <button onClick={trigger} data-testid="trigger-sync" className="px-4 py-2 rounded-md bg-[#00A3E0] text-white text-sm">Kích hoạt</button>
      </div>
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-2.5">Thời gian</th>
              <th className="text-left px-4 py-2.5">Nguồn</th>
              <th className="text-right px-4 py-2.5">Bản ghi</th>
              <th className="text-left px-4 py-2.5">Trạng thái</th>
              <th className="text-left px-4 py-2.5">Ghi chú</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id} className="border-t border-slate-100">
                <td className="px-4 py-2.5 text-xs">{new Date(l.started_at).toLocaleString("vi-VN")}</td>
                <td className="px-4 py-2.5">{l.source}</td>
                <td className="px-4 py-2.5 text-right">{l.records_processed}</td>
                <td className="px-4 py-2.5">
                  <span className={`text-xs px-2 py-0.5 rounded text-white ${l.status === "success" ? "bg-[#00A82D]" : "bg-[#E74C3C]"}`}>
                    {l.status === "success" ? "Thành công" : "Lỗi"}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-slate-600 text-xs">{l.message}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LogsTab() {
  const [logs, setLogs] = useState([]);
  useEffect(() => { api.get("/admin/system-logs").then((r) => setLogs(r.data)); }, []);
  return (
    <div className="mt-4 bg-white border border-slate-200 rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
          <tr>
            <th className="text-left px-4 py-2.5">Thời gian</th>
            <th className="text-left px-4 py-2.5">Người thực hiện</th>
            <th className="text-left px-4 py-2.5">Hành động</th>
            <th className="text-left px-4 py-2.5">Chi tiết</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((l) => (
            <tr key={l.id} className="border-t border-slate-100">
              <td className="px-4 py-2.5 text-xs">{new Date(l.ts).toLocaleString("vi-VN")}</td>
              <td className="px-4 py-2.5 font-mono text-xs">{l.actor_email}</td>
              <td className="px-4 py-2.5"><span className="text-xs px-2 py-0.5 rounded bg-[#00A3E0]/15 text-[#00A3E0]">{l.action}</span></td>
              <td className="px-4 py-2.5 text-slate-600 text-xs">{l.detail}</td>
            </tr>
          ))}
          {!logs.length && <tr><td colSpan={4} className="text-center py-8 text-slate-500">Chưa có nhật ký</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function Input({ label, value, onChange, type = "text" }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-slate-700 uppercase tracking-wide">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#00C4B4]" />
    </label>
  );
}
