import snowflake from "snowflake-sdk";
import fs from "fs";

snowflake.configure({ logLevel: "ERROR" });

let connection: snowflake.Connection | null = null;
let cachedToken: string | null = null;
let cachedAuthMethod: string | null = null;

type AuthMethod = "oauth" | "keypair" | "pat" | "password" | "browser";

function getOAuthToken(): string | null {
  const tokenPath = "/snowflake/session/token";
  try {
    if (fs.existsSync(tokenPath)) {
      return fs.readFileSync(tokenPath, "utf8");
    }
  } catch {
    // Not in SPCS environment
  }
  return null;
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
      console.error("Failed to read private key from:", keyPath);
    }
  }
  return null;
}

function detectAuthMethod(): AuthMethod {
  if (getOAuthToken()) {
    return "oauth";
  }
  
  if (getPrivateKey() && process.env.SNOWFLAKE_USER) {
    return "keypair";
  }
  
  if (process.env.SNOWFLAKE_PAT) {
    return "pat";
  }
  
  if (process.env.SNOWFLAKE_PASSWORD) {
    return "password";
  }
  
  return "browser";
}

function getConfig(): snowflake.ConnectionOptions {
  const base = {
    account: process.env.SNOWFLAKE_ACCOUNT || "your-account",
    warehouse: process.env.SNOWFLAKE_WAREHOUSE || "COMPUTE_WH",
    database: process.env.SNOWFLAKE_DATABASE || "DEMO",
    schema: process.env.SNOWFLAKE_SCHEMA || "DEMO",
  };

  const authMethod = detectAuthMethod();
  
  if (authMethod === "oauth") {
    const token = getOAuthToken()!;
    return {
      ...base,
      host: process.env.SNOWFLAKE_HOST,
      token,
      authenticator: "oauth",
    };
  }
  
  if (authMethod === "keypair") {
    const privateKey = getPrivateKey()!;
    return {
      ...base,
      username: process.env.SNOWFLAKE_USER!,
      privateKey,
      authenticator: "SNOWFLAKE_JWT",
    };
  }
  
  if (authMethod === "pat") {
    return {
      ...base,
      username: process.env.SNOWFLAKE_USER || "your-username",
      token: process.env.SNOWFLAKE_PAT!,
      authenticator: "PROGRAMMATIC_ACCESS_TOKEN",
    };
  }
  
  if (authMethod === "password") {
    return {
      ...base,
      username: process.env.SNOWFLAKE_USER || "your-username",
      password: process.env.SNOWFLAKE_PASSWORD!,
    };
  }

  console.warn("WARNING: External browser auth not supported in server context. Use PAT, key-pair, or password.");
  return {
    ...base,
    username: process.env.SNOWFLAKE_USER || "your-username",
    authenticator: "EXTERNALBROWSER",
  };
}

async function getConnection(): Promise<snowflake.Connection> {
  const authMethod = detectAuthMethod();
  const token = authMethod === "oauth" ? getOAuthToken() : null;

  if (connection && authMethod === cachedAuthMethod && (!token || token === cachedToken)) {
    return connection;
  }

  if (connection) {
    console.log("Auth method or token changed, reconnecting");
    connection.destroy(() => {});
  }

  console.log(`Connecting with ${authMethod} authentication`);
  const conn = snowflake.createConnection(getConfig());
  await conn.connectAsync(() => {});
  connection = conn;
  cachedToken = token;
  cachedAuthMethod = authMethod;
  return connection;
}

function isRetryableError(err: unknown): boolean {
  const error = err as { message?: string; code?: number };
  return !!(
    error.message?.includes("OAuth access token expired") ||
    error.message?.includes("terminated connection") ||
    error.code === 407002
  );
}

export async function query<T>(sql: string, retries = 1): Promise<T[]> {
  try {
    const conn = await getConnection();
    return await new Promise<T[]>((resolve, reject) => {
      conn.execute({
        sqlText: sql,
        complete: (err, stmt, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve((rows || []) as T[]);
          }
        },
      });
    });
  } catch (err) {
    console.error("Query error:", (err as Error).message);
    if (retries > 0 && isRetryableError(err)) {
      connection = null;
      return query(sql, retries - 1);
    }
    throw err;
  }
}

// Cortex Analyst query function for natural language to SQL
export async function cortexAnalystQuery(
  question: string,
  semanticView: string
): Promise<{ sql: string; results: unknown[]; explanation: string }> {
  const conn = await getConnection();
  
  return new Promise((resolve, reject) => {
    conn.execute({
      sqlText: `SELECT SNOWFLAKE.CORTEX.ANALYST(
        '${semanticView}',
        '${question.replace(/'/g, "''")}'
      ) as response`,
      complete: async (err, stmt, rows) => {
        if (err) {
          reject(err);
          return;
        }
        
        try {
          const response = (rows as { RESPONSE: string }[])[0]?.RESPONSE;
          const parsed = JSON.parse(response);
          
          if (parsed.sql) {
            // Execute the generated SQL
            const results = await query(parsed.sql);
            resolve({
              sql: parsed.sql,
              results,
              explanation: parsed.explanation || ""
            });
          } else {
            resolve({
              sql: "",
              results: [],
              explanation: parsed.message || "No SQL generated"
            });
          }
        } catch (parseErr) {
          reject(parseErr);
        }
      },
    });
  });
}
