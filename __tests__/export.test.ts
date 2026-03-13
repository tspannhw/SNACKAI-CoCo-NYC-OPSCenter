import { POST } from "@/app/api/export/route";

function makeRequest(body: unknown) {
  return {
    json: () => Promise.resolve(body),
  } as Parameters<typeof POST>[0];
}

describe("POST /api/export", () => {
  it("exports data as JSON by default", async () => {
    const req = makeRequest({ data: [{ id: 1, name: "Camera A" }], filename: "test", format: "json" });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(JSON.parse(text)).toEqual([{ id: 1, name: "Camera A" }]);
  });

  it("exports data as CSV", async () => {
    const req = makeRequest({ data: [{ id: 1, name: "Camera A" }], filename: "test", format: "csv" });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain("id,name");
    expect(text).toContain("1,Camera A");
  });

  it("returns empty CSV for empty data", async () => {
    const req = makeRequest({ data: [], filename: "test", format: "csv" });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toBe("");
  });

  it("returns 400 when data is not an array", async () => {
    const req = makeRequest({ data: "not-an-array" });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Data array is required");
  });

  it("returns 400 when data is missing", async () => {
    const req = makeRequest({ filename: "test" });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("escapes commas in CSV values", async () => {
    const req = makeRequest({ data: [{ address: "123 Main St, NYC" }], format: "csv" });
    const res = await POST(req);
    const text = await res.text();
    expect(text).toContain('"123 Main St, NYC"');
  });

  it("escapes double quotes in CSV values", async () => {
    const req = makeRequest({ data: [{ note: 'say "hello"' }], format: "csv" });
    const res = await POST(req);
    const text = await res.text();
    expect(text).toContain('"say ""hello"""');
  });

  it("handles null and undefined values in CSV", async () => {
    const req = makeRequest({ data: [{ id: 1, name: null, extra: undefined }], format: "csv" });
    const res = await POST(req);
    const text = await res.text();
    const lines = text.split("\n");
    expect(lines[1]).toBe("1,,");
  });

  it("sets correct Content-Disposition for JSON", async () => {
    const req = makeRequest({ data: [{ x: 1 }], filename: "myfile", format: "json" });
    const res = await POST(req);
    expect(res.headers.get("Content-Disposition")).toContain("myfile.json");
  });

  it("sets correct Content-Disposition for CSV", async () => {
    const req = makeRequest({ data: [{ x: 1 }], filename: "myfile", format: "csv" });
    const res = await POST(req);
    expect(res.headers.get("Content-Disposition")).toContain("myfile.csv");
  });
});
