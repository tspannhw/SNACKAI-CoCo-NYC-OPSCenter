import { NextResponse } from "next/server";
import { query } from "@/lib/snowflake";

interface CameraData {
  CAMERA_ID: string;
  CAMERA_NAME: string;
  ROADWAY: string;
  DIRECTION: string;
  LATITUDE: number;
  LONGITUDE: number;
  IMAGE_LINK: string;
  VIDEO_LINK: string;
  IS_DISABLED: boolean;
  IS_BLOCKED: boolean;
  CAPTURED_AT: string;
}

export const revalidate = 30; // Cache for 30 seconds

export async function GET() {
  try {
    const results = await query<CameraData>(`
      SELECT 
        CAMERA_ID,
        CAMERA_NAME,
        ROADWAY,
        DIRECTION,
        LATITUDE,
        LONGITUDE,
        IMAGE_LINK,
        VIDEO_LINK,
        IS_DISABLED,
        IS_BLOCKED,
        CAPTURED_AT
      FROM DEMO.DEMO.NYC_CAMERA_SEMANTIC_VIEW
      WHERE LATITUDE IS NOT NULL AND LONGITUDE IS NOT NULL
      ORDER BY CAPTURED_AT DESC
      LIMIT 500
    `);
    
    return NextResponse.json(results, {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
      },
    });
  } catch (error) {
    console.error("Camera API error:", error);
    return NextResponse.json({ error: "Failed to fetch camera data" }, { status: 500 });
  }
}
