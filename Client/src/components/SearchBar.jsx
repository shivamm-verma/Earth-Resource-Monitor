import { useState } from 'react'

// ✅ add this helper here (or import it from a utils file)
async function getCoordinates(place) {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(place)}&format=json`,
      {
        headers: {
          Accept: "application/json"
        }
      }
    );

    if (!response.ok) {
      throw new Error("Network response failed");
    }

    const data = await response.json();

    if (!data.length) {
      throw new Error("No location found");
    }

    return {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
      displayName: data[0].display_name
    };

  } catch (error) {
    console.error("Geocoding error:", error.message);
    return null;
  }
}

export default function SearchBar({ onSubmit }) {
  const [place, setPlace] = useState('')
  const [analysisType, setAnalysisType] = useState('full')
  const [loading, setLoading] = useState(false)

  // ✅ make async
  const handleSubmit = async () => {
    if (!place.trim()) return

    setLoading(true)

    // ✅ get coordinates
    const coords = await getCoordinates(place.trim())

    setLoading(false)

    if (!coords) {
      alert("Location not found")
      return
    }

    // ✅ pass coords along with your existing payload
    onSubmit({
      type: 'place',
      place: place.trim(),
      analysisType,
      coordinates: coords, // 🔥 NEW
      timestamp: new Date().toISOString(),
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center bg-white/5 border border-white/10 rounded-2xl px-5 py-4 gap-3 focus-within:border-blue-500/50 transition-colors">
        <input
          type="text"
          value={place}
          onChange={(e) => setPlace(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          placeholder="Country, continent, or region — e.g. Amazon Basin"
          className="flex-1 bg-transparent text-white placeholder-slate-600 text-sm outline-none"
        />
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
        disabled={!place.trim() || loading}
        className="w-full py-3.5 rounded-2xl bg-linear-to-r from-blue-600 to-emerald-500 text-white text-sm font-semibold tracking-wide disabled:opacity-30"
      >
        {loading ? "Fetching coordinates..." : "Analyze Region"}
      </button>
    </div>
  )
}