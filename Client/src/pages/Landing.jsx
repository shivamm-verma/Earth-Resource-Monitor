import { useState } from 'react'
import SearchBar from '../components/SearchBar'
import GeoInput from '../components/GeoInput'

export default function Landing() {
  const [mode, setMode] = useState('place')
  const [formData, setFormData] = useState(null)

  const handleSubmit = (data) => {
    setFormData(data)
    console.log('Collected data to send to model:', data)
    // TODO: send to backend/model API
  }

  return (
    <main className="min-h-screen bg-[#030712] text-white flex flex-col items-center justify-center px-4 relative overflow-hidden">

      {/* Background glow blobs */}
      <div className="absolute top-[-150px] left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full bg-blue-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-100px] right-[-100px] w-[400px] h-[400px] rounded-full bg-emerald-500/8 blur-[100px] pointer-events-none" />

      {/* Logo + Heading */}
      <div className="flex flex-col items-center mb-12 z-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-emerald-400 flex items-center justify-center text-sm font-bold tracking-wider">
            <img src="" alt="" />
          </div>
          <span className="text-sm font-medium tracking-[0.3em] text-slate-400 uppercase">
            Earth Resource Monitor
          </span>
        </div>

        <h1 className="text-4xl md:text-6xl font-semibold text-center leading-tight tracking-tight">
          Environmental Intelligence
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
            for Any Location
          </span>
        </h1>

        <p className="mt-5 text-slate-400 text-center text-base md:text-lg max-w-xl leading-relaxed">
          Input a place name or exact coordinates to analyze satellite data,
          weather patterns, and environmental risk for any region on Earth.
        </p>
      </div>

      {/* Toggle */}
      <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-full p-1 mb-8 z-10">
        <button
          onClick={() => setMode('place')}
          className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
            mode === 'place'
              ? 'bg-white text-black'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Place Name
        </button>
        <button
          onClick={() => setMode('geo')}
          className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
            mode === 'geo'
              ? 'bg-white text-black'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Coordinates
        </button>
      </div>

      {/* Input Section */}
      <div className="w-full max-w-xl z-10">
        {mode === 'place' ? (
          <SearchBar onSubmit={handleSubmit} />
        ) : (
          <GeoInput onSubmit={handleSubmit} />
        )}
      </div>

      {/* Submitted data preview — temporary dev helper */}
      {formData && (
        <div className="mt-8 w-full max-w-xl z-10 bg-white/5 border border-white/10 rounded-2xl p-5">
          <p className="text-xs text-slate-500 uppercase tracking-widest mb-3">Collected — ready to send to model</p>
          <pre className="text-sm text-emerald-400 font-mono overflow-x-auto">
            {JSON.stringify(formData, null, 2)}
          </pre>
        </div>
      )}

      {/* Footer */}
      <p className="absolute bottom-6 text-xs text-slate-600 z-10 tracking-wide">
        ERM · Earth Resource Monitor
      </p>
    </main>
  )
}