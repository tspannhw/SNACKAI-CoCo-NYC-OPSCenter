import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { data, filename, format } = await request.json();

    if (!data || !Array.isArray(data)) {
      return NextResponse.json({ error: "Data array is required" }, { status: 400 });
    }

    if (format === "csv") {
      // Convert to CSV
      if (data.length === 0) {
        return new NextResponse("", {
          headers: {
            "Content-Type": "text/csv",
            "Content-Disposition": `attachment; filename="${filename || "export"}.csv"`,
          },
        });
      }

      const headers = Object.keys(data[0]);
      const csvRows = [
        headers.join(","),
        ...data.map((row) =>
          headers
            .map((header) => {
              const value = row[header];
              if (value === null || value === undefined) return "";
              const stringValue = String(value);
              // Escape quotes and wrap in quotes if contains comma, quote, or newline
              if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")) {
                return `"${stringValue.replace(/"/g, '""')}"`;
              }
              return stringValue;
            })
            .join(",")
        ),
      ];

      return new NextResponse(csvRows.join("\n"), {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="${filename || "export"}.csv"`,
        },
      });
    }

    // Default to JSON
    return new NextResponse(JSON.stringify(data, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${filename || "export"}.json"`,
      },
    });
  } catch (error) {
    console.error("Export API error:", error);
    return NextResponse.json({ error: "Failed to export data" }, { status: 500 });
  }
}
