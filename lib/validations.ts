import { z } from "zod";

/**
 * Validates the body of a Cortex Analyst / AI chat request.
 *
 * Fields:
 * - `question` – non-empty string, max 2 000 chars, whitespace trimmed
 */
export const analystRequestSchema = z.object({
  question: z
    .string()
    .min(1, "Question is required")
    .max(2000, "Question must be less than 2000 characters")
    .trim(),
});

export type AnalystRequest = z.infer<typeof analystRequestSchema>;

/**
 * Validates required Snowflake environment variables.
 *
 * Required:
 * - `SNOWFLAKE_ACCOUNT` – Snowflake account identifier
 *
 * Optional (with defaults):
 * - `SNOWFLAKE_WAREHOUSE` – defaults to `"COMPUTE_WH"`
 * - `SNOWFLAKE_DATABASE`  – defaults to `"DEMO"`
 * - `SNOWFLAKE_SCHEMA`    – defaults to `"DEMO"`
 *
 * Auth (at least one should be set):
 * - `SNOWFLAKE_PAT`, `SNOWFLAKE_PASSWORD`, `SNOWFLAKE_PRIVATE_KEY`,
 *   `SNOWFLAKE_PRIVATE_KEY_PATH`
 */
export const envSchema = z.object({
  SNOWFLAKE_ACCOUNT: z.string().min(1, "SNOWFLAKE_ACCOUNT is required"),
  SNOWFLAKE_USER: z.string().optional(),
  SNOWFLAKE_WAREHOUSE: z.string().default("COMPUTE_WH"),
  SNOWFLAKE_DATABASE: z.string().default("DEMO"),
  SNOWFLAKE_SCHEMA: z.string().default("DEMO"),
  SNOWFLAKE_PAT: z.string().optional(),
  SNOWFLAKE_PASSWORD: z.string().optional(),
  SNOWFLAKE_PRIVATE_KEY: z.string().optional(),
  SNOWFLAKE_PRIVATE_KEY_PATH: z.string().optional(),
  SNOWFLAKE_HOST: z.string().optional(),
});

/**
 * Validates a WGS-84 coordinate pair.
 * - `latitude`  – −90 to 90
 * - `longitude` – −180 to 180
 */
export const coordinatesSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

/**
 * Validates a row returned by the THERMAL_SENSOR_SEMANTIC_VIEW.
 */
export const thermalDataSchema = z.object({
  DEVICE_UUID: z.string(),
  DEVICE_HOSTNAME: z.string(),
  DEVICE_IP: z.string(),
  TEMPERATURE_CELSIUS: z.number(),
  HUMIDITY_PCT: z.number(),
  CO2_LEVEL: z.number(),
  VOC_LEVEL: z.number(),
  PRESSURE_PASCALS: z.number(),
  CPU_TEMP_F: z.number(),
  CPU_USAGE: z.number(),
  MEMORY_USAGE: z.number(),
  READING_TIMESTAMP: z.string(),
});

/**
 * Validates a row returned by the NYC_CAMERA_SEMANTIC_VIEW.
 */
export const cameraDataSchema = z.object({
  CAMERA_ID: z.string(),
  CAMERA_NAME: z.string(),
  ROADWAY: z.string(),
  DIRECTION: z.string(),
  LATITUDE: z.number().nullable(),
  LONGITUDE: z.number().nullable(),
  IMAGE_LINK: z.string().nullable(),
  VIDEO_LINK: z.string().nullable(),
  IS_DISABLED: z.boolean(),
  IS_BLOCKED: z.boolean(),
  CAPTURED_AT: z.string(),
});

/**
 * Validates a row returned by the NYC_AIR_QUALITY_SEMANTIC_VIEW.
 * AQI must be in the 0–500 range defined by the EPA.
 */
export const airQualityDataSchema = z.object({
  POLLUTANT: z.string(),
  CATEGORY: z.string(),
  AQI: z.number().min(0).max(500),
  REPORTING_AREA: z.string(),
  DATE_OBSERVED: z.string(),
  HOUR_OBSERVED: z.string(),
  LATITUDE: z.number().nullable(),
  LONGITUDE: z.number().nullable(),
});

/**
 * Validates a row returned by the NYC_WEATHER_SEMANTIC_VIEW.
 * Relative humidity must be 0–100 %; wind speed must be non-negative.
 */
export const weatherDataSchema = z.object({
  STATION_ID: z.string(),
  STATION_LOCATION: z.string(),
  CONDITIONS: z.string(),
  TEMP_F: z.number(),
  TEMP_C: z.number(),
  RELATIVE_HUMIDITY: z.number().min(0).max(100),
  WIND_MPH: z.number().min(0),
  WIND_DIRECTION: z.string(),
  VISIBILITY_MI: z.number(),
  PRESSURE_IN: z.number(),
  DEWPOINT_F: z.number(),
  LATITUDE: z.number().nullable(),
  LONGITUDE: z.number().nullable(),
  LAST_UPDATED: z.string(),
});

/**
 * Validates a row returned by the NYC_TRAFFIC_EVENTS_SEMANTIC_VIEW.
 */
export const trafficEventDataSchema = z.object({
  EVENT_ID: z.string(),
  EVENT_TYPE: z.string(),
  EVENT_SUBTYPE: z.string().nullable(),
  SEVERITY: z.string(),
  ROADWAY: z.string(),
  DIRECTION: z.string().nullable(),
  AREA: z.string().nullable(),
  DETAILS: z.string().nullable(),
  LATITUDE: z.number().nullable(),
  LONGITUDE: z.number().nullable(),
  EVENT_TIME: z.string(),
  START_DATE: z.string().nullable(),
  PLANNED_END: z.string().nullable(),
});

/**
 * Validates a row returned by the SVMTA view (MTA real-time bus data).
 */
export const mtaDataSchema = z.object({
  VEHICLEREF: z.string(),
  PUBLISHEDLINENAME: z.string(),
  DESTINATIONNAME: z.string(),
  STOPPOINTNAME: z.string().nullable(),
  VEHICLELOCATIONLATITUDE: z.number().nullable(),
  VEHICLELOCATIONLONGITUDE: z.number().nullable(),
  BEARING: z.number().nullable(),
  PROGRESSSTATUS: z.string().nullable(),
  NUMBEROFSTOPSAWAY: z.string().nullable(),
  DISTANCEFROMSTOP: z.string().nullable(),
  EXPECTEDARRIVALTIME: z.string().nullable(),
  RECORDEDATTIME: z.string(),
});

/**
 * Validates arbitrary request bodies against a Zod schema and returns a
 * discriminated-union result.
 *
 * @param schema - Any Zod schema
 * @param data   - The raw (unknown) input to validate
 * @returns `{ success: true, data }` on success, or
 *          `{ success: false, error }` with a human-readable message on failure
 *
 * @example
 * const result = validateRequest(analystRequestSchema, req.body);
 * if (!result.success) return res.status(400).json({ error: result.error });
 * const { question } = result.data;
 */
export function validateRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  const errorMessage = result.error.issues
    .map((e) => `${e.path.join(".")}: ${e.message}`)
    .join(", ");
  return { success: false, error: errorMessage };
}
