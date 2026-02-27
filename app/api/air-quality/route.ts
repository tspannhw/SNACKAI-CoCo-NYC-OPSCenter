import { NextResponse } from "next/server";
import { query } from "@/lib/snowflake";

interface AirQualityData {
  POLLUTANT: string;
  CATEGORY: string;
  AQI: number;
  REPORTING_AREA: string;
  DATE_OBSERVED: string;
  HOUR_OBSERVED: string;
  LATITUDE: number;
  LONGITUDE: number;
}

export const revalidate = 60; // Air quality updates less frequently

export async function GET() {
  try {
    const results = await query<AirQualityData>(`
      SELECT 
        POLLUTANT,
        CATEGORY,
        AQI,
        REPORTING_AREA,
        DATE_OBSERVED,
        HOUR_OBSERVED,
        LATITUDE,
        LONGITUDE
      FROM DEMO.DEMO.NYC_AIR_QUALITY_SEMANTIC_VIEW
      ORDER BY DATE_OBSERVED DESC, HOUR_OBSERVED DESC
      LIMIT 500
    `);
    
    return NextResponse.json(results, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" },
    });
  } catch (error) {
    console.error("Air quality API error:", error);
    return NextResponse.json({ error: "Failed to fetch air quality data" }, { status: 500 });
  }
}
