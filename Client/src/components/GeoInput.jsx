import { useState } from 'react'

export default function GeoInput({ onSubmit }) {
  const [lat, setLat] = useState('')
  const [lon, setLon] = useState('')
  const [radius, setRadius] = useState('50')
  const [analysisType, setAnalysisType] = useState('full')
  const [error, setError] = useState('')

  const validate = () => {
    const latN = parseFloat(lat)
    const lonN = parseFloat(lon)
    if (isNaN(latN) || isNaN(lonN)) return 'Enter valid numeric coordinates.'
    if (latN < -90 || latN > 90) return 'Latitude must be between -90 and 90.'
    if (lonN < -180 || lonN > 180) return 'Longitude must be between -180 and 180.'
    return ''
  }

  const handleSubmit = () => {
    const err = validate()
    if (err) { setError(err); return }
    setError('')
    onSubmit({
      type: 'coordinates',
      latitude: parseFloat(lat),
      longitude: parseFloat(lon),
      radiusKm: parseInt(radius),
      analysisType,
      timestamp: new Date().toISOString(),
    })
  }

  const handleLocate = () => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition((pos) => {
      setLat(pos.coords.latitude.toFixed(6))
      setLon(pos.coords.longitude.toFixed(6))
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 focus-within:border-blue-500/50 transition-colors">
          <label className="block text-[10px] text-slate-500 uppercase tracking-widest mb-1">Latitude</label>
          <input
            type="number"
            value={lat}
            onChange={(e) => setLat(e.target.value)}
            placeholder="28.6139"
            className="w-full bg-transparent text-white text-sm outline-none placeholder-slate-700"
          />
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 focus-within:border-blue-500/50 transition-colors">
          <label className="block text-[10px] text-slate-500 uppercase tracking-widest mb-1">Longitude</label>
          <input
            type="number"
            value={lon}
            onChange={(e) => setLon(e.target.value)}
            placeholder="77.2090"
            className="w-full bg-transparent text-white text-sm outline-none placeholder-slate-700"
          />
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5">
        <label className="block text-[10px] text-slate-500 uppercase tracking-widest mb-2">
          Analysis Radius — {radius} km
        </label>
        <input
          type="range"
          min="10"
          max="500"
          value={radius}
          onChange={(e) => setRadius(e.target.value)}
          className="w-full accent-blue-500"
        />
        <div className="flex justify-between text-[10px] text-slate-600 mt-1">
          <span>10 km</span>
          <span>500 km</span>
        </div>
      </div>

      <div className="flex gap-2">
        {['full', 'vegetation', 'water', 'disaster'].map((type) => (
          <button
            key={type}
            onClick={() => setAnalysisType(type)}
            className={`flex-1 py-2 rounded-xl text-xs font-medium capitalize transition-all ${
              analysisType === type
                ? 'bg-blue-600/30 border border-blue-500/50 text-blue-300'
                : 'bg-white/5 border border-white/5 text-slate-500 hover:text-slate-300'
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      {error && <p className="text-xs text-red-400 -mt-1">{error}</p>}

      <div className="flex gap-3">
        <button
          onClick={handleLocate}
          className="px-4 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-slate-400 text-sm hover:text-white hover:border-white/20 transition-all"
        >
          📍 Use My Location
        </button>
        <button
          onClick={handleSubmit}
          disabled={!lat || !lon}
          className="flex-1 py-3.5 rounded-2xl bg-linear-to-r from-blue-600 to-emerald-500 text-white text-sm font-semibold tracking-wide hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Analyze Region
        </button>
      </div>
    </div>
  )
}