# NYC Operations Command Center - Authentication Guide

## Overview

This application connects to Snowflake using the `snowflake-sdk` Node.js driver. It supports **5 authentication methods** that are auto-detected in priority order.

## Authentication Priority

| Priority.          | Method | Environment Variables | Best For |
|--------------------|--------|----------------------|----------|
| 1 | OAuth (SPCS)   | Auto-detected | SPCS deployment |
| 2 | Key-Pair (JWT) | `SNOWFLAKE_PRIVATE_KEY_PATH` or `SNOWFLAKE_PRIVATE_KEY` | Production automation |
| 3 | PAT            | `SNOWFLAKE_PAT` | Local development |
| 4 | Password       | `SNOWFLAKE_PASSWORD` | Simple testing |
| 5 | Browser SSO    | Default fallback | CLI tools only |

> **Important**: External browser authentication does NOT work in Next.js server context. Use methods 1-4 for this application.

---

## Method 1: OAuth Token (SPCS Deployment)

### When to Use
- Deploying to Snowpark Container Services (SPCS)
- OAuth token is automatically injected by the platform

### How It Works
The application checks for a token file at `/snowflake/session/token`. If found, it uses OAuth authentication.

### Configuration
No configuration needed. SPCS automatically:
- Injects the OAuth token at `/snowflake/session/token`
- Sets `SNOWFLAKE_HOST` environment variable

### Verification
```bash
# In SPCS container
cat /snowflake/session/token
# Should output a valid JWT token
```

---

## Method 2: Key-Pair Authentication (JWT)

### When to Use
- Production workloads
- Automated pipelines
- When you need non-interactive authentication without storing passwords

### Setup Steps

#### Step 1: Generate Key Pair
```bash
# Generate encrypted private key (recommended for production)
openssl genrsa 2048 | openssl pkcs8 -topk8 -v2 aes256 -inform PEM -out rsa_key.p8

# Or generate unencrypted private key (easier for development)
openssl genrsa 2048 | openssl pkcs8 -topk8 -inform PEM -out rsa_key.p8 -nocrypt

# Extract public key
openssl rsa -in rsa_key.p8 -pubout -out rsa_key.pub
```

#### Step 2: Register Public Key in Snowflake
```sql
-- Get the public key content (remove header/footer and newlines)
-- Then assign to your user
ALTER USER your_username SET RSA_PUBLIC_KEY='MIIBIjANBgkqhki...';

-- Verify
DESC USER your_username;
-- Check RSA_PUBLIC_KEY_FP is set
```

#### Step 3: Configure Environment
```env
# Option A: Path to key file
SNOWFLAKE_ACCOUNT=your-account
SNOWFLAKE_USER=your-username
SNOWFLAKE_PRIVATE_KEY_PATH=/path/to/rsa_key.p8
SNOWFLAKE_WAREHOUSE=COMPUTE_WH
SNOWFLAKE_DATABASE=DEMO
SNOWFLAKE_SCHEMA=DEMO

# Option B: Inline key (replace newlines with \n)
SNOWFLAKE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBA...\n-----END PRIVATE KEY-----"
```

### Verification
```bash
# Test with snowsql
snowsql -a your-account -u your-username --private-key-path rsa_key.p8
```

---

## Method 3: Programmatic Access Token (PAT)

### When to Use
- Local development
- CI/CD pipelines
- When you want simple token-based auth without key management

### Setup Steps

#### Step 1: Generate PAT in Snowsight
1. Log into Snowsight
2. Click your username (bottom-left)
3. Go to **My Profile**
4. Click **Programmatic Access Tokens**
5. Click **+ Generate New Token**
6. Set name, role restriction (optional), and expiration
7. **Copy the token immediately** (shown only once!)

#### Step 2: Configure Environment
```env
SNOWFLAKE_ACCOUNT=your-account
SNOWFLAKE_USER=your-username
SNOWFLAKE_PAT=eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
SNOWFLAKE_WAREHOUSE=COMPUTE_WH
SNOWFLAKE_DATABASE=DEMO
SNOWFLAKE_SCHEMA=DEMO
```

### SQL Alternative
```sql
-- Create PAT via SQL
ALTER USER your_username ADD PROGRAMMATIC ACCESS TOKEN my_token_name
  ROLE_RESTRICTION = 'YOUR_ROLE'
  DAYS_TO_EXPIRY = 90
  COMMENT = 'NYC Ops Center development';

-- List existing PATs
SHOW PROGRAMMATIC ACCESS TOKENS FOR USER your_username;

-- Remove a PAT
ALTER USER your_username REMOVE PROGRAMMATIC ACCESS TOKEN my_token_name;
```

