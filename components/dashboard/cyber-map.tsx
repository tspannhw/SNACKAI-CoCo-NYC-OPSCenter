"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MapPin, Layers, ZoomIn, ZoomOut } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { MapMarker, MapMarkerDetails } from "./types";

interface CyberMapProps {
  markers: MapMarker[];
  center?: [number, number];
  zoom?: number;
  onMarkerClick?: (marker: MapMarker) => void;
  className?: string;
}

const markerColors: Record<string, string> = {
  camera: "#00d4ff",
  weather: "#ffd000",
  traffic: "#ff3333",
  air: "#00ff88",
  thermal: "#ff6b35",
  mta: "#ff0080",
};

const markerLabels: Record<string, string> = {
  camera: "Cameras",
  weather: "Weather",
  traffic: "Traffic",
  air: "Air Quality",
  thermal: "Thermal",
  mta: "MTA Buses",
};

function createCustomIcon(type: string) {
  const color = markerColors[type] || "#00d4ff";
  return L.divIcon({
    className: "custom-marker",
    html: `
      <div style="
        width: 12px;
        height: 12px;
        background: ${color};
        border-radius: 50%;
        box-shadow: 0 0 10px ${color}, 0 0 20px ${color}40;
        border: 2px solid rgba(255,255,255,0.3);
      "></div>
    `,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  });
}

function buildTooltipContent(marker: MapMarker): string {
  const color = markerColors[marker.type] || "#00d4ff";
  let detailsHtml = "";
  
  // Build details section if details exist
  if (marker.details && typeof marker.details === "object") {
    const details = marker.details;
    const detailLines: string[] = [];
    
    // Extract key information based on marker type
    if (marker.type === "weather") {
      if (details.temperature !== undefined) detailLines.push(`Temp: ${details.temperature}°F`);
      if (details.humidity !== undefined) detailLines.push(`Humidity: ${details.humidity}%`);
      if (details.conditions) detailLines.push(`${details.conditions}`);
    } else if (marker.type === "air") {
      if (details.aqi !== undefined) detailLines.push(`AQI: ${details.aqi}`);
      if (details.pm25 !== undefined) detailLines.push(`PM2.5: ${details.pm25}`);
      if (details.status) detailLines.push(`Status: ${details.status}`);
    } else if (marker.type === "traffic") {
      if (details.status) detailLines.push(`Status: ${details.status}`);
      if (details.severity) detailLines.push(`Severity: ${details.severity}`);
      if (details.description) detailLines.push(`${String(details.description).substring(0, 50)}`);
    } else if (marker.type === "thermal") {
      if (details.temperature !== undefined) detailLines.push(`Temp: ${details.temperature}°F`);
      if (details.status) detailLines.push(`Status: ${details.status}`);
    } else if (marker.type === "mta") {
      if (details.route) detailLines.push(`Route: ${details.route}`);
      if (details.direction) detailLines.push(`Dir: ${details.direction}`);
      if (details.nextStop) detailLines.push(`Next: ${details.nextStop}`);
    } else if (marker.type === "camera") {
      if (details.status) detailLines.push(`Status: ${details.status}`);
      if (details.location) detailLines.push(`${details.location}`);
    }
    
    // Add any other non-standard details (limit to first 3)
    if (detailLines.length === 0) {
      Object.entries(details).slice(0, 3).forEach(([key, value]) => {
        if (value !== undefined && value !== null && key !== "lat" && key !== "lng" && key !== "id") {
          detailLines.push(`${key}: ${String(value).substring(0, 30)}`);
        }
      });
    }
    
    if (detailLines.length > 0) {
      detailsHtml = `<div style="margin-top: 6px; padding-top: 6px; border-top: 1px solid ${color}40;">
        ${detailLines.map(line => `<div style="color: #9ca3af; font-size: 9px;">${line}</div>`).join("")}
      </div>`;
    }
  }
  
  return `<div style="
    background: rgba(13, 17, 23, 0.98);
    color: #e0e6ed;
    padding: 10px 14px;
    border-radius: 6px;
    font-family: monospace;
    font-size: 11px;
    min-width: 140px;
    max-width: 220px;
    border: 1px solid ${color}50;
    box-shadow: 0 4px 20px rgba(0,0,0,0.5), 0 0 15px ${color}30;
  ">
    <div style="color: ${color}; font-weight: bold; margin-bottom: 2px;">
      ${marker.label}
    </div>
    <div style="color: #6b7280; text-transform: uppercase; font-size: 9px; letter-spacing: 0.5px;">
      ${markerLabels[marker.type]}
    </div>
    <div style="color: #4b5563; font-size: 8px; margin-top: 4px;">
      ${marker.lat.toFixed(4)}, ${marker.lng.toFixed(4)}
    </div>
    ${detailsHtml}
  </div>`;
}

