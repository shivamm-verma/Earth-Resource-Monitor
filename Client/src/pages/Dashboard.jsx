import { useLocation, useNavigate } from "react-router-dom";
import WeatherBox from "../components/WeatherBox";
import { useState, useCallback, useEffect, useRef } from "react";
import {
  Copy,
  Check,
  CloudSun,
  Layers,
  Download,
  Calendar,
} from "lucide-react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
// Backend selection: try local first, fallback to deployed
const LOCAL_API = import.meta.env.VITE_API_LOCAL || "http://localhost:5000";
const DEPLOYED_API =
  import.meta.env.VITE_API_DEPLOYED ||
  "https://earth-resource-monitor-backend.onrender.com";
let API = LOCAL_API;

async function testBackend(url) {
  try {
    const res = await fetch(`${url}/api/maps?lat=20&lon=77`, {
      method: "GET",
      mode: "cors",
      signal: AbortSignal.timeout(4000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

const GEE_LAYERS = [
  {
    key: "satellite",
    label: "Satellite",
    icon: "🛰",
    endpoint: "maps",
    tileKey: "satellite",
  },
  {
    key: "ndvi",
    label: "NDVI",
    icon: "🌿",
    endpoint: "vegetation",
    tileKey: "sentinel2_ndvi",
  },
  {
    key: "evi",
    label: "EVI",
    icon: "🌱",
    endpoint: "vegetation",
    tileKey: "modis_evi",
  },
  {
    key: "landcover",
    label: "Land Cover",
    icon: "🗺",
    endpoint: "landcover",
    tileKey: "esa_worldcover",
  },
  {
    key: "water",
    label: "Water",
    icon: "💧",
    endpoint: "water",
    tileKey: "jrc_occurrence",
  },
  {
    key: "elevation",
    label: "Elevation",
    icon: "⛰",
    endpoint: "terrain",
    tileKey: "srtm_elevation",
  },
  {
    key: "fire",
    label: "Fire",
    icon: "🔥",
    endpoint: "hazards",
    tileKey: "modis_fire",
  },
  {
    key: "nightlights",
    label: "Night Lights",
    icon: "🌃",
    endpoint: "urban",
    tileKey: "viirs_nightlights",
  },
  {
    key: "temperature",
    label: "Temperature",
    icon: "🌡",
    endpoint: "climate",
    tileKey: "era5_temperature",
  },
  {
    key: "flood",
    label: "Flood Risk",
    icon: "🌊",
    endpoint: "hazards",
    tileKey: "flood_extent",
  },
];

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function getCoords(formData) {
  if (!formData) return null;
  if (formData.type === "place") {
    return { lat: formData.coordinates?.lat, lon: formData.coordinates?.lng };
  }
  return { lat: formData.latitude, lon: formData.longitude };
}

function getContinent(countryCode) {
  const map = {
    AF: "Africa",
    DZ: "Africa",
    AO: "Africa",
    BJ: "Africa",
    BW: "Africa",
    BF: "Africa",
    BI: "Africa",
    CM: "Africa",
    CV: "Africa",
    CF: "Africa",
    TD: "Africa",
    KM: "Africa",
    CG: "Africa",
    CD: "Africa",
    DJ: "Africa",
    EG: "Africa",
    GQ: "Africa",
    ER: "Africa",
    ET: "Africa",
    GA: "Africa",
    GM: "Africa",
    GH: "Africa",
    GN: "Africa",
    GW: "Africa",
    CI: "Africa",
    KE: "Africa",
    LS: "Africa",
    LR: "Africa",
    LY: "Africa",
    MG: "Africa",
    MW: "Africa",
    ML: "Africa",
    MR: "Africa",
    MU: "Africa",
    MA: "Africa",
    MZ: "Africa",
    NA: "Africa",
    NE: "Africa",
    NG: "Africa",
    RW: "Africa",
    ST: "Africa",
    SN: "Africa",
    SL: "Africa",
    SO: "Africa",
    ZA: "Africa",
    SS: "Africa",
    SD: "Africa",
    SZ: "Africa",
    TZ: "Africa",
    TG: "Africa",
    TN: "Africa",
    UG: "Africa",
    ZM: "Africa",
    ZW: "Africa",
    AS: "Asia",
    AM: "Asia",
    AZ: "Asia",
    BH: "Asia",
    BD: "Asia",
    BT: "Asia",
    BN: "Asia",
    KH: "Asia",
    CN: "Asia",
    CY: "Asia",
    GE: "Asia",
    IN: "Asia",
    ID: "Asia",
    IR: "Asia",
    IQ: "Asia",
    IL: "Asia",
    JP: "Asia",
    JO: "Asia",
    KZ: "Asia",
    KW: "Asia",
    KG: "Asia",
    LA: "Asia",
    LB: "Asia",
    MY: "Asia",
    MV: "Asia",
    MN: "Asia",
    MM: "Asia",
    NP: "Asia",
    KP: "Asia",
    OM: "Asia",
    PK: "Asia",
    PS: "Asia",
    PH: "Asia",
    QA: "Asia",
    SA: "Asia",
    SG: "Asia",
    KR: "Asia",
    LK: "Asia",
    SY: "Asia",
    TW: "Asia",
    TJ: "Asia",
    TH: "Asia",
    TL: "Asia",
    TR: "Asia",
    TM: "Asia",
    AE: "Asia",
    UZ: "Asia",
    VN: "Asia",
    YE: "Asia",
    AL: "Europe",
    AD: "Europe",
    AT: "Europe",
    BY: "Europe",
    BE: "Europe",
    BA: "Europe",
    BG: "Europe",
    HR: "Europe",
    CZ: "Europe",
    DK: "Europe",
    EE: "Europe",
    FI: "Europe",
    FR: "Europe",
    DE: "Europe",
    GR: "Europe",
    HU: "Europe",
    IS: "Europe",
    IE: "Europe",
    IT: "Europe",
    XK: "Europe",
    LV: "Europe",
    LI: "Europe",
    LT: "Europe",
    LU: "Europe",
    MT: "Europe",
    MD: "Europe",
    MC: "Europe",
    ME: "Europe",
    NL: "Europe",
    MK: "Europe",
    NO: "Europe",
    PL: "Europe",
    PT: "Europe",
    RO: "Europe",
    RU: "Europe",
    SM: "Europe",
    RS: "Europe",
    SK: "Europe",
    SI: "Europe",
    ES: "Europe",
    SE: "Europe",
    CH: "Europe",
    UA: "Europe",
    GB: "Europe",
    VA: "Europe",
    AG: "North America",
    BS: "North America",
    BB: "North America",
    BZ: "North America",
    CA: "North America",
    CR: "North America",
    CU: "North America",
    DM: "North America",
    DO: "North America",
    SV: "North America",
    GD: "North America",
    GT: "North America",
    HT: "North America",
    HN: "North America",
    JM: "North America",
    MX: "North America",
    NI: "North America",
    PA: "North America",
    KN: "North America",
    LC: "North America",
    VC: "North America",
    TT: "North America",
    US: "North America",
    AR: "South America",
    BO: "South America",
    BR: "South America",
    CL: "South America",
    CO: "South America",
    EC: "South America",
    GY: "South America",
    PY: "South America",
    PE: "South America",
    SR: "South America",
    UY: "South America",
    VE: "South America",
    AU: "Oceania",
    FJ: "Oceania",
    KI: "Oceania",
    MH: "Oceania",
    FM: "Oceania",
    NR: "Oceania",
    NZ: "Oceania",
    PW: "Oceania",
    PG: "Oceania",
    WS: "Oceania",
    SB: "Oceania",
    TO: "Oceania",
    TV: "Oceania",
    VU: "Oceania",
  };
  return map[countryCode] || "—";
}

// ─── SHARED UI COMPONENTS ─────────────────────────────────────────────────────
function StatCard({ label, value, sub, accent }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col gap-1">
      <p className="text-[10px] text-slate-500 uppercase tracking-widest">
        {label}
      </p>
      <p className={`text-xl font-semibold ${accent || "text-white"}`}>
        {value}
      </p>
      {sub && <p className="text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <p className="text-[10px] text-slate-500 uppercase tracking-widest">
          {title}
        </p>
        <div className="flex-1 h-px bg-white/5" />
      </div>
      {children}
    </div>
  );
}

// ─── MAP UPDATER ──────────────────────────────────────────────────────────────
function MapUpdater({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, 10);
  }, [center]);
  return null;
}

// ─── GEE MAP PANEL ────────────────────────────────────────────────────────────
function GeeMapPanel({ lat, lon }) {
  const [activeLayer, setActiveLayer] = useState("satellite");
  const [tileUrl, setTileUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [opacity, setOpacity] = useState(0.85);
  const [startDate, setStart] = useState("2023-01-01");
  const [endDate, setEnd] = useState("2023-12-31");
  const [timeSeries, setTS] = useState(null);
  const [showDates, setShowDates] = useState(false);
  const [apiStatus, setApiStatus] = useState(LOCAL_API);
  const cache = useRef({});

  // Check backend availability on mount
  useEffect(() => {
    const checkBackend = async () => {
      // On Vercel (production), skip local check entirely
      const isProduction =
        window.location.hostname !== "localhost" &&
        window.location.hostname !== "127.0.0.1";
      if (isProduction) {
        API = DEPLOYED_API;
        setApiStatus(DEPLOYED_API);
        return;
      }
      // On local dev, try local first then fall back to deployed
      const localOk = await testBackend(LOCAL_API);
      if (localOk) {
        API = LOCAL_API;
        setApiStatus(LOCAL_API);
      } else {
        API = DEPLOYED_API;
        setApiStatus(DEPLOYED_API);
      }
    };
    checkBackend();
  }, []);

  const fetchLayer = async (layerKey, sd, ed) => {
    const layer = GEE_LAYERS.find((l) => l.key === layerKey);
    if (!layer) return;
    const cacheKey = `${layerKey}_${lat}_${lon}_${sd}_${ed}`;
    if (cache.current[cacheKey]) {
      setTileUrl(cache.current[cacheKey].tile);
      setTS(cache.current[cacheKey].ts);
      setError("");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const url = `${API}/api/${layer.endpoint}?lat=${lat}&lon=${lon}&start_date=${sd}&end_date=${ed}`;
      const res = await fetch(url, {
        method: "GET",
        mode: "cors",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error(`Remote error: ${res.status}`);
      const data = await res.json();
      const tile = data.tiles?.[layer.tileKey] || data.layers?.[layer.tileKey];
      if (!tile) throw new Error("Tile layer not available");
      setTileUrl(tile);
      const ts = data.time_series || null;
      setTS(ts);
      cache.current[cacheKey] = { tile, ts };
    } catch (e) {
      setError(e.message);
      console.error("Fetch error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLayer(activeLayer, startDate, endDate);
  }, []);

  const handleExport = async (fmt) => {
    const exportLayer = activeLayer === "satellite" ? "elevation" : activeLayer;
    const url = `${API}/api/export?lat=${lat}&lon=${lon}&layer=${exportLayer}&format=${fmt}&start_date=${startDate}&end_date=${endDate}`;
    try {
      const res = await fetch(url, {
        method: "GET",
        mode: "cors",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (fmt === "json") {
        const blob = new Blob([JSON.stringify(data, null, 2)], {
          type: "application/json",
        });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `${exportLayer}_${lat}_${lon}.json`;
        a.click();
      } else {
        alert(
          `✅ GeoTIFF export started!\nCheck Google Drive → GEE_Exports\nTask: ${data.task_id}`,
        );
      }
    } catch (e) {
      alert(`Export failed: ${e.message}`);
    }
  };

  // Extract time series data - handle both GEE FeatureCollection format and direct arrays
  const ndviData =
    timeSeries && timeSeries.features
      ? timeSeries.features
          .map((f) => ({
            month:
              parseInt(f.properties?.month) || parseInt(f.properties?.month),
            ndvi: parseFloat(f.properties?.ndvi) || 0,
          }))
          .filter(
            (d) => !isNaN(d.ndvi) && d.ndvi !== null && d.ndvi !== undefined,
          )
          .sort((a, b) => a.month - b.month)
      : [];

  const maxNdvi =
    ndviData.length > 0 ? Math.max(...ndviData.map((d) => d.ndvi || 0)) : 1;

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden flex flex-col">
      {/* TOOLBAR */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-white/3">
        <div className="flex items-center gap-2">
          <Layers className="w-3.5 h-3.5 text-blue-400" />
          <p className="text-[10px] text-slate-500 uppercase tracking-widest">
            Satellite Layers · GEE
          </p>
          {loading && (
            <div className="w-3 h-3 border border-blue-400/40 border-t-blue-400 rounded-full animate-spin" />
          )}
          {apiStatus && (
            <span className="text-[9px] text-slate-600 bg-white/5 px-2 py-0.5 rounded-full border border-white/10">
              {apiStatus === LOCAL_API ? "📍 Local" : "🌐 Cloud"}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowDates((s) => !s)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
          >
            <Calendar className="w-3 h-3 text-slate-400" />
            <span className="text-[10px] text-slate-400">
              {startDate.slice(0, 7)} → {endDate.slice(0, 7)}
            </span>
          </button>
          <button
            onClick={() => handleExport("json")}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 hover:bg-emerald-500/10 hover:border-emerald-500/30 transition-all"
          >
            <Download className="w-3 h-3 text-slate-400" />
            <span className="text-[10px] text-slate-400">JSON</span>
          </button>
          <button
            onClick={() => handleExport("geotiff")}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 hover:bg-emerald-500/10 hover:border-emerald-500/30 transition-all"
          >
            <Download className="w-3 h-3 text-slate-400" />
            <span className="text-[10px] text-slate-400">GeoTIFF</span>
          </button>
        </div>
      </div>

      {/* DATE PICKER (collapsible) */}
      {showDates && (
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5 bg-white/3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-500 uppercase tracking-widest">
              From
            </span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStart(e.target.value)}
              className="bg-white/5 border border-white/10 text-slate-300 text-xs px-2 py-1 rounded-lg outline-none focus:border-blue-500/50"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-500 uppercase tracking-widest">
              To
            </span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEnd(e.target.value)}
              className="bg-white/5 border border-white/10 text-slate-300 text-xs px-2 py-1 rounded-lg outline-none focus:border-blue-500/50"
            />
          </div>
          <button
            onClick={() => {
              fetchLayer(activeLayer, startDate, endDate);
              setShowDates(false);
            }}
            className="px-3 py-1 rounded-lg bg-blue-500/20 border border-blue-500/30 text-blue-400 text-[10px] uppercase tracking-widest hover:bg-blue-500/30 transition-all"
          >
            Apply
          </button>
        </div>
      )}

      {/* LAYER PILLS */}
      <div
        className="flex gap-2 px-4 py-3 overflow-x-auto border-b border-white/5"
        style={{ scrollbarWidth: "none" }}
      >
        {GEE_LAYERS.map((l) => (
          <button
            key={l.key}
            onClick={() => {
              setActiveLayer(l.key);
              fetchLayer(l.key, startDate, endDate);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[10px] whitespace-nowrap transition-all shrink-0 ${
              activeLayer === l.key
                ? "bg-blue-500/20 border-blue-500/40 text-blue-300"
                : "bg-white/5 border-white/10 text-slate-500 hover:text-slate-300 hover:border-white/20"
            }`}
          >
            <span>{l.icon}</span> {l.label}
          </button>
        ))}
      </div>

      {/* MAP */}
      <div className="relative" style={{ height: "360px" }}>
        {loading && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-black/60 backdrop-blur-sm">
            <div className="w-8 h-8 border border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
            <p className="text-[10px] text-blue-400 uppercase tracking-widest">
              Fetching Satellite Data
            </p>
          </div>
        )}
        {error && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 bg-red-500/10 border border-red-500/30 text-red-400 text-[10px] px-4 py-2 rounded-full">
            ⚠ {error}
          </div>
        )}
        <MapContainer
          center={[lat, lon]}
          zoom={10}
          style={{ height: "100%", width: "100%" }}
          zoomControl={true}
        >
          <MapUpdater center={[lat, lon]} />
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution="CartoDB"
          />
          {tileUrl && (
            <TileLayer key={tileUrl} url={tileUrl} opacity={opacity} />
          )}
        </MapContainer>

        {/* Opacity slider */}
        <div className="absolute bottom-3 left-3 z-50 flex items-center gap-2 bg-black/50 backdrop-blur-sm border border-white/10 rounded-full px-3 py-1.5">
          <span className="text-[9px] text-slate-500 uppercase tracking-widest">
            Opacity
          </span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={opacity}
            onChange={(e) => setOpacity(parseFloat(e.target.value))}
            className="w-16 accent-blue-400"
          />
          <span className="text-[9px] text-slate-400">
            {Math.round(opacity * 100)}%
          </span>
        </div>

        {/* Coords HUD */}
        <div className="absolute bottom-3 right-3 z-50 bg-black/50 backdrop-blur-sm border border-white/10 rounded-full px-3 py-1.5 text-[9px] text-slate-400 font-mono">
          {lat.toFixed(4)}° N · {lon.toFixed(4)}° E
        </div>
      </div>

      {/* NDVI CHART */}
      {ndviData.length > 0 && (
        <div className="px-4 py-4 border-t border-white/5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest">
              NDVI Monthly Time Series · {endDate.slice(0, 4)}
            </p>
            <span className="text-[8px] text-slate-600 bg-white/5 px-2 py-1 rounded">
              {ndviData.length} months
            </span>
          </div>
          <div className="flex items-end gap-1" style={{ height: "80px" }}>
            {ndviData.map((d) => {
              const monthIdx = Math.max(0, Math.min(11, d.month - 1));
              const monthName = MONTHS[monthIdx];
              const normalizedValue = maxNdvi > 0 ? d.ndvi / maxNdvi : 0;
              return (
                <div
                  key={d.month}
                  className="flex-1 flex flex-col items-center gap-1 h-full justify-end group relative"
                >
                  {/* Tooltip */}
                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-900 border border-white/20 text-slate-200 text-[9px] px-3 py-2 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-lg">
                    <div className="font-semibold">{monthName}</div>
                    <div className="text-blue-300">
                      {(d.ndvi || 0).toLocaleString(undefined, {
                        maximumFractionDigits: 0,
                      })}
                    </div>
                  </div>
                  {/* Bar */}
                  <div
                    className="w-full rounded-sm transition-all duration-300 hover:opacity-80"
                    style={{
                      height: `${Math.max(normalizedValue * 100, 2)}%`,
                      background:
                        normalizedValue > 0.7
                          ? "linear-gradient(to top, #10b981, #6ee7b7)"
                          : normalizedValue > 0.4
                            ? "linear-gradient(to top, #3b82f6, #93c5fd)"
                            : normalizedValue > 0.1
                              ? "linear-gradient(to top, #f59e0b, #fcd34d)"
                              : "linear-gradient(to top, #8b5cf6, #a78bfa)",
                    }}
                  />
                  <span className="text-[8px] text-slate-600 mt-1">
                    {monthName.charAt(0)}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="mt-3 text-[9px] text-slate-500">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1">
                <div
                  className="w-2 h-2 rounded-sm"
                  style={{
                    background: "linear-gradient(to top, #10b981, #6ee7b7)",
                  }}
                ></div>
                <span>High veg</span>
              </div>
              <div className="flex items-center gap-1">
                <div
                  className="w-2 h-2 rounded-sm"
                  style={{
                    background: "linear-gradient(to top, #3b82f6, #93c5fd)",
                  }}
                ></div>
                <span>Moderate</span>
              </div>
              <div className="flex items-center gap-1">
                <div
                  className="w-2 h-2 rounded-sm"
                  style={{
                    background: "linear-gradient(to top, #f59e0b, #fcd34d)",
                  }}
                ></div>
                <span>Low veg</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MAIN DASHBOARD ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const formData = state?.formData;
  const coords = getCoords(formData);

  const [modelStatus] = useState("idle");
  const [weatherData, setWeatherData] = useState(null);
  const [locationMeta, setLocationMeta] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!weatherData) return;
    navigator.clipboard.writeText(JSON.stringify(weatherData, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useCallback(() => {
    if (!coords?.lat || !coords?.lon) return;
    fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${coords.lat}&lon=${coords.lon}&format=json`,
    )
      .then((r) => r.json())
      .then((data) => {
        const addr = data.address || {};
        setLocationMeta({
          country: addr.country || "—",
          state: addr.state || addr.region || "—",
          continent: getContinent(addr.country_code?.toUpperCase()),
        });
      })
      .catch(() => {});
  }, [coords?.lat, coords?.lon])();

  if (!formData) {
    return (
      <main className="min-h-screen bg-[#030712] text-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-slate-400 text-sm">
            No data found. Go back and submit a location.
          </p>
          <button
            onClick={() => navigate("/")}
            className="px-5 py-2.5 rounded-full bg-white/10 border border-white/10 text-sm text-white hover:bg-white/15 transition-all"
          >
            ← Back to Home
          </button>
        </div>
      </main>
    );
  }

  const displayName =
    formData.type === "place"
      ? formData.coordinates?.displayName || formData.place
      : `${formData.latitude?.toFixed(4)}, ${formData.longitude?.toFixed(4)}`;

  const shortName =
    formData.type === "place"
      ? formData.place
      : `${formData.latitude?.toFixed(2)}°, ${formData.longitude?.toFixed(2)}°`;

  return (
    <main className="relative min-h-screen bg-[url('/stars-bg-verydark.avif')] bg-cover bg-center text-white overflow-x-hidden">
      <div className="absolute inset-0 bg-black/65" />
      <div className="absolute -top-37.5 left-1/4 w-150 h-150 rounded-full bg-blue-600/6 blur-[130px] pointer-events-none" />
      <div className="absolute -bottom-25 right-0 w-100 h-100 rounded-full bg-emerald-500/5 blur-[100px] pointer-events-none" />

      <div className="relative z-10 max-w-6xl mx-auto px-5 md:px-10 py-8">
        {/* TOP NAV */}
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-3">
            <img
              src="/newERM-logo.png"
              alt="ERM"
              className="w-7 h-7 rounded-full"
            />
            <span className="text-xs font-medium tracking-[0.25em] text-slate-500 uppercase">
              Earth Resource Monitor
            </span>
          </div>
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs text-slate-400 hover:text-white hover:border-white/20 transition-all"
          >
            ← New Analysis
          </button>
        </div>

        {/* HERO HEADER */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] uppercase tracking-widest text-slate-500">
              Analysis Result
            </span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${
                modelStatus === "running"
                  ? "text-amber-400 border-amber-500/30 bg-amber-500/10"
                  : modelStatus === "done"
                    ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
                    : modelStatus === "error"
                      ? "text-red-400 border-red-500/30 bg-red-500/10"
                      : "text-slate-400 border-white/10 bg-white/5"
              }`}
            >
              {modelStatus === "running"
                ? "● Model Running"
                : modelStatus === "done"
                  ? "✓ Complete"
                  : modelStatus === "error"
                    ? "✕ Error"
                    : "○ Model Idle"}
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-white">
            {shortName}
          </h1>
          <p className="text-slate-500 text-sm mt-1 max-w-xl truncate">
            {displayName}
          </p>
          {locationMeta && (
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {[
                locationMeta.continent,
                locationMeta.country,
                locationMeta.state,
              ]
                .filter((v) => v && v !== "—")
                .map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-slate-400 tracking-wide"
                  >
                    {tag}
                  </span>
                ))}
            </div>
          )}
        </div>

        {/* QUICK STATS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
          <StatCard
            label="Analysis Type"
            value={formData.analysisType || "Full"}
            sub="Selected mode"
            accent="text-blue-400"
          />
          <StatCard
            label="Input Type"
            value={formData.type === "place" ? "Place Name" : "Coordinates"}
            sub={
              formData.type === "coordinates"
                ? `±${formData.radiusKm} km radius`
                : "Geocoded"
            }
          />
          {coords?.lat && (
            <StatCard
              label="Latitude"
              value={`${parseFloat(coords.lat).toFixed(4)}°`}
              sub="North / South"
              accent="text-emerald-400"
            />
          )}
          {coords?.lon && (
            <StatCard
              label="Longitude"
              value={`${parseFloat(coords.lon).toFixed(4)}°`}
              sub="East / West"
              accent="text-emerald-400"
            />
          )}
        </div>

        {/* MAIN GRID */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* LEFT COL */}
          <div className="md:col-span-2 flex flex-col gap-6">
            {/* GEE MAP — replaces old empty satellite placeholder */}
            {coords?.lat && coords?.lon && (
              <Section title="Satellite Maps · Google Earth Engine">
                <GeeMapPanel
                  lat={parseFloat(coords.lat)}
                  lon={parseFloat(coords.lon)}
                />
              </Section>
            )}

            {/* RAW WEATHER JSON */}
            <Section title="Weather Data — Raw JSON">
              <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <CloudSun className="w-3.5 h-3.5 text-sky-400" />
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest">
                      OpenWeatherMap · Live Response
                    </p>
                  </div>
                  <button
                    onClick={handleCopy}
                    disabled={!weatherData}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-[10px] text-emerald-400">
                          Copied
                        </span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 text-slate-400" />
                        <span className="text-[10px] text-slate-400">Copy</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="p-4 min-h-24">
                  {weatherData ? (
                    <pre className="text-xs text-sky-400 font-mono overflow-x-auto whitespace-pre-wrap">
                      {JSON.stringify(weatherData, null, 2)}
                    </pre>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-600 animate-pulse" />
                      <p className="text-slate-500 text-xs">
                        Fetching weather data...
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </Section>

            {/* PIPELINE STATUS */}
            <Section title="Pipeline Status">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col gap-2.5">
                {[
                  { step: "Input received", done: true },
                  { step: "Coordinates resolved", done: !!coords?.lat },
                  { step: "Weather data fetched", done: !!weatherData },
                  { step: "Satellite pull (GEE)", done: true },
                  { step: "Model segmentation", done: false },
                  { step: "Risk assessment", done: false },
                  { step: "Report generation", done: false },
                ].map(({ step, done }) => (
                  <div key={step} className="flex items-center gap-3">
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                        done
                          ? "border-emerald-500/50 bg-emerald-500/15"
                          : "border-white/10 bg-white/5"
                      }`}
                    >
                      {done && (
                        <svg
                          className="w-2.5 h-2.5 text-emerald-400"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2.5}
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M4.5 12.75l6 6 9-13.5"
                          />
                        </svg>
                      )}
                    </div>
                    <p
                      className={`text-xs ${done ? "text-slate-300" : "text-slate-600"}`}
                    >
                      {step}
                    </p>
                  </div>
                ))}
              </div>
            </Section>
          </div>

          {/* RIGHT COL */}
          <div className="flex flex-col gap-6">
            <Section title="Live Weather">
              {coords?.lat && coords?.lon ? (
                <WeatherBox
                  lat={coords.lat}
                  lon={coords.lon}
                  onData={setWeatherData}
                />
              ) : (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                  <p className="text-xs text-slate-500">
                    Coordinates unavailable
                  </p>
                </div>
              )}
            </Section>

            <Section title="Analysis Config">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col gap-3">
                {[
                  { label: "Mode", value: formData.analysisType || "full" },
                  { label: "Region", value: shortName },
                  {
                    label: "Submitted",
                    value: formData.timestamp
                      ? new Date(formData.timestamp).toLocaleTimeString()
                      : "—",
                  },
                  ...(formData.radiusKm
                    ? [{ label: "Radius", value: `${formData.radiusKm} km` }]
                    : []),
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    className="flex items-center justify-between"
                  >
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest">
                      {label}
                    </p>
                    <p className="text-xs text-slate-300 font-medium capitalize">
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            </Section>

            <Section title="Risk Zones">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col gap-2">
                <p className="text-xs text-slate-600">
                  Risk zone data will populate after model run.
                </p>
                {["High Risk", "Moderate", "Low Risk"].map((zone, i) => (
                  <div key={zone} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-2 h-2 rounded-full ${i === 0 ? "bg-red-400" : i === 1 ? "bg-amber-400" : "bg-emerald-400"}`}
                      />
                      <p className="text-xs text-slate-500">{zone}</p>
                    </div>
                    <p className="text-[10px] text-slate-600">—</p>
                  </div>
                ))}
              </div>
            </Section>
          </div>
        </div>

        <p className="text-center text-xs text-slate-700 mt-12 tracking-wide">
          ERM · Earth Resource Monitor
        </p>
      </div>
    </main>
  );
}
