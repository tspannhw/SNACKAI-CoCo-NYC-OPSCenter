import { NextResponse } from "next/server";
import { query } from "@/lib/snowflake";

interface MTAData {
  VEHICLEREF: string;
  PUBLISHEDLINENAME: string;
  DESTINATIONNAME: string;
  STOPPOINTNAME: string;
  VEHICLELOCATIONLATITUDE: number;
  VEHICLELOCATIONLONGITUDE: number;
  BEARING: number;
  PROGRESSSTATUS: string;
  NUMBEROFSTOPSAWAY: string;
  DISTANCEFROMSTOP: string;
  EXPECTEDARRIVALTIME: string;
  RECORDEDATTIME: string;
}

export const revalidate = 15; // MTA data updates more frequently

export async function GET() {
  try {
    const results = await query<MTAData>(`
      SELECT 
        VEHICLEREF,
        PUBLISHEDLINENAME,
        DESTINATIONNAME,
        STOPPOINTNAME,
        VEHICLELOCATIONLATITUDE,
        VEHICLELOCATIONLONGITUDE,
        BEARING,
        PROGRESSSTATUS,
        NUMBEROFSTOPSAWAY,
        DISTANCEFROMSTOP,
        EXPECTEDARRIVALTIME,
        RECORDEDATTIME
      FROM DEMO.DEMO.SVMTA
      WHERE VEHICLELOCATIONLATITUDE IS NOT NULL 
        AND VEHICLELOCATIONLONGITUDE IS NOT NULL
      ORDER BY RECORDEDATTIME DESC
      LIMIT 500
    `);
    
    return NextResponse.json(results, {
      headers: { "Cache-Control": "public, s-maxage=15, stale-while-revalidate=30" },
    });
  } catch (error) {
    console.error("MTA API error:", error);
    return NextResponse.json({ error: "Failed to fetch MTA data" }, { status: 500 });
  }
}
