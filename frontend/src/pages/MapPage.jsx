import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { renderToStaticMarkup } from "react-dom/server";
import { Tractor, Sprout, Filter, MapPin, Calendar, Activity, Phone, Layers } from "lucide-react";
import { api } from "../lib/api";

const STATUS_COLORS = {
  green: "#00A82D",
  amber: "#F5A623",
  red: "#E74C3C",
  gray: "#95A5A6",
};

function makePinIcon(color) {
  const svg = renderToStaticMarkup(
    <svg viewBox="0 0 32 42" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M16 0C7.163 0 0 7.163 0 16c0 11.5 16 26 16 26s16-14.5 16-26C32 7.163 24.837 0 16 0z"
        fill={color}
      />
      <circle cx="16" cy="15" r="9" fill="white" />
      <g transform="translate(9,8)" stroke={color} strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 9V6.5A2.5 2.5 0 0 0 4.5 4H3" />
        <path d="M3 4a2 2 0 1 0 4 0" />
        <circle cx="4" cy="11" r="2" />
        <circle cx="10" cy="11" r="2" />
        <path d="M7 11h1" />
      </g>
    </svg>,
  );
  return L.divIcon({
    className: "mkg-marker-pin",
    html: svg,
    iconSize: [32, 42],
    iconAnchor: [16, 42],
    popupAnchor: [0, -38],
  });
}

function MapAutoFit({ points }) {
  const map = useMap();
  useEffect(() => {
    if (!points?.length) return;
    const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng]));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 9 });
  }, [points, map]);
  return null;
}

