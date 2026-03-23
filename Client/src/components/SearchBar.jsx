import { useState } from 'react'

export default function SearchBar({ onSubmit }) {
  const [place, setPlace] = useState('')
  const [analysisType, setAnalysisType] = useState('full')

  const handleSubmit = () => {
    if (!place.trim()) return
    onSubmit({
      type: 'place',
      place: place.trim(),
      analysisType,
      timestamp: new Date().toISOString(),
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center bg-white/5 border border-white/10 rounded-2xl px-5 py-4 gap-3 focus-within:border-blue-500/50 transition-colors">
        <svg className="w-5 h-5 text-slate-500 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"/>
        </svg>
        <input
          type="text"
          value={place}
          onChange={(e) => setPlace(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          placeholder="Country, continent, or region — e.g. Amazon Basin"
          className="flex-1 bg-transparent text-white placeholder-slate-600 text-sm outline-none"
        />
        {place && (
          <button onClick={() => setPlace('')} className="text-slate-600 hover:text-slate-400 text-xs">
            ✕
          </button>
        )}
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

      <button
        onClick={handleSubmit}
        disabled={!place.trim()}
        className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-emerald-500 text-white text-sm font-semibold tracking-wide hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
      >
        Analyze Region
      </button>
    </div>
  )
}