import { useEffect, useState } from "react";
import { api } from "../lib/api";
import {
  Users, ShieldCheck, Sliders, RefreshCw, PlusCircle, KeyRound,
} from "lucide-react";
import { toast, Toaster } from "sonner";
import { Input } from "../components/adminUi";

/* ============================================================
   FN-11 — TÀI KHOẢN VÀ PHÂN QUYỀN.
   FN-06 được hiển thị tại route /app-integration.
   ============================================================ */
export default function Admin() {
  return (
    <div className="p-6 lg:p-8 space-y-6" data-testid="admin-page">
      <Toaster position="top-right" richColors />
      <div>
        <h1 className="font-display font-bold text-3xl text-slate-900">Quản lý tài khoản & Phân quyền</h1>
        <p className="text-sm text-slate-500 mt-1">Chỉ dành cho Quản trị viên</p>
      </div>
      <div className="text-xs text-slate-500">Tài khoản & phân quyền — chỉ Admin CRUD</div>
      <UsersTab />
    </div>
  );
}

/* ============================================================
   FN-11 — TÀI KHOẢN
   ============================================================ */
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

/* ============================================================
   FN-06 — TÍCH HỢP APP HTX
   ============================================================ */
export function SyncTab() {
  const [logs, setLogs] = useState([]);
  const [settings, setSettings] = useState({ htx_sync_url: "", default_htx_sync_url: "" });
  const [urlDraft, setUrlDraft] = useState("");
  const load = () => Promise.all([
    api.get("/admin/sync-logs"),
    api.get("/admin/settings"),
  ]).then(([l, s]) => {
    setLogs(l.data);
    setSettings(s.data);
    setUrlDraft(s.data.htx_sync_url || "");
  });
  useEffect(() => { load(); }, []);
  const trigger = async () => {
    toast.info("Đang gọi API Ứng dụng HTX…");
    const { data } = await api.post("/admin/sync-logs/trigger");
    if (data.status === "success") {
      toast.success(`Đồng bộ thành công · Cập nhật ${data.updated_count}/${data.records_processed} máy (${data.latency_ms}ms)`);
    } else {
      toast.error(`Đồng bộ lỗi: ${data.message}`);
    }
    load();
  };
  const saveUrl = async () => {
    await api.patch("/admin/settings", { htx_sync_url: urlDraft.trim() });
    toast.success("Đã cập nhật cấu hình URL đồng bộ");
    load();
  };
  return (
    <div className="mt-4 space-y-4">
      <div className="bg-white border border-slate-200 rounded-lg p-4" data-testid="sync-config">
        <div className="flex items-center gap-2 mb-3">
          <Sliders className="w-4 h-4 text-[#00A3E0]" />
          <div className="font-display font-bold text-sm uppercase tracking-wide">Cấu hình API Ứng dụng HTX</div>
        </div>
        <div className="text-xs text-slate-600 mb-2">
          URL endpoint đồng bộ (để trống → dùng mặc định: <code className="text-[11px] bg-slate-100 px-1 rounded font-mono">{settings.default_htx_sync_url}</code>)
        </div>
        <div className="flex gap-2">
          <input
            data-testid="sync-url-input"
            type="text"
            value={urlDraft}
            onChange={(e) => setUrlDraft(e.target.value)}
            placeholder="https://api.htx-app.vn/machine-updates"
            className="flex-1 px-3 py-2 border border-slate-300 rounded-md text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#00C4B4]"
          />
          <button onClick={saveUrl} data-testid="sync-url-save" className="px-4 py-2 rounded-md text-sm bg-[#00A3E0] text-white font-medium">
            Lưu URL
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-4 flex items-center gap-3">
        <RefreshCw className="w-4 h-4 text-[#00A3E0]" />
        <div className="flex-1">
          <div className="font-display font-bold text-sm">Đồng bộ dữ liệu Ứng dụng HTX</div>
          <div className="text-xs text-slate-500">Gọi HTTP thực đến endpoint đã cấu hình. Cập nhật tình trạng máy trực tiếp vào DB.</div>
        </div>
        <button onClick={trigger} data-testid="trigger-sync" className="px-4 py-2 rounded-md bg-[#00A3E0] text-white text-sm">Kích hoạt đồng bộ</button>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-2.5">Thời gian</th>
              <th className="text-left px-4 py-2.5">Nguồn URL</th>
              <th className="text-right px-4 py-2.5">Cập nhật</th>
              <th className="text-right px-4 py-2.5">Không khớp</th>
              <th className="text-right px-4 py-2.5">Độ trễ</th>
              <th className="text-left px-4 py-2.5">Trạng thái</th>
              <th className="text-left px-4 py-2.5">Ghi chú</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id} className="border-t border-slate-100">
                <td className="px-4 py-2.5 text-xs">{new Date(l.started_at).toLocaleString("vi-VN")}</td>
                <td className="px-4 py-2.5 font-mono text-[10px] text-slate-500 truncate max-w-[200px]" title={l.source_url || l.source}>
                  {l.source_url ? (() => { try { const u = new URL(l.source_url); return u.host + u.pathname; } catch { return l.source_url; } })() : l.source}
                </td>
                <td className="px-4 py-2.5 text-right font-medium text-[#00A82D]">{l.updated_count ?? "—"}</td>
                <td className="px-4 py-2.5 text-right text-slate-500">{l.notfound_count ?? "—"}</td>
                <td className="px-4 py-2.5 text-right text-slate-500">{l.latency_ms ? `${l.latency_ms}ms` : "—"}</td>
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
