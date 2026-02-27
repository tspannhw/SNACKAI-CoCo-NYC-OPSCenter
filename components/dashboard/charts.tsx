"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";

const NEON_COLORS = [
  "#00d4ff",
  "#ff0080",
  "#00ff88",
  "#ff6b35",
  "#ffd000",
  "#0066ff",
];

interface ChartCardProps {
  title: string;
  icon?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

export function ChartCard({ title, icon, className, children }: ChartCardProps) {
  return (
    <Card className={cn("cyber-card corner-decoration", className)}>
      <CardHeader className="pb-2 border-b border-[#00d4ff]/20">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          {icon}
          <span className="text-[#00d4ff]">{title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">{children}</CardContent>
    </Card>
  );
}

interface AreaChartProps {
  data: Record<string, unknown>[];
  dataKey: string;
  xAxisKey: string;
  color?: string;
  height?: number;
}

export function NeonAreaChart({
  data,
  dataKey,
  xAxisKey,
  color = "#00d4ff",
  height = 200,
}: AreaChartProps) {
  const chartConfig = {
    [dataKey]: { color },
  };

  return (
    <ChartContainer config={chartConfig} className={`h-[${height}px] w-full`}>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
          <defs>
            <linearGradient id={`gradient-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.4} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,212,255,0.1)" />
          <XAxis
            dataKey={xAxisKey}
            tick={{ fill: "#6b7280", fontSize: 10 }}
            axisLine={{ stroke: "rgba(0,212,255,0.2)" }}
            tickLine={{ stroke: "rgba(0,212,255,0.2)" }}
          />
          <YAxis
            tick={{ fill: "#6b7280", fontSize: 10 }}
            axisLine={{ stroke: "rgba(0,212,255,0.2)" }}
            tickLine={{ stroke: "rgba(0,212,255,0.2)" }}
          />
          <ChartTooltip
            content={<ChartTooltipContent className="bg-[#0d1117] border-[#00d4ff]/30" />}
          />
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={2}
            fill={`url(#gradient-${dataKey})`}
            style={{ filter: `drop-shadow(0 0 4px ${color})` }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}

interface BarChartProps {
  data: Record<string, unknown>[];
  dataKey: string;
  xAxisKey: string;
  colors?: string[];
  height?: number;
  layout?: "horizontal" | "vertical";
}

export function NeonBarChart({
  data,
  dataKey,
  xAxisKey,
  colors = NEON_COLORS,
  height = 200,
  layout = "horizontal",
}: BarChartProps) {
  const chartConfig = {
    [dataKey]: { color: colors[0] },
  };

  return (
    <ChartContainer config={chartConfig} className={`h-[${height}px] w-full`}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={data}
          layout={layout}
          margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,212,255,0.1)" />
          {layout === "horizontal" ? (
            <>
              <XAxis
                dataKey={xAxisKey}
                tick={{ fill: "#6b7280", fontSize: 10 }}
                axisLine={{ stroke: "rgba(0,212,255,0.2)" }}
              />
              <YAxis
                tick={{ fill: "#6b7280", fontSize: 10 }}
                axisLine={{ stroke: "rgba(0,212,255,0.2)" }}
              />
            </>
          ) : (
            <>
              <XAxis
                type="number"
                tick={{ fill: "#6b7280", fontSize: 10 }}
                axisLine={{ stroke: "rgba(0,212,255,0.2)" }}
              />
              <YAxis
                type="category"
                dataKey={xAxisKey}
                tick={{ fill: "#6b7280", fontSize: 10 }}
                axisLine={{ stroke: "rgba(0,212,255,0.2)" }}
                width={80}
              />
            </>
          )}
          <ChartTooltip
            content={<ChartTooltipContent className="bg-[#0d1117] border-[#00d4ff]/30" />}
          />
          <Bar dataKey={dataKey} radius={[4, 4, 0, 0]}>
            {data.map((_, index) => (
              <Cell
                key={index}
                fill={colors[index % colors.length]}
                style={{ filter: `drop-shadow(0 0 4px ${colors[index % colors.length]})` }}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}

interface MultiLineChartProps {
  data: Record<string, unknown>[];
  lines: { dataKey: string; color: string; name: string }[];
  xAxisKey: string;
  height?: number;
}

export function NeonMultiLineChart({
  data,
  lines,
  xAxisKey,
  height = 200,
}: MultiLineChartProps) {
  const chartConfig = lines.reduce(
    (acc, line) => ({ ...acc, [line.dataKey]: { color: line.color, label: line.name } }),
    {}
  );

  return (
    <ChartContainer config={chartConfig} className={`h-[${height}px] w-full`}>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,212,255,0.1)" />
          <XAxis
            dataKey={xAxisKey}
            tick={{ fill: "#6b7280", fontSize: 10 }}
            axisLine={{ stroke: "rgba(0,212,255,0.2)" }}
          />
          <YAxis
            tick={{ fill: "#6b7280", fontSize: 10 }}
            axisLine={{ stroke: "rgba(0,212,255,0.2)" }}
          />
          <ChartTooltip
            content={<ChartTooltipContent className="bg-[#0d1117] border-[#00d4ff]/30" />}
          />
          {lines.map((line) => (
            <Line
              key={line.dataKey}
              type="monotone"
              dataKey={line.dataKey}
              stroke={line.color}
              strokeWidth={2}
              dot={false}
              style={{ filter: `drop-shadow(0 0 4px ${line.color})` }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}

interface PieChartProps {
  data: { name: string; value: number; color?: string }[];
  height?: number;
}

export function NeonPieChart({ data, height = 200 }: PieChartProps) {
  const chartConfig = data.reduce(
    (acc, item, i) => ({
      ...acc,
      [item.name]: { color: item.color || NEON_COLORS[i % NEON_COLORS.length], label: item.name },
    }),
    {}
  );

  return (
    <ChartContainer config={chartConfig} className={`h-[${height}px] w-full`}>
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <ChartTooltip
            content={<ChartTooltipContent className="bg-[#0d1117] border-[#00d4ff]/30" />}
          />
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={40}
            outerRadius={70}
            paddingAngle={2}
          >
            {data.map((entry, index) => (
              <Cell
                key={index}
                fill={entry.color || NEON_COLORS[index % NEON_COLORS.length]}
                stroke="transparent"
                style={{
                  filter: `drop-shadow(0 0 8px ${entry.color || NEON_COLORS[index % NEON_COLORS.length]})`,
                }}
              />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}

interface RadarChartProps {
  data: Record<string, unknown>[];
  dataKey: string;
  angleKey: string;
  color?: string;
  height?: number;
}

export function NeonRadarChart({
  data,
  dataKey,
  angleKey,
  color = "#00d4ff",
  height = 200,
}: RadarChartProps) {
  const chartConfig = {
    [dataKey]: { color },
  };

  return (
    <ChartContainer config={chartConfig} className={`h-[${height}px] w-full`}>
      <ResponsiveContainer width="100%" height={height}>
        <RadarChart data={data} cx="50%" cy="50%" outerRadius="70%">
          <PolarGrid stroke="rgba(0,212,255,0.2)" />
          <PolarAngleAxis
            dataKey={angleKey}
            tick={{ fill: "#6b7280", fontSize: 10 }}
          />
          <PolarRadiusAxis
            tick={{ fill: "#6b7280", fontSize: 10 }}
            axisLine={{ stroke: "rgba(0,212,255,0.2)" }}
          />
          <Radar
            dataKey={dataKey}
            stroke={color}
            fill={color}
            fillOpacity={0.3}
            style={{ filter: `drop-shadow(0 0 4px ${color})` }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}

interface GaugeProps {
  value: number;
  max: number;
  label: string;
  color?: string;
  thresholds?: { value: number; color: string }[];
}

export function NeonGauge({
  value,
  max,
  label,
  color = "#00d4ff",
  thresholds,
}: GaugeProps) {
  const percentage = Math.min((value / max) * 100, 100);
  
  // Determine color based on thresholds
  let activeColor = color;
  if (thresholds) {
    for (const t of thresholds) {
      if (value >= t.value) {
        activeColor = t.color;
      }
    }
  }

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-32 h-16 overflow-hidden">
        <div
          className="absolute inset-0 border-t-8 border-l-8 border-r-8 rounded-t-full"
          style={{ borderColor: "rgba(0,212,255,0.1)" }}
        />
        <div
          className="absolute inset-0 border-t-8 border-l-8 border-r-8 rounded-t-full transition-all duration-500"
          style={{
            borderColor: activeColor,
            clipPath: `polygon(0 100%, ${percentage}% 100%, ${percentage}% 0, 0 0)`,
            filter: `drop-shadow(0 0 8px ${activeColor})`,
          }}
        />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-center">
          <div className="text-2xl font-bold" style={{ color: activeColor }}>
            {value}
          </div>
        </div>
      </div>
      <div className="text-xs text-muted-foreground mt-1 uppercase tracking-wider">
        {label}
      </div>
    </div>
  );
}
