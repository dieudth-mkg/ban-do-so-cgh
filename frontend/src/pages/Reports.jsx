import { useEffect, useState, useCallback } from "react";
import { api, API } from "../lib/api";
import {
  FileSpreadsheet, FileText, BarChart3, Layers, AlertTriangle, Download,
  Filter, Calendar, MapPin, Tractor, Eye, X, Loader2, ChevronRight, ArrowLeft,
} from "lucide-react";
import { toast, Toaster } from "sonner";

const REPORTS = [
  {
    kind: "summary_by_region",
    icon: Layers, color: "#00A3E0",
    title: "Báo cáo Tổng hợp theo Khu vực",
    desc: "Tổng hợp theo tỉnh, kèm chi tiết từng HTX, chủng loại máy và số lượng.",
    uses: ["province", "category"],
  },
  {
    kind: "supply_demand",
    icon: BarChart3, color: "#00A82D",
    title: "Báo cáo Cân đối Cung – Cầu",
    desc: "Bảng chi tiết nhu cầu và cung ứng máy móc theo khâu sản xuất.",
    uses: ["season", "province", "category"],
  },
  {
    kind: "htx_shortage",
    icon: AlertTriangle, color: "#E74C3C",
    title: "Báo cáo HTX Thừa/Thiếu",
    desc: "Danh sách HTX đang thiếu máy cần ưu tiên can thiệp.",
    uses: ["season", "province", "category"],
  },
];