export default function MapPage() {
  const [filters, setFilters] = useState({ season: "DX", province: "ALL", category: "ALL", status: "ALL" });
  const [htxList, setHtxList] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [cats, setCats] = useState([]);
  const [seasons, setSeasons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDetail, setSelectedDetail] = useState(null);

  useEffect(() => {
    (async () => {
      const [p, c, s] = await Promise.all([
        api.get("/provinces"),
        api.get("/machine-categories"),
        api.get("/seasons"),
      ]);
      setProvinces(p.data);
      setCats(c.data);
      setSeasons(s.data);
    })();
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = {};
    if (filters.province !== "ALL") params.province = filters.province;
    if (filters.category !== "ALL") params.category = filters.category;
    if (filters.status !== "ALL") params.status = filters.status;
    api.get("/map/htx-summary", { params }).then((r) => {
      setHtxList(r.data);
      setLoading(false);
    });
  }, [filters]);

  const summary = useMemo(() => {
    const c = { green: 0, amber: 0, red: 0, gray: 0 };
    htxList.forEach((h) => { c[h.status_color] = (c[h.status_color] || 0) + 1; });
    return c;
  }, [htxList]);

  const openDetail = async (htxId) => {
    const { data } = await api.get(`/map/htx/${htxId}/detail`);
    setSelectedDetail(data);
  };

  return (
    <div className="relative w-full" style={{ height: "calc(100vh - 3.5rem)" }} data-testid="map-page">
      <MapContainer
        center={[10.2, 105.6]}
        zoom={7}
        style={{ width: "100%", height: "100%" }}
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <MapAutoFit points={htxList} />
        {htxList.map((h) => (
          <Marker
            key={h.id}
            position={[h.lat, h.lng]}
            icon={makePinIcon(STATUS_COLORS[h.status_color] || STATUS_COLORS.gray)}
          >
            <Popup>
              <div className="min-w-[240px]" data-testid={`popup-${h.code}`}>
                <div className="flex items-start gap-2">
                  <div
                    className="w-8 h-8 rounded-md flex items-center justify-center text-white flex-shrink-0"
                    style={{ background: STATUS_COLORS[h.status_color] || STATUS_COLORS.gray }}
                  >
                    <Sprout className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-display font-bold text-base leading-tight">{h.name}</div>
                    <div className="text-xs text-slate-500">
                      Mã: <span className="font-mono">{h.code}</span>
                    </div>
                  </div>
                </div>
                <div className="mt-3 space-y-1 text-xs">
                  <div className="flex justify-between"><span className="text-slate-500">Chủ sở hữu</span><span className="font-medium">{h.owner_name}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Diện tích</span><span className="font-medium">{h.cultivated_area_ha.toLocaleString("vi-VN")} ha</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Tổng máy</span><span className="font-medium">{h.machine_count} máy</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Hoạt động</span><span className="font-medium">{h.active_count}</span></div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Tỷ lệ đáp ứng</span>
                    <span
                      className="px-2 py-0.5 rounded text-white text-xs font-medium"
                      style={{ background: STATUS_COLORS[h.status_color] }}
                    >
                      {h.coverage_ratio == null ? "—" : `${(h.coverage_ratio * 100).toFixed(0)}% · ${h.status_label}`}
                    </span>
                  </div>
                  {h.phone && (
                    <div className="flex items-center gap-1 text-slate-500 pt-1">
                      <Phone className="w-3 h-3" /> {h.phone}
                    </div>
                  )}
                </div>
                <button
                  data-testid={`btn-detail-${h.code}`}
                  onClick={() => openDetail(h.id)}
                  className="mt-3 w-full text-xs font-medium py-1.5 rounded bg-[#00A3E0] hover:bg-[#0089BE] text-white"
                >
                  Xem chi tiết HTX
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Filter Panel - Glassmorphism */}
      <div className="absolute top-6 left-6 w-[300px] mkg-glass rounded-xl p-5 z-[1000]" data-testid="map-filter-panel">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4 text-[#00A3E0]" />
          <h3 className="font-display font-bold text-sm uppercase tracking-wide">Bộ lọc bản đồ</h3>
        </div>

        <FilterSelect
          icon={Calendar} label="Mùa vụ" testid="filter-season"
          value={filters.season}
          onChange={(v) => setFilters({ ...filters, season: v })}
          options={[["ALL", "Tất cả"], ...seasons.map((s) => [s.code, s.name])]}
        />
        <FilterSelect
          icon={MapPin} label="Địa bàn" testid="filter-province"
          value={filters.province}
          onChange={(v) => setFilters({ ...filters, province: v })}
          options={[["ALL", "Toàn vùng"], ...provinces.map((p) => [p.code, p.name])]}
        />
        <FilterSelect
          icon={Tractor} label="Chủng loại máy" testid="filter-category"
          value={filters.category}
          onChange={(v) => setFilters({ ...filters, category: v })}
          options={[["ALL", "Tất cả chủng loại"], ...cats.map((c) => [c.code, c.name])]}
        />
        <FilterSelect
          icon={Activity} label="Tình trạng" testid="filter-status"
          value={filters.status}
          onChange={(v) => setFilters({ ...filters, status: v })}
          options={[
            ["ALL", "Tất cả"],
            ["hoat_dong", "Hoạt động"],
            ["bao_tri", "Bảo trì"],
            ["hong", "Hỏng"],
          ]}
        />

        <div className="mt-4 pt-3 border-t border-slate-200/60">
          <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">Chú giải</div>
          <div className="grid grid-cols-2 gap-1.5 text-[11px]">
            <LegendItem color={STATUS_COLORS.green} label={`Đủ (${summary.green})`} />
            <LegendItem color={STATUS_COLORS.amber} label={`Thiếu nhẹ (${summary.amber})`} />
            <LegendItem color={STATUS_COLORS.red} label={`Thiếu (${summary.red})`} />
            <LegendItem color={STATUS_COLORS.gray} label={`Chưa có (${summary.gray})`} />
          </div>
        </div>
      </div>

      {/* Bottom overview table */}
      <div className="absolute bottom-6 right-6 w-[380px] max-h-[45vh] mkg-glass rounded-xl overflow-hidden z-[1000]" data-testid="map-status-table">
        <div className="px-4 py-3 border-b border-white/40 flex items-center gap-2">
          <Layers className="w-4 h-4 text-[#00A82D]" />
          <div className="font-display font-bold text-sm uppercase tracking-wide">Tình trạng theo Khu vực</div>
          <div className="ml-auto text-[10px] text-slate-500">{htxList.length} HTX</div>
        </div>
        <div className="overflow-y-auto max-h-[calc(45vh-2.5rem)]">
          <table className="w-full text-xs">
            <thead className="text-slate-500">
              <tr className="border-b border-white/40">
                <th className="text-left px-3 py-2">HTX</th>
                <th className="text-center px-2 py-2">Máy</th>
                <th className="text-right px-3 py-2">Tỷ lệ</th>
              </tr>
            </thead>
            <tbody>
              {htxList.slice(0, 60).map((h) => (
                <tr key={h.id} className="border-b border-white/30 hover:bg-white/40" data-testid={`row-${h.code}`}>
                  <td className="px-3 py-2">
                    <div className="font-medium truncate max-w-[140px]">{h.name}</div>
                    <div className="text-[10px] text-slate-500">{h.code}</div>
                  </td>
                  <td className="text-center px-2 py-2">{h.active_count}/{h.machine_count}</td>
                  <td className="text-right px-3 py-2">
                    <span
                      className="inline-block px-2 py-0.5 rounded text-white text-[10px] font-medium"
                      style={{ background: STATUS_COLORS[h.status_color] }}
                    >
                      {h.coverage_ratio == null ? "—" : `${(h.coverage_ratio * 100).toFixed(0)}%`}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail modal */}
      {selectedDetail && (
        <div
          className="fixed inset-0 bg-black/40 z-[2000] flex items-center justify-center p-6"
          onClick={() => setSelectedDetail(null)}
          data-testid="htx-detail-modal"
        >
          <div
            className="bg-white rounded-xl max-w-2xl w-full max-h-[85vh] overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 bg-gradient-to-r from-[#00A3E0] to-[#00C4B4] text-white">
              <div className="font-display font-bold text-xl">{selectedDetail.htx.name}</div>
              <div className="text-white/85 text-xs">{selectedDetail.htx.code} · {selectedDetail.htx.owner_name}</div>
            </div>
            <div className="p-5 overflow-y-auto max-h-[calc(85vh-6rem)]">
              <div className="grid grid-cols-2 gap-3 mb-4">
                <Stat label="Diện tích" value={`${selectedDetail.htx.cultivated_area_ha.toLocaleString("vi-VN")} ha`} />
                <Stat label="Tổng máy" value={selectedDetail.machines.length} />
              </div>
              <div className="font-display font-bold text-sm uppercase tracking-wide mb-2">Cơ cấu máy theo Chủng loại</div>
              <table className="w-full text-sm border border-slate-200 rounded-md overflow-hidden">
                <thead className="bg-slate-100 text-slate-600 text-xs uppercase">
                  <tr>
                    <th className="text-left px-3 py-2">Chủng loại</th>
                    <th className="text-center px-2 py-2">Có</th>
                    <th className="text-center px-2 py-2">Hoạt động</th>
                    <th className="text-center px-2 py-2">Cần</th>
                    <th className="text-right px-3 py-2">Tỷ lệ</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedDetail.by_category.map((c) => (
                    <tr key={c.category_code} className="border-t border-slate-200">
                      <td className="px-3 py-2 font-medium">{c.category_name}</td>
                      <td className="text-center px-2 py-2">{c.have}</td>
                      <td className="text-center px-2 py-2">{c.active}</td>
                      <td className="text-center px-2 py-2">{c.needed}</td>
                      <td className="text-right px-3 py-2">
                        {c.coverage == null ? "—" : `${(c.coverage * 100).toFixed(0)}%`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button
                data-testid="close-detail-btn"
                onClick={() => setSelectedDetail(null)}
                className="mt-4 px-4 py-2 rounded-md bg-slate-900 text-white text-sm"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="absolute top-4 right-4 mkg-glass px-4 py-2 rounded-md text-xs z-[1000]">
          Đang tải dữ liệu…
        </div>
      )}
    </div>
  );
}

function FilterSelect({ icon: Icon, label, value, onChange, options, testid }) {
  return (
    <label className="block mb-3">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-slate-500 mb-1">
        <Icon className="w-3 h-3" /> {label}
      </div>
      <select
        data-testid={testid}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full text-sm bg-white border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#00C4B4]"
      >
        {options.map(([v, l]) => (
          <option key={v} value={v}>{l}</option>
        ))}
      </select>
    </label>
  );
}

function LegendItem({ color, label }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-3 h-3 rounded-full" style={{ background: color }} />
      <span className="text-slate-700">{label}</span>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="border border-slate-200 rounded-md p-3">
      <div className="text-[10px] uppercase tracking-widest text-slate-500">{label}</div>
      <div className="font-display font-bold text-xl">{value}</div>
    </div>
  );
}
