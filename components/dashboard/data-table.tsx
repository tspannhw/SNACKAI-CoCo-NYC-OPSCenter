"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, Search, ChevronDown, FileJson, FileSpreadsheet } from "lucide-react";
import { cn } from "@/lib/utils";

interface Column<T> {
  key: keyof T & string;
  label: string;
  render?: (value: unknown, row: T) => React.ReactNode;
}

interface DataTableProps<T extends object> {
  title: string;
  data: T[];
  columns: Column<T>[];
  icon?: React.ReactNode;
  maxHeight?: string;
  className?: string;
  exportFilename?: string;
}

export function DataTable<T extends object>({
  title,
  data,
  columns,
  icon,
  maxHeight = "400px",
  className,
  exportFilename = "export",
}: DataTableProps<T>) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // Filter data based on search
  const filteredData = data.filter((row) =>
    columns.some((col) => {
      const value = row[col.key];
      return value?.toString().toLowerCase().includes(search.toLowerCase());
    })
  );

  // Sort data
  const sortedData = sortKey
    ? [...filteredData].sort((a, b) => {
        const aVal = (a as Record<string, unknown>)[sortKey];
        const bVal = (b as Record<string, unknown>)[sortKey];
        if (aVal === bVal) return 0;
        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;
        const comparison = aVal < bVal ? -1 : 1;
        return sortDir === "asc" ? comparison : -comparison;
      })
    : filteredData;

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const handleExport = async (format: "json" | "csv") => {
    try {
      const response = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: sortedData,
          filename: exportFilename,
          format,
        }),
      });

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${exportFilename}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export failed:", error);
    }
  };

  return (
    <Card className={cn("cyber-card corner-decoration", className)}>
      <CardHeader className="pb-3 border-b border-[#00d4ff]/20">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            {icon}
            <span className="text-[#00d4ff]">{title}</span>
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-7 w-[150px] pl-7 text-xs bg-[#0a0a0f] border-[#00d4ff]/30"
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs bg-[#0a0a0f] border-[#00d4ff]/30 hover:bg-[#00d4ff]/20"
                >
                  <Download className="h-3 w-3 mr-1" />
                  Export
                  <ChevronDown className="h-3 w-3 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-[#0d1117] border-[#00d4ff]/30">
                <DropdownMenuItem
                  onClick={() => handleExport("json")}
                  className="text-xs cursor-pointer"
                >
                  <FileJson className="h-3 w-3 mr-2 text-[#ffd000]" />
                  Export JSON
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleExport("csv")}
                  className="text-xs cursor-pointer"
                >
                  <FileSpreadsheet className="h-3 w-3 mr-2 text-[#00ff88]" />
                  Export CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <div className="text-[10px] text-muted-foreground mt-1">
          {sortedData.length} records
          {search && ` (filtered from ${data.length})`}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea style={{ maxHeight }}>
          <Table>
            <TableHeader className="sticky top-0 bg-[#0d1117]">
              <TableRow className="border-b border-[#00d4ff]/20 hover:bg-transparent">
                {columns.map((col) => (
                  <TableHead
                    key={col.key}
                    className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-[#00d4ff] transition-colors h-8"
                    onClick={() => handleSort(col.key)}
                  >
                    <div className="flex items-center gap-1">
                      {col.label}
                      {sortKey === col.key && (
                        <span className="text-[#00d4ff]">
                          {sortDir === "asc" ? "^" : "v"}
                        </span>
                      )}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedData.slice(0, 100).map((row, i) => (
                <TableRow
                  key={i}
                  className="border-b border-[#00d4ff]/10 hover:bg-[#00d4ff]/5 transition-colors"
                >
                  {columns.map((col) => (
                    <TableCell key={col.key} className="text-xs py-2 font-mono">
                      {col.render
                        ? col.render(row[col.key], row)
                        : String(row[col.key] ?? "-")}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {sortedData.length > 100 && (
            <div className="p-2 text-center text-[10px] text-muted-foreground border-t border-[#00d4ff]/10">
              Showing first 100 of {sortedData.length} records. Export to see all.
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
