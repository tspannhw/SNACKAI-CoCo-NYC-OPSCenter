import snowflake from "snowflake-sdk";
import fs from "fs";

snowflake.configure({ logLevel: "ERROR" });

let connection: snowflake.Connection | null = null;
let cachedToken: string | null = null;
let cachedAuthMethod: string | null = null;

type AuthMethod = "oauth" | "keypair" | "pat" | "password" | "browser";

/**
 * Reads the Snowflake OAuth token from the SPCS token file path.
 *
 * This is only present when the app is running inside a Snowpark Container
 * Service (SPCS) pod. Returns `null` in all other environments.
 */
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

/**
 * Loads the RSA private key used for JWT / key-pair authentication.
 *
 * Resolution order:
 * 1. `SNOWFLAKE_PRIVATE_KEY` env var (inline PEM, `\n` sequences are expanded)
 * 2. File at the path given by `SNOWFLAKE_PRIVATE_KEY_PATH`
 *
 * Returns `null` if neither env var is set or the file cannot be read.
 */
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

/**
 * Detects the best available Snowflake authentication method.
 *
 * Priority (highest to lowest):
 * 1. **oauth**    – SPCS token file present
 * 2. **keypair**  – `SNOWFLAKE_PRIVATE_KEY[_PATH]` + `SNOWFLAKE_USER` set
 * 3. **pat**      – `SNOWFLAKE_PAT` set
 * 4. **password** – `SNOWFLAKE_PASSWORD` set
 * 5. **browser**  – fallback (not usable in server-side Next.js routes)
 */
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

/**
 * Builds the Snowflake connection options from environment variables and the
 * detected auth method.
 *
 * The base config (account, warehouse, database, schema) comes from the
 * `SNOWFLAKE_*` env vars and falls back to sensible defaults.
 */
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

/**
 * Returns a cached (or newly created) Snowflake connection.
 *
 * The cached connection is reused as long as the auth method and token have not
 * changed. On change the old connection is destroyed and a fresh one is created.
 *
 * @returns A connected `snowflake.Connection` instance
 */
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

/**
 * Determines whether a Snowflake query error is safe to retry.
 *
 * Retryable conditions:
 * - OAuth token expired
 * - Terminated connection
 * - Error code 407002 (session expired)
 */
function isRetryableError(err: unknown): boolean {
  const error = err as { message?: string; code?: number };
  return !!(
    error.message?.includes("OAuth access token expired") ||
    error.message?.includes("terminated connection") ||
    error.code === 407002
  );
}

/**
 * Executes a SQL query against Snowflake and returns the result rows.
 *
 * On failure the error is logged. If the error is retryable (e.g. expired
 * session) the connection is reset and the query is retried once.
 *
 * @param sql     - SQL statement to execute
 * @param retries - Number of retries remaining (default 1)
 * @returns Array of result rows typed as `T`
 *
 * @example
 * const rows = await query<{ COUNT: number }>("SELECT COUNT(*) AS COUNT FROM my_table");
 */
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

/**
 * Submits a natural-language question to a Snowflake Semantic View via
 * `SNOWFLAKE.CORTEX.ANALYST` and executes the generated SQL.
 *
 * @param question     - Free-text question in English
 * @param semanticView - Fully-qualified semantic view name
 *                       (e.g. `"DEMO.DEMO.NYC_CAMERA_SEMANTIC_VIEW"`)
 * @returns Object containing:
 *   - `sql`         – The SQL generated by Cortex Analyst
 *   - `results`     – Rows returned by executing that SQL
 *   - `explanation` – Optional plain-text explanation from the model
 *
 * @example
 * const { sql, results } = await cortexAnalystQuery(
 *   "How many cameras are blocked?",
 *   "DEMO.DEMO.NYC_CAMERA_SEMANTIC_VIEW"
 * );
 */
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
