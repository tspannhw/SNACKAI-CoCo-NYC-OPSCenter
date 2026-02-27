import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/snowflake";
import crypto from "crypto";
import fs from "fs";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

const AGENT_DATABASE = "DEMO";
const AGENT_SCHEMA = "DEMO";
const AGENT_NAME = "NYC_OPS_CENTER_AGENT";
const TIMEOUT_MS = 180000;

interface ToolResultContent {
  type: string;
  json?: {
    sql?: string;
    result_set?: {
      data?: unknown[][];
      resultSetMetaData?: {
        rowType?: Array<{ name: string; type: string }>;
        numRows?: number;
      };
    };
    text?: string;
    query_id?: string;
  };
}

interface ContentItem {
  type: string;
  text?: string;
  tool_result?: {
    name: string;
    type: string;
    status: string;
    content: ToolResultContent[];
  };
}

interface AgentResponse {
  role: string;
  content: ContentItem[];
  metadata?: {
    usage?: unknown;
  };
}

function getPrivateKey(): string | null {
  const keyPath = process.env.SNOWFLAKE_PRIVATE_KEY_PATH;
  const keyContent = process.env.SNOWFLAKE_PRIVATE_KEY;
  
  if (keyContent) {
    return keyContent.replace(/\\n/g, "\n");
  }
  
  if (keyPath) {
    try {
      if (fs.existsSync(keyPath)) {
        return fs.readFileSync(keyPath, "utf8");
      }
    } catch {
      console.error("Failed to read private key");
    }
  }
  return null;
}

function generateJWT(): string {
  const account = process.env.SNOWFLAKE_ACCOUNT || "";
  const user = process.env.SNOWFLAKE_USER || "";
  const privateKey = getPrivateKey();
  
  if (!privateKey) {
    throw new Error("Private key not available for JWT generation");
  }

  const accountUpper = account.toUpperCase().replace(".GLOBAL", "").split(".")[0];
  const userUpper = user.toUpperCase();
  const qualifiedUsername = `${accountUpper}.${userUpper}`;

  const publicKeyFp = crypto
    .createHash("sha256")
    .update(
      crypto.createPublicKey(privateKey).export({ type: "spki", format: "der" })
    )
    .digest("base64");

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: `${qualifiedUsername}.SHA256:${publicKeyFp}`,
    sub: qualifiedUsername,
    iat: now,
    exp: now + 3600,
  };

  const encode = (obj: object) =>
    Buffer.from(JSON.stringify(obj)).toString("base64url");
  const headerB64 = encode(header);
  const payloadB64 = encode(payload);

  const signature = crypto
    .createSign("RSA-SHA256")
    .update(`${headerB64}.${payloadB64}`)
    .sign(privateKey, "base64url");

  return `${headerB64}.${payloadB64}.${signature}`;
}

async function getAuthToken(): Promise<{ token: string; tokenType: string }> {
  if (process.env.SNOWFLAKE_PAT) {
    return { token: process.env.SNOWFLAKE_PAT, tokenType: "PROGRAMMATIC_ACCESS_TOKEN" };
  }

  if (getPrivateKey() && process.env.SNOWFLAKE_USER) {
    return { token: generateJWT(), tokenType: "KEYPAIR_JWT" };
  }

  throw new Error("No valid authentication method available for Cortex Agent API");
}

function getAccountUrl(): string {
  const account = process.env.SNOWFLAKE_ACCOUNT || "";
  if (account.includes(".snowflakecomputing.com")) {
    return `https://${account}`;
  }
  return `https://${account}.snowflakecomputing.com`;
}

