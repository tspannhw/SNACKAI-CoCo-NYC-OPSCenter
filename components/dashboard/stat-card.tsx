"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: "cyan" | "magenta" | "orange" | "green" | "yellow";
  className?: string;
}

const variantStyles = {
  cyan: {
    glow: "neon-glow-cyan",
    text: "text-[#00d4ff]",
    bg: "bg-[#00d4ff]/10",
  },
  magenta: {
    glow: "neon-glow-magenta",
    text: "text-[#ff0080]",
    bg: "bg-[#ff0080]/10",
  },
  orange: {
    glow: "neon-glow-orange",
    text: "text-[#ff6b35]",
    bg: "bg-[#ff6b35]/10",
  },
  green: {
    glow: "neon-glow-green",
    text: "text-[#00ff88]",
    bg: "bg-[#00ff88]/10",
  },
  yellow: {
    glow: "",
    text: "text-[#ffd000]",
    bg: "bg-[#ffd000]/10",
  },
};

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = "cyan",
  className,
}: StatCardProps) {
  const styles = variantStyles[variant];

  return (
    <Card
      className={cn(
        "cyber-card corner-decoration data-stream",
        styles.glow,
        className
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {title}
        </CardTitle>
        <div className={cn("p-2 rounded", styles.bg)}>
          <Icon className={cn("h-4 w-4", styles.text)} />
        </div>
      </CardHeader>
      <CardContent>
        <div className={cn("text-3xl font-bold tracking-tight", styles.text)}>
          {value}
        </div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
        {trend && (
          <div className="flex items-center mt-2">
            <span
              className={cn(
                "text-xs font-medium",
                trend.isPositive ? "text-[#00ff88]" : "text-[#ff3333]"
              )}
            >
              {trend.isPositive ? "+" : ""}
              {trend.value}%
            </span>
            <span className="text-xs text-muted-foreground ml-1">
              from last hour
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
