import { NextResponse } from "next/server";
import { query } from "@/lib/snowflake";

interface TrafficEventData {
  EVENT_ID: string;
  EVENT_TYPE: string;
  EVENT_SUBTYPE: string;
  SEVERITY: string;
  ROADWAY: string;
  DIRECTION: string;
  AREA: string;
  DETAILS: string;
  LATITUDE: number;
  LONGITUDE: number;
  EVENT_TIME: string;
  START_DATE: string;
  PLANNED_END: string;
}

export const revalidate = 30;

export async function GET() {
  try {
    const results = await query<TrafficEventData>(`
      SELECT 
        EVENT_ID,
        EVENT_TYPE,
        EVENT_SUBTYPE,
        SEVERITY,
        ROADWAY,
        DIRECTION,
        AREA,
        DETAILS,
        LATITUDE,
        LONGITUDE,
        EVENT_TIME,
        START_DATE,
        PLANNED_END
      FROM DEMO.DEMO.NYC_TRAFFIC_EVENTS_SEMANTIC_VIEW
      WHERE LATITUDE IS NOT NULL AND LONGITUDE IS NOT NULL
      ORDER BY EVENT_TIME DESC
      LIMIT 500
    `);
    
    return NextResponse.json(results, {
      headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" },
    });
  } catch (error) {
    console.error("Traffic API error:", error);
    return NextResponse.json({ error: "Failed to fetch traffic data" }, { status: 500 });
  }
}
