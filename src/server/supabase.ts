import dotenv from 'dotenv';
dotenv.config();
import { createClient } from '@supabase/supabase-js';

// Load Supabase credentials from environment or use the user-provided fallbacks
const supabaseUrl = process.env.SUPABASE_URL || 'https://sepiucqrayucucrcwsgw.supabase.co';
// Use the secret role key on the backend to allow full CRUD bypass of RLS checks
const supabaseKey = process.env.SUPABASE_SECRET_KEY || 'sb_secret_4eVzuxnYh64E9RrXJPPWsw_zMleDTVi';

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

// Diagnostic helper to test the Supabase connection and check table readiness
export async function checkSupabaseStatus() {
  const status = {
    connected: false,
    tables: {
      agents: false,
      apks: false,
      logs: false,
      system_updates: false
    },
    error: null as string | null
  };

  try {
    // Simple latency check/ping
    const { data, error } = await supabase.from('agents').select('count', { count: 'exact', head: true });
    status.connected = true;
    if (!error) {
      status.tables.agents = true;
    } else if (error.code !== '42P01') { // 42P01 is "relation does not exist"
      status.error = error.message;
    }

    const { error: apkErr } = await supabase.from('apks').select('count', { count: 'exact', head: true });
    if (!apkErr) status.tables.apks = true;

    const { error: logErr } = await supabase.from('logs').select('count', { count: 'exact', head: true });
    if (!logErr) status.tables.logs = true;

    const { error: updateErr } = await supabase.from('system_updates').select('count', { count: 'exact', head: true });
    if (!updateErr) status.tables.system_updates = true;

  } catch (err: any) {
    status.error = err?.message || 'Unknown connection error';
  }

  return status;
}

// SQL helper to guide user on database setup
export const SUPABASE_SCHEMA_SQL = `-- Run this in your Supabase SQL Editor to provision all required tables:

-- 1. Agents Table
CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. APK Files Table
CREATE TABLE IF NOT EXISTS apks (
  id TEXT PRIMARY KEY,
  filename TEXT NOT NULL,
  name TEXT NOT NULL,
  version TEXT NOT NULL,
  size BIGINT NOT NULL,
  description TEXT,
  "downloadsCount" INTEGER NOT NULL DEFAULT 0,
  "uploadedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "allowOldVersions" BOOLEAN NOT NULL DEFAULT TRUE
);

-- 3. Operational Activity Logs Table
CREATE TABLE IF NOT EXISTS logs (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "agentCode" TEXT,
  phone TEXT,
  details TEXT NOT NULL,
  ip TEXT
);

-- 4. System Updates / Announcements Table
CREATE TABLE IF NOT EXISTS system_updates (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  version TEXT
);

-- Enable RLS (or keep disabled for service role access)
-- Since we use the service role key to authenticate server-to-server, RLS policies are bypassed.
`;