function renderDetails(details: MapMarkerDetails): React.ReactNode[] {
  return Object.entries(details)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => (
      <div key={key} className="flex justify-between items-start py-1 border-b border-white/5">
        <span className="text-[10px] text-muted-foreground capitalize">
          {key.replace(/_/g, " ")}
        </span>
        <span className="text-[10px] text-foreground/90 font-mono text-right max-w-[60%] break-words">
          {typeof value === "object" ? JSON.stringify(value) : String(value)}
        </span>
      </div>
    ));
}

export function CyberMap({
  markers,
  center = [40.7128, -74.006],
  zoom = 11,
  onMarkerClick,
  className,
}: CyberMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const [activeFilters, setActiveFilters] = useState<Set<string>>(
    new Set(["camera", "weather", "traffic", "air", "thermal", "mta"])
  );
  const [selectedMarker, setSelectedMarker] = useState<MapMarker | null>(null);

  // Filter markers based on active filters
  const filteredMarkers = useMemo(
    () => markers.filter((m) => activeFilters.has(m.type)),
    [markers, activeFilters]
  );

  // Count markers by type
  const markerCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    markers.forEach((m) => {
      counts[m.type] = (counts[m.type] || 0) + 1;
    });
    return counts;
  }, [markers]);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      center,
      zoom,
      zoomControl: false,
      attributionControl: false,
    });

    // Dark tile layer
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      maxZoom: 19,
    }).addTo(map);

    // Custom attribution
    L.control
      .attribution({ position: "bottomright", prefix: false })
      .addTo(map);

    markersLayerRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [center, zoom]);

  // Update markers
  useEffect(() => {
    if (!markersLayerRef.current) return;

    markersLayerRef.current.clearLayers();

    filteredMarkers.forEach((marker) => {
      if (!marker.lat || !marker.lng) return;
      
      const leafletMarker = L.marker([marker.lat, marker.lng], {
        icon: createCustomIcon(marker.type),
      });

      // Tooltip on hover - shows point information
      const tooltipContent = buildTooltipContent(marker);
      leafletMarker.bindTooltip(tooltipContent, {
        className: "cyber-tooltip",
        direction: "top",
        offset: [0, -8],
        opacity: 1,
      });

      leafletMarker.on("click", () => {
        setSelectedMarker(marker);
        onMarkerClick?.(marker);
      });

      leafletMarker.addTo(markersLayerRef.current!);
    });
  }, [filteredMarkers, onMarkerClick]);

  const toggleFilter = (type: string) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  const handleZoom = (delta: number) => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setZoom(mapInstanceRef.current.getZoom() + delta);
    }
  };

  return (
    <Card className={`cyber-card corner-decoration overflow-hidden ${className}`}>
      <CardHeader className="pb-2 border-b border-[#00d4ff]/20">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <MapPin className="h-4 w-4 text-[#00d4ff]" />
            <span className="text-[#00d4ff]">NYC OPERATIONS MAP</span>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="bg-[#00d4ff]/10 text-[#00d4ff] border-[#00d4ff]/30 text-xs"
            >
              {filteredMarkers.length} ACTIVE
            </Badge>
          </div>
        </div>
        <div className="flex flex-wrap gap-1 mt-2">
          {Object.entries(markerLabels).map(([type, label]) => (
            <Button
              key={type}
              variant="outline"
              size="sm"
              className={`h-6 px-2 text-[10px] font-mono transition-all ${
                activeFilters.has(type)
                  ? `bg-[${markerColors[type]}]/20 text-[${markerColors[type]}] border-[${markerColors[type]}]/50`
                  : "bg-transparent text-muted-foreground border-muted/30 opacity-50"
              }`}
              style={{
                backgroundColor: activeFilters.has(type)
                  ? `${markerColors[type]}20`
                  : undefined,
                color: activeFilters.has(type) ? markerColors[type] : undefined,
                borderColor: activeFilters.has(type)
                  ? `${markerColors[type]}50`
                  : undefined,
              }}
              onClick={() => toggleFilter(type)}
            >
              {label} ({markerCounts[type] || 0})
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="p-0 relative">
        <div ref={mapRef} className="h-[400px] w-full" />
        
        {/* Zoom controls */}
        <div className="absolute top-4 right-4 flex flex-col gap-1 z-[1000]">
          <Button
            size="sm"
            variant="outline"
            className="h-8 w-8 p-0 bg-[#0d1117]/90 border-[#00d4ff]/30 hover:bg-[#00d4ff]/20"
            onClick={() => handleZoom(1)}
          >
            <ZoomIn className="h-4 w-4 text-[#00d4ff]" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 w-8 p-0 bg-[#0d1117]/90 border-[#00d4ff]/30 hover:bg-[#00d4ff]/20"
            onClick={() => handleZoom(-1)}
          >
            <ZoomOut className="h-4 w-4 text-[#00d4ff]" />
          </Button>
        </div>

        {/* Legend */}
        <div className="absolute bottom-4 left-4 bg-[#0d1117]/90 border border-[#00d4ff]/20 rounded p-2 z-[1000]">
          <div className="flex items-center gap-1 text-[9px] text-muted-foreground mb-1">
            <Layers className="h-3 w-3" />
            LEGEND
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1">
            {Object.entries(markerLabels).map(([type, label]) => (
              <div key={type} className="flex items-center gap-1">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{
                    backgroundColor: markerColors[type],
                    boxShadow: `0 0 4px ${markerColors[type]}`,
                  }}
                />
                <span className="text-[9px] text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Selected marker detail panel */}
        {selectedMarker && (
          <div 
            className="absolute inset-0 bg-[#0d1117]/98 z-[1001] flex flex-col"
            style={{ backdropFilter: "blur(4px)" }}
          >
            {/* Header with back button */}
            <div className="flex items-center gap-3 p-4 border-b border-[#00d4ff]/20">
              <Button
                size="sm"
                variant="outline"
                className="h-8 px-3 bg-[#00d4ff]/10 border-[#00d4ff]/30 hover:bg-[#00d4ff]/20 text-[#00d4ff]"
                onClick={() => setSelectedMarker(null)}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Map
              </Button>
              <div className="flex-1">
                <div
                  className="text-sm font-bold"
                  style={{ color: markerColors[selectedMarker.type] }}
                >
                  {selectedMarker.label}
                </div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  {markerLabels[selectedMarker.type]}
                </div>
              </div>
              <div
                className="w-3 h-3 rounded-full"
                style={{
                  backgroundColor: markerColors[selectedMarker.type],
                  boxShadow: `0 0 10px ${markerColors[selectedMarker.type]}`,
                }}
              />
            </div>
            
            {/* Detail content */}
            <div className="flex-1 p-4 overflow-auto">
              {/* Location */}
              <div className="mb-4">
                <div className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1">Location</div>
                <div className="text-xs font-mono text-[#00d4ff]">
                  {selectedMarker.lat.toFixed(6)}, {selectedMarker.lng.toFixed(6)}
                </div>
              </div>
              
              {/* ID */}
              <div className="mb-4">
                <div className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1">ID</div>
                <div className="text-xs font-mono text-foreground/80">
                  {selectedMarker.id}
                </div>
              </div>
              
              {/* Details */}
              {selectedMarker.details && (
                <div>
                  <div className="text-[9px] text-muted-foreground uppercase tracking-wider mb-2">Details</div>
                  <div className="space-y-2">
                    {renderDetails(selectedMarker.details)}
                  </div>
                </div>
              )}
            </div>
            
            {/* Footer */}
            <div className="p-3 border-t border-[#00d4ff]/20 flex justify-center">
              <Button
                size="sm"
                variant="outline"
                className="h-8 px-4 bg-transparent border-[#00d4ff]/30 hover:bg-[#00d4ff]/20 text-[#00d4ff] text-xs"
                onClick={() => setSelectedMarker(null)}
              >
                Close & Return to Map
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
