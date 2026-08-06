import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, GeoJSON, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.heat";
import "leaflet.markercluster";
import { renderToStaticMarkup } from "react-dom/server";
import {
  Tractor, Sprout, Filter, MapPin, Calendar, Activity, Phone, Layers,
  Flame, Waypoints, X, Search, Clock,
} from "lucide-react";
import { api } from "../lib/api";

const STATUS_COLORS = {
  green: "#00A82D", amber: "#F5A623", red: "#E74C3C", gray: "#95A5A6", blue: "#00A3E0",
};

const PROVINCE_COLORS = {
  CT: "#00A3E0", AG: "#00A82D", VL: "#00C4B4",
  DT: "#7C3AED", TN: "#F5A623", CM: "#E74C3C",
};

function makePinIcon(color) {
  const svg = renderToStaticMarkup(
    <svg viewBox="0 0 32 42" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 0C7.163 0 0 7.163 0 16c0 11.5 16 26 16 26s16-14.5 16-26C32 7.163 24.837 0 16 0z" fill={color} />
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
    className: "mkg-marker-pin", html: svg,
    iconSize: [32, 42], iconAnchor: [16, 42], popupAnchor: [0, -38],
  });
}

function MapAutoFit({ points }) {
  const map = useMap();
  useEffect(() => {
    if (!points?.length) return;
    const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng]));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 10 });
  }, [points, map]);
  return null;
}

function HeatLayer({ points, max }) {
  const map = useMap();
  useEffect(() => {
    if (!points?.length) return;
    const data = points.map((p) => [p.lat, p.lng, p.hp_per_ha]);
    const layer = L.heatLayer(data, {
      radius: 45, blur: 30, maxZoom: 10, max: max || 1,
      gradient: { 0.0: "#00A82D", 0.35: "#00C4B4", 0.55: "#00A3E0", 0.75: "#F5A623", 1.0: "#E74C3C" },
    });
    layer.addTo(map);
    return () => { map.removeLayer(layer); };
  }, [points, max, map]);
  return null;
}

function ClusterLayer({ htxList, onPopupDetail }) {
  const map = useMap();
  useEffect(() => {
    if (!htxList?.length) return;
    const group = L.markerClusterGroup({
      chunkedLoading: true, maxClusterRadius: 55,
      spiderfyOnMaxZoom: true, showCoverageOnHover: false,
    });
    htxList.forEach((h) => {
      const icon = makePinIcon(STATUS_COLORS[h.status_color] || STATUS_COLORS.gray);
      const m = L.marker([h.lat, h.lng], { icon });
      const popupHtml = `
        <div style="min-width:220px;font-family:'IBM Plex Sans',sans-serif">
          <div style="display:flex;align-items:start;gap:8px">
            <div style="width:28px;height:28px;border-radius:6px;background:${STATUS_COLORS[h.status_color]};color:white;display:flex;align-items:center;justify-content:center;font-weight:700">${h.name?.[4] || "H"}</div>
            <div><div style="font-weight:700;font-size:14px">${h.name}</div>
            <div style="font-size:11px;color:#64748b">${h.code} · ${h.commune || ""}</div></div>
          </div>
          <div style="margin-top:8px;font-size:12px;line-height:1.5">
            <div>Chủ sở hữu: <b>${h.owner_name}</b></div>
            <div>Diện tích: <b>${h.cultivated_area_ha.toLocaleString("vi-VN")} ha</b></div>
            <div>Máy: <b>${h.active_count}/${h.machine_count}</b></div>
            <div>Đáp ứng: <span style="background:${STATUS_COLORS[h.status_color]};color:white;padding:1px 6px;border-radius:4px;font-size:11px;font-weight:600">${h.coverage_ratio == null ? "—" : (h.coverage_ratio * 100).toFixed(0) + "% · " + h.status_label}</span></div>
          </div>
          <button data-htx-id="${h.id}" class="mkg-cluster-detail-btn" style="margin-top:10px;width:100%;padding:6px;font-size:12px;font-weight:600;background:#00A3E0;color:white;border:none;border-radius:4px;cursor:pointer">Xem chi tiết HTX</button>
        </div>`;
      m.bindPopup(popupHtml);
      m.on("popupopen", (e) => {
        const btn = e.popup._contentNode?.querySelector(".mkg-cluster-detail-btn");
        if (btn) btn.onclick = () => onPopupDetail(h.id);
      });
      group.addLayer(m);
    });
    group.addTo(map);
    return () => { map.removeLayer(group); };
  }, [htxList, map, onPopupDetail]);
  return null;
}

