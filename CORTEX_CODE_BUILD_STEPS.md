# Cortex Code Build Steps

This document records the exact steps used by Cortex Code to build the NYC Operations Command Center Dashboard.

## Task: Build NYC Operations Command Center Dashboard

**Created**: Session 3d53a026-8efd-4143-be3c-1024da6a3201

### Step 1: Create Next.js project with dependencies

```bash
# Create Next.js project
npx create-next-app@latest nyc-ops-center --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*" --yes

# Initialize shadcn/ui
cd nyc-ops-center
npx shadcn@latest init -d

# Add shadcn components
npx shadcn@latest add card chart button table select input tabs badge skeleton dialog dropdown-menu separator tooltip scroll-area textarea --yes

# Install additional dependencies
npm install recharts@2.15.4 lucide-react snowflake-sdk leaflet react-leaflet @types/leaflet
```

**Files created/modified:**
- `next.config.ts` - Added standalone output and serverExternalPackages for snowflake-sdk

### Step 2: Build Snowflake connection layer

**File created:** `lib/snowflake.ts`

Features:
- Dual authentication: External Browser (local dev) and OAuth (SPCS)
- Connection pooling and reconnection logic
- Retry on expired OAuth tokens
- Cortex Analyst query function

### Step 3: Create API routes for all 6 data sources

**Files created:**
- `app/api/thermal/route.ts` - Thermal sensor data
- `app/api/cameras/route.ts` - Traffic cameras
- `app/api/weather/route.ts` - Weather stations
- `app/api/air-quality/route.ts` - Air quality readings
- `app/api/traffic/route.ts` - Traffic events
- `app/api/mta/route.ts` - MTA bus positions
- `app/api/analyst/route.ts` - Cortex AI chat endpoint
- `app/api/export/route.ts` - CSV/JSON export

Each route queries the corresponding Snowflake semantic view with appropriate caching headers.

### Step 4: Build Blade Runner themed UI components

**File created:** `app/globals.css`

