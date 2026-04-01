// lib/weather.ts

import { getBaseApiUrl } from '@/api/config'
import { Ionicons } from '@expo/vector-icons'
/* -----------------------------------------
 * TYPES
 * ----------------------------------------- */
export interface WeatherData {
  temperature: number
  weathercode: number
  city: string
}

/* -----------------------------------------
 * INTERNAL HELPERS
 * ----------------------------------------- */
function safeParse(raw: any): WeatherData | null {
  try {
    if (!raw) return null

    return {
      temperature: Number(raw.temperature ?? 0),
      weathercode: Number(raw.weathercode ?? 0),
      city: String(raw.city ?? ''),
    }
  } catch {
    return null
  }
}

/* -----------------------------------------
 * FETCH WEATHER (🔥 ใช้ BASE AUTO)
 * ----------------------------------------- */
export async function fetchWeather(): Promise<WeatherData | null> {
  try {
    const base = await getBaseApiUrl() // ⭐ สำคัญมาก

    const res = await fetch(`${base}/weather`)

    if (!res.ok) {
      console.warn('⚠️ fetchWeather bad status:', res.status)
      return null
    }

    const data = await res.json()
    return safeParse(data)
  } catch (err) {
    console.error('❌ fetchWeather error:', err)
    return null
  }
}

/* -----------------------------------------
 * ICON MAPPING
 * ----------------------------------------- */
export function getWeatherIcon(
  code: number
): keyof typeof Ionicons.glyphMap {
  if (code === 0) return 'sunny'
  if (code <= 3) return 'partly-sunny'
  if (code <= 48) return 'cloudy'
  if (code <= 67) return 'rainy'
  if (code <= 77) return 'snow'
  return 'cloud'
}

/* -----------------------------------------
 * FORMAT TEMP
 * ----------------------------------------- */
export function formatTemp(temp?: number): string {
  if (temp === undefined || temp === null) return '--°C'
  return `${Math.round(temp)}°C`
}

/* -----------------------------------------
 * FALLBACK
 * ----------------------------------------- */
export function getFallbackWeather(): WeatherData {
  return {
    temperature: 30,
    weathercode: 1,
    city: 'Bangkok',
  }
}