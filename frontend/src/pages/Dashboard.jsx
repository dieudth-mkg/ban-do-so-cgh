import { useEffect, useState } from "react";
import { api } from "../lib/api";
import {
  Tractor, Home, CheckCircle2, AlertTriangle, TrendingUp, MapPin, AlertOctagon,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from "recharts";

const COLORS = ["#00A82D", "#00A3E0", "#00C4B4", "#F5A623", "#E74C3C", "#7C3AED"];

export default function Dashboard() {
  const [kpi, setKpi] = useState(null);
  const [charts, setCharts] = useState(null);
  const [priority, setPriority] = useState([]);

  useEffect(() => {
    (async () => {
      const [k, c, p] = await Promise.all([
        api.get("/dashboard/kpi"),
        api.get("/dashboard/charts"),
        api.get("/dashboard/priority-list"),
      ]);
      setKpi(k.data);
      setCharts(c.data);
      setPriority(p.data);
    })();
  }, []);

  if (!kpi || !charts) {
    return <div className="p-8 text-slate-500">Đang tải dữ liệu tổng quan…</div>;
  }

  return (
    <div className="p-6 lg:p-8 space-y-6" data-testid="dashboard-page">
      <div>
        <h1 className="font-display font-bold text-3xl text-slate-900">Tổng quan Cơ giới hóa ĐBSCL</h1>
        <p className="text-sm text-slate-500 mt-1">
          Dữ liệu tổng hợp toàn vùng · Cập nhật thời gian thực từ hệ thống & Ứng dụng HTX
        </p>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          testid="kpi-total-htx"
          icon={Home} accent="#00A3E0"
          label="Tổng số HTX đang hoạt động"
          value={kpi.total_htx.toLocaleString("vi-VN")}
          hint="6 tỉnh ĐBSCL"
        />
        <KpiCard
          testid="kpi-total-machines"
          icon={Tractor} accent="#00A82D"
          label="Tổng số máy nông nghiệp"
          value={kpi.total_machines.toLocaleString("vi-VN")}
          hint={`${kpi.active_machines.toLocaleString("vi-VN")} đang hoạt động`}
        />
        <KpiCard
          testid="kpi-area"
          icon={CheckCircle2} accent="#00C4B4"
          label="Diện tích canh tác (ha)"
          value={kpi.total_area_ha.toLocaleString("vi-VN")}
          hint="Được cơ giới hóa"
        />
        <KpiCard
          testid="kpi-alert"
          icon={AlertTriangle} accent="#E74C3C"
          label="HTX thiếu máy nghiêm trọng"
          value={kpi.shortage_severe_htx}
          hint={`Thiếu nhẹ: ${kpi.shortage_slight_htx} · Đủ: ${kpi.sufficient_htx}`}
        />
      </div>

      {/* CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Cơ cấu chủng loại máy" icon={Tractor}>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={charts.by_category} dataKey="value" nameKey="name"
                cx="50%" cy="50%" innerRadius={55} outerRadius={95} paddingAngle={2}
              >
                {charts.by_category.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Phân bố máy theo tỉnh" icon={MapPin}>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={charts.by_province}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="province" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="machines" fill="#00A82D" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Mật độ HP / ha theo tỉnh" icon={TrendingUp}>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={charts.hp_density}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="province" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line
                type="monotone" dataKey="hp_per_ha" stroke="#00A3E0"
                strokeWidth={3} dot={{ r: 5, fill: "#00A3E0" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Tình trạng máy" icon={CheckCircle2}>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={charts.status_distribution} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
              <Tooltip />
              <Bar dataKey="value" fill="#00C4B4" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Priority list */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden" data-testid="priority-list">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-2 bg-red-50">
          <AlertOctagon className="w-4 h-4 text-[#E74C3C]" />
          <h3 className="font-display font-bold text-base">Danh sách HTX ưu tiên can thiệp</h3>
          <span className="ml-auto text-xs text-slate-500">{priority.length} HTX</span>
        </div>
        <table className="w-full text-sm">
          <thead className="text-slate-500 bg-slate-50 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-2.5">Mã HTX</th>
              <th className="text-left px-4 py-2.5">Tên HTX</th>
              <th className="text-left px-4 py-2.5">Chủ sở hữu</th>
              <th className="text-right px-4 py-2.5">Diện tích (ha)</th>
              <th className="text-right px-4 py-2.5">Số máy</th>
              <th className="text-right px-4 py-2.5">Tỷ lệ đáp ứng</th>
            </tr>
          </thead>
          <tbody>
            {priority.map((h) => (
              <tr key={h.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-2.5 font-mono text-xs">{h.code}</td>
                <td className="px-4 py-2.5 font-medium">{h.name}</td>
                <td className="px-4 py-2.5 text-slate-600">{h.owner_name}</td>
                <td className="px-4 py-2.5 text-right">{h.cultivated_area_ha.toLocaleString("vi-VN")}</td>
                <td className="px-4 py-2.5 text-right">{h.machine_count}</td>
                <td className="px-4 py-2.5 text-right">
                  <span className="inline-block px-2 py-0.5 rounded text-white text-xs font-medium bg-[#E74C3C]">
                    {h.coverage_ratio == null ? "—" : `${(h.coverage_ratio * 100).toFixed(0)}%`}
                  </span>
                </td>
              </tr>
            ))}
            {!priority.length && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                Không có HTX nào cần ưu tiên can thiệp.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, hint, accent, testid }) {
  return (
    <div
      className="bg-white border border-slate-200 rounded-lg p-5 relative overflow-hidden"
      data-testid={testid}
    >
      <div className="absolute left-0 top-0 bottom-0 w-1" style={{ background: accent }} />
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-slate-500">{label}</div>
          <div className="font-display font-bold text-3xl mt-1 text-slate-900">{value}</div>
          <div className="text-xs text-slate-500 mt-1">{hint}</div>
        </div>
        <div
          className="w-10 h-10 rounded-md flex items-center justify-center"
          style={{ background: `${accent}15`, color: accent }}
        >
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}

function ChartCard({ title, icon: Icon, children }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-[#00A82D]" />
        <h3 className="font-display font-bold text-sm uppercase tracking-wide">{title}</h3>
      </div>
      {children}
    </div>
  );
}
