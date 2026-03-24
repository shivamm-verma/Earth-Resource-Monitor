import { useLocation, useNavigate } from "react-router-dom";
import WeatherBox from "../components/WeatherBox";
import { useState, useCallback } from "react";
import { Copy, Check, CloudSun } from "lucide-react";

function getCoords(formData) {
  if (!formData) return null;
  if (formData.type === "place") {
    return {
      lat: formData.coordinates?.lat,
      lon: formData.coordinates?.lng,
    };
  }
  return {
    lat: formData.latitude,
    lon: formData.longitude,
  };
}

function getContinent(countryCode) {
  const map = {
    AF:"Africa",DZ:"Africa",AO:"Africa",BJ:"Africa",BW:"Africa",BF:"Africa",BI:"Africa",CM:"Africa",CV:"Africa",CF:"Africa",TD:"Africa",KM:"Africa",CG:"Africa",CD:"Africa",DJ:"Africa",EG:"Africa",GQ:"Africa",ER:"Africa",ET:"Africa",GA:"Africa",GM:"Africa",GH:"Africa",GN:"Africa",GW:"Africa",CI:"Africa",KE:"Africa",LS:"Africa",LR:"Africa",LY:"Africa",MG:"Africa",MW:"Africa",ML:"Africa",MR:"Africa",MU:"Africa",MA:"Africa",MZ:"Africa",NA:"Africa",NE:"Africa",NG:"Africa",RW:"Africa",ST:"Africa",SN:"Africa",SL:"Africa",SO:"Africa",ZA:"Africa",SS:"Africa",SD:"Africa",SZ:"Africa",TZ:"Africa",TG:"Africa",TN:"Africa",UG:"Africa",ZM:"Africa",ZW:"Africa",
    AS:"Asia",AM:"Asia",AZ:"Asia",BH:"Asia",BD:"Asia",BT:"Asia",BN:"Asia",KH:"Asia",CN:"Asia",CY:"Asia",GE:"Asia",IN:"Asia",ID:"Asia",IR:"Asia",IQ:"Asia",IL:"Asia",JP:"Asia",JO:"Asia",KZ:"Asia",KW:"Asia",KG:"Asia",LA:"Asia",LB:"Asia",MY:"Asia",MV:"Asia",MN:"Asia",MM:"Asia",NP:"Asia",KP:"Asia",OM:"Asia",PK:"Asia",PS:"Asia",PH:"Asia",QA:"Asia",SA:"Asia",SG:"Asia",KR:"Asia",LK:"Asia",SY:"Asia",TW:"Asia",TJ:"Asia",TH:"Asia",TL:"Asia",TR:"Asia",TM:"Asia",AE:"Asia",UZ:"Asia",VN:"Asia",YE:"Asia",
    AL:"Europe",AD:"Europe",AT:"Europe",BY:"Europe",BE:"Europe",BA:"Europe",BG:"Europe",HR:"Europe",CZ:"Europe",DK:"Europe",EE:"Europe",FI:"Europe",FR:"Europe",DE:"Europe",GR:"Europe",HU:"Europe",IS:"Europe",IE:"Europe",IT:"Europe",XK:"Europe",LV:"Europe",LI:"Europe",LT:"Europe",LU:"Europe",MT:"Europe",MD:"Europe",MC:"Europe",ME:"Europe",NL:"Europe",MK:"Europe",NO:"Europe",PL:"Europe",PT:"Europe",RO:"Europe",RU:"Europe",SM:"Europe",RS:"Europe",SK:"Europe",SI:"Europe",ES:"Europe",SE:"Europe",CH:"Europe",UA:"Europe",GB:"Europe",VA:"Europe",
    AG:"North America",BS:"North America",BB:"North America",BZ:"North America",CA:"North America",CR:"North America",CU:"North America",DM:"North America",DO:"North America",SV:"North America",GD:"North America",GT:"North America",HT:"North America",HN:"North America",JM:"North America",MX:"North America",NI:"North America",PA:"North America",KN:"North America",LC:"North America",VC:"North America",TT:"North America",US:"North America",
    AR:"South America",BO:"South America",BR:"South America",CL:"South America",CO:"South America",EC:"South America",GY:"South America",PY:"South America",PE:"South America",SR:"South America",UY:"South America",VE:"South America",
    AU:"Oceania",FJ:"Oceania",KI:"Oceania",MH:"Oceania",FM:"Oceania",NR:"Oceania",NZ:"Oceania",PW:"Oceania",PG:"Oceania",WS:"Oceania",SB:"Oceania",TO:"Oceania",TV:"Oceania",VU:"Oceania",
  };
  return map[countryCode] || "—";
}

