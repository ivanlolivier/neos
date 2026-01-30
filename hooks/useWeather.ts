import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  fetchWeekWeather,
  getWeatherInfo,
  type WeekWeatherData,
  type HourlyWeather,
  type WeatherInfo,
} from "@/lib/weather";

export function useWeekWeather() {
  return useQuery({
    queryKey: ["weather", "week"],
    queryFn: fetchWeekWeather,
    staleTime: 1000 * 60 * 30, // 30 minutes
    retry: 1,
  });
}

export type SlotWeather = {
  temperature: number;
  precipitationProbability: number;
  info: WeatherInfo;
};

export function getWeatherForSlot(
  data: WeekWeatherData | undefined,
  date: Date,
  timeSlots: string[]
): SlotWeather | null {
  if (!data) return null;

  const dateKey = format(date, "yyyy-MM-dd");
  const dayData = data[dateKey];
  if (!dayData) return null;

  // Use the first time slot's hour
  const firstSlot = timeSlots.find((s) => s !== "not_going");
  if (!firstSlot) return null;

  const hour = parseInt(firstSlot.split(":")[0], 10);
  const hourData = dayData[hour];
  if (!hourData) return null;

  return {
    temperature: hourData.temperature,
    precipitationProbability: hourData.precipitationProbability,
    info: getWeatherInfo(hourData.weatherCode),
  };
}