Theme features:
- Dark background (#0a0a0f) with cyber grid pattern
- Neon colors: Cyan (#00d4ff), Magenta (#ff0080), Orange (#ff6b35), Green (#00ff88)
- CSS animations: pulse-neon, glitch, holographic-shift, data-stream
- Custom classes: cyber-card, neon-glow-*, text-glow-*, corner-decoration
- Dark Leaflet map overrides
- Custom scrollbar styling

**Files created in `components/dashboard/`:**
- `cyber-map.tsx` - Interactive Leaflet map with marker filtering
- `stat-card.tsx` - Metric cards with neon glow variants
- `data-table.tsx` - Generic sortable/searchable/exportable table
- `badges.tsx` - SeverityBadge, AQIBadge, StatusDot components
- `charts.tsx` - NeonAreaChart, NeonBarChart, NeonPieChart, NeonMultiLineChart, NeonRadarChart, NeonGauge
- `ai-chat.tsx` - Cortex Analyst chat panel
- `types.ts` - TypeScript interfaces for all data types

### Step 5: Create main dashboard layout with all visualizations

**File created:** `app/page.tsx`

Features:
- Header with system status and refresh button
- 5 tabs: Overview, Traffic, Weather, Sensors, Transit
- Overview tab: Stats row, map + AI chat, charts, gauges
- Each tab: Relevant stats, tables, and visualizations
- Loading screen with animated spinner
- 60-second auto-refresh

**File modified:** `app/layout.tsx`
- Added TooltipProvider wrapper
- Added Orbitron font for headers
- Set dark mode class on html element

### Step 6: Add Cortex Analyst chat integration

Integrated into `app/page.tsx` and `components/dashboard/ai-chat.tsx`:
- Data source selector dropdown
- Chat history with user/assistant messages
- Queries Cortex Complete (mistral-large2) via `/api/analyst`
- Context about all 6 data sources

### Step 7: Add data export functionality

Integrated into `components/dashboard/data-table.tsx`:
- Export dropdown with JSON and CSV options
- Calls `/api/export` endpoint
- Downloads file with appropriate filename

### Step 8: Performance optimization

**Optimizations applied:**
- API route caching with `revalidate` and Cache-Control headers
- Dynamic import for CyberMap (Leaflet SSR issues)
- useMemo for computed statistics and chart data
- useCallback for fetch function
- Limit markers on map (200 MTA buses max)
- Limit table rows displayed (100 with export for all)

**Files created:**
- `Dockerfile` - Multi-stage build for production
- `.dockerignore` - Exclude unnecessary files
- `.env.example` - Environment variable template

### Step 9: Verify build compiles

```bash
npm run build
```

Build output:
```
Route (app)
├ ○ /
├ ○ /_not-found
├ ƒ /api/air-quality
├ ƒ /api/analyst
├ ƒ /api/cameras
├ ƒ /api/export
├ ƒ /api/mta
├ ƒ /api/thermal
├ ƒ /api/traffic
└ ƒ /api/weather

○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand
```

## Semantic Views Used

1. `DEMO.DEMO.NYC_AIR_QUALITY_SEMANTIC_VIEW`
   - Dimensions: POLLUTANT, CATEGORY, REPORTING_AREA, DATE_OBSERVED, HOUR_OBSERVED
   - Facts: AQI, LATITUDE, LONGITUDE
   - Metrics: AVG_AQI, MAX_AQI, MIN_AQI, READING_COUNT

2. `DEMO.DEMO.NYC_CAMERA_SEMANTIC_VIEW`
   - Dimensions: CAMERA_ID, CAMERA_NAME, ROADWAY, DIRECTION, IMAGE_LINK, VIDEO_LINK, IS_BLOCKED, IS_DISABLED
   - Facts: LATITUDE, LONGITUDE, UUID
   - Metrics: CAMERA_COUNT, ROADWAY_COUNT, RECORD_COUNT

3. `DEMO.DEMO.NYC_WEATHER_SEMANTIC_VIEW`
   - Dimensions: STATION_ID, STATION_LOCATION, CONDITIONS, WIND_DIRECTION
   - Facts: TEMP_F, TEMP_C, RELATIVE_HUMIDITY, WIND_MPH, VISIBILITY_MI, PRESSURE_IN, LATITUDE, LONGITUDE
   - Metrics: AVG_TEMPERATURE, AVG_VISIBILITY, AVG_WIND_SPEED, STATION_COUNT

4. `DEMO.DEMO.NYC_TRAFFIC_EVENTS_SEMANTIC_VIEW`
   - Dimensions: EVENT_ID, EVENT_TYPE, EVENT_SUBTYPE, SEVERITY, ROADWAY, DIRECTION, AREA, DETAILS
   - Facts: LATITUDE, LONGITUDE, UUID
   - Metrics: EVENT_COUNT, ROADWAY_COUNT

5. `DEMO.DEMO.THERMAL_SENSOR_SEMANTIC_VIEW`
   - Dimensions: DEVICE_UUID, DEVICE_HOSTNAME, DEVICE_IP, READING_TIMESTAMP
   - Facts: TEMPERATURE_CELSIUS, HUMIDITY_PCT, CO2_LEVEL, VOC_LEVEL, PRESSURE_PASCALS, CPU_TEMP_F, CPU_USAGE, MEMORY_USAGE
   - Metrics: AVG_TEMPERATURE, AVG_CO2, AVG_HUMIDITY, READING_COUNT

6. `DEMO.DEMO.SVMTA`
   - Dimensions: VEHICLEREF, PUBLISHEDLINENAME, DESTINATIONNAME, STOPPOINTNAME, PROGRESSSTATUS, NUMBEROFSTOPSAWAY
   - Facts: VEHICLELOCATIONLATITUDE, VEHICLELOCATIONLONGITUDE, BEARING, DISTANCEFROMSTOP
   - Metrics: AVG_BEARING, AVG_DISTANCE_FROM_STOP, SUM_STOPSAWAY

## Commands Reference

```bash
# Development
npm run dev

# Build
npm run build

# Production
npm start

# Docker build
docker build -t nyc-ops-center .

# Docker run
docker run -p 3000:3000 nyc-ops-center
```

---

Generated with [Cortex Code](https://docs.snowflake.com/en/user-guide/cortex-code/cortex-code)
