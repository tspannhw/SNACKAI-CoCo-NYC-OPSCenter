import {
  analystRequestSchema,
  envSchema,
  coordinatesSchema,
  thermalDataSchema,
  cameraDataSchema,
  airQualityDataSchema,
  weatherDataSchema,
  trafficEventDataSchema,
  mtaDataSchema,
  validateRequest,
} from "@/lib/validations";

describe("analystRequestSchema", () => {
  it("accepts a valid question", () => {
    const result = analystRequestSchema.safeParse({ question: "How many cameras are active?" });
    expect(result.success).toBe(true);
  });

  it("trims whitespace", () => {
    const result = analystRequestSchema.safeParse({ question: "  hello  " });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.question).toBe("hello");
  });

  it("rejects empty question", () => {
    const result = analystRequestSchema.safeParse({ question: "" });
    expect(result.success).toBe(false);
  });

  it("rejects question exceeding 2000 chars", () => {
    const result = analystRequestSchema.safeParse({ question: "a".repeat(2001) });
    expect(result.success).toBe(false);
  });

  it("rejects missing question field", () => {
    const result = analystRequestSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe("envSchema", () => {
  it("accepts minimal valid env with required field", () => {
    const result = envSchema.safeParse({ SNOWFLAKE_ACCOUNT: "myaccount" });
    expect(result.success).toBe(true);
  });

  it("applies default warehouse", () => {
    const result = envSchema.safeParse({ SNOWFLAKE_ACCOUNT: "myaccount" });
    if (result.success) expect(result.data.SNOWFLAKE_WAREHOUSE).toBe("COMPUTE_WH");
  });

  it("applies default database and schema", () => {
    const result = envSchema.safeParse({ SNOWFLAKE_ACCOUNT: "myaccount" });
    if (result.success) {
      expect(result.data.SNOWFLAKE_DATABASE).toBe("DEMO");
      expect(result.data.SNOWFLAKE_SCHEMA).toBe("DEMO");
    }
  });

  it("rejects missing SNOWFLAKE_ACCOUNT", () => {
    const result = envSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe("coordinatesSchema", () => {
  it("accepts valid NYC coordinates", () => {
    const result = coordinatesSchema.safeParse({ latitude: 40.7128, longitude: -74.006 });
    expect(result.success).toBe(true);
  });

  it("rejects latitude > 90", () => {
    const result = coordinatesSchema.safeParse({ latitude: 91, longitude: 0 });
    expect(result.success).toBe(false);
  });

  it("rejects longitude > 180", () => {
    const result = coordinatesSchema.safeParse({ latitude: 0, longitude: 181 });
    expect(result.success).toBe(false);
  });
});

describe("airQualityDataSchema", () => {
  it("accepts valid AQI range 0-500", () => {
    const base = {
      POLLUTANT: "PM2.5",
      CATEGORY: "Moderate",
      AQI: 75,
      REPORTING_AREA: "NYC",
      DATE_OBSERVED: "2026-03-13",
      HOUR_OBSERVED: "12",
      LATITUDE: null,
      LONGITUDE: null,
    };
    expect(airQualityDataSchema.safeParse(base).success).toBe(true);
  });

  it("rejects AQI > 500", () => {
    const result = airQualityDataSchema.safeParse({
      POLLUTANT: "O3", CATEGORY: "Hazardous", AQI: 501,
      REPORTING_AREA: "NYC", DATE_OBSERVED: "2026-03-13",
      HOUR_OBSERVED: "12", LATITUDE: null, LONGITUDE: null,
    });
    expect(result.success).toBe(false);
  });
});

describe("weatherDataSchema", () => {
  it("rejects negative wind speed", () => {
    const result = weatherDataSchema.safeParse({
      STATION_ID: "S1", STATION_LOCATION: "Central Park", CONDITIONS: "Clear",
      TEMP_F: 72, TEMP_C: 22, RELATIVE_HUMIDITY: 50,
      WIND_MPH: -5, WIND_DIRECTION: "N",
      VISIBILITY_MI: 10, PRESSURE_IN: 29.92, DEWPOINT_F: 55,
      LATITUDE: null, LONGITUDE: null, LAST_UPDATED: "2026-03-13",
    });
    expect(result.success).toBe(false);
  });

  it("rejects humidity > 100", () => {
    const result = weatherDataSchema.safeParse({
      STATION_ID: "S1", STATION_LOCATION: "JFK", CONDITIONS: "Fog",
      TEMP_F: 60, TEMP_C: 15, RELATIVE_HUMIDITY: 105,
      WIND_MPH: 5, WIND_DIRECTION: "E",
      VISIBILITY_MI: 0.5, PRESSURE_IN: 29.5, DEWPOINT_F: 58,
      LATITUDE: null, LONGITUDE: null, LAST_UPDATED: "2026-03-13",
    });
    expect(result.success).toBe(false);
  });
});

describe("thermalDataSchema", () => {
  it("accepts valid sensor reading", () => {
    const result = thermalDataSchema.safeParse({
      DEVICE_UUID: "abc-123",
      DEVICE_HOSTNAME: "sensor-01",
      DEVICE_IP: "10.0.0.1",
      TEMPERATURE_CELSIUS: 22.5,
      HUMIDITY_PCT: 45.0,
      CO2_LEVEL: 400,
      VOC_LEVEL: 0.1,
      PRESSURE_PASCALS: 101325,
      CPU_TEMP_F: 98.6,
      CPU_USAGE: 15.3,
      MEMORY_USAGE: 62.1,
      READING_TIMESTAMP: "2026-03-13T10:00:00Z",
    });
    expect(result.success).toBe(true);
  });
});

describe("cameraDataSchema", () => {
  it("accepts camera with null coordinates", () => {
    const result = cameraDataSchema.safeParse({
      CAMERA_ID: "cam-1",
      CAMERA_NAME: "FDR Camera",
      ROADWAY: "FDR Drive",
      DIRECTION: "N",
      LATITUDE: null,
      LONGITUDE: null,
      IMAGE_LINK: null,
      VIDEO_LINK: null,
      IS_DISABLED: false,
      IS_BLOCKED: false,
      CAPTURED_AT: "2026-03-13T10:00:00Z",
    });
    expect(result.success).toBe(true);
  });
});

describe("trafficEventDataSchema", () => {
  it("accepts a traffic event with nulls", () => {
    const result = trafficEventDataSchema.safeParse({
      EVENT_ID: "evt-1",
      EVENT_TYPE: "Incident",
      EVENT_SUBTYPE: null,
      SEVERITY: "MAJOR",
      ROADWAY: "I-278",
      DIRECTION: null,
      AREA: null,
      DETAILS: null,
      LATITUDE: null,
      LONGITUDE: null,
      EVENT_TIME: "2026-03-13T09:00:00Z",
      START_DATE: null,
      PLANNED_END: null,
    });
    expect(result.success).toBe(true);
  });
});

describe("mtaDataSchema", () => {
  it("accepts a valid MTA bus record", () => {
    const result = mtaDataSchema.safeParse({
      VEHICLEREF: "MTA_123",
      PUBLISHEDLINENAME: "B63",
      DESTINATIONNAME: "Atlantic Ave",
      STOPPOINTNAME: null,
      VEHICLELOCATIONLATITUDE: 40.68,
      VEHICLELOCATIONLONGITUDE: -73.99,
      BEARING: 180.0,
      PROGRESSSTATUS: "In Progress",
      NUMBEROFSTOPSAWAY: "3",
      DISTANCEFROMSTOP: "200",
      EXPECTEDARRIVALTIME: null,
      RECORDEDATTIME: "2026-03-13T10:00:00Z",
    });
    expect(result.success).toBe(true);
  });
});

describe("validateRequest helper", () => {
  it("returns success with parsed data", () => {
    const result = validateRequest(analystRequestSchema, { question: "test" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.question).toBe("test");
  });

  it("returns failure with error message", () => {
    const result = validateRequest(analystRequestSchema, { question: "" });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain("question");
  });

  it("formats multi-field errors as comma-separated", () => {
    const result = validateRequest(coordinatesSchema, { latitude: 200, longitude: 400 });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain(",");
  });
});
