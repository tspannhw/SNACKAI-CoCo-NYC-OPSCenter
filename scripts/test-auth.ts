#!/usr/bin/env node

/**
 * NYC Operations Command Center - Authentication Test Script
 * 
 * Tests Snowflake connectivity using the configured authentication method.
 * Run: npx ts-node scripts/test-auth.ts
 * Or:  npm run test:auth
 */

import snowflake from 'snowflake-sdk';
import fs from 'fs';
import path from 'path';

// Load .env.local if exists
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && !key.startsWith('#')) {
      const value = valueParts.join('=').trim();
      if (value && !process.env[key.trim()]) {
        process.env[key.trim()] = value.replace(/^["']|["']$/g, '');
      }
    }
  });
}

snowflake.configure({ logLevel: 'ERROR' });

type AuthMethod = 'oauth' | 'keypair' | 'pat' | 'password' | 'browser';

interface TestResult {
  method: AuthMethod;
  status: 'success' | 'failed' | 'skipped';
  message: string;
  details?: Record<string, string>;
}

function getOAuthToken(): string | null {
  const tokenPath = '/snowflake/session/token';
  try {
    if (fs.existsSync(tokenPath)) {
      return fs.readFileSync(tokenPath, 'utf8');
    }
  } catch {
    // Not in SPCS
  }
  return null;
}

function getPrivateKey(): string | null {
  const keyPath = process.env.SNOWFLAKE_PRIVATE_KEY_PATH;
  const keyContent = process.env.SNOWFLAKE_PRIVATE_KEY;
  
  if (keyContent) {
    return keyContent.replace(/\\n/g, '\n');
  }
  
  if (keyPath && fs.existsSync(keyPath)) {
    return fs.readFileSync(keyPath, 'utf8');
  }
  return null;
}

function detectAuthMethod(): AuthMethod {
  if (getOAuthToken()) return 'oauth';
  if (getPrivateKey() && process.env.SNOWFLAKE_USER) return 'keypair';
  if (process.env.SNOWFLAKE_PAT) return 'pat';
  if (process.env.SNOWFLAKE_PASSWORD) return 'password';
  return 'browser';
}

async function testConnection(config: snowflake.ConnectionOptions): Promise<{
  success: boolean;
  user?: string;
  role?: string;
  warehouse?: string;
  error?: string;
}> {
  return new Promise((resolve) => {
    const conn = snowflake.createConnection(config);
    
    conn.connect((err) => {
      if (err) {
        resolve({ success: false, error: err.message });
        return;
      }
      
      conn.execute({
        sqlText: 'SELECT CURRENT_USER() as user, CURRENT_ROLE() as role, CURRENT_WAREHOUSE() as warehouse',
        complete: (err2, _stmt, rows) => {
          conn.destroy(() => {});
          
          if (err2) {
            resolve({ success: false, error: err2.message });
            return;
          }
          
          const row = (rows as Record<string, string>[])?.[0];
          resolve({
            success: true,
            user: row?.USER || row?.user,
            role: row?.ROLE || row?.role,
            warehouse: row?.WAREHOUSE || row?.warehouse,
          });
        },
      });
    });
  });
}

