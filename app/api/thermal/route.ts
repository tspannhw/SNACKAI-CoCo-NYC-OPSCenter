import { NextResponse } from "next/server";
import { query } from "@/lib/snowflake";

interface ThermalData {
  DEVICE_UUID: string;
  DEVICE_HOSTNAME: string;
  DEVICE_IP: string;
  TEMPERATURE_CELSIUS: number;
  HUMIDITY_PCT: number;
  CO2_LEVEL: number;
  VOC_LEVEL: number;
  PRESSURE_PASCALS: number;
  CPU_TEMP_F: number;
  CPU_USAGE: number;
  MEMORY_USAGE: number;
  READING_TIMESTAMP: string;
}

export const revalidate = 30;

export async function GET() {
  try {
    const results = await query<ThermalData>(`
      SELECT 
        DEVICE_UUID,
        DEVICE_HOSTNAME,
        DEVICE_IP,
        TEMPERATURE_CELSIUS,
        HUMIDITY_PCT,
        CO2_LEVEL,
        VOC_LEVEL,
        PRESSURE_PASCALS,
        CPU_TEMP_F,
        CPU_USAGE,
        MEMORY_USAGE,
        READING_TIMESTAMP
      FROM DEMO.DEMO.THERMAL_SENSOR_SEMANTIC_VIEW
      ORDER BY READING_TIMESTAMP DESC
      LIMIT 500
    `);
    
    return NextResponse.json(results, {
      headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" },
    });
  } catch (error) {
    console.error("Thermal API error:", error);
    return NextResponse.json({ error: "Failed to fetch thermal data" }, { status: 500 });
  }
}
