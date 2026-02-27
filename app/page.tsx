"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/dashboard/stat-card";
import { DataTable } from "@/components/dashboard/data-table";
import { AIChatPanel } from "@/components/dashboard/ai-chat";
import { SeverityBadge, AQIBadge, StatusDot } from "@/components/dashboard/badges";
import {
  ChartCard,
  NeonAreaChart,
  NeonBarChart,
  NeonPieChart,
  NeonMultiLineChart,
  NeonGauge,
} from "@/components/dashboard/charts";
import type {
  ThermalData,
  CameraData,
  AirQualityData,
  WeatherData,
  TrafficEventData,
  MTAData,
  MapMarker,
} from "@/components/dashboard/types";
import {
  Camera,
  Cloud,
  Wind,
  Thermometer,
  AlertTriangle,
  Bus,
  Activity,
  Radio,
  Cpu,
  Droplets,
  Eye,
  RefreshCw,
  Gauge,
  MapPin,
  BarChart3,
} from "lucide-react";

// Dynamic import for map to avoid SSR issues with Leaflet
const CyberMap = dynamic(
  () => import("@/components/dashboard/cyber-map").then((mod) => mod.CyberMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-[400px] bg-[#0d1117] rounded-lg animate-pulse flex items-center justify-center">
        <MapPin className="h-8 w-8 text-[#00d4ff]/30 animate-pulse" />
      </div>
    ),
  }
);

