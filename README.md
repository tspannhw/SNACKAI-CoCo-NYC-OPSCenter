# NYC Operations Command Center Dashboard

A high-tech, Blade Runner-style real-time monitoring dashboard for NYC infrastructure, built with Next.js 16, Snowflake, and Cortex AI.

![Dashboard Preview](https://img.shields.io/badge/Status-Active-00ff88?style=flat-square)
![Next.js](https://img.shields.io/badge/Next.js-16.1.6-00d4ff?style=flat-square)
![Snowflake](https://img.shields.io/badge/Snowflake-Cortex-ff0080?style=flat-square)

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure authentication (choose one method)
cp .env.example .env.local
# Edit .env.local with your credentials

# 3. Test your connection
npm run test:auth

# 4. Start development server
npm run dev

# 5. Open http://localhost:3000
```

## Demo Walkthrough

### Step 1: Generate a PAT (Recommended for Development)

1. Log into [Snowsight](https://app.snowflake.com)
2. Click your username (bottom-left) → **My Profile**
3. Go to **Programmatic Access Tokens**
4. Click **+ Generate New Token**
5. Copy the token immediately (shown only once!)

### Step 2: Configure Environment

```bash
# Create .env.local
cat > .env.local << 'EOF'
SNOWFLAKE_ACCOUNT=your-account-identifier
SNOWFLAKE_USER=your-username
SNOWFLAKE_PAT=paste-your-token-here
SNOWFLAKE_WAREHOUSE=COMPUTE_WH
SNOWFLAKE_DATABASE=DEMO
SNOWFLAKE_SCHEMA=DEMO
EOF
```

### Step 3: Verify Authentication

```bash
npm run test:auth
```

Expected output:
```
╔══════════════════════════════════════════════════════════════╗
║     NYC Operations Command Center - Authentication Test      ║
╚══════════════════════════════════════════════════════════════╝

Environment Configuration:
─────────────────────────────────────────────────────────────────
  Account:   your-account
  User:      your-username
  ...

Testing PAT...
  ✓ Success: YOUR_USER

Summary:
  ✓ Successful: 1
  ✗ Failed:     0
  ⊘ Skipped:    4

✓ At least one authentication method works!
```

### Step 4: Launch the Dashboard

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and explore:

| Tab | Features |
|-----|----------|
| **Overview** | Stats cards, interactive map, AI chat, gauges |
| **Traffic** | Traffic events, camera feeds, incident breakdown |
| **Weather** | Weather stations, air quality monitors |
| **Sensors** | Thermal sensor data, time series charts |
| **Transit** | MTA bus positions, route distribution |

### Step 5: Try the AI Chat

In the Overview tab, use the Cortex Analyst chat to ask questions:
- "How many cameras are active?"
- "What's the average temperature today?"
- "Show me traffic events by severity"
- "Which bus routes have the most vehicles?"

---

## Features

### Data Sources (6 Semantic Views)
| View | Description |
|------|-------------|
| `NYC_CAMERA_SEMANTIC_VIEW` | Live camera feeds, locations, status |
| `NYC_WEATHER_SEMANTIC_VIEW` | Temperature, humidity, wind, visibility |
| `NYC_AIR_QUALITY_SEMANTIC_VIEW` | AQI readings by pollutant |
| `NYC_TRAFFIC_EVENTS_SEMANTIC_VIEW` | Incidents, construction, severity |
| `THERMAL_SENSOR_SEMANTIC_VIEW` | IoT sensors with CO2, VOC, temperature |
| `SVMTA` | Real-time bus positions, routes, ETAs |

### Visualizations
- **Interactive Map** - Leaflet-based dark theme map with filterable markers
- **Charts** - Area, bar, pie, line, and radar charts with neon glow effects
- **Gauges** - Environmental monitors with threshold-based color coding
- **Data Tables** - Sortable, searchable tables with pagination and export

### Key Capabilities
- **Cortex Analyst Chat** - Natural language queries using Snowflake Cortex AI
- **Data Export** - Download any table as CSV or JSON
- **Real-time Updates** - Auto-refresh every 60 seconds
- **Responsive Design** - Works on desktop and tablet

---

## Authentication

See [AUTHENTICATION.md](./AUTHENTICATION.md) for complete documentation.

### Quick Reference

| Method | Environment Variables | Best For |
|--------|----------------------|----------|
| **OAuth** | Auto-detected | SPCS deployment |
| **Key-Pair** | `SNOWFLAKE_PRIVATE_KEY_PATH` | Production |
| **PAT** | `SNOWFLAKE_PAT` | Development |
| **Password** | `SNOWFLAKE_PASSWORD` | Simple testing |

### Test Your Configuration

```bash
npm run test:auth
```

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| Framework | Next.js 16 (App Router) |
| UI Components | shadcn/ui + Tailwind CSS |
| Charts | Recharts |
| Maps | Leaflet + react-leaflet |
| Database | Snowflake (snowflake-sdk) |
| AI | Snowflake Cortex Analyst |

---

## Design

Cyberpunk/Blade Runner aesthetic featuring:
- Dark background (#0a0a0f) with cyber grid pattern
- Neon accent colors: Cyan (#00d4ff), Magenta (#ff0080), Orange (#ff6b35), Green (#00ff88)
- Glowing effects, scanlines, and holographic animations
- Corner decorations and data stream effects
- Custom dark theme for Leaflet maps

---

## Project Structure

```
nyc-ops-center/
├── app/
│   ├── api/                    # API routes
│   │   ├── air-quality/route.ts
│   │   ├── analyst/route.ts    # Cortex AI chat
│   │   ├── cameras/route.ts
│   │   ├── export/route.ts     # CSV/JSON export
│   │   ├── mta/route.ts
│   │   ├── thermal/route.ts
│   │   ├── traffic/route.ts
│   │   └── weather/route.ts
│   ├── globals.css             # Blade Runner theme
│   ├── layout.tsx
│   └── page.tsx                # Main dashboard
├── components/
│   ├── dashboard/
│   │   ├── ai-chat.tsx         # Cortex Analyst panel
│   │   ├── badges.tsx          # Severity/AQI badges
│   │   ├── charts.tsx          # Neon chart components
│   │   ├── cyber-map.tsx       # Interactive map
│   │   ├── data-table.tsx      # Tables with export
│   │   ├── stat-card.tsx       # Metric cards
│   │   └── types.ts            # TypeScript interfaces
│   └── ui/                     # shadcn/ui components
├── lib/
│   ├── snowflake.ts            # Snowflake connection
│   └── utils.ts
├── scripts/
│   └── test-auth.ts            # Authentication test
├── AUTHENTICATION.md           # Auth documentation
├── Dockerfile
└── package.json
```

---

## API Caching

| Endpoint | Cache Duration | Reason |
|----------|---------------|--------|
| `/api/mta` | 15s | Most dynamic (bus positions) |
| `/api/traffic` | 30s | Medium update frequency |
| `/api/cameras` | 30s | Medium update frequency |
| `/api/thermal` | 30s | Sensor readings |
| `/api/weather` | 60s | Slower updates |
| `/api/air-quality` | 60s | Slower updates |

---

## SPCS Deployment

This app is ready for deployment to Snowpark Container Services:

1. A `Dockerfile` is included for containerization
2. The app auto-detects OAuth tokens at `/snowflake/session/token`
3. Use the `deploy-to-spcs` Cortex Code skill for guided deployment

```bash
# Build container
docker build -t nyc-ops-center .

# Deploy to SPCS (use Cortex Code skill)
/skill deploy-to-spcs
```

---

## Troubleshooting

### "Cannot read properties of null (reading 'proofKey')"
External browser auth doesn't work in server context. Configure PAT, key-pair, or password.

### "Programmatic access token is invalid"
Token may be expired or username doesn't match. Generate a new PAT.

### Dashboard shows "INITIALIZING SYSTEMS" forever
Check browser console for errors. Run `npm run test:auth` to verify connectivity.

### API routes return 500 errors
Check server logs (`npm run dev` terminal). Likely authentication issue.

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run test:auth` | Test Snowflake authentication |

---

## License

Internal use only.

---

Built with [Cortex Code](https://docs.snowflake.com/en/user-guide/cortex-code/cortex-code)