async function callCortexAgent(question: string, signal?: AbortSignal): Promise<{
  answer: string;
  sql: string | null;
  results: Record<string, unknown>[] | null;
  toolName: string | null;
}> {
  const { token, tokenType } = await getAuthToken();
  const accountUrl = getAccountUrl();
  
  const agentUrl = `${accountUrl}/api/v2/databases/${AGENT_DATABASE}/schemas/${AGENT_SCHEMA}/agents/${AGENT_NAME}:run`;
  
  const requestBody = {
    messages: [
      {
        role: "user",
        content: [{ type: "text", text: question }]
      }
    ],
    stream: false
  };

  const response = await fetch(agentUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "Authorization": `Bearer ${token}`,
      "X-Snowflake-Authorization-Token-Type": tokenType
    },
    body: JSON.stringify(requestBody),
    signal
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Cortex Agent API error: ${response.status} - ${errorText}`);
  }

  const data: AgentResponse = await response.json();
  
  let answer = "";
  let sql: string | null = null;
  let results: Record<string, unknown>[] | null = null;
  let toolName: string | null = null;

  for (const item of data.content || []) {
    if (item.type === "text" && item.text) {
      answer += item.text;
    }
    
    if (item.type === "tool_result" && item.tool_result) {
      toolName = item.tool_result.name;
      
      for (const content of item.tool_result.content || []) {
        if (content.type === "json" && content.json) {
          if (content.json.sql) {
            sql = content.json.sql;
          }
          
          if (content.json.result_set?.data && content.json.result_set?.resultSetMetaData?.rowType) {
            const columns = content.json.result_set.resultSetMetaData.rowType.map(col => col.name);
            results = content.json.result_set.data.map(row => {
              const obj: Record<string, unknown> = {};
              (row as unknown[]).forEach((val, idx) => {
                obj[columns[idx]] = val;
              });
              return obj;
            });
          }
          
          if (content.json.text && !answer) {
            answer = content.json.text;
          }
        }
      }
    }
  }

  return { answer, sql, results, toolName };
}

async function fallbackToDirectQuery(question: string): Promise<{
  answer: string;
  sql: string | null;
  results: unknown[] | null;
}> {
  const escapedQuestion = question.replace(/'/g, "''");
  
  const response = await query<{ RESPONSE: string }>(`
    SELECT SNOWFLAKE.CORTEX.COMPLETE(
      'mistral-large2',
      'You are an NYC Operations assistant. Answer this question concisely: ${escapedQuestion}'
    ) as RESPONSE
  `);

  return {
    answer: response[0]?.RESPONSE || "Unable to process your question.",
    sql: null,
    results: null
  };
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
  
  try {
    const { question } = await request.json();

    if (!question) {
      clearTimeout(timeoutId);
      return NextResponse.json({ error: "Question is required" }, { status: 400 });
    }

    let answer: string;
    let sql: string | null = null;
    let results: Record<string, unknown>[] | null = null;
    let toolName: string | null = null;
    let usedAgent = false;

    try {
      const agentResponse = await callCortexAgent(question, controller.signal);
      
      answer = agentResponse.answer;
      sql = agentResponse.sql;
      results = agentResponse.results;
      toolName = agentResponse.toolName;
      usedAgent = true;
    } catch (agentError) {
      const errorMsg = agentError instanceof Error ? agentError.message : "Unknown error";
      console.error("Cortex Agent error:", errorMsg);
      
      if (errorMsg.includes("aborted") || agentError instanceof DOMException) {
        throw new Error("Request timeout");
      }
      
      console.log("Falling back to direct query");
      const fallback = await fallbackToDirectQuery(question);
      
      answer = fallback.answer;
      sql = fallback.sql;
      results = fallback.results as Record<string, unknown>[] | null;
    }

    clearTimeout(timeoutId);
    const duration = Date.now() - startTime;

    return NextResponse.json({
      answer,
      sql,
      results,
      rowCount: results?.length || 0,
      toolName,
      usedAgent,
      agentName: usedAgent ? `${AGENT_DATABASE}.${AGENT_SCHEMA}.${AGENT_NAME}` : null,
      duration: `${duration}ms`,
    });
  } catch (error) {
    clearTimeout(timeoutId);
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    console.error("Analyst API error:", errorMessage, `(${duration}ms)`);
    
    if (errorMessage.includes("timeout") || errorMessage.includes("aborted")) {
      return NextResponse.json(
        { error: "Request timed out. Please try a simpler question." },
        { status: 504 }
      );
    }
    
    return NextResponse.json(
      { error: `Failed to process question: ${errorMessage}` },
      { status: 500 }
    );
  }
}
