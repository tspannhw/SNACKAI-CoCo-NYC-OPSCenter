import { NextResponse } from "next/server";
import { query } from "@/lib/snowflake";

interface WeatherData {
  STATION_ID: string;
  STATION_LOCATION: string;
  CONDITIONS: string;
  TEMP_F: number;
  TEMP_C: number;
  RELATIVE_HUMIDITY: number;
  WIND_MPH: number;
  WIND_DIRECTION: string;
  VISIBILITY_MI: number;
  PRESSURE_IN: number;
  DEWPOINT_F: number;
  LATITUDE: number;
  LONGITUDE: number;
  LAST_UPDATED: string;
}

export const revalidate = 60;

export async function GET() {
  try {
    const results = await query<WeatherData>(`
      SELECT 
        STATION_ID,
        STATION_LOCATION,
        CONDITIONS,
        TEMP_F,
        TEMP_C,
        RELATIVE_HUMIDITY,
        WIND_MPH,
        WIND_DIRECTION,
        VISIBILITY_MI,
        PRESSURE_IN,
        DEWPOINT_F,
        LATITUDE,
        LONGITUDE,
        LAST_UPDATED
      FROM DEMO.DEMO.NYC_WEATHER_SEMANTIC_VIEW
      WHERE LATITUDE IS NOT NULL AND LONGITUDE IS NOT NULL
      ORDER BY LAST_UPDATED DESC
      LIMIT 100
    `);
    
    return NextResponse.json(results, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" },
    });
  } catch (error) {
    console.error("Weather API error:", error);
    return NextResponse.json({ error: "Failed to fetch weather data" }, { status: 500 });
  }
}
