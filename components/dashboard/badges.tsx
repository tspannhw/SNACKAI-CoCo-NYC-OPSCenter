"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface SeverityBadgeProps {
  severity: string;
  className?: string;
}

export function SeverityBadge({ severity, className }: SeverityBadgeProps) {
  const normalizedSeverity = severity?.toLowerCase() || "unknown";

  const getVariantStyles = () => {
    switch (normalizedSeverity) {
      case "critical":
      case "severe":
      case "high":
      case "emergency":
        return "bg-[#ff3333]/20 text-[#ff3333] border-[#ff3333]/30 shadow-[0_0_10px_rgba(255,51,51,0.3)]";
      case "major":
      case "medium":
      case "moderate":
        return "bg-[#ff6b35]/20 text-[#ff6b35] border-[#ff6b35]/30 shadow-[0_0_10px_rgba(255,107,53,0.3)]";
      case "minor":
      case "low":
        return "bg-[#ffd000]/20 text-[#ffd000] border-[#ffd000]/30 shadow-[0_0_10px_rgba(255,208,0,0.3)]";
      case "good":
      case "normal":
      case "ok":
        return "bg-[#00ff88]/20 text-[#00ff88] border-[#00ff88]/30 shadow-[0_0_10px_rgba(0,255,136,0.3)]";
      default:
        return "bg-[#00d4ff]/20 text-[#00d4ff] border-[#00d4ff]/30 shadow-[0_0_10px_rgba(0,212,255,0.3)]";
    }
  };

  return (
    <Badge
      variant="outline"
      className={cn(
        "font-mono text-xs uppercase tracking-wider",
        getVariantStyles(),
        className
      )}
    >
      {severity || "Unknown"}
    </Badge>
  );
}

interface AQIBadgeProps {
  aqi: number;
  className?: string;
}

export function AQIBadge({ aqi, className }: AQIBadgeProps) {
  const getAQICategory = () => {
    if (aqi <= 50) return { label: "Good", color: "bg-[#00ff88]/20 text-[#00ff88] border-[#00ff88]/30" };
    if (aqi <= 100) return { label: "Moderate", color: "bg-[#ffd000]/20 text-[#ffd000] border-[#ffd000]/30" };
    if (aqi <= 150) return { label: "Unhealthy (Sensitive)", color: "bg-[#ff6b35]/20 text-[#ff6b35] border-[#ff6b35]/30" };
    if (aqi <= 200) return { label: "Unhealthy", color: "bg-[#ff3333]/20 text-[#ff3333] border-[#ff3333]/30" };
    if (aqi <= 300) return { label: "Very Unhealthy", color: "bg-[#ff0080]/20 text-[#ff0080] border-[#ff0080]/30" };
    return { label: "Hazardous", color: "bg-[#800080]/20 text-[#800080] border-[#800080]/30" };
  };

  const { label, color } = getAQICategory();

  return (
    <Badge variant="outline" className={cn("font-mono text-xs", color, className)}>
      AQI {aqi} - {label}
    </Badge>
  );
}

interface StatusDotProps {
  status: "online" | "warning" | "danger" | "offline";
  label?: string;
  className?: string;
}

export function StatusDot({ status, label, className }: StatusDotProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className={cn("status-dot", status)} />
      {label && (
        <span className="text-xs text-muted-foreground uppercase tracking-wider">
          {label}
        </span>
      )}
    </div>
  );
}
