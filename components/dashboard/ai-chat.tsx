"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Bot, User, Loader2, Sparkles, Database, ChevronDown, ChevronUp, Code, Cpu } from "lucide-react";
import { cn } from "@/lib/utils";

interface QueryResult {
  sql: string | null;
  results: Record<string, unknown>[] | null;
  rowCount: number;
  toolName?: string | null;
  agentName?: string | null;
  usedAgent?: boolean;
  duration?: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  queryResult?: QueryResult;
}

function SQLResultsTable({ results }: { results: Record<string, unknown>[] }) {
  if (!results || results.length === 0) return null;
  
  const columns = Object.keys(results[0]);
  
  return (
    <div className="overflow-x-auto mt-2">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-[#00d4ff]/10">
            {columns.map((col) => (
              <th key={col} className="border border-[#00d4ff]/20 px-2 py-1 text-left text-[#00d4ff] font-medium">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {results.slice(0, 10).map((row, i) => (
            <tr key={i} className={i % 2 === 0 ? "bg-[#0a0a0f]/50" : "bg-[#1a1a2e]/50"}>
              {columns.map((col) => (
                <td key={col} className="border border-[#00d4ff]/10 px-2 py-1 text-foreground/80 truncate max-w-[200px]">
                  {String(row[col] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {results.length > 10 && (
        <p className="text-[10px] text-muted-foreground mt-1">
          Showing 10 of {results.length} rows
        </p>
      )}
    </div>
  );
}

function QueryResultDisplay({ queryResult }: { queryResult: QueryResult }) {
  const [showSQL, setShowSQL] = useState(false);
  const [showResults, setShowResults] = useState(true);
  
  if (!queryResult.sql && !queryResult.results && !queryResult.usedAgent) return null;
  
  return (
    <div className="mt-3 border-t border-[#00d4ff]/10 pt-3">
      {queryResult.usedAgent && (
        <div className="flex items-center gap-2 mb-2 text-[10px]">
          <Cpu className="h-3 w-3 text-purple-400" />
          <span className="text-purple-400">
            Cortex Agent: {queryResult.toolName || "NYC_OPS_CENTER_AGENT"}
          </span>
        </div>
      )}
      
      {queryResult.sql && (
        <div className="mb-2">
          <button
            onClick={() => setShowSQL(!showSQL)}
            className="flex items-center gap-1 text-[10px] text-[#00d4ff] hover:text-[#00d4ff]/80 transition-colors"
          >
            <Code className="h-3 w-3" />
            <span>SQL Query</span>
            {showSQL ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
          {showSQL && (
            <pre className="mt-1 p-2 bg-[#0a0a0f] rounded text-[10px] text-green-400 overflow-x-auto border border-[#00d4ff]/10 whitespace-pre-wrap">
              {queryResult.sql}
            </pre>
          )}
        </div>
      )}
      
      {queryResult.results && queryResult.results.length > 0 && (
        <div>
          <button
            onClick={() => setShowResults(!showResults)}
            className="flex items-center gap-1 text-[10px] text-[#ff0080] hover:text-[#ff0080]/80 transition-colors"
          >
            <Database className="h-3 w-3" />
            <span>Results ({queryResult.rowCount} rows)</span>
            {showResults ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
          {showResults && <SQLResultsTable results={queryResult.results} />}
        </div>
      )}
      
      {queryResult.duration && (
        <p className="text-[9px] text-muted-foreground mt-2">
          Completed in {queryResult.duration}
        </p>
      )}
    </div>
  );
}

export function AIChatPanel() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Welcome to NYC Ops Command Center AI powered by Cortex Agent. I can help you analyze data from traffic cameras, weather stations, air quality monitors, thermal sensors, and MTA buses. What would you like to know?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 180000);

    try {
      const response = await fetch("/api/analyst", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: input }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const data = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.answer || data.error || "Unable to process your request.",
        timestamp: new Date(),
        queryResult: (data.sql || data.results || data.usedAgent) ? {
          sql: data.sql,
          results: data.results,
          rowCount: data.rowCount || 0,
          toolName: data.toolName,
          agentName: data.agentName,
          usedAgent: data.usedAgent,
          duration: data.duration,
        } : undefined,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      clearTimeout(timeoutId);
      const errorMessage = err instanceof Error && err.name === "AbortError"
        ? "Request timed out. The Cortex Agent may be processing a complex query."
        : "Connection error. Please try again.";
      
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: errorMessage,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="cyber-card corner-decoration h-full flex flex-col">
      <CardHeader className="pb-3 border-b border-[#00d4ff]/20">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#ff0080]" />
            <span className="text-[#00d4ff]">CORTEX AGENT</span>
          </CardTitle>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Cpu className="h-3 w-3" />
            <span>NYC_OPS_CENTER_AGENT</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-0 min-h-0">
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 min-h-0"
          style={{ maxHeight: "calc(100% - 100px)" }}
        >
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-3",
                  message.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                {message.role === "assistant" && (
                  <div className="w-8 h-8 rounded bg-[#ff0080]/20 flex items-center justify-center shrink-0">
                    <Bot className="h-4 w-4 text-[#ff0080]" />
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[85%] rounded-lg px-4 py-2 text-sm",
                    message.role === "user"
                      ? "bg-[#00d4ff]/20 text-[#00d4ff] border border-[#00d4ff]/30"
                      : "bg-[#1a1a2e] text-foreground border border-[#ff0080]/20"
                  )}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                  {message.queryResult && (
                    <QueryResultDisplay queryResult={message.queryResult} />
                  )}
                  <span className="text-[10px] text-muted-foreground mt-1 block">
                    {message.timestamp.toLocaleTimeString()}
                  </span>
                </div>
                {message.role === "user" && (
                  <div className="w-8 h-8 rounded bg-[#00d4ff]/20 flex items-center justify-center shrink-0">
                    <User className="h-4 w-4 text-[#00d4ff]" />
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded bg-[#ff0080]/20 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-[#ff0080]" />
                </div>
                <div className="bg-[#1a1a2e] rounded-lg px-4 py-3 border border-[#ff0080]/20">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-[#ff0080]" />
                    <span className="text-xs text-muted-foreground">Cortex Agent processing...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
        <form
          onSubmit={handleSubmit}
          className="p-4 border-t border-[#00d4ff]/20"
        >
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about NYC operations data..."
              className="min-h-[60px] max-h-[120px] bg-[#0a0a0f] border-[#00d4ff]/30 resize-none text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
            />
            <Button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="bg-[#00d4ff] hover:bg-[#00d4ff]/80 text-[#0a0a0f] px-4"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
