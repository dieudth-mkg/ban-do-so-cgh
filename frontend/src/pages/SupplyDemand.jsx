import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { AlertOctagon, Scale, Filter } from "lucide-react";

const STAGE_LABELS = {
  LAM_DAT: "Làm đất",
  GIEO_SA: "Gieo sạ",
  CHAM_SOC: "Chăm sóc",
  THU_HOACH: "Thu hoạch",
  SAU_THU_HOACH: "Sau thu hoạch",
};

const STATUS_STYLES = {
  ok: { bg: "#00A82D", text: "Đủ" },
  surplus: { bg: "#00A3E0", text: "Thừa" },
  slight: { bg: "#F5A623", text: "Thiếu nhẹ" },
  severe: { bg: "#E74C3C", text: "Thiếu nghiêm trọng" },
  no_data: { bg: "#95A5A6", text: "Chưa có dữ liệu" },
};

export default function SupplyDemand() {
  const [rows, setRows] = useState([]);
  const [critical, setCritical] = useState([]);
  const [province, setProvince] = useState("ALL");
  const [provinces, setProvinces] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/provinces").then((r) => setProvinces(r.data));
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = province !== "ALL" ? { province } : {};
    api.get("/supply-demand", { params }).then((r) => {
      setRows(r.data.rows);
      setCritical(r.data.critical);
      setLoading(false);
    });
  }, [province]);

  const grouped = useMemo(() => {
    const map = {};
    rows.forEach((r) => {
      map[r.province_code] ||= { province_name: r.province_name, stages: {} };
      map[r.province_code].stages[r.stage] = r;
    });
    return map;
  }, [rows]);

  const stages = Object.keys(STAGE_LABELS);

  return (
    <div className="p-6 lg:p-8 space-y-6" data-testid="supply-demand-page">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display font-bold text-3xl text-slate-900">Cân đối Cung – Cầu & Cảnh báo</h1>
          <p className="text-sm text-slate-500 mt-1">
            So sánh nhu cầu máy thực tế với số lượng sẵn có theo từng khâu sản xuất
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-500" />
          <select
            data-testid="filter-sd-province"
            value={province}
            onChange={(e) => setProvince(e.target.value)}
            className="text-sm bg-white border border-slate-300 rounded-md px-3 py-2"
          >
            <option value="ALL">Toàn vùng</option>
            {provinces.map((p) => <option key={p.code} value={p.code}>{p.name}</option>)}
          </select>
        </div>
      </div>

      {/* Critical warning strip */}
      {critical.length > 0 && (
        <div className="rounded-lg border-l-4 border-[#E74C3C] bg-red-50 p-4" data-testid="critical-strip">
          <div className="flex items-center gap-2 mb-2">
            <AlertOctagon className="w-4 h-4 text-[#E74C3C]" />
            <div className="font-display font-bold text-sm uppercase tracking-wide text-[#E74C3C]">
              Cảnh báo khẩn cấp – Mất cân đối nghiêm trọng
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
            {critical.slice(0, 6).map((c, i) => (
              <div key={i} className="bg-white rounded px-3 py-2 border border-red-200">
                <div className="font-medium text-slate-800">{c.province_name} · {STAGE_LABELS[c.stage]}</div>
                <div className="text-slate-500">{c.category_name} — {c.label} (đáp ứng {c.coverage != null ? `${(c.coverage * 100).toFixed(0)}%` : "—"})</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Table by stage */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-2 bg-slate-50">
          <Scale className="w-4 h-4 text-[#00A3E0]" />
          <h3 className="font-display font-bold text-base">Bảng cân đối theo Khâu sản xuất</h3>
          {loading && <span className="ml-auto text-xs text-slate-500">Đang tính toán…</span>}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-slate-500 text-xs uppercase bg-slate-50 sticky top-0">
              <tr>
                <th className="text-left px-4 py-2.5 sticky left-0 bg-slate-50 z-10">Tỉnh</th>
                {stages.map((s) => (
                  <th key={s} className="text-center px-3 py-2.5 min-w-[160px]">{STAGE_LABELS[s]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(grouped).map(([pcode, g]) => (
                <tr key={pcode} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium sticky left-0 bg-white">{g.province_name}</td>
                  {stages.map((s) => {
                    const cell = g.stages[s];
                    if (!cell) return <td key={s} className="px-3 py-3 text-slate-400 text-center">—</td>;
                    const style = STATUS_STYLES[cell.status];
                    return (
                      <td key={s} className="px-3 py-3 text-center" data-testid={`sd-cell-${pcode}-${s}`}>
                        <div
                          className="inline-block px-2 py-0.5 rounded text-white text-xs font-semibold mb-0.5"
                          style={{ background: style.bg }}
                        >
                          {cell.label}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          Cần {cell.needed} · Có {cell.have}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
              {!rows.length && !loading && (
                <tr><td colSpan={stages.length + 1} className="text-center py-8 text-slate-500">
                  Không có dữ liệu.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-xs text-slate-500 border border-slate-200 rounded-md p-3 bg-white">
        <strong>Công thức (QT-01):</strong> Số máy cần = Diện tích canh tác (ha) / Định mức năng suất (ha/máy/vụ) theo văn bản do Cục ban hành.
        Ngưỡng cảnh báo cấu hình tại Quản trị → Tham số hệ thống. Hệ thống không tự động điều phối máy liên vùng (QT-02).
      </div>
    </div>
  );
}
