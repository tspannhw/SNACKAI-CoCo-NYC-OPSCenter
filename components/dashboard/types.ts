// Shared types for dashboard components

export interface ThermalData {
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

export interface CameraData {
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

export interface AirQualityData {
  POLLUTANT: string;
  CATEGORY: string;
  AQI: number;
  REPORTING_AREA: string;
  DATE_OBSERVED: string;
  HOUR_OBSERVED: string;
  LATITUDE: number;
  LONGITUDE: number;
}

export interface WeatherData {
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

export interface TrafficEventData {
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

export interface MTAData {
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

export type MapMarker = {
  id: string;
  lat: number;
  lng: number;
  type: 'camera' | 'weather' | 'traffic' | 'air' | 'thermal' | 'mta';
  label: string;
  details?: unknown;
};
