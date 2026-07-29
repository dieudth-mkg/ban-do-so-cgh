import { useEffect, useState } from "react";
import { api, API } from "../lib/api";
import { FileSpreadsheet, FileText, BarChart3, Layers, AlertTriangle, Download } from "lucide-react";
import { toast, Toaster } from "sonner";

const REPORTS = [
  {
    kind: "summary_by_region",
    icon: Layers,
    color: "#00A3E0",
    title: "Báo cáo Tổng hợp theo Khu vực",
    desc: "Số HTX, số máy và diện tích cơ giới hóa theo từng tỉnh trong vùng ĐBSCL.",
  },
  {
    kind: "supply_demand",
    icon: BarChart3,
    color: "#00A82D",
    title: "Báo cáo Cân đối Cung – Cầu",
    desc: "Bảng chi tiết nhu cầu và cung ứng máy móc theo khâu sản xuất và tỉnh.",
  },
  {
    kind: "htx_shortage",
    icon: AlertTriangle,
    color: "#E74C3C",
    title: "Báo cáo HTX Thừa/Thiếu",
    desc: "Danh sách các HTX đang thiếu máy nghiêm trọng cần ưu tiên can thiệp.",
  },
];

export default function Reports() {
  const [preview, setPreview] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/reports/summary-by-region").then((r) => {
      setPreview(r.data);
      setLoading(false);
    });
  }, []);

  const download = async (kind, fmt) => {
    try {
      const token = localStorage.getItem("mkg_token");
      const resp = await fetch(`${API}/reports/export?kind=${kind}&fmt=${fmt}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) throw new Error("Xuất báo cáo thất bại");
      const blob = await resp.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${kind}.${fmt}`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success(`Đã tải ${fmt.toUpperCase()}`);
    } catch (e) {
      toast.error(e.message || "Lỗi tải xuống");
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6" data-testid="reports-page">
      <Toaster position="top-right" richColors />
      <div>
        <h1 className="font-display font-bold text-3xl text-slate-900">Báo cáo & Kết xuất Dữ liệu</h1>
        <p className="text-sm text-slate-500 mt-1">Trung tâm xuất báo cáo phục vụ công tác chỉ đạo & chính sách</p>
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
            <p className="text-sm text-slate-600 mb-4 flex-1">{r.desc}</p>
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