function StatCard({ label, value, sub, accent }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col gap-1">
      <p className="text-[10px] text-slate-500 uppercase tracking-widest">{label}</p>
      <p className={`text-xl font-semibold ${accent || "text-white"}`}>{value}</p>
      {sub && <p className="text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <p className="text-[10px] text-slate-500 uppercase tracking-widest">{title}</p>
        <div className="flex-1 h-px bg-white/5" />
      </div>
      {children}
    </div>
  );
}

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
      `https://nominatim.openstreetmap.org/reverse?lat=${coords.lat}&lon=${coords.lon}&format=json`
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
          <p className="text-slate-400 text-sm">No data found. Go back and submit a location.</p>
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

        {/* Top nav */}
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-3">
            <img src="/newERM-logo.png" alt="ERM" className="w-7 h-7 rounded-full" />
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

        {/* Hero header */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] uppercase tracking-widest text-slate-500">Analysis Result</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${
              modelStatus === "running"
                ? "text-amber-400 border-amber-500/30 bg-amber-500/10"
                : modelStatus === "done"
                ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
                : modelStatus === "error"
                ? "text-red-400 border-red-500/30 bg-red-500/10"
                : "text-slate-400 border-white/10 bg-white/5"
            }`}>
              {modelStatus === "running" ? "● Model Running" :
               modelStatus === "done"    ? "✓ Complete" :
               modelStatus === "error"   ? "✕ Error" :
               "○ Model Idle"}
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-white">
            {shortName}
          </h1>
          <p className="text-slate-500 text-sm mt-1 max-w-xl truncate">{displayName}</p>
          {locationMeta && (
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {[locationMeta.continent, locationMeta.country, locationMeta.state]
                .filter((v) => v && v !== "—")
                .map((tag) => (
                  <span key={tag} className="text-[10px] px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-slate-400 tracking-wide">
                    {tag}
                  </span>
                ))}
            </div>
          )}
        </div>

        {/* Quick stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
          <StatCard label="Analysis Type" value={formData.analysisType || "Full"} sub="Selected mode" accent="text-blue-400" />
          <StatCard label="Input Type" value={formData.type === "place" ? "Place Name" : "Coordinates"} sub={formData.type === "coordinates" ? `±${formData.radiusKm} km radius` : "Geocoded"} />
          {coords?.lat && <StatCard label="Latitude" value={`${parseFloat(coords.lat).toFixed(4)}°`} sub="North / South" accent="text-emerald-400" />}
          {coords?.lon && <StatCard label="Longitude" value={`${parseFloat(coords.lon).toFixed(4)}°`} sub="East / West" accent="text-emerald-400" />}
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* LEFT col */}
          <div className="md:col-span-2 flex flex-col gap-6">

            <Section title="Segmented Satellite Image">
              <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden aspect-video flex items-center justify-center relative">
                <div className="absolute inset-0 bg-linear-to-br from-blue-900/20 to-emerald-900/20" />
                <div className="text-center z-10">
                  <div className="w-10 h-10 rounded-full border border-white/10 bg-white/5 flex items-center justify-center mx-auto mb-3">
                    <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5M4.5 3h15A1.5 1.5 0 0121 4.5v15a1.5 1.5 0 01-1.5 1.5h-15A1.5 1.5 0 013 19.5v-15A1.5 1.5 0 014.5 3z"/>
                    </svg>
                  </div>
                  <p className="text-slate-500 text-xs">Segmented map output will appear here</p>
                  <p className="text-slate-600 text-[10px] mt-1">Awaiting model response</p>
                </div>
              </div>
            </Section>

            <Section title="Model Output — Raw JSON">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 min-h-35">
                {modelStatus === "done" ? (
                  <pre className="text-xs text-emerald-400 font-mono overflow-x-auto">{"{ }"}</pre>
                ) : (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${modelStatus === "running" ? "bg-amber-400 animate-pulse" : "bg-slate-600"}`} />
                      <p className="text-slate-500 text-xs">
                        {modelStatus === "running" ? "Model is processing..." : "Waiting for model to run"}
                      </p>
                    </div>
                    <p className="text-[10px] text-slate-600 uppercase tracking-widest mt-2">Input Payload</p>
                    <pre className="text-xs text-slate-400 font-mono overflow-x-auto">
                      {JSON.stringify(formData, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </Section>

            {/* Raw Weather JSON */}
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
                        <span className="text-[10px] text-emerald-400">Copied</span>
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
                      <p className="text-slate-500 text-xs">Fetching weather data...</p>
                    </div>
                  )}
                </div>
              </div>
            </Section>

            <Section title="Pipeline Status">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col gap-2.5">
                {[
                  { step: "Input received",       done: true },
                  { step: "Coordinates resolved", done: !!coords?.lat },
                  { step: "Weather data fetched", done: !!weatherData },
                  { step: "Satellite pull",        done: false },
                  { step: "Model segmentation",   done: false },
                  { step: "Risk assessment",       done: false },
                  { step: "Report generation",     done: false },
                ].map(({ step, done }) => (
                  <div key={step} className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                      done ? "border-emerald-500/50 bg-emerald-500/15" : "border-white/10 bg-white/5"
                    }`}>
                      {done && (
                        <svg className="w-2.5 h-2.5 text-emerald-400" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5"/>
                        </svg>
                      )}
                    </div>
                    <p className={`text-xs ${done ? "text-slate-300" : "text-slate-600"}`}>{step}</p>
                  </div>
                ))}
              </div>
            </Section>

          </div>

          {/* RIGHT col */}
          <div className="flex flex-col gap-6">

            <Section title="Live Weather">
              {coords?.lat && coords?.lon ? (
                <WeatherBox lat={coords.lat} lon={coords.lon} onData={setWeatherData} />
              ) : (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                  <p className="text-xs text-slate-500">Coordinates unavailable</p>
                </div>
              )}
            </Section>

            <Section title="Analysis Config">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col gap-3">
                {[
                  { label: "Mode",      value: formData.analysisType || "full" },
                  { label: "Region",    value: shortName },
                  { label: "Submitted", value: formData.timestamp ? new Date(formData.timestamp).toLocaleTimeString() : "—" },
                  ...(formData.radiusKm ? [{ label: "Radius", value: `${formData.radiusKm} km` }] : []),
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between">
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest">{label}</p>
                    <p className="text-xs text-slate-300 font-medium capitalize">{value}</p>
                  </div>
                ))}
              </div>
            </Section>

            <Section title="Risk Zones">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col gap-2">
                <p className="text-xs text-slate-600">Risk zone data will populate here after model run.</p>
                {["High Risk", "Moderate", "Low Risk"].map((zone, i) => (
                  <div key={zone} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${i === 0 ? "bg-red-400" : i === 1 ? "bg-amber-400" : "bg-emerald-400"}`} />
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