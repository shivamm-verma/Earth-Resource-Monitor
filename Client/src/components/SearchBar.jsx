import { useState } from 'react'

async function getCoordinates(place) {
  try {
    const response = await fetch(
      `https://photon.komoot.io/api/?q=${encodeURIComponent(place)}&limit=1`
    )

    if (!response.ok) throw new Error('Network failed')

    const data = await response.json()
    if (!data?.features?.length) return null

    const f = data.features[0]
    return {
      lat: f.geometry.coordinates[1],
      lng: f.geometry.coordinates[0],
      displayName: [f.properties.name, f.properties.state, f.properties.country]
        .filter(Boolean).join(', ')
    }
  } catch (err) {
    console.error('Geocoding error:', err.message)
    return null
  }
}

export default function SearchBar({ onSubmit }) {
  const [place, setPlace] = useState('')
  const [analysisType, setAnalysisType] = useState('full')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [suggestLoading, setSuggestLoading] = useState(false)

  // Live suggestions as user types
  const handleChange = async (val) => {
    setPlace(val)
    setError('')
    if (val.trim().length < 3) { setSuggestions([]); return }

    setSuggestLoading(true)
    try {
      const res = await fetch(
        `https://photon.komoot.io/api/?q=${encodeURIComponent(val)}&limit=5`
      )
      const data = await res.json()
      setSuggestions(data?.features || [])
      setShowSuggestions(true)
    } catch {
      setSuggestions([])
    }
    setSuggestLoading(false)
  }

  const pickSuggestion = (item) => {
    setPlace(item.properties?.name || item.properties?.city || item.properties?.country || '')
    setSuggestions([])
    setShowSuggestions(false)
    setError('')
  }

  const handleSubmit = async () => {
    if (!place.trim()) return
    setLoading(true)
    setError('')
    setShowSuggestions(false)

    const coords = await getCoordinates(place.trim())
    setLoading(false)

    if (!coords) {
      setError('Location not found. Try a different name or use coordinates instead.')
      return
    }

    onSubmit({
      type: 'place',
      place: place.trim(),
      analysisType,
      coordinates: coords,
      timestamp: new Date().toISOString(),
    })
  }

  return (
    <div className="flex flex-col gap-4">

      {/* Input + suggestions */}
      <div className="relative">
        <div className={`flex items-center bg-white/5 border rounded-2xl px-5 py-4 gap-3 transition-colors ${
          error ? 'border-red-500/40' : 'border-white/10 focus-within:border-blue-500/50'
        }`}>
          {/* Search icon */}
          <svg className="w-4 h-4 text-slate-500 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"/>
          </svg>
          <input
            type="text"
            value={place}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            placeholder="Country, continent, or region — e.g. Amazon Basin"
            className="flex-1 bg-transparent text-white placeholder-slate-600 text-sm outline-none"
          />
          {suggestLoading && (
            <svg className="w-4 h-4 text-slate-500 animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
          )}
          {place && !suggestLoading && (
            <button onClick={() => { setPlace(''); setSuggestions([]); setError('') }}
              className="text-slate-600 hover:text-slate-400 text-xs shrink-0">✕</button>
          )}
        </div>

        {/* Dropdown suggestions */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-[#0d1117] border border-white/10 rounded-2xl overflow-hidden z-50 shadow-xl">
            {suggestions.map((item, i) => (
              <button
                key={i}
                onMouseDown={() => pickSuggestion(item)}
                className="w-full px-4 py-3 text-left text-sm text-slate-300 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 flex flex-col gap-0.5"
              >
                <span className="font-medium text-white truncate">
                  {item.properties?.name || item.properties?.city || item.properties?.country}
                </span>
                <span className="text-[11px] text-slate-500 truncate">
                  {[item.properties?.state, item.properties?.country].filter(Boolean).join(', ')}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Inline error — no alert() */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20">
          <svg className="w-3.5 h-3.5 text-red-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
          </svg>
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      {/* Analysis type */}
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

      <button
        onClick={handleSubmit}
        disabled={!place.trim() || loading}
        className="w-full py-3.5 rounded-2xl bg-linear-to-r from-blue-600 to-emerald-500 text-white text-sm font-semibold tracking-wide hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
            Locating...
          </span>
        ) : "Analyze Region"}
      </button>
    </div>
  )
}