import { useEffect, useState } from "react";

export default function WeatherBox({ lat, lon, onData }) {
  const [weather, setWeather] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const API_KEY = import.meta.env.VITE_WEATHER_API_KEY;

  useEffect(() => {
    if (!lat || !lon) return;
    const fetchWeather = async () => {
      try {
        setLoading(true);
        setError("");
        const res = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`,
        );
        const data = await res.json();
        if (!data.main) throw new Error("Weather fetch failed");
        onData?.(data);
        setWeather({
          temp: data.main.temp,
          feelsLike: data.main.feels_like,
          humidity: data.main.humidity,
          min: data.main.temp_min,
          max: data.main.temp_max,
          desc: data.weather[0].description,
          wind: data.wind?.speed,
          city: data.name,
        });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchWeather();
  }, [lat, lon]);

  if (loading) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
          <p className="text-xs text-slate-500">Fetching weather data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white/5 border border-red-500/20 rounded-2xl p-4">
        <p className="text-xs text-red-400">{error}</p>
      </div>
    );
  }

  if (!weather) return null;

  const rows = [
    { label: "Temperature", value: `${weather.temp}°C` },
    { label: "Feels Like", value: `${weather.feelsLike}°C` },
    { label: "Humidity", value: `${weather.humidity}%` },
    { label: "Min / Max", value: `${weather.min}° / ${weather.max}°C` },
    { label: "Wind Speed", value: `${weather.wind} m/s` },
    { label: "Condition", value: weather.desc },
  ];

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col gap-3">
      {weather.city && (
        <p className="text-xs text-slate-400 font-medium">{weather.city}</p>
      )}
      {rows.map(({ label, value }) => (
        <div key={label} className="flex items-center justify-between">
          <p className="text-[10px] text-slate-500 uppercase tracking-widest">
            {label}
          </p>
          <p className="text-xs text-slate-300 capitalize">{value}</p>
        </div>
      ))}
    </div>
  );
}