### Verification
```bash
# Test PAT with curl
curl -X POST "https://your-account.snowflakecomputing.com/api/v2/statements" \
  -H "Authorization: Bearer $SNOWFLAKE_PAT" \
  -H "Content-Type: application/json" \
  -d '{"statement": "SELECT CURRENT_USER()"}'
```

---

## Method 4: Password Authentication

### When to Use
- Simple testing
- Legacy systems
- When other methods aren't available

### Configuration
```env
SNOWFLAKE_ACCOUNT=your-account
SNOWFLAKE_USER=your-username
SNOWFLAKE_PASSWORD=your-password
SNOWFLAKE_WAREHOUSE=COMPUTE_WH
SNOWFLAKE_DATABASE=DEMO
SNOWFLAKE_SCHEMA=DEMO
```

> **Security Warning**: Avoid storing passwords in plain text. Use environment variables or secret managers.

---

## Method 5: External Browser SSO

### When to Use
- CLI tools only (snowsql, Snowflake CLI)
- Interactive sessions where a browser can open

### Why It Doesn't Work Here
Next.js API routes run on the server without access to a browser. The Snowflake SDK's `EXTERNALBROWSER` authenticator requires:
1. Opening a browser window
2. User interaction for SSO login
3. Callback to the SDK

This is impossible in a headless server environment.

### Fallback Behavior
If no other auth method is configured, the app will:
1. Log a warning: `"External browser auth not supported in server context"`
2. Attempt the connection (which will fail)
3. Return an error to the API caller

---

## Troubleshooting

### Error: "Cannot read properties of null (reading 'proofKey')"
**Cause**: External browser auth attempted in server context
**Solution**: Configure PAT, key-pair, or password authentication

### Error: "Programmatic access token is invalid"
**Causes**:
- Token expired
- Username mismatch (PAT is tied to specific user)
- Role restriction not met

**Solution**: Generate a new PAT and verify username matches

### Error: "JWT token is invalid"
**Causes**:
- Private key doesn't match registered public key
- Account identifier format incorrect
- Clock skew between client and server

**Solution**: 
```sql
-- Verify public key fingerprint
DESC USER your_username;
-- Compare RSA_PUBLIC_KEY_FP with your key
```

### Error: "OAuth access token expired"
**Cause**: SPCS token needs refresh
**Solution**: The app automatically retries on token expiration. If persistent, restart the container.

---

## Security Best Practices

1. **Never commit credentials** - Use `.env.local` (gitignored)
2. **Rotate PATs regularly** - Set reasonable expiration (30-90 days)
3. **Use role restrictions** - Limit PAT to specific roles
4. **Prefer key-pair for production** - More secure than passwords
5. **Use encrypted private keys** - Add passphrase protection
6. **Audit access** - Monitor LOGIN_HISTORY in Snowflake

---

## Environment Variable Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `SNOWFLAKE_ACCOUNT` | Yes | Account identifier (e.g., `xy12345.us-east-1`) |
| `SNOWFLAKE_USER` | Yes | Snowflake username |
| `SNOWFLAKE_WAREHOUSE` | Yes | Default warehouse |
| `SNOWFLAKE_DATABASE` | Yes | Default database |
| `SNOWFLAKE_SCHEMA` | Yes | Default schema |
| `SNOWFLAKE_PAT` | No* | Programmatic Access Token |
| `SNOWFLAKE_PASSWORD` | No* | User password |
| `SNOWFLAKE_PRIVATE_KEY_PATH` | No* | Path to private key file |
| `SNOWFLAKE_PRIVATE_KEY` | No* | Inline private key content |
| `SNOWFLAKE_HOST` | No | Override host (set by SPCS) |

*At least one authentication method must be configured.

---

## Quick Start Examples

### Development with PAT
```bash
# .env.local
SNOWFLAKE_ACCOUNT=SFSENORTHAMERICA-TSPANN-AWS1
SNOWFLAKE_USER=kafkaguy
SNOWFLAKE_PAT=eyJhbGciOiJSUzI1NiIs...
SNOWFLAKE_WAREHOUSE=INGEST
SNOWFLAKE_DATABASE=DEMO
SNOWFLAKE_SCHEMA=DEMO
```

### Production with Key-Pair
```bash
# .env.local
SNOWFLAKE_ACCOUNT=SFSENORTHAMERICA-TSPANN-AWS1
SNOWFLAKE_USER=kafkaguy
SNOWFLAKE_PRIVATE_KEY_PATH=/secure/keys/rsa_key.p8
SNOWFLAKE_WAREHOUSE=INGEST
SNOWFLAKE_DATABASE=DEMO
SNOWFLAKE_SCHEMA=DEMO
```

### SPCS Deployment
```bash
# No .env needed - SPCS injects credentials
# Just ensure your service spec includes OAuth scope
```
