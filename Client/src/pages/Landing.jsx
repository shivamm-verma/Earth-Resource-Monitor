import { useState } from "react";
import SearchBar from "../components/SearchBar";
import GeoInput from "../components/GeoInput";
import EarthGlobe from "../components/EarthGlobe";

export default function Landing() {
  const [mode, setMode] = useState("place");
  const [formData, setFormData] = useState(null);

  const handleSubmit = (data) => {
    setFormData(data);
    console.log("Collected data to send to model:", data);
  };

  return (
    <main className="relative min-h-screen bg-[url('/stars-bg-verydark.avif')] bg-cover bg-center text-white overflow-hidden">
      {/* overlay with 80% black = bg appears ~20% visible */}
      <div className="absolute inset-0 bg-black/55"></div>
      
      {/* <main className="min-h-screen bg-[#030712] text-white relative overflow-hidden" > */}

      {/* Background glows */}
      <div className="absolute -top-37.5 left-1/4 w-150 h-150 rounded-full bg-blue-600/8 blur-[130px] pointer-events-none" />
      <div className="absolute -bottom-25 -right-25 w-100 h-100 rounded-full bg-emerald-500/6 blur-[100px] pointer-events-none" />

      {/* Layout — stacked on mobile, side-by-side on desktop */}
      <div className="min-h-screen flex flex-col-reverse md:flex-row items-center justify-center gap-0 md:gap-10 px-6 md:px-16 py-10 md:py-0">
        {/* LEFT — Input Section */}
        <div className="w-full md:w-120 flex flex-col z-10">
          {/* Logo + badge */}
          <div className="flex items-center gap-2.5 mb-8">
            <div className="w-8 h-8 rounded-full shadow-lg shadow-white/40  emerald-400 flex items-center justify-center text-xs font-bold">
              <img src="/newERM-logo.png" alt="" />
            </div>
            <span className="text-xs font-medium tracking-[0.25em] text-slate-500 uppercase">
              Earth Resource Monitor
            </span>
          </div>

          <h1 className="text-3xl md:text-5xl font-semibold leading-tight tracking-tight mb-4">
            Environmental
            <br />
            <span className="text-transparent bg-clip-text bg-linear-to-r from-blue-400 to-emerald-400">
              Intelligence
            </span>
            <br />
            for Any Location
          </h1>

          <p className="text-slate-500 text-sm md:text-base leading-relaxed mb-8 max-w-sm">
            Input a place name or exact coordinates to analyze satellite data,
            weather patterns, and environmental risk for any region on Earth.
          </p>

          {/* Toggle */}
          <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-full p-1 mb-6 w-fit">
            <button
              onClick={() => setMode("place")}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                mode === "place"
                  ? "bg-white text-black"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Place Name
            </button>
            <button
              onClick={() => setMode("geo")}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                mode === "geo"
                  ? "bg-white text-black"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Coordinates
            </button>
          </div>

          {/* Form */}
          {mode === "place" ? (
            <SearchBar onSubmit={handleSubmit} />
          ) : (
            <GeoInput onSubmit={handleSubmit} />
          )}

          {/* Dev data preview */}
          {formData && (
            <div className="mt-6 bg-white/5 border border-white/10 rounded-2xl p-4">
              <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-2">
                Ready to send to model
              </p>
              <pre className="text-xs text-emerald-400 font-mono overflow-x-auto">
                {JSON.stringify(formData, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* RIGHT — 3D Earth Globe */}
        {/* On mobile: smaller, sits on top. On desktop: large, right side */}
        <div className="w-65 h-65 sm:w-85 sm:h-85 md:w-130 md:h-130 lg:w-150 lg:h-150 shrink-0 z-10">
          <EarthGlobe />
        </div>
      </div>

      {/* Footer */}
      <p className="absolute bottom-5 left-1/2 -translate-x-1/2 text-xs text-slate-700 tracking-wide z-10">
        ERM · Earth Resource Monitor
      </p>
    </main>
  );
}
