"use client";

import { useEffect, useRef, useState, useMemo } from "react";
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

interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  type: "camera" | "weather" | "traffic" | "air" | "thermal" | "mta";
  label: string;
  details?: unknown;
}

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

      leafletMarker.bindPopup(
        `<div style="
          background: rgba(13, 17, 23, 0.95);
          color: #e0e6ed;
          padding: 8px 12px;
          border-radius: 4px;
          font-family: monospace;
          font-size: 11px;
          min-width: 150px;
        ">
          <div style="color: ${markerColors[marker.type]}; font-weight: bold; margin-bottom: 4px;">
            ${marker.label}
          </div>
          <div style="color: #6b7280; text-transform: uppercase; font-size: 9px;">
            ${markerLabels[marker.type]}
          </div>
        </div>`,
        {
          className: "cyber-popup",
        }
      );

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

        {/* Selected marker info */}
        {selectedMarker && (
          <div className="absolute top-4 left-4 bg-[#0d1117]/95 border border-[#00d4ff]/30 rounded p-3 z-[1000] max-w-[200px]">
            <div
              className="text-xs font-bold mb-1"
              style={{ color: markerColors[selectedMarker.type] }}
            >
              {selectedMarker.label}
            </div>
            <div className="text-[10px] text-muted-foreground uppercase">
              {markerLabels[selectedMarker.type]}
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="absolute top-1 right-1 h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
              onClick={() => setSelectedMarker(null)}
            >
              x
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