function RegionSummaryView({ data }) {
  const [selectedProvince, setSelectedProvince] = useState(null);
  if (!data) return null;

  const provinces = data.rows.filter((row) => row[0] === "Tổng hợp tỉnh");
  const details = data.rows.filter((row) => row[0] === "Chi tiết HTX");
  const province = provinces.find((row) => row[1] === selectedProvince);

  if (!province) {
    return (
      <div className="p-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {provinces.map((row) => (
          <button
            key={row[1]}
            type="button"
            onClick={() => setSelectedProvince(row[1])}
            className="text-left rounded-xl border border-slate-200 bg-white p-5 hover:border-[#00A3E0] hover:shadow-md transition-all"
            data-testid={`region-report-${row[1]}`}
          >
            <div className="flex items-center gap-2">
              <span className="font-display font-bold text-lg text-slate-800 flex-1">{row[1]}</span>
              <ChevronRight className="w-5 h-5 text-[#00A3E0]" />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div><div className="text-xs text-slate-500">HTX</div><strong>{Number(row[4]).toLocaleString("vi-VN")}</strong></div>
              <div><div className="text-xs text-slate-500">Tổng máy</div><strong>{Number(row[5]).toLocaleString("vi-VN")}</strong></div>
              <div><div className="text-xs text-slate-500">Máy hoạt động</div><strong>{Number(row[6]).toLocaleString("vi-VN")}</strong></div>
              <div><div className="text-xs text-slate-500">Diện tích</div><strong>{Number(row[7]).toLocaleString("vi-VN")} ha</strong></div>
            </div>
            <div className="mt-4 text-xs font-medium text-[#00A3E0]">Xem chi tiết HTX và máy móc</div>
          </button>
        ))}
        {!provinces.length && <div className="col-span-full text-center py-8 text-slate-500">Không có dữ liệu phù hợp bộ lọc.</div>}
      </div>
    );
  }

  const provinceDetails = details.filter((row) => row[1] === selectedProvince);
  return (
    <div className="p-5">
      <button type="button" onClick={() => setSelectedProvince(null)} className="flex items-center gap-1.5 text-sm text-[#00A3E0] font-medium mb-4">
        <ArrowLeft className="w-4 h-4" /> Danh sách tỉnh
      </button>
      <div className="mb-4 flex flex-wrap items-end gap-x-7 gap-y-2">
        <h3 className="font-display font-bold text-xl text-slate-800 mr-auto">{selectedProvince}</h3>
        <span className="text-sm text-slate-600"><strong>{Number(province[4]).toLocaleString("vi-VN")}</strong> HTX</span>
        <span className="text-sm text-slate-600"><strong>{Number(province[5]).toLocaleString("vi-VN")}</strong> máy</span>
        <span className="text-sm text-slate-600"><strong>{Number(province[6]).toLocaleString("vi-VN")}</strong> hoạt động</span>
      </div>
      <div className="overflow-x-auto border border-slate-200 rounded-lg">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-slate-100 text-slate-500 text-xs uppercase">
            <tr>{["Mã HTX", "Tên HTX", "Tổng máy HTX", "Máy hoạt động", "Chủng loại máy", "Hãng / Model", "Số lượng"].map((header) => <th key={header} className="text-left px-4 py-2.5">{header}</th>)}</tr>
          </thead>
          <tbody>
            {provinceDetails.map((row, index) => (
              <tr key={`${row[2]}-${row[8]}-${row[9]}-${index}`} className="border-t border-slate-100">
                {[row[2], row[3], row[5], row[6], row[8], row[9], row[10]].map((cell, cellIndex) => <td key={cellIndex} className="px-4 py-2.5 whitespace-nowrap">{typeof cell === "number" ? cell.toLocaleString("vi-VN") : String(cell ?? "")}</td>)}
              </tr>
            ))}
            {!provinceDetails.length && <tr><td colSpan={7} className="text-center py-8 text-slate-500">Chưa có máy thuộc các HTX của tỉnh này.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function Reports() {
  const [provinces, setProvinces] = useState([]);
  const [seasons, setSeasons] = useState([]);
  const [cats, setCats] = useState([]);
  const [filters, setFilters] = useState({ season: "DX", province: "ALL", category: "ALL" });
  const [previewKind, setPreviewKind] = useState("summary_by_region");
  const [preview, setPreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(true);
  const [modal, setModal] = useState(null); // {kind, data}
  const [busyExport, setBusyExport] = useState(null);

  useEffect(() => {
    Promise.all([
      api.get("/provinces"), api.get("/seasons"), api.get("/machine-categories"),
    ]).then(([p, s, c]) => {
      setProvinces(p.data); setSeasons(s.data); setCats(c.data);
    });
  }, []);

  const buildParams = useCallback((kind) => {
    const rep = REPORTS.find((x) => x.kind === kind);
    const params = new URLSearchParams();
    params.set("kind", kind);
    if (rep.uses.includes("season") && filters.season) params.set("season", filters.season);
    if (rep.uses.includes("province") && filters.province) params.set("province", filters.province);
    if (rep.uses.includes("category") && filters.category) params.set("category", filters.category);
    return params;
  }, [filters]);

  // Reload the on-page preview whenever filters or selected preview kind change
  useEffect(() => {
    setLoadingPreview(true);
    const params = buildParams(previewKind);
    api.get(`/reports/preview?${params.toString()}`).then((r) => {
      setPreview(r.data);
      setLoadingPreview(false);
    }).catch(() => setLoadingPreview(false));
  }, [previewKind, buildParams]);

  const openPreviewModal = async (kind) => {
    setModal({ kind, data: null });
    const params = buildParams(kind);
    try {
      const { data } = await api.get(`/reports/preview?${params.toString()}`);
      setModal({ kind, data });
    } catch (e) {
      toast.error("Không tải được xem trước");
      setModal(null);
    }
  };

  const download = async (kind, fmt) => {
    setBusyExport(`${kind}-${fmt}`);
    try {
      const params = buildParams(kind);
      params.set("fmt", fmt);
      const token = localStorage.getItem("mkg_token");
      const resp = await fetch(`${API}/reports/export?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) throw new Error("Xuất báo cáo thất bại");
      const blob = await resp.blob();
      const suffix = [filters.season, filters.province, filters.category]
        .filter((x) => x && x !== "ALL").join("-");
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = suffix ? `${kind}-${suffix}.${fmt}` : `${kind}.${fmt}`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success(`Đã tải ${fmt.toUpperCase()}`);
    } catch (e) {
      toast.error(e.message || "Lỗi tải xuống");
    } finally {
      setBusyExport(null);
    }
  };

  const currentFilterLabel = () => {
    const parts = [];
    if (filters.season && filters.season !== "ALL") parts.push(seasons.find((s) => s.code === filters.season)?.name || filters.season);
    if (filters.province !== "ALL") parts.push(provinces.find((p) => p.code === filters.province)?.name || filters.province);
    if (filters.category !== "ALL") parts.push(cats.find((c) => c.code === filters.category)?.name || filters.category);
    return parts.length ? parts.join(" · ") : "Toàn bộ dữ liệu";
  };

  const currentReport = REPORTS.find((r) => r.kind === previewKind);

  return (
    <div className="p-6 lg:p-8 space-y-6" data-testid="reports-page">
      <Toaster position="top-right" richColors />
      <div>
        <h1 className="font-display font-bold text-3xl text-slate-900">Báo cáo & Kết xuất Dữ liệu</h1>
        <p className="text-sm text-slate-500 mt-1">Trung tâm xem trước và xuất báo cáo phục vụ công tác chỉ đạo</p>
      </div>

      {/* Filter panel */}
      <div className="bg-white border border-slate-200 rounded-lg p-4" data-testid="reports-filter">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-[#00A3E0]" />
          <h3 className="font-display font-bold text-sm uppercase tracking-wide">Bộ lọc chung (áp dụng cho xem trước & xuất file)</h3>
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
          <div key={r.kind}
            className={`bg-white border rounded-lg p-5 flex flex-col transition-shadow cursor-pointer ${
              previewKind === r.kind ? "border-[#00A82D] shadow-md" : "border-slate-200 hover:shadow-sm"
            }`}
            data-testid={`report-card-${r.kind}`}
            onClick={() => setPreviewKind(r.kind)}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-md flex items-center justify-center" style={{ background: `${r.color}15`, color: r.color }}>
                <r.icon className="w-5 h-5" />
              </div>
              <h3 className="font-display font-bold text-base leading-tight">{r.title}</h3>
              {previewKind === r.kind && (
                <span className="ml-auto text-[10px] font-semibold uppercase tracking-widest text-[#00A82D]">Đang xem</span>
              )}
            </div>
            <p className="text-sm text-slate-600 mb-3 flex-1">{r.desc}</p>
            <div className="text-[11px] text-slate-500 mb-3 border-t border-slate-100 pt-2">
              <span className="font-semibold text-slate-600 uppercase tracking-wider">Áp dụng: </span>
              {r.uses.map((u) => u === "season" ? "Mùa vụ" : u === "province" ? "Tỉnh" : "Chủng loại").join(" · ")}
            </div>
            <div className="flex gap-2">
              <button
                data-testid={`preview-btn-${r.kind}`}
                onClick={(e) => { e.stopPropagation(); openPreviewModal(r.kind); }}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md bg-white border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50"
              >
                <Eye className="w-4 h-4" /> Xem trước
              </button>
              <button
                data-testid={`export-xlsx-${r.kind}`}
                onClick={(e) => { e.stopPropagation(); download(r.kind, "xlsx"); }}
                disabled={busyExport === `${r.kind}-xlsx`}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md bg-[#00A82D] hover:bg-[#008E26] text-white text-sm font-medium disabled:opacity-60"
              >
                {busyExport === `${r.kind}-xlsx` ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />} Excel
              </button>
              <button
                data-testid={`export-pdf-${r.kind}`}
                onClick={(e) => { e.stopPropagation(); download(r.kind, "pdf"); }}
                disabled={busyExport === `${r.kind}-pdf`}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md bg-[#00A3E0] hover:bg-[#0089BE] text-white text-sm font-medium disabled:opacity-60"
              >
                {busyExport === `${r.kind}-pdf` ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />} PDF
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* On-page preview - dynamic based on filters + selected kind */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden" data-testid="report-preview">
        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
          <Eye className="w-4 h-4 text-[#00A82D]" />
          <div>
            <div className="font-display font-bold text-base">{currentReport?.title}</div>
            <div className="text-xs text-slate-500">
              {loadingPreview ? "Đang tính…" : preview ? `${preview.total_rows} dòng · ${preview.filter_suffix}` : "—"}
            </div>
          </div>
          {loadingPreview && <Loader2 className="w-4 h-4 animate-spin text-slate-400 ml-auto" />}
        </div>
        {previewKind === "summary_by_region" ? (
          <div className="max-h-[520px] overflow-y-auto">
            <RegionSummaryView data={preview} />
          </div>
        ) : (
          <>
        <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="text-slate-500 text-xs uppercase bg-slate-50 sticky top-0">
              <tr>
                {preview?.headers.map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {preview?.rows.slice(0, 200).map((row, i) => (
                <tr key={i} className="border-t border-slate-100 hover:bg-slate-50">
                  {row.map((cell, j) => (
                    <td key={j} className="px-4 py-2.5 whitespace-nowrap" data-testid={`preview-cell-${i}-${j}`}>
                      {typeof cell === "number" ? cell.toLocaleString("vi-VN") : String(cell ?? "")}
                    </td>
                  ))}
                </tr>
              ))}
              {preview?.rows.length === 0 && (
                <tr><td colSpan={preview.headers.length} className="text-center py-8 text-slate-500">
                  Không có dữ liệu phù hợp bộ lọc.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
        {preview?.rows.length > 200 && (
          <div className="px-4 py-2 text-xs text-slate-500 border-t border-slate-100 bg-slate-50">
            Hiển thị 200/{preview.total_rows} dòng · Xuất file để xem toàn bộ.
          </div>
        )}
          </>
        )}
      </div>

      {/* Preview modal - full-screen */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 z-[2000] flex items-center justify-center p-6" onClick={() => setModal(null)} data-testid="preview-modal">
          <div className="bg-white rounded-xl w-full max-w-6xl max-h-[92vh] overflow-hidden shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-200 flex items-center gap-3 bg-gradient-to-r from-[#00A82D]/10 to-[#00A3E0]/10">
              <Eye className="w-5 h-5 text-[#00A82D]" />
              <div className="flex-1">
                <div className="font-display font-bold text-xl">{modal.data?.title || "Đang tải…"}</div>
                <div className="text-xs text-slate-500">{modal.data ? `${modal.data.total_rows} dòng dữ liệu` : ""}</div>
              </div>
              <button
                data-testid="modal-export-xlsx"
                onClick={() => download(modal.kind, "xlsx")}
                className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-[#00A82D] hover:bg-[#008E26] text-white text-sm font-medium"
              >
                <FileSpreadsheet className="w-4 h-4" /> Xuất Excel
              </button>
              <button
                data-testid="modal-export-pdf"
                onClick={() => download(modal.kind, "pdf")}
                className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-[#00A3E0] hover:bg-[#0089BE] text-white text-sm font-medium"
              >
                <FileText className="w-4 h-4" /> Xuất PDF
              </button>
              <button data-testid="preview-modal-close" onClick={() => setModal(null)} className="p-2 rounded-md text-slate-500 hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-5">
              {!modal.data ? (
                <div className="flex items-center justify-center py-20 text-slate-500">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" /> Đang tính toán báo cáo…
                </div>
              ) : modal.kind === "summary_by_region" ? (
                <RegionSummaryView data={modal.data} />
              ) : (
                <table className="w-full text-sm border border-slate-200 rounded-md overflow-hidden">
                  <thead className="bg-slate-100 text-slate-600 text-xs uppercase sticky top-0">
                    <tr>
                      {modal.data.headers.map((h) => (
                        <th key={h} className="text-left px-3 py-2 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {modal.data.rows.map((row, i) => (
                      <tr key={i} className="border-t border-slate-200">
                        {row.map((cell, j) => (
                          <td key={j} className="px-3 py-2 whitespace-nowrap">
                            {typeof cell === "number" ? cell.toLocaleString("vi-VN") : String(cell ?? "")}
                          </td>
                        ))}
                      </tr>
                    ))}
                    {!modal.data.rows.length && (
                      <tr><td colSpan={modal.data.headers.length} className="text-center py-8 text-slate-500">
                        Không có dữ liệu phù hợp bộ lọc.
                      </td></tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
