import { format, addDays, startOfWeek } from "date-fns";

const LATITUDE = -34.9011;
const LONGITUDE = -56.1645;

export type HourlyWeather = {
  temperature: number;
  weatherCode: number;
  precipitationProbability: number;
};

export type WeekWeatherData = {
  [date: string]: {
    [hour: number]: HourlyWeather;
  };
};

export async function fetchWeekWeather(): Promise<WeekWeatherData> {
  const today = new Date();
  const start = startOfWeek(today, { weekStartsOn: 1 });
  const end = addDays(start, 6);

  const startStr = format(start, "yyyy-MM-dd");
  const endStr = format(end, "yyyy-MM-dd");

  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${LATITUDE}&longitude=${LONGITUDE}` +
    `&hourly=temperature_2m,weather_code,precipitation_probability` +
    `&start_date=${startStr}&end_date=${endStr}` +
    `&timezone=America/Montevideo`;

  const res = await fetch(url);
  if (!res.ok) throw new Error("Weather API error");

  const json = await res.json();
  const { time, temperature_2m, weather_code, precipitation_probability } =
    json.hourly;

  const data: WeekWeatherData = {};

  for (let i = 0; i < time.length; i++) {
    const dt = new Date(time[i]);
    const dateKey = format(dt, "yyyy-MM-dd");
    const hour = dt.getHours();

    if (!data[dateKey]) data[dateKey] = {};
    data[dateKey][hour] = {
      temperature: Math.round(temperature_2m[i]),
      weatherCode: weather_code[i],
      precipitationProbability: precipitation_probability[i] ?? 0,
    };
  }

  return data;
}

export type WeatherInfo = {
  icon: "sun-o" | "cloud" | "tint" | "bolt";
  label: string;
  color: string;
};

export function getWeatherInfo(wmoCode: number): WeatherInfo {
  // Clear
  if (wmoCode <= 1) {
    return { icon: "sun-o", label: "Despejado", color: "#FBBF24" };
  }
  // Partly cloudy
  if (wmoCode === 2) {
    return { icon: "sun-o", label: "Parcialmente nublado", color: "#FBBF24" };
  }
  // Overcast
  if (wmoCode === 3) {
    return { icon: "cloud", label: "Nublado", color: "#9CA3AF" };
  }
  // Fog
  if (wmoCode >= 45 && wmoCode <= 48) {
    return { icon: "cloud", label: "Niebla", color: "#9CA3AF" };
  }
  // Drizzle
  if (wmoCode >= 51 && wmoCode <= 57) {
    return { icon: "tint", label: "Llovizna", color: "#60A5FA" };
  }
  // Rain
  if (wmoCode >= 61 && wmoCode <= 67) {
    return { icon: "tint", label: "Lluvia", color: "#60A5FA" };
  }
  // Snow
  if (wmoCode >= 71 && wmoCode <= 77) {
    return { icon: "cloud", label: "Nieve", color: "#D1D5DB" };
  }
  // Rain showers
  if (wmoCode >= 80 && wmoCode <= 82) {
    return { icon: "tint", label: "Chaparrón", color: "#60A5FA" };
  }
  // Thunderstorm
  if (wmoCode >= 95 && wmoCode <= 99) {
    return { icon: "bolt", label: "Tormenta", color: "#FB923C" };
  }
  // Default
  return { icon: "cloud", label: "Nublado", color: "#9CA3AF" };
}