export default function Dashboard() {
  const [thermalData, setThermalData] = useState<ThermalData[]>([]);
  const [cameraData, setCameraData] = useState<CameraData[]>([]);
  const [airQualityData, setAirQualityData] = useState<AirQualityData[]>([]);
  const [weatherData, setWeatherData] = useState<WeatherData[]>([]);
  const [trafficData, setTrafficData] = useState<TrafficEventData[]>([]);
  const [mtaData, setMtaData] = useState<MTAData[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      const [thermal, cameras, air, weather, traffic, mta] = await Promise.all([
        fetch("/api/thermal").then((r) => r.json()),
        fetch("/api/cameras").then((r) => r.json()),
        fetch("/api/air-quality").then((r) => r.json()),
        fetch("/api/weather").then((r) => r.json()),
        fetch("/api/traffic").then((r) => r.json()),
        fetch("/api/mta").then((r) => r.json()),
      ]);

      setThermalData(Array.isArray(thermal) ? thermal : []);
      setCameraData(Array.isArray(cameras) ? cameras : []);
      setAirQualityData(Array.isArray(air) ? air : []);
      setWeatherData(Array.isArray(weather) ? weather : []);
      setTrafficData(Array.isArray(traffic) ? traffic : []);
      setMtaData(Array.isArray(mta) ? mta : []);
      setLastUpdate(new Date());
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
    const interval = setInterval(fetchAllData, 60000); // Refresh every 60s
    return () => clearInterval(interval);
  }, [fetchAllData]);

  // Create map markers from all data sources
  const mapMarkers = useMemo<MapMarker[]>(() => {
    const markers: MapMarker[] = [];

    cameraData.forEach((cam) => {
      if (cam.LATITUDE && cam.LONGITUDE) {
        markers.push({
          id: cam.CAMERA_ID,
          lat: cam.LATITUDE,
          lng: cam.LONGITUDE,
          type: "camera",
          label: cam.CAMERA_NAME || cam.ROADWAY,
          details: cam,
        });
      }
    });

    weatherData.forEach((w) => {
      if (w.LATITUDE && w.LONGITUDE) {
        markers.push({
          id: w.STATION_ID,
          lat: w.LATITUDE,
          lng: w.LONGITUDE,
          type: "weather",
          label: w.STATION_LOCATION,
          details: w,
        });
      }
    });

    trafficData.forEach((t) => {
      if (t.LATITUDE && t.LONGITUDE) {
        markers.push({
          id: t.EVENT_ID,
          lat: t.LATITUDE,
          lng: t.LONGITUDE,
          type: "traffic",
          label: `${t.EVENT_TYPE}: ${t.ROADWAY}`,
          details: t,
        });
      }
    });

    airQualityData.forEach((a, i) => {
      if (a.LATITUDE && a.LONGITUDE) {
        markers.push({
          id: `air-${i}`,
          lat: a.LATITUDE,
          lng: a.LONGITUDE,
          type: "air",
          label: `${a.POLLUTANT} - AQI: ${a.AQI}`,
          details: a,
        });
      }
    });

    mtaData.slice(0, 200).forEach((m) => {
      if (m.VEHICLELOCATIONLATITUDE && m.VEHICLELOCATIONLONGITUDE) {
        markers.push({
          id: m.VEHICLEREF,
          lat: m.VEHICLELOCATIONLATITUDE,
          lng: m.VEHICLELOCATIONLONGITUDE,
          type: "mta",
          label: `${m.PUBLISHEDLINENAME} to ${m.DESTINATIONNAME}`,
          details: m,
        });
      }
    });

    return markers;
  }, [cameraData, weatherData, trafficData, airQualityData, mtaData]);

  // Computed statistics
  const stats = useMemo(() => {
    const avgTemp =
      weatherData.length > 0
        ? weatherData.reduce((sum, w) => sum + (w.TEMP_F || 0), 0) / weatherData.length
        : 0;

    const avgAQI =
      airQualityData.length > 0
        ? airQualityData.reduce((sum, a) => sum + (a.AQI || 0), 0) / airQualityData.length
        : 0;

    const activeCameras = cameraData.filter((c) => !c.IS_DISABLED && !c.IS_BLOCKED).length;
    const activeIncidents = trafficData.length;
    const activeBuses = new Set(mtaData.map((m) => m.VEHICLEREF)).size;

    const avgCO2 =
      thermalData.length > 0
        ? thermalData.reduce((sum, t) => sum + (t.CO2_LEVEL || 0), 0) / thermalData.length
        : 0;

    return { avgTemp, avgAQI, activeCameras, activeIncidents, activeBuses, avgCO2 };
  }, [weatherData, airQualityData, cameraData, trafficData, mtaData, thermalData]);

  // Chart data transformations
  const aqiByPollutant = useMemo(() => {
    const grouped: Record<string, number[]> = {};
    airQualityData.forEach((a) => {
      if (!grouped[a.POLLUTANT]) grouped[a.POLLUTANT] = [];
      grouped[a.POLLUTANT].push(a.AQI);
    });
    return Object.entries(grouped).map(([name, values]) => ({
      name,
      value: Math.round(values.reduce((s, v) => s + v, 0) / values.length),
    }));
  }, [airQualityData]);

  const trafficBySeverity = useMemo(() => {
    const counts: Record<string, number> = {};
    trafficData.forEach((t) => {
      const sev = t.SEVERITY || "Unknown";
      counts[sev] = (counts[sev] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [trafficData]);

  const trafficByType = useMemo(() => {
    const counts: Record<string, number> = {};
    trafficData.forEach((t) => {
      const type = t.EVENT_TYPE || "Unknown";
      counts[type] = (counts[type] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [trafficData]);

  const thermalTimeSeries = useMemo(() => {
    return thermalData.slice(0, 50).map((t, i) => ({
      time: i,
      temperature: t.TEMPERATURE_CELSIUS,
      humidity: t.HUMIDITY_PCT,
      co2: t.CO2_LEVEL,
    }));
  }, [thermalData]);

  const busRouteDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    mtaData.forEach((m) => {
      const route = m.PUBLISHEDLINENAME || "Unknown";
      counts[route] = (counts[route] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [mtaData]);

  if (loading && !lastUpdate) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] cyber-grid">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-[#00d4ff]/20 bg-[#0a0a0f]/95 backdrop-blur">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded bg-[#00d4ff]/20 flex items-center justify-center neon-glow-cyan">
                  <Activity className="h-6 w-6 text-[#00d4ff]" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-[#00d4ff] tracking-wider font-[var(--font-orbitron)]">
                    NYC OPS CENTER
                  </h1>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                    Real-Time Infrastructure Monitor
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <StatusDot status="online" label="Systems Online" />
              {lastUpdate && (
                <Badge
                  variant="outline"
                  className="bg-[#0d1117] border-[#00d4ff]/30 text-xs"
                >
                  Updated: {lastUpdate.toLocaleTimeString()}
                </Badge>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={fetchAllData}
                disabled={loading}
                className="bg-[#0d1117] border-[#00d4ff]/30 hover:bg-[#00d4ff]/20"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-[#0d1117] border border-[#00d4ff]/20 p-1">
            <TabsTrigger value="overview" className="data-[state=active]:bg-[#00d4ff]/20 data-[state=active]:text-[#00d4ff]">
              <BarChart3 className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="traffic" className="data-[state=active]:bg-[#ff3333]/20 data-[state=active]:text-[#ff3333]">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Traffic
            </TabsTrigger>
            <TabsTrigger value="weather" className="data-[state=active]:bg-[#ffd000]/20 data-[state=active]:text-[#ffd000]">
              <Cloud className="h-4 w-4 mr-2" />
              Weather
            </TabsTrigger>
            <TabsTrigger value="sensors" className="data-[state=active]:bg-[#ff6b35]/20 data-[state=active]:text-[#ff6b35]">
              <Thermometer className="h-4 w-4 mr-2" />
              Sensors
            </TabsTrigger>
            <TabsTrigger value="transit" className="data-[state=active]:bg-[#ff0080]/20 data-[state=active]:text-[#ff0080]">
              <Bus className="h-4 w-4 mr-2" />
              Transit
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <StatCard
                title="Temperature"
                value={`${stats.avgTemp.toFixed(1)}°F`}
                subtitle="NYC Average"
                icon={Thermometer}
                variant="orange"
              />
              <StatCard
                title="Air Quality"
                value={stats.avgAQI.toFixed(0)}
                subtitle="Average AQI"
                icon={Wind}
                variant="green"
              />
              <StatCard
                title="Cameras"
                value={stats.activeCameras}
                subtitle="Active feeds"
                icon={Camera}
                variant="cyan"
              />
              <StatCard
                title="Incidents"
                value={stats.activeIncidents}
                subtitle="Active events"
                icon={AlertTriangle}
                variant="magenta"
              />
              <StatCard
                title="MTA Buses"
                value={stats.activeBuses}
                subtitle="Tracked vehicles"
                icon={Bus}
                variant="yellow"
              />
              <StatCard
                title="CO2 Level"
                value={`${stats.avgCO2.toFixed(0)}`}
                subtitle="ppm average"
                icon={Gauge}
                variant="cyan"
              />
            </div>

            {/* Map and AI Chat */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <CyberMap markers={mapMarkers} />
              </div>
              <div className="h-[450px]">
                <AIChatPanel />
              </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <ChartCard title="AIR QUALITY BY POLLUTANT" icon={<Wind className="h-4 w-4 text-[#00ff88]" />}>
                <NeonBarChart
                  data={aqiByPollutant}
                  dataKey="value"
                  xAxisKey="name"
                  colors={["#00ff88", "#ffd000", "#ff6b35", "#ff3333", "#ff0080"]}
                />
              </ChartCard>
              <ChartCard title="TRAFFIC BY SEVERITY" icon={<AlertTriangle className="h-4 w-4 text-[#ff3333]" />}>
                <NeonPieChart data={trafficBySeverity} />
              </ChartCard>
              <ChartCard title="TOP BUS ROUTES" icon={<Bus className="h-4 w-4 text-[#ff0080]" />}>
                <NeonBarChart
                  data={busRouteDistribution}
                  dataKey="value"
                  xAxisKey="name"
                  layout="vertical"
                  height={200}
                />
              </ChartCard>
            </div>

            {/* Sensor Gauges */}
            <ChartCard title="ENVIRONMENTAL MONITORS" icon={<Radio className="h-4 w-4 text-[#00d4ff]" />}>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 py-4">
                <NeonGauge
                  value={Math.round(stats.avgTemp)}
                  max={120}
                  label="Temperature (°F)"
                  thresholds={[
                    { value: 0, color: "#00d4ff" },
                    { value: 60, color: "#00ff88" },
                    { value: 85, color: "#ffd000" },
                    { value: 95, color: "#ff3333" },
                  ]}
                />
                <NeonGauge
                  value={Math.round(stats.avgAQI)}
                  max={300}
                  label="Air Quality Index"
                  thresholds={[
                    { value: 0, color: "#00ff88" },
                    { value: 50, color: "#ffd000" },
                    { value: 100, color: "#ff6b35" },
                    { value: 150, color: "#ff3333" },
                  ]}
                />
                <NeonGauge
                  value={Math.round(stats.avgCO2)}
                  max={2000}
                  label="CO2 (ppm)"
                  thresholds={[
                    { value: 0, color: "#00ff88" },
                    { value: 800, color: "#ffd000" },
                    { value: 1200, color: "#ff6b35" },
                    { value: 1500, color: "#ff3333" },
                  ]}
                />
                <NeonGauge
                  value={stats.activeIncidents}
                  max={100}
                  label="Active Incidents"
                  color="#ff0080"
                />
              </div>
            </ChartCard>
          </TabsContent>

          {/* Traffic Tab */}
          <TabsContent value="traffic" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <DataTable
                  title="TRAFFIC EVENTS"
                  icon={<AlertTriangle className="h-4 w-4 text-[#ff3333]" />}
                  data={trafficData}
                  exportFilename="nyc-traffic-events"
                  maxHeight="500px"
                  columns={[
                    { key: "EVENT_TYPE", label: "Type" },
                    {
                      key: "SEVERITY",
                      label: "Severity",
                      render: (val) => <SeverityBadge severity={val as string} />,
                    },
                    { key: "ROADWAY", label: "Roadway" },
                    { key: "DIRECTION", label: "Dir" },
                    { key: "AREA", label: "Area" },
                    {
                      key: "EVENT_TIME",
                      label: "Time",
                      render: (val) =>
                        val ? new Date(val as string).toLocaleString() : "-",
                    },
                  ]}
                />
              </div>
              <div className="space-y-6">
                <ChartCard title="EVENTS BY TYPE" icon={<AlertTriangle className="h-4 w-4 text-[#ff3333]" />}>
                  <NeonBarChart
                    data={trafficByType}
                    dataKey="value"
                    xAxisKey="name"
                    layout="vertical"
                    height={300}
                  />
                </ChartCard>
              </div>
            </div>
            <DataTable
              title="TRAFFIC CAMERAS"
              icon={<Camera className="h-4 w-4 text-[#00d4ff]" />}
              data={cameraData}
              exportFilename="nyc-traffic-cameras"
              maxHeight="400px"
              columns={[
                { key: "CAMERA_NAME", label: "Name" },
                { key: "ROADWAY", label: "Roadway" },
                { key: "DIRECTION", label: "Direction" },
                {
                  key: "IS_DISABLED",
                  label: "Status",
                  render: (val, row) => (
                    <StatusDot
                      status={
                        row.IS_DISABLED
                          ? "danger"
                          : row.IS_BLOCKED
                          ? "warning"
                          : "online"
                      }
                      label={row.IS_DISABLED ? "Disabled" : row.IS_BLOCKED ? "Blocked" : "Active"}
                    />
                  ),
                },
                {
                  key: "IMAGE_LINK",
                  label: "Feed",
                  render: (val) =>
                    val ? (
                      <a
                        href={val as string}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#00d4ff] hover:underline"
                      >
                        <Eye className="h-4 w-4" />
                      </a>
                    ) : (
                      "-"
                    ),
                },
              ]}
            />
          </TabsContent>

          {/* Weather Tab */}
          <TabsContent value="weather" className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                title="Avg Temperature"
                value={`${stats.avgTemp.toFixed(1)}°F`}
                icon={Thermometer}
                variant="orange"
              />
              <StatCard
                title="Weather Stations"
                value={weatherData.length}
                icon={Radio}
                variant="cyan"
              />
              <StatCard
                title="Avg Humidity"
                value={`${(weatherData.reduce((s, w) => s + (w.RELATIVE_HUMIDITY || 0), 0) / (weatherData.length || 1)).toFixed(0)}%`}
                icon={Droplets}
                variant="cyan"
              />
              <StatCard
                title="Avg Wind"
                value={`${(weatherData.reduce((s, w) => s + (w.WIND_MPH || 0), 0) / (weatherData.length || 1)).toFixed(1)} mph`}
                icon={Wind}
                variant="green"
              />
            </div>
            <DataTable
              title="WEATHER STATIONS"
              icon={<Cloud className="h-4 w-4 text-[#ffd000]" />}
              data={weatherData}
              exportFilename="nyc-weather-stations"
              maxHeight="500px"
              columns={[
                { key: "STATION_LOCATION", label: "Location" },
                { key: "CONDITIONS", label: "Conditions" },
                {
                  key: "TEMP_F",
                  label: "Temp (°F)",
                  render: (val) => (
                    <span className="text-[#ff6b35]">{val ? `${Number(val).toFixed(1)}°` : "-"}</span>
                  ),
                },
                {
                  key: "RELATIVE_HUMIDITY",
                  label: "Humidity",
                  render: (val) => (val ? `${Number(val).toFixed(0)}%` : "-"),
                },
                { key: "WIND_MPH", label: "Wind (mph)" },
                { key: "WIND_DIRECTION", label: "Wind Dir" },
                { key: "VISIBILITY_MI", label: "Visibility" },
                { key: "PRESSURE_IN", label: "Pressure" },
              ]}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ChartCard title="AIR QUALITY INDEX" icon={<Wind className="h-4 w-4 text-[#00ff88]" />}>
                <NeonBarChart data={aqiByPollutant} dataKey="value" xAxisKey="name" height={250} />
              </ChartCard>
              <DataTable
                title="AIR QUALITY READINGS"
                icon={<Wind className="h-4 w-4 text-[#00ff88]" />}
                data={airQualityData}
                exportFilename="nyc-air-quality"
                maxHeight="300px"
                columns={[
                  { key: "POLLUTANT", label: "Pollutant" },
                  {
                    key: "AQI",
                    label: "AQI",
                    render: (val) => <AQIBadge aqi={val as number} />,
                  },
                  { key: "CATEGORY", label: "Category" },
                  { key: "REPORTING_AREA", label: "Area" },
                ]}
              />
            </div>
          </TabsContent>

          {/* Sensors Tab */}
          <TabsContent value="sensors" className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                title="Active Sensors"
                value={new Set(thermalData.map((t) => t.DEVICE_HOSTNAME)).size}
                icon={Cpu}
                variant="cyan"
              />
              <StatCard
                title="Avg Temperature"
                value={`${(thermalData.reduce((s, t) => s + (t.TEMPERATURE_CELSIUS || 0), 0) / (thermalData.length || 1)).toFixed(1)}°C`}
                icon={Thermometer}
                variant="orange"
              />
              <StatCard
                title="Avg CO2"
                value={`${stats.avgCO2.toFixed(0)} ppm`}
                icon={Wind}
                variant="green"
              />
              <StatCard
                title="Avg Humidity"
                value={`${(thermalData.reduce((s, t) => s + (t.HUMIDITY_PCT || 0), 0) / (thermalData.length || 1)).toFixed(0)}%`}
                icon={Droplets}
                variant="cyan"
              />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ChartCard
                title="SENSOR READINGS OVER TIME"
                icon={<Activity className="h-4 w-4 text-[#00d4ff]" />}
              >
                <NeonMultiLineChart
                  data={thermalTimeSeries}
                  xAxisKey="time"
                  height={250}
                  lines={[
                    { dataKey: "temperature", color: "#ff6b35", name: "Temperature (°C)" },
                    { dataKey: "humidity", color: "#00d4ff", name: "Humidity (%)" },
                  ]}
                />
              </ChartCard>
              <ChartCard title="CO2 LEVELS" icon={<Wind className="h-4 w-4 text-[#00ff88]" />}>
                <NeonAreaChart
                  data={thermalTimeSeries}
                  dataKey="co2"
                  xAxisKey="time"
                  color="#00ff88"
                  height={250}
                />
              </ChartCard>
            </div>
            <DataTable
              title="THERMAL SENSOR DATA"
              icon={<Thermometer className="h-4 w-4 text-[#ff6b35]" />}
              data={thermalData}
              exportFilename="nyc-thermal-sensors"
              maxHeight="400px"
              columns={[
                { key: "DEVICE_HOSTNAME", label: "Device" },
                { key: "DEVICE_IP", label: "IP" },
                {
                  key: "TEMPERATURE_CELSIUS",
                  label: "Temp (°C)",
                  render: (val) => (
                    <span className="text-[#ff6b35]">{val ? Number(val).toFixed(1) : "-"}</span>
                  ),
                },
                {
                  key: "HUMIDITY_PCT",
                  label: "Humidity",
                  render: (val) => (val ? `${Number(val).toFixed(0)}%` : "-"),
                },
                {
                  key: "CO2_LEVEL",
                  label: "CO2 (ppm)",
                  render: (val) => (
                    <span className="text-[#00ff88]">{val ? Number(val).toFixed(0) : "-"}</span>
                  ),
                },
                { key: "VOC_LEVEL", label: "VOC (ppb)" },
                {
                  key: "CPU_USAGE",
                  label: "CPU %",
                  render: (val) => (val ? `${Number(val).toFixed(0)}%` : "-"),
                },
                {
                  key: "READING_TIMESTAMP",
                  label: "Timestamp",
                  render: (val) => (val ? new Date(val as string).toLocaleString() : "-"),
                },
              ]}
            />
          </TabsContent>

          {/* Transit Tab */}
          <TabsContent value="transit" className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                title="Active Buses"
                value={stats.activeBuses}
                icon={Bus}
                variant="magenta"
              />
              <StatCard
                title="Routes"
                value={new Set(mtaData.map((m) => m.PUBLISHEDLINENAME)).size}
                icon={MapPin}
                variant="cyan"
              />
              <StatCard
                title="Data Points"
                value={mtaData.length}
                icon={Activity}
                variant="green"
              />
              <StatCard
                title="Avg Distance"
                value={`${(mtaData.reduce((s, m) => s + (parseFloat(m.DISTANCEFROMSTOP) || 0), 0) / (mtaData.length || 1)).toFixed(0)}m`}
                icon={Gauge}
                variant="orange"
              />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <DataTable
                  title="MTA BUS POSITIONS"
                  icon={<Bus className="h-4 w-4 text-[#ff0080]" />}
                  data={mtaData}
                  exportFilename="nyc-mta-buses"
                  maxHeight="500px"
                  columns={[
                    { key: "PUBLISHEDLINENAME", label: "Route" },
                    { key: "DESTINATIONNAME", label: "Destination" },
                    { key: "STOPPOINTNAME", label: "Next Stop" },
                    { key: "NUMBEROFSTOPSAWAY", label: "Stops Away" },
                    { key: "PROGRESSSTATUS", label: "Status" },
                    {
                      key: "EXPECTEDARRIVALTIME",
                      label: "ETA",
                      render: (val) =>
                        val ? new Date(val as string).toLocaleTimeString() : "-",
                    },
                  ]}
                />
              </div>
              <ChartCard title="TOP ROUTES" icon={<Bus className="h-4 w-4 text-[#ff0080]" />}>
                <NeonBarChart
                  data={busRouteDistribution}
                  dataKey="value"
                  xAxisKey="name"
                  layout="vertical"
                  height={400}
                  colors={["#ff0080", "#00d4ff", "#00ff88", "#ffd000", "#ff6b35"]}
                />
              </ChartCard>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#00d4ff]/20 py-4 mt-8">
        <div className="container mx-auto px-4 text-center">
          <p className="text-xs text-muted-foreground">
            NYC Operations Command Center | Powered by Snowflake | Real-time data from 6 sources
          </p>
        </div>
      </footer>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center cyber-grid">
      <div className="text-center space-y-6">
        <div className="relative">
          <div className="w-24 h-24 rounded-full border-4 border-[#00d4ff]/20 border-t-[#00d4ff] animate-spin mx-auto" />
          <Activity className="h-10 w-10 text-[#00d4ff] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-[#00d4ff] tracking-wider">
            INITIALIZING SYSTEMS
          </h2>
          <p className="text-sm text-muted-foreground mt-2">
            Connecting to NYC data feeds...
          </p>
        </div>
        <div className="flex justify-center gap-2">
          {["Cameras", "Weather", "Traffic", "Sensors", "Transit"].map((item, i) => (
            <Skeleton
              key={item}
              className="h-6 w-20 bg-[#00d4ff]/10"
              style={{ animationDelay: `${i * 100}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
