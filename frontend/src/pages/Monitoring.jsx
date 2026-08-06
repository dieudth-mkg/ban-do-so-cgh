import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import { AlertTriangle, BarChart3, ClipboardList, X } from "lucide-react";
import { Toaster } from "sonner";
import { Row } from "../components/adminUi";

/* ============================================================
   FN-12 — GIÁM SÁT VÀ VẬN HÀNH
   Màn hình riêng, độc lập với FN-01 (Danh mục & Cấu hình).
   B2 lọc (thời gian/loại sự kiện/tài khoản) → B3 chi tiết dòng →
   B4 tab Lỗi đồng bộ → B5 thống kê hoạt động
   ============================================================ */
export default function Monitoring() {
  return (
    <div className="p-6 lg:p-8 space-y-6" data-testid="monitoring-page">
      <Toaster position="top-right" richColors />
      <div>
        <h1 className="font-display font-bold text-3xl text-slate-900">Giám sát & Vận hành</h1>
        <p className="text-sm text-slate-500 mt-1">
          Nhật ký hoạt động, lỗi đồng bộ App HTX, thống kê hoạt động. Chỉ Admin xem (BR-03).
        </p>
      </div>

      <Tabs defaultValue="activity">
        <TabsList>
          <TabsTrigger value="activity" data-testid="tab-activity"><ClipboardList className="w-4 h-4 mr-1.5" /> Nhật ký hoạt động</TabsTrigger>
          <TabsTrigger value="sync-errors" data-testid="tab-sync-errors"><AlertTriangle className="w-4 h-4 mr-1.5" /> Lỗi đồng bộ</TabsTrigger>
          <TabsTrigger value="stats" data-testid="tab-stats"><BarChart3 className="w-4 h-4 mr-1.5" /> Thống kê hoạt động</TabsTrigger>
        </TabsList>
        <TabsContent value="activity"><ActivityLogTab /></TabsContent>
        <TabsContent value="sync-errors"><SyncErrorsTab /></TabsContent>
        <TabsContent value="stats"><StatsTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function ActivityLogTab() {
  const [logs, setLogs] = useState([]);
  const [meta, setMeta] = useState({ actions: [], actors: [] });
  const [filters, setFilters] = useState({ date_from: "", date_to: "", action: "", actor_email: "" });
  const [detail, setDetail] = useState(null);

  const load = async () => {
    const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
    const [l, m] = await Promise.all([
      api.get("/admin/system-logs", { params }),
      api.get("/admin/system-logs/meta"),
    ]);
    setLogs(l.data); setMeta(m.data);
  };
  useEffect(() => { load(); }, []); // eslint-disable-line

  return (
    <div className="mt-4 space-y-3">
      <div className="bg-white border border-slate-200 rounded-lg p-3 flex flex-wrap items-end gap-3" data-testid="log-filters">
        <div>
          <div className="text-[11px] uppercase text-slate-500 mb-1">Từ ngày</div>
          <input type="date" value={filters.date_from} onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
            className="border border-slate-300 rounded-md px-2 py-1.5 text-sm" />
        </div>
        <div>
          <div className="text-[11px] uppercase text-slate-500 mb-1">Đến ngày</div>
          <input type="date" value={filters.date_to} onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
            className="border border-slate-300 rounded-md px-2 py-1.5 text-sm" />
        </div>
        <div>
          <div className="text-[11px] uppercase text-slate-500 mb-1">Loại sự kiện</div>
          <select value={filters.action} onChange={(e) => setFilters({ ...filters, action: e.target.value })}
            className="border border-slate-300 rounded-md px-2 py-1.5 text-sm min-w-[160px]">
            <option value="">Tất cả</option>
            {meta.actions.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div>
          <div className="text-[11px] uppercase text-slate-500 mb-1">Tài khoản</div>
          <select value={filters.actor_email} onChange={(e) => setFilters({ ...filters, actor_email: e.target.value })}
            className="border border-slate-300 rounded-md px-2 py-1.5 text-sm min-w-[160px]">
            <option value="">Tất cả</option>
            {meta.actors.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <button onClick={load} data-testid="log-filter-apply" className="px-3 py-1.5 rounded-md bg-[#00A3E0] text-white text-sm">Lọc</button>
        <button
          onClick={() => { setFilters({ date_from: "", date_to: "", action: "", actor_email: "" }); setTimeout(load, 0); }}
          className="px-3 py-1.5 rounded-md bg-slate-100 text-sm">Xóa lọc</button>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-2.5">Thời gian</th>
              <th className="text-left px-4 py-2.5">Người thực hiện</th>
              <th className="text-left px-4 py-2.5">Loại sự kiện</th>
              <th className="text-left px-4 py-2.5">Chi tiết</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id} onClick={() => setDetail(l)} className="border-t border-slate-100 hover:bg-slate-50 cursor-pointer" data-testid="log-row">
                <td className="px-4 py-2.5 text-xs">{new Date(l.ts).toLocaleString("vi-VN")}</td>
                <td className="px-4 py-2.5 font-mono text-xs">{l.actor_email}</td>
                <td className="px-4 py-2.5"><span className="text-xs px-2 py-0.5 rounded bg-[#00A3E0]/15 text-[#00A3E0]">{l.action}</span></td>
                <td className="px-4 py-2.5 text-slate-600 text-xs truncate max-w-[360px]">{l.detail}</td>
              </tr>
            ))}
            {!logs.length && <tr><td colSpan={4} className="text-center py-8 text-slate-500">Không có sự kiện theo bộ lọc</td></tr>}
          </tbody>
        </table>
      </div>

      {detail && (
        <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center p-6" onClick={() => setDetail(null)}>
          <div className="bg-white rounded-lg w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()} data-testid="log-detail">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-xl">Chi tiết sự kiện</h3>
              <button onClick={() => setDetail(null)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <dl className="space-y-2 text-sm">
              <Row k="Thời điểm" v={new Date(detail.ts).toLocaleString("vi-VN")} />
              <Row k="Người thực hiện" v={detail.actor_email} />
              <Row k="Hành động" v={detail.action} />
              <Row k="Chi tiết" v={detail.detail || "—"} />
            </dl>
          </div>
        </div>
      )}
    </div>
  );
}

function SyncErrorsTab() {
  const [items, setItems] = useState([]);
  useEffect(() => { api.get("/admin/sync-errors").then((r) => setItems(r.data)); }, []);
  return (
    <div className="mt-4 space-y-3">
      <p className="text-xs text-slate-500">Các lần đồng bộ App HTX bị lỗi được ghi log và cảnh báo Admin.</p>
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-2.5">Thời gian</th>
              <th className="text-left px-4 py-2.5">Nguồn</th>
              <th className="text-left px-4 py-2.5">Thông báo lỗi</th>
            </tr>
          </thead>
          <tbody>
            {items.map((l) => (
              <tr key={l.id} className="border-t border-slate-100">
                <td className="px-4 py-2.5 text-xs">{new Date(l.started_at).toLocaleString("vi-VN")}</td>
                <td className="px-4 py-2.5 font-mono text-xs">{l.source}</td>
                <td className="px-4 py-2.5 text-[#E74C3C] text-xs">{l.message}</td>
              </tr>
            ))}
            {!items.length && <tr><td colSpan={3} className="text-center py-8 text-slate-500">Không có lần đồng bộ nào bị lỗi</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatsTab() {
  const [stats, setStats] = useState({ by_day: [], by_actor: [], total: 0 });
  useEffect(() => { api.get("/admin/system-logs/stats").then((r) => setStats(r.data)); }, []);
  const maxDay = useMemo(() => Math.max(1, ...stats.by_day.map((d) => d.count)), [stats]);
  const maxActor = useMemo(() => Math.max(1, ...stats.by_actor.map((d) => d.count)), [stats]);
  return (
    <div className="mt-4 grid md:grid-cols-2 gap-4">
      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <h3 className="font-display font-bold text-sm uppercase tracking-wide mb-3">Hoạt động theo thời gian ({stats.total} sự kiện)</h3>
        <div className="space-y-1.5 max-h-80 overflow-y-auto">
          {stats.by_day.map((d) => (
            <div key={d.date} className="flex items-center gap-2 text-xs">
              <span className="w-24 text-slate-500">{d.date}</span>
              <div className="flex-1 bg-slate-100 rounded h-3">
                <div className="bg-[#00A3E0] h-3 rounded" style={{ width: `${(d.count / maxDay) * 100}%` }} />
              </div>
              <span className="w-8 text-right font-medium">{d.count}</span>
            </div>
          ))}
          {!stats.by_day.length && <div className="text-slate-500 text-sm">Chưa có dữ liệu</div>}
        </div>
      </div>
      <div className="bg-white border border-slate-200 rounded-lg p-4">
        <h3 className="font-display font-bold text-sm uppercase tracking-wide mb-3">Hoạt động theo tài khoản</h3>
        <div className="space-y-1.5 max-h-80 overflow-y-auto">
          {stats.by_actor.map((d) => (
            <div key={d.actor_email} className="flex items-center gap-2 text-xs">
              <span className="w-32 truncate font-mono text-slate-600" title={d.actor_email}>{d.actor_email}</span>
              <div className="flex-1 bg-slate-100 rounded h-3">
                <div className="bg-[#00A82D] h-3 rounded" style={{ width: `${(d.count / maxActor) * 100}%` }} />
              </div>
              <span className="w-8 text-right font-medium">{d.count}</span>
            </div>
          ))}
          {!stats.by_actor.length && <div className="text-slate-500 text-sm">Chưa có dữ liệu</div>}
        </div>
      </div>
    </div>
  );
}