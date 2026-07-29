import { useEffect, useState } from "react";
import { api, API } from "../lib/api";
import {
  FileSpreadsheet, FileText, BarChart3, Layers, AlertTriangle, Download,
  Filter, Calendar, MapPin, Tractor,
} from "lucide-react";
import { toast, Toaster } from "sonner";

const REPORTS = [
  {
    kind: "summary_by_region",
    icon: Layers,
    color: "#00A3E0",
    title: "Báo cáo Tổng hợp theo Khu vực",
    desc: "Số HTX, số máy và diện tích cơ giới hóa theo từng tỉnh.",
    uses: ["province", "category"],
  },
  {
    kind: "supply_demand",
    icon: BarChart3,
    color: "#00A82D",
    title: "Báo cáo Cân đối Cung – Cầu",
    desc: "Bảng chi tiết nhu cầu và cung ứng máy móc theo khâu sản xuất.",
    uses: ["season", "province", "category"],
  },
  {
    kind: "htx_shortage",
    icon: AlertTriangle,
    color: "#E74C3C",
    title: "Báo cáo HTX Thừa/Thiếu",
    desc: "Danh sách các HTX đang thiếu máy cần ưu tiên can thiệp.",
    uses: ["season", "province", "category"],
  },
];

export default function Reports() {
  const [preview, setPreview] = useState([]);
  const [loading, setLoading] = useState(true);
  const [provinces, setProvinces] = useState([]);
  const [seasons, setSeasons] = useState([]);
  const [cats, setCats] = useState([]);
  const [filters, setFilters] = useState({ season: "DX", province: "ALL", category: "ALL" });

  useEffect(() => {
    Promise.all([
      api.get("/provinces"),
      api.get("/seasons"),
      api.get("/machine-categories"),
    ]).then(([p, s, c]) => {
      setProvinces(p.data); setSeasons(s.data); setCats(c.data);
    });
  }, []);

  useEffect(() => {
    setLoading(true);
    api.get("/reports/summary-by-region").then((r) => {
      setPreview(r.data); setLoading(false);
    });
  }, []);

  const buildQS = (kind) => {
    const rep = REPORTS.find((x) => x.kind === kind);
    const params = new URLSearchParams({ kind, fmt: "xlsx" });
    if (rep.uses.includes("season") && filters.season) params.set("season", filters.season);
    if (rep.uses.includes("province") && filters.province) params.set("province", filters.province);
    if (rep.uses.includes("category") && filters.category) params.set("category", filters.category);
    return params;
  };

  const download = async (kind, fmt) => {
    try {
      const token = localStorage.getItem("mkg_token");
      const params = buildQS(kind);
      params.set("fmt", fmt);
      const resp = await fetch(`${API}/reports/export?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) throw new Error("Xuất báo cáo thất bại");
      const blob = await resp.blob();
      const url = window.URL.createObjectURL(blob);
      const suffix = [filters.season, filters.province, filters.category]
        .filter((x) => x && x !== "ALL").join("-");
      const a = document.createElement("a");
      a.href = url;
      a.download = suffix ? `${kind}-${suffix}.${fmt}` : `${kind}.${fmt}`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success(`Đã tải ${fmt.toUpperCase()}`);
    } catch (e) {
      toast.error(e.message || "Lỗi tải xuống");
    }
  };

  const currentFilterLabel = () => {
    const parts = [];
    if (filters.season && filters.season !== "ALL") {
      parts.push(seasons.find((s) => s.code === filters.season)?.name || filters.season);
    }
    if (filters.province !== "ALL") {
      parts.push(provinces.find((p) => p.code === filters.province)?.name || filters.province);
    }
    if (filters.category !== "ALL") {
      parts.push(cats.find((c) => c.code === filters.category)?.name || filters.category);
    }
    return parts.length ? parts.join(" · ") : "Toàn bộ dữ liệu";
  };

  return (
    <div className="p-6 lg:p-8 space-y-6" data-testid="reports-page">
      <Toaster position="top-right" richColors />
      <div>
        <h1 className="font-display font-bold text-3xl text-slate-900">Báo cáo & Kết xuất Dữ liệu</h1>
        <p className="text-sm text-slate-500 mt-1">Trung tâm xuất báo cáo phục vụ công tác chỉ đạo & chính sách</p>
      </div>

      {/* Filter panel */}
      <div className="bg-white border border-slate-200 rounded-lg p-4" data-testid="reports-filter">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-[#00A3E0]" />
          <h3 className="font-display font-bold text-sm uppercase tracking-wide">Bộ lọc áp dụng cho tệp xuất</h3>
          <span className="ml-auto text-xs px-3 py-1 rounded-full bg-[#00A82D]/10 text-[#00A82D] font-medium">
            {currentFilterLabel()}
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-slate-500 mb-1">
              <Calendar className="w-3 h-3" /> Mùa vụ
            </div>
            <div className="grid grid-cols-3 gap-1 border border-slate-200 rounded-md p-1" data-testid="report-season-switcher">
              {seasons.map((s) => (
                <button
                  key={s.code}
                  data-testid={`report-season-${s.code}`}
                  onClick={() => setFilters({ ...filters, season: s.code })}
                  className={`text-xs font-medium py-1.5 rounded transition-colors ${
                    filters.season === s.code ? "bg-[#00A82D] text-white" : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-slate-500 mb-1">
              <MapPin className="w-3 h-3" /> Tỉnh
            </div>
            <select
              data-testid="report-province"
              value={filters.province}
              onChange={(e) => setFilters({ ...filters, province: e.target.value })}
              className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#00C4B4]"
            >
              <option value="ALL">Toàn vùng</option>
              {provinces.map((p) => <option key={p.code} value={p.code}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-slate-500 mb-1">
              <Tractor className="w-3 h-3" /> Chủng loại máy
            </div>
            <select
              data-testid="report-category"
              value={filters.category}
              onChange={(e) => setFilters({ ...filters, category: e.target.value })}
              className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#00C4B4]"
            >
              <option value="ALL">Tất cả chủng loại</option>
              {cats.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {REPORTS.map((r) => (
          <div key={r.kind} className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col" data-testid={`report-card-${r.kind}`}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-md flex items-center justify-center" style={{ background: `${r.color}15`, color: r.color }}>
                <r.icon className="w-5 h-5" />
              </div>
              <h3 className="font-display font-bold text-base">{r.title}</h3>
            </div>
            <p className="text-sm text-slate-600 mb-3 flex-1">{r.desc}</p>
            <div className="text-[11px] text-slate-500 mb-3 border-t border-slate-100 pt-2">
              <span className="font-semibold text-slate-600 uppercase tracking-wider">Áp dụng: </span>
              {r.uses.map((u) => u === "season" ? "Mùa vụ" : u === "province" ? "Tỉnh" : "Chủng loại").join(" · ")}
            </div>
            <div className="flex gap-2">
              <button
                data-testid={`export-xlsx-${r.kind}`}
                onClick={() => download(r.kind, "xlsx")}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md bg-[#00A82D] hover:bg-[#008E26] text-white text-sm font-medium"
              >
                <FileSpreadsheet className="w-4 h-4" /> Excel
              </button>
              <button
                data-testid={`export-pdf-${r.kind}`}
                onClick={() => download(r.kind, "pdf")}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md bg-[#00A3E0] hover:bg-[#0089BE] text-white text-sm font-medium"
              >
                <FileText className="w-4 h-4" /> PDF
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden" data-testid="report-preview">
        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
          <Download className="w-4 h-4 text-[#00A82D]" />
          <h3 className="font-display font-bold text-base">Xem trước · Tổng hợp theo Khu vực</h3>
          {loading && <span className="ml-auto text-xs text-slate-500">Đang tải…</span>}
        </div>
        <table className="w-full text-sm">
          <thead className="text-slate-500 text-xs uppercase bg-slate-50">
            <tr>
              <th className="text-left px-4 py-2.5">Tỉnh</th>
              <th className="text-right px-4 py-2.5">Số HTX</th>
              <th className="text-right px-4 py-2.5">Tổng máy</th>
              <th className="text-right px-4 py-2.5">Máy hoạt động</th>
              <th className="text-right px-4 py-2.5">Diện tích (ha)</th>
            </tr>
          </thead>
          <tbody>
            {preview.map((r, i) => (
              <tr key={i} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-2.5 font-medium">{r.province}</td>
                <td className="px-4 py-2.5 text-right">{r.htx_count}</td>
                <td className="px-4 py-2.5 text-right">{r.machine_count.toLocaleString("vi-VN")}</td>
                <td className="px-4 py-2.5 text-right">{r.active_count.toLocaleString("vi-VN")}</td>
                <td className="px-4 py-2.5 text-right">{r.area_ha.toLocaleString("vi-VN")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