export default function MapPage() {
  const [filters, setFilters] = useState({ season: "DX", province: "ALL", category: "ALL", status: "ALL", q: "" });
  const [layers, setLayers] = useState({ boundaries: true, heatmap: false, cluster: false });
  const [htxList, setHtxList] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [cats, setCats] = useState([]);
  const [seasons, setSeasons] = useState([]);
  const [geojson, setGeojson] = useState(null);
  const [heat, setHeat] = useState({ points: [], max_density: 1 });
  const [loading, setLoading] = useState(true);
  const [selectedDetail, setSelectedDetail] = useState(null);

  useEffect(() => {
    (async () => {
      const [p, c, s, gj, h] = await Promise.all([
        api.get("/provinces"), api.get("/machine-categories"),
        api.get("/seasons"), api.get("/geojson/provinces"), api.get("/map/heatmap"),
      ]);
      setProvinces(p.data); setCats(c.data); setSeasons(s.data);
      setGeojson(gj.data); setHeat(h.data);
    })();
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = { season: filters.season };
    if (filters.province !== "ALL") params.province = filters.province;
    if (filters.category !== "ALL") params.category = filters.category;
    if (filters.status !== "ALL") params.status = filters.status;
    if (filters.q.trim()) params.q = filters.q.trim();
    api.get("/map/htx-summary", { params })
      .then((r) => setHtxList(r.data))
      .catch(() => setHtxList([]))
      .finally(() => setLoading(false));
  }, [filters]);

  const summary = useMemo(() => {
    const c = { green: 0, amber: 0, red: 0, gray: 0 };
    htxList.forEach((h) => { c[h.status_color] = (c[h.status_color] || 0) + 1; });
    return c;
  }, [htxList]);

  const openDetail = async (htxId) => {
    const { data } = await api.get(`/map/htx/${htxId}/detail`, {
      params: { season: filters.season, category: filters.category, status: filters.status },
    });
    setSelectedDetail(data);
  };

  const geoStyle = (feature) => ({
    color: PROVINCE_COLORS[feature.properties.code] || "#00A3E0",
    weight: filters.province === feature.properties.code ? 3.5 : 2,
    fillColor: PROVINCE_COLORS[feature.properties.code] || "#00A3E0",
    fillOpacity: filters.province === feature.properties.code ? 0.18 : 0.08,
    dashArray: filters.province === feature.properties.code ? undefined : "6 4",
    className: "mkg-province-hover",
  });

  const clusterMode = filters.province !== "ALL" || layers.cluster;
  const showMarkers = !layers.heatmap;

  // Group HTX by commune for the drilldown list
  const byCommune = useMemo(() => {
    if (filters.province === "ALL") return null;
    const grp = {};
    htxList.forEach((h) => {
      const key = h.commune || "(chưa có)";
      grp[key] = grp[key] || [];
      grp[key].push(h);
    });
    return grp;
  }, [htxList, filters.province]);

  const activeProvinceName = filters.province !== "ALL"
    ? provinces.find((p) => p.code === filters.province)?.name : null;

  return (
    <div className="relative w-full" style={{ height: "calc(100vh - 3.5rem)" }} data-testid="map-page">
      <MapContainer center={[10.2, 105.6]} zoom={7} style={{ width: "100%", height: "100%" }} zoomControl={false}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' />
        <MapAutoFit points={htxList} />

        {layers.boundaries && geojson && (
          <GeoJSON
            key={`geo-${filters.season}-${filters.province}`}
            data={geojson}
            style={geoStyle}
            onEachFeature={(f, layer) => {
              layer.bindTooltip(f.properties.name, { permanent: false, direction: "center", className: "mkg-boundary-tip" });
              layer.on("click", () => {
                setFilters((prev) => ({
                  ...prev,
                  province: prev.province === f.properties.code ? "ALL" : f.properties.code,
                }));
              });
              layer.on("mouseover", () => layer.setStyle({ fillOpacity: 0.22 }));
              layer.on("mouseout", () => {
                if (filters.province !== f.properties.code) {
                  layer.setStyle({ fillOpacity: 0.08 });
                }
              });
            }}
          />
        )}

        {layers.heatmap && heat.points.length > 0 && (
          <HeatLayer points={heat.points} max={heat.max_density} />
        )}

        {showMarkers && clusterMode && (
          <ClusterLayer htxList={htxList} onPopupDetail={openDetail} />
        )}

        {showMarkers && !clusterMode && htxList.map((h) => (
          <Marker key={h.id} position={[h.lat, h.lng]}
            icon={makePinIcon(STATUS_COLORS[h.status_color] || STATUS_COLORS.gray)}>
            <Popup>
              <div className="min-w-[240px]" data-testid={`popup-${h.code}`}>
                <div className="flex items-start gap-2">
                  <div className="w-8 h-8 rounded-md flex items-center justify-center text-white flex-shrink-0"
                    style={{ background: STATUS_COLORS[h.status_color] || STATUS_COLORS.gray }}>
                    <Sprout className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-display font-bold text-base leading-tight">{h.name}</div>
                    <div className="text-xs text-slate-500">Mã: <span className="font-mono">{h.code}</span></div>
                  </div>
                </div>
                <div className="mt-3 space-y-1 text-xs">
                  <div className="flex justify-between"><span className="text-slate-500">Chủ sở hữu</span><span className="font-medium">{h.owner_name}</span></div>
                  {h.commune && <div className="flex justify-between"><span className="text-slate-500">Xã</span><span className="font-medium">{h.commune}</span></div>}
                  <div className="flex justify-between"><span className="text-slate-500">Diện tích</span><span className="font-medium">{h.cultivated_area_ha.toLocaleString("vi-VN")} ha</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Tổng máy</span><span className="font-medium">{h.machine_count} máy</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Hoạt động</span><span className="font-medium">{h.active_count}</span></div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Tỷ lệ đáp ứng</span>
                    <span className="px-2 py-0.5 rounded text-white text-xs font-medium" style={{ background: STATUS_COLORS[h.status_color] }}>
                      {h.coverage_ratio == null ? "—" : `${(h.coverage_ratio * 100).toFixed(0)}% · ${h.status_label}`}
                    </span>
                  </div>
                  {h.phone && (
                    <div className="flex items-center gap-1 text-slate-500 pt-1">
                      <Phone className="w-3 h-3" /> {h.phone}
                    </div>
                  )}
                </div>
                <button data-testid={`btn-detail-${h.code}`} onClick={() => openDetail(h.id)}
                  className="mt-3 w-full text-xs font-medium py-1.5 rounded bg-[#00A3E0] hover:bg-[#0089BE] text-white">
                  Xem chi tiết HTX
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      <div className="absolute top-6 right-6 mkg-glass rounded-lg px-3 py-2 z-[1000] text-xs text-slate-600 flex items-center gap-2" data-testid="map-system-date">
        <Calendar className="w-3.5 h-3.5 text-[#00A3E0]" /> Ngày hệ thống: {new Date().toLocaleDateString("vi-VN")}
      </div>

      {/* Filter Panel */}
      <div className="absolute top-6 left-6 w-[300px] mkg-glass rounded-xl p-5 z-[1000]" data-testid="map-filter-panel">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4 text-[#00A3E0]" />
          <h3 className="font-display font-bold text-sm uppercase tracking-wide">Bộ lọc bản đồ</h3>
        </div>

        <label className="block mb-3">
          <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-slate-500 mb-1">
            <Search className="w-3 h-3" /> Tra cứu HTX / máy / chủ sở hữu
          </div>
          <input data-testid="map-search" value={filters.q}
            onChange={(e) => setFilters({ ...filters, q: e.target.value })}
            placeholder="Tên, mã, SN, số khung..."
            className="w-full text-sm bg-white border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#00C4B4]" />
        </label>

        <div className="mb-3">
          <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-slate-500 mb-1.5">
            <Calendar className="w-3 h-3" /> Mùa vụ
          </div>
          <div className="grid grid-cols-3 gap-1 bg-white/60 rounded-lg p-1 border border-slate-200/50" data-testid="season-switcher">
            {seasons.map((s) => (
              <button key={s.code} data-testid={`season-${s.code}`}
                onClick={() => setFilters({ ...filters, season: s.code })}
                className={`text-[11px] font-medium py-1.5 rounded-md transition-colors ${
                  filters.season === s.code ? "bg-[#00A82D] text-white shadow-sm" : "text-slate-600 hover:bg-white"
                }`}>
                {s.name}
              </button>
            ))}
          </div>
        </div>

        {activeProvinceName && (
          <div className="mb-3 flex items-center gap-2 bg-[#00A3E0]/10 border border-[#00A3E0]/30 rounded-md p-2 text-xs" data-testid="drilldown-badge">
            <MapPin className="w-3.5 h-3.5 text-[#00A3E0]" />
            <span className="font-semibold text-[#00A3E0]">{activeProvinceName}</span>
            <span className="text-slate-500">· phân cụm theo xã</span>
            <button onClick={() => setFilters({ ...filters, province: "ALL" })} className="ml-auto text-slate-500 hover:text-slate-800" data-testid="drilldown-clear">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <FilterSelect icon={MapPin} label="Địa bàn" testid="filter-province"
          value={filters.province} onChange={(v) => setFilters({ ...filters, province: v })}
          options={[["ALL", "Toàn vùng"], ...provinces.map((p) => [p.code, p.name])]} />
        <FilterSelect icon={Tractor} label="Chủng loại máy" testid="filter-category"
          value={filters.category} onChange={(v) => setFilters({ ...filters, category: v })}
          options={[["ALL", "Tất cả chủng loại"], ...cats.map((c) => [c.code, c.name])]} />
        <FilterSelect icon={Activity} label="Tình trạng" testid="filter-status"
          value={filters.status} onChange={(v) => setFilters({ ...filters, status: v })}
          options={[["ALL", "Tất cả"], ["hoat_dong", "Hoạt động"], ["bao_tri", "Bảo trì"], ["hong", "Hỏng"], ["chua_co_du_lieu", "Chưa có dữ liệu"]]} />

        <div className="mt-4 pt-3 border-t border-slate-200/60">
          <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">Lớp bản đồ</div>
          <LayerToggle icon={Waypoints} testid="toggle-boundaries" label="Ranh giới 6 tỉnh"
            active={layers.boundaries}
            onToggle={() => setLayers({ ...layers, boundaries: !layers.boundaries })} />
          <LayerToggle icon={Flame} testid="toggle-heatmap" label="Mật độ HP / ha"
            active={layers.heatmap}
            onToggle={() => setLayers({ ...layers, heatmap: !layers.heatmap })} />
          <LayerToggle icon={Layers} testid="toggle-cluster" label="Gom cụm theo Xã"
            active={clusterMode}
            onToggle={() => setLayers({ ...layers, cluster: !layers.cluster })} />
        </div>

        <div className="mt-3 pt-3 border-t border-slate-200/60">
          <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">Chú giải</div>
          {!layers.heatmap ? (
            <div className="grid grid-cols-2 gap-1.5 text-[11px]">
              <LegendItem color={STATUS_COLORS.green} label={`Đủ (${summary.green})`} />
              <LegendItem color={STATUS_COLORS.blue} label={`Thừa (${summary.blue || 0})`} />
              <LegendItem color={STATUS_COLORS.amber} label={`Thiếu nhẹ (${summary.amber})`} />
              <LegendItem color={STATUS_COLORS.red} label={`Thiếu (${summary.red})`} />
              <LegendItem color={STATUS_COLORS.gray} label={`Chưa có (${summary.gray})`} />
            </div>
          ) : (
            <div className="text-[11px] space-y-1">
              <div className="h-2 rounded" style={{
                background: "linear-gradient(90deg, #00A82D 0%, #00C4B4 35%, #00A3E0 55%, #F5A623 75%, #E74C3C 100%)"
              }} />
              <div className="flex justify-between text-slate-500">
                <span>Thấp</span><span>Cao (max {heat.max_density.toFixed(2)} HP/ha)</span>
              </div>
            </div>
          )}
        </div>
        {filters.province === "ALL" && !layers.heatmap && (
          <div className="mt-3 text-[10px] text-slate-500 italic">Mẹo: bấm vào 1 tỉnh trên bản đồ để phân cụm theo Xã.</div>
        )}
      </div>

      {/* Bottom panel: switches between HTX list & Xã list */}
      {filters.province === "ALL" && (
        <div className="absolute bottom-6 right-6 w-[380px] max-h-[45vh] mkg-glass rounded-xl overflow-hidden z-[1000]" data-testid="map-status-table">
          <div className="px-4 py-3 border-b border-white/40 flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#00A82D]" />
            <div className="font-display font-bold text-sm uppercase tracking-wide">Tình trạng theo Khu vực</div>
            <div className="ml-auto text-[10px] text-slate-500">{htxList.length} HTX · {seasons.find(s => s.code === filters.season)?.name}</div>
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
                  <tr key={h.id} onClick={() => openDetail(h.id)} className="border-b border-white/30 hover:bg-white/40 cursor-pointer" data-testid={`row-${h.code}`}>
                    <td className="px-3 py-2">
                      <div className="font-medium truncate max-w-[140px]">{h.name}</div>
                      <div className="text-[10px] text-slate-500">{h.code}</div>
                    </td>
                    <td className="text-center px-2 py-2">{h.active_count}/{h.machine_count}</td>
                    <td className="text-right px-3 py-2">
                      <span className="inline-block px-2 py-0.5 rounded text-white text-[10px] font-medium"
                        style={{ background: STATUS_COLORS[h.status_color] }}>
                        {h.coverage_ratio == null ? "—" : `${(h.coverage_ratio * 100).toFixed(0)}%`}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Commune drilldown list */}
      {byCommune && (
        <div className="absolute bottom-6 right-6 w-[380px] max-h-[55vh] mkg-glass rounded-xl overflow-hidden z-[1000]" data-testid="commune-panel">
          <div className="px-4 py-3 border-b border-white/40 flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#00A3E0]" />
            <div className="font-display font-bold text-sm uppercase tracking-wide">HTX theo Xã · {activeProvinceName}</div>
            <div className="ml-auto text-[10px] text-slate-500">{Object.keys(byCommune).length} xã</div>
          </div>
          <div className="overflow-y-auto max-h-[calc(55vh-2.5rem)] p-3 space-y-3">
            {Object.entries(byCommune).map(([commune, list]) => (
              <div key={commune} data-testid={`commune-${commune.replace(/\s+/g, "_")}`}>
                <div className="text-[11px] uppercase font-semibold text-slate-600 tracking-wide flex items-center gap-1.5 mb-1">
                  <MapPin className="w-3 h-3 text-[#00A82D]" /> {commune}
                  <span className="text-slate-400 font-normal ml-auto">{list.length} HTX</span>
                </div>
                <div className="space-y-1">
                  {list.map((h) => (
                    <button key={h.id} onClick={() => openDetail(h.id)}
                      className="w-full flex items-center gap-2 text-left px-2 py-1.5 rounded hover:bg-white/70 border border-transparent hover:border-slate-200 transition-colors">
                      <span className="w-2 h-2 rounded-full" style={{ background: STATUS_COLORS[h.status_color] }} />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium truncate">{h.name}</div>
                        <div className="text-[10px] text-slate-500">{h.code} · {h.machine_count} máy</div>
                      </div>
                      <span className="text-[10px] font-semibold" style={{ color: STATUS_COLORS[h.status_color] }}>
                        {h.coverage_ratio == null ? "—" : `${(h.coverage_ratio * 100).toFixed(0)}%`}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedDetail && (
        <div className="fixed inset-0 bg-black/40 z-[2000] flex items-center justify-center p-6"
          onClick={() => setSelectedDetail(null)} data-testid="htx-detail-modal">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[85vh] overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}>
            <div className="p-5 bg-gradient-to-r from-[#00A3E0] to-[#00C4B4] text-white">
              <div className="font-display font-bold text-xl">{selectedDetail.htx.name}</div>
              <div className="text-white/85 text-xs">{selectedDetail.htx.code} · {selectedDetail.htx.owner_name}{selectedDetail.htx.commune ? ` · ${selectedDetail.htx.commune}` : ""}</div>
            </div>
            <div className="p-5 overflow-y-auto max-h-[calc(85vh-6rem)]">
              <div className="grid grid-cols-2 gap-3 mb-4">
                <Stat label="Diện tích" value={`${selectedDetail.htx.cultivated_area_ha.toLocaleString("vi-VN")} ha`} />
                <Stat label="Tổng máy" value={selectedDetail.machines.length} />
              </div>
              <div className="mb-4 rounded-md bg-slate-50 border border-slate-200 p-3 text-xs text-slate-600 flex gap-2">
                <Clock className="w-4 h-4 shrink-0 text-[#00A3E0]" /> {selectedDetail.area_note}
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
              <div className="font-display font-bold text-sm uppercase tracking-wide mt-5 mb-2">Danh sách máy & nguồn tình trạng</div>
              <div className="overflow-x-auto border border-slate-200 rounded-md">
                <table className="w-full text-xs">
                  <thead className="bg-slate-100 text-slate-600 uppercase">
                    <tr><th className="text-left px-3 py-2">Máy</th><th className="text-left px-3 py-2">Trạng thái</th><th className="text-left px-3 py-2">Nguồn / cập nhật</th></tr>
                  </thead>
                  <tbody>
                    {selectedDetail.machines.length === 0 ? <tr><td colSpan="3" className="px-3 py-3 text-slate-500">Không có máy phù hợp bộ lọc.</td></tr> : selectedDetail.machines.map((m) => (
                      <tr key={m.id} className="border-t border-slate-200">
                        <td className="px-3 py-2"><div className="font-medium">{m.code || m.serial_no || "Máy chưa có mã"}</div><div className="text-slate-500">{m.brand} {m.model}</div></td>
                        <td className="px-3 py-2">{m.status_label}</td>
                        <td className="px-3 py-2"><div>{m.status_source_label}</div><div className="text-slate-500">{m.status_updated_at ? new Date(m.status_updated_at).toLocaleString("vi-VN") : "—"}</div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button data-testid="close-detail-btn" onClick={() => setSelectedDetail(null)}
                className="mt-4 px-4 py-2 rounded-md bg-slate-900 text-white text-sm">
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
      <select data-testid={testid} value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full text-sm bg-white border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#00C4B4]">
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  );
}

function LayerToggle({ icon: Icon, label, active, onToggle, testid }) {
  return (
    <button data-testid={testid} onClick={onToggle}
      className={`w-full flex items-center gap-2 text-xs px-2.5 py-1.5 rounded-md mb-1.5 transition-colors border ${
        active ? "bg-[#00A3E0]/10 border-[#00A3E0]/30 text-[#00A3E0]" : "bg-white/50 border-slate-200 text-slate-600 hover:bg-white"
      }`}>
      <Icon className="w-3.5 h-3.5" />
      <span className="flex-1 text-left">{label}</span>
      <span className={`w-8 h-4 rounded-full relative transition-colors ${active ? "bg-[#00A3E0]" : "bg-slate-300"}`}>
        <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${active ? "left-4" : "left-0.5"}`} />
      </span>
    </button>
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