async function runTests(): Promise<TestResult[]> {
  const results: TestResult[] = [];
  const detected = detectAuthMethod();
  
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║     NYC Operations Command Center - Authentication Test      ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');
  
  console.log('Environment Configuration:');
  console.log('─────────────────────────────────────────────────────────────────');
  console.log(`  Account:   ${process.env.SNOWFLAKE_ACCOUNT || '(not set)'}`);
  console.log(`  User:      ${process.env.SNOWFLAKE_USER || '(not set)'}`);
  console.log(`  Warehouse: ${process.env.SNOWFLAKE_WAREHOUSE || '(not set)'}`);
  console.log(`  Database:  ${process.env.SNOWFLAKE_DATABASE || '(not set)'}`);
  console.log(`  Schema:    ${process.env.SNOWFLAKE_SCHEMA || '(not set)'}`);
  console.log('');
  console.log('Auth Methods Configured:');
  console.log(`  OAuth Token:  ${getOAuthToken() ? '✓ Found' : '✗ Not found'}`);
  console.log(`  Private Key:  ${getPrivateKey() ? '✓ Found' : '✗ Not found'}`);
  console.log(`  PAT:          ${process.env.SNOWFLAKE_PAT ? '✓ Set' : '✗ Not set'}`);
  console.log(`  Password:     ${process.env.SNOWFLAKE_PASSWORD ? '✓ Set' : '✗ Not set'}`);
  console.log('');
  console.log(`Detected Auth Method: ${detected.toUpperCase()}`);
  console.log('─────────────────────────────────────────────────────────────────\n');

  const base = {
    account: process.env.SNOWFLAKE_ACCOUNT || '',
    warehouse: process.env.SNOWFLAKE_WAREHOUSE || 'COMPUTE_WH',
    database: process.env.SNOWFLAKE_DATABASE || 'DEMO',
    schema: process.env.SNOWFLAKE_SCHEMA || 'DEMO',
  };

  // Test 1: OAuth
  console.log('Testing OAuth (SPCS)...');
  const oauthToken = getOAuthToken();
  if (oauthToken) {
    const result = await testConnection({
      ...base,
      host: process.env.SNOWFLAKE_HOST,
      token: oauthToken,
      authenticator: 'oauth',
    });
    results.push({
      method: 'oauth',
      status: result.success ? 'success' : 'failed',
      message: result.success ? `Connected as ${result.user}` : result.error || 'Unknown error',
      details: result.success ? { role: result.role!, warehouse: result.warehouse! } : undefined,
    });
    console.log(result.success ? `  ✓ Success: ${result.user}` : `  ✗ Failed: ${result.error}`);
  } else {
    results.push({ method: 'oauth', status: 'skipped', message: 'No OAuth token found' });
    console.log('  ⊘ Skipped: No OAuth token at /snowflake/session/token');
  }

  // Test 2: Key-Pair
  console.log('\nTesting Key-Pair (JWT)...');
  const privateKey = getPrivateKey();
  if (privateKey && process.env.SNOWFLAKE_USER) {
    const result = await testConnection({
      ...base,
      username: process.env.SNOWFLAKE_USER,
      privateKey,
      authenticator: 'SNOWFLAKE_JWT',
    });
    results.push({
      method: 'keypair',
      status: result.success ? 'success' : 'failed',
      message: result.success ? `Connected as ${result.user}` : result.error || 'Unknown error',
      details: result.success ? { role: result.role!, warehouse: result.warehouse! } : undefined,
    });
    console.log(result.success ? `  ✓ Success: ${result.user}` : `  ✗ Failed: ${result.error}`);
  } else {
    results.push({ method: 'keypair', status: 'skipped', message: 'No private key configured' });
    console.log('  ⊘ Skipped: No SNOWFLAKE_PRIVATE_KEY_PATH or SNOWFLAKE_PRIVATE_KEY');
  }

  // Test 3: PAT
  console.log('\nTesting PAT...');
  if (process.env.SNOWFLAKE_PAT) {
    const result = await testConnection({
      ...base,
      username: process.env.SNOWFLAKE_USER || '',
      token: process.env.SNOWFLAKE_PAT,
      authenticator: 'PROGRAMMATIC_ACCESS_TOKEN',
    });
    results.push({
      method: 'pat',
      status: result.success ? 'success' : 'failed',
      message: result.success ? `Connected as ${result.user}` : result.error || 'Unknown error',
      details: result.success ? { role: result.role!, warehouse: result.warehouse! } : undefined,
    });
    console.log(result.success ? `  ✓ Success: ${result.user}` : `  ✗ Failed: ${result.error}`);
  } else {
    results.push({ method: 'pat', status: 'skipped', message: 'No PAT configured' });
    console.log('  ⊘ Skipped: No SNOWFLAKE_PAT set');
  }

  // Test 4: Password
  console.log('\nTesting Password...');
  if (process.env.SNOWFLAKE_PASSWORD) {
    const result = await testConnection({
      ...base,
      username: process.env.SNOWFLAKE_USER || '',
      password: process.env.SNOWFLAKE_PASSWORD,
    });
    results.push({
      method: 'password',
      status: result.success ? 'success' : 'failed',
      message: result.success ? `Connected as ${result.user}` : result.error || 'Unknown error',
      details: result.success ? { role: result.role!, warehouse: result.warehouse! } : undefined,
    });
    console.log(result.success ? `  ✓ Success: ${result.user}` : `  ✗ Failed: ${result.error}`);
  } else {
    results.push({ method: 'password', status: 'skipped', message: 'No password configured' });
    console.log('  ⊘ Skipped: No SNOWFLAKE_PASSWORD set');
  }

  // Test 5: Browser (always skip in script)
  console.log('\nTesting Browser SSO...');
  results.push({ method: 'browser', status: 'skipped', message: 'Not supported in non-interactive mode' });
  console.log('  ⊘ Skipped: Browser SSO requires interactive session');

  // Summary
  console.log('\n─────────────────────────────────────────────────────────────────');
  console.log('Summary:');
  const successful = results.filter(r => r.status === 'success');
  const failed = results.filter(r => r.status === 'failed');
  const skipped = results.filter(r => r.status === 'skipped');
  
  console.log(`  ✓ Successful: ${successful.length}`);
  console.log(`  ✗ Failed:     ${failed.length}`);
  console.log(`  ⊘ Skipped:    ${skipped.length}`);
  
  if (successful.length > 0) {
    console.log('\n✓ At least one authentication method works!');
    console.log(`  Recommended: Use "${successful[0].method}" for this application.`);
  } else if (failed.length > 0) {
    console.log('\n✗ All configured authentication methods failed.');
    console.log('  Check your credentials and try again.');
  } else {
    console.log('\n⚠ No authentication methods configured.');
    console.log('  Set SNOWFLAKE_PAT, SNOWFLAKE_PASSWORD, or SNOWFLAKE_PRIVATE_KEY_PATH');
  }
  
  console.log('─────────────────────────────────────────────────────────────────\n');
  
  return results;
}

runTests()
  .then(results => {
    const hasSuccess = results.some(r => r.status === 'success');
    process.exit(hasSuccess ? 0 : 1);
  })
  .catch(err => {
    console.error('Test script error:', err);
    process.exit(1);
  });
