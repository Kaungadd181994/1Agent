var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path2 = __toESM(require("path"), 1);
var import_fs2 = __toESM(require("fs"), 1);
var import_vite = require("vite");
var import_multer = __toESM(require("multer"), 1);
var xlsx = __toESM(require("xlsx"), 1);

// src/server/db.ts
var import_fs = __toESM(require("fs"), 1);
var import_path = __toESM(require("path"), 1);

// src/server/supabase.ts
var import_dotenv = __toESM(require("dotenv"), 1);
var import_supabase_js = require("@supabase/supabase-js");
import_dotenv.default.config();
var supabaseUrl = process.env.SUPABASE_URL || "https://sepiucqrayucucrcwsgw.supabase.co";
var supabaseKey = process.env.SUPABASE_SECRET_KEY || "sb_secret_4eVzuxnYh64E9RrXJPPWsw_zMleDTVi";
var supabase = (0, import_supabase_js.createClient)(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});
var SUPABASE_SCHEMA_SQL = `-- Run this in your Supabase SQL Editor to provision all required tables:

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
  "allowOldVersions" BOOLEAN NOT NULL DEFAULT TRUE,
  status TEXT NOT NULL DEFAULT 'active'
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

// src/server/db.ts
var DATA_DIR = import_path.default.join(process.cwd(), "data");
var APK_DIR = import_path.default.join(DATA_DIR, "apks");
var DB_FILE = import_path.default.join(DATA_DIR, "db.json");
var defaultData = {
  agents: [
    {
      id: "agent-1",
      code: "AGT001",
      phone: "0912345678",
      name: "Kaung Htet",
      status: "active",
      createdAt: (/* @__PURE__ */ new Date("2026-06-25T10:00:00Z")).toISOString()
    },
    {
      id: "agent-2",
      code: "AGT002",
      phone: "0998765432",
      name: "Aung Kyaw",
      status: "active",
      createdAt: (/* @__PURE__ */ new Date("2026-06-28T12:30:00Z")).toISOString()
    },
    {
      id: "agent-3",
      code: "AGT003",
      phone: "0955544433",
      name: "Mya Mya",
      status: "inactive",
      createdAt: (/* @__PURE__ */ new Date("2026-07-01T08:15:00Z")).toISOString()
    }
  ],
  apks: [
    {
      id: "apk-1",
      filename: "agent-portal-v1.0.0.apk",
      name: "Agent Operations App",
      version: "1.0.0",
      size: 1542e4,
      // ~14.7 MB
      description: "Initial release of the official Agent Operations mobile application. Features agent reporting, task logging, and instant notification capabilities.",
      downloadsCount: 45,
      uploadedAt: (/* @__PURE__ */ new Date("2026-06-25T11:00:00Z")).toISOString(),
      status: "active"
    },
    {
      id: "apk-2",
      filename: "agent-pos-v1.1.2.apk",
      name: "Agent POS Terminal",
      version: "1.1.2",
      size: 2485e4,
      // ~23.7 MB
      description: "Stable version of the Agent POS merchant terminal interface. Improved receipt layout, bluetooth printer pairing, and offline sales logging.",
      downloadsCount: 128,
      uploadedAt: (/* @__PURE__ */ new Date("2026-06-30T15:45:00Z")).toISOString(),
      status: "active"
    }
  ],
  logs: [
    {
      id: "log-1",
      type: "login_success",
      timestamp: (/* @__PURE__ */ new Date("2026-07-02T09:12:00Z")).toISOString(),
      agentCode: "AGT001",
      phone: "0912345678",
      details: "Agent Kaung Htet (AGT001) successfully logged in.",
      ip: "192.168.1.100"
    },
    {
      id: "log-2",
      type: "download",
      timestamp: (/* @__PURE__ */ new Date("2026-07-02T09:15:00Z")).toISOString(),
      agentCode: "AGT001",
      phone: "0912345678",
      details: "Agent Kaung Htet (AGT001) downloaded Agent POS Terminal (v1.1.2).",
      ip: "192.168.1.100"
    },
    {
      id: "log-3",
      type: "login_failed",
      timestamp: (/* @__PURE__ */ new Date("2026-07-02T14:22:00Z")).toISOString(),
      agentCode: "AGT002",
      phone: "0900000000",
      details: "Failed login attempt: Agent code matches but phone number is incorrect.",
      ip: "203.81.71.42"
    }
  ],
  systemUpdates: [
    {
      id: "update-1",
      title: "Server Maintenance Notice",
      description: "The Agent Portal server will undergo scheduled security updates on July 5, 2026, between 02:00 AM and 04:00 AM UTC. Portals may experience brief timeouts.",
      timestamp: (/* @__PURE__ */ new Date("2026-07-01T06:00:00Z")).toISOString()
    },
    {
      id: "update-2",
      title: "New POS Terminal Update (v1.1.2)",
      description: "We have rolled out POS Terminal v1.1.2 to address critical receipt layout issues for agents using Bluetooth thermal printers. All agents are advised to upgrade.",
      timestamp: (/* @__PURE__ */ new Date("2026-06-30T15:50:00Z")).toISOString(),
      version: "1.1.2"
    }
  ]
};
var supabaseTableStatus = {
  connected: false,
  agents: false,
  apks: false,
  logs: false,
  systemUpdates: false,
  lastSyncTime: null,
  syncError: null
};
var apksHasStatusColumnChecked = false;
var apksHasStatusColumn = false;
async function checkApksStatusColumn() {
  if (apksHasStatusColumnChecked) return apksHasStatusColumn;
  try {
    const { error } = await supabase.from("apks").select("status").limit(1);
    if (!error) {
      apksHasStatusColumn = true;
    } else {
      console.log('[Supabase Sync] "status" column is not present on "apks" table. Enabling backwards-compatibility mode.');
      apksHasStatusColumn = false;
    }
    apksHasStatusColumnChecked = true;
  } catch (e) {
    console.log('[Supabase Sync] Exception during "status" column verification (assumed missing):', e);
    apksHasStatusColumn = false;
    apksHasStatusColumnChecked = true;
  }
  return apksHasStatusColumn;
}
function readData() {
  try {
    if (!import_fs.default.existsSync(DB_FILE)) {
      return defaultData;
    }
    return JSON.parse(import_fs.default.readFileSync(DB_FILE, "utf-8"));
  } catch (e) {
    console.error("[Database] Failed to read db.json, returning defaults", e);
    return defaultData;
  }
}
function writeData(data) {
  try {
    import_fs.default.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (e) {
    console.error("[Database] Failed to write db.json", e);
  }
}
function initDb() {
  if (!import_fs.default.existsSync(DATA_DIR)) {
    import_fs.default.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!import_fs.default.existsSync(APK_DIR)) {
    import_fs.default.mkdirSync(APK_DIR, { recursive: true });
  }
  const dummyApk1Path = import_path.default.join(APK_DIR, "apk-1.apk");
  if (!import_fs.default.existsSync(dummyApk1Path)) {
    import_fs.default.writeFileSync(dummyApk1Path, Buffer.alloc(1024 * 100));
  }
  const dummyApk2Path = import_path.default.join(APK_DIR, "apk-2.apk");
  if (!import_fs.default.existsSync(dummyApk2Path)) {
    import_fs.default.writeFileSync(dummyApk2Path, Buffer.alloc(1024 * 100));
  }
  if (!import_fs.default.existsSync(DB_FILE)) {
    import_fs.default.writeFileSync(DB_FILE, JSON.stringify(defaultData, null, 2), "utf-8");
  } else {
    try {
      const data = JSON.parse(import_fs.default.readFileSync(DB_FILE, "utf-8"));
      if (!data.agents || !data.apks || !data.logs || !data.systemUpdates) {
        const merged = { ...defaultData, ...data };
        import_fs.default.writeFileSync(DB_FILE, JSON.stringify(merged, null, 2), "utf-8");
      }
    } catch (e) {
      import_fs.default.writeFileSync(DB_FILE, JSON.stringify(defaultData, null, 2), "utf-8");
    }
  }
  runSupabaseSyncLoop();
}
var syncTimeout = null;
async function runSupabaseSyncLoop() {
  try {
    await performTwoWaySync();
  } catch (err) {
    console.error("[Supabase Sync] Loop failure:", err);
  }
  syncTimeout = setTimeout(runSupabaseSyncLoop, 15e3);
}
async function performTwoWaySync() {
  try {
    supabaseTableStatus.connected = true;
    supabaseTableStatus.syncError = null;
    const hasStatusCol = await checkApksStatusColumn();
    const localData = readData();
    try {
      const { data: remoteAgents, error: agentsError } = await supabase.from("agents").select("*");
      if (agentsError) {
        if (agentsError.code === "42P01" || agentsError.code === "PGRST205") {
          supabaseTableStatus.agents = false;
          console.warn('[Supabase Sync] Table "agents" does not exist in Supabase.');
        } else {
          throw agentsError;
        }
      } else {
        supabaseTableStatus.agents = true;
        const remoteMap = /* @__PURE__ */ new Map();
        (remoteAgents || []).forEach((a) => remoteMap.set(a.id, a));
        let localModified = false;
        for (const localAgent of localData.agents) {
          const remoteAgent = remoteMap.get(localAgent.id);
          if (!remoteAgent) {
            await supabase.from("agents").upsert(localAgent, { onConflict: "code" });
          } else if (remoteAgent.code !== localAgent.code || remoteAgent.phone !== localAgent.phone || remoteAgent.name !== localAgent.name || remoteAgent.status !== localAgent.status) {
            await supabase.from("agents").upsert(localAgent, { onConflict: "code" });
          }
        }
        for (const remoteAgent of remoteAgents || []) {
          const localAgentIdx = localData.agents.findIndex((a) => a.id === remoteAgent.id);
          if (localAgentIdx === -1) {
            localData.agents.push(remoteAgent);
            localModified = true;
          } else {
            const localAgent = localData.agents[localAgentIdx];
            if (localAgent.code !== remoteAgent.code || localAgent.phone !== remoteAgent.phone || localAgent.name !== remoteAgent.name || localAgent.status !== remoteAgent.status) {
              localData.agents[localAgentIdx] = remoteAgent;
              localModified = true;
            }
          }
        }
        if (localModified) {
          writeData(localData);
        }
      }
    } catch (err) {
      console.error("[Supabase Sync] Error syncing Agents:", err);
      supabaseTableStatus.syncError = err.message || "Agents sync failed";
    }
    try {
      const { data: remoteApks, error: apksError } = await supabase.from("apks").select("*");
      if (apksError) {
        if (apksError.code === "42P01" || apksError.code === "PGRST205") {
          supabaseTableStatus.apks = false;
          console.warn('[Supabase Sync] Table "apks" does not exist in Supabase.');
        } else {
          throw apksError;
        }
      } else {
        supabaseTableStatus.apks = true;
        const remoteMap = /* @__PURE__ */ new Map();
        (remoteApks || []).forEach((a) => remoteMap.set(a.id, a));
        let localModified = false;
        for (const localApk of localData.apks) {
          const remoteApk = remoteMap.get(localApk.id);
          if (!remoteApk) {
            const payload = { ...localApk };
            if (!hasStatusCol) {
              delete payload.status;
            }
            await supabase.from("apks").insert(payload);
          } else if (remoteApk.downloadsCount !== localApk.downloadsCount || remoteApk.allowOldVersions !== localApk.allowOldVersions || remoteApk.name !== localApk.name || remoteApk.version !== localApk.version || remoteApk.description !== localApk.description || hasStatusCol && remoteApk.status !== localApk.status) {
            const payload = { ...localApk };
            if (!hasStatusCol) {
              delete payload.status;
            }
            await supabase.from("apks").update(payload).eq("id", localApk.id);
          }
        }
        for (const remoteApk of remoteApks || []) {
          const localIdx = localData.apks.findIndex((a) => a.id === remoteApk.id);
          if (localIdx === -1) {
            localData.apks.push({
              ...remoteApk,
              status: remoteApk.status || "active"
            });
            localModified = true;
          } else {
            const localApk = localData.apks[localIdx];
            if (localApk.downloadsCount !== remoteApk.downloadsCount || localApk.allowOldVersions !== remoteApk.allowOldVersions || localApk.name !== remoteApk.name || localApk.version !== remoteApk.version || localApk.description !== remoteApk.description || hasStatusCol && localApk.status !== remoteApk.status) {
              localData.apks[localIdx] = {
                ...remoteApk,
                status: remoteApk.status || localApk.status || "active"
              };
              localModified = true;
            }
          }
        }
        if (localModified) {
          writeData(localData);
        }
      }
    } catch (err) {
      console.error("[Supabase Sync] Error syncing APKs:", err);
    }
    try {
      const { data: remoteUpdates, error: updatesError } = await supabase.from("system_updates").select("*");
      if (updatesError) {
        if (updatesError.code === "42P01" || updatesError.code === "PGRST205") {
          supabaseTableStatus.systemUpdates = false;
          console.warn('[Supabase Sync] Table "system_updates" does not exist in Supabase.');
        } else {
          throw updatesError;
        }
      } else {
        supabaseTableStatus.systemUpdates = true;
        const remoteMap = /* @__PURE__ */ new Map();
        (remoteUpdates || []).forEach((u) => remoteMap.set(u.id, u));
        let localModified = false;
        for (const localUpdate of localData.systemUpdates) {
          const remoteUpdate = remoteMap.get(localUpdate.id);
          if (!remoteUpdate) {
            await supabase.from("system_updates").insert({
              id: localUpdate.id,
              title: localUpdate.title,
              description: localUpdate.description,
              timestamp: localUpdate.timestamp,
              version: localUpdate.version
            });
          }
        }
        for (const remoteUpdate of remoteUpdates || []) {
          const localIdx = localData.systemUpdates.findIndex((u) => u.id === remoteUpdate.id);
          if (localIdx === -1) {
            localData.systemUpdates.push({
              id: remoteUpdate.id,
              title: remoteUpdate.title,
              description: remoteUpdate.description,
              timestamp: remoteUpdate.timestamp,
              version: remoteUpdate.version
            });
            localModified = true;
          }
        }
        if (localModified) {
          writeData(localData);
        }
      }
    } catch (err) {
      console.error("[Supabase Sync] Error syncing System Updates:", err);
    }
    try {
      const { data: remoteLogs, error: logsError } = await supabase.from("logs").select("*").order("timestamp", { ascending: false }).limit(200);
      if (logsError) {
        if (logsError.code === "42P01" || logsError.code === "PGRST205") {
          supabaseTableStatus.logs = false;
          console.warn('[Supabase Sync] Table "logs" does not exist in Supabase.');
        } else {
          throw logsError;
        }
      } else {
        supabaseTableStatus.logs = true;
        const remoteMap = /* @__PURE__ */ new Map();
        (remoteLogs || []).forEach((l) => remoteMap.set(l.id, l));
        let localModified = false;
        for (const localLog of localData.logs.slice(0, 100)) {
          if (!remoteMap.has(localLog.id)) {
            await supabase.from("logs").insert({
              id: localLog.id,
              type: localLog.type,
              timestamp: localLog.timestamp,
              agentCode: localLog.agentCode,
              phone: localLog.phone,
              details: localLog.details,
              ip: localLog.ip
            });
          }
        }
        for (const remoteLog of remoteLogs || []) {
          const localIdx = localData.logs.findIndex((l) => l.id === remoteLog.id);
          if (localIdx === -1) {
            localData.logs.push({
              id: remoteLog.id,
              type: remoteLog.type,
              timestamp: remoteLog.timestamp,
              agentCode: remoteLog.agentCode,
              phone: remoteLog.phone,
              details: remoteLog.details,
              ip: remoteLog.ip
            });
            localModified = true;
          }
        }
        if (localModified) {
          localData.logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          if (localData.logs.length > 500) {
            localData.logs = localData.logs.slice(0, 500);
          }
          writeData(localData);
        }
      }
    } catch (err) {
      console.error("[Supabase Sync] Error syncing Logs:", err);
    }
    supabaseTableStatus.lastSyncTime = (/* @__PURE__ */ new Date()).toISOString();
  } catch (err) {
    supabaseTableStatus.connected = false;
    supabaseTableStatus.syncError = err?.message || "Connection failure";
    console.error("[Supabase Sync] Connection checking failure:", err);
  }
}
var db = {
  // Agents CRUD
  getAgents() {
    return readData().agents;
  },
  saveAgents(agents) {
    const data = readData();
    data.agents = agents;
    writeData(data);
    if (supabaseTableStatus.agents) {
      supabase.from("agents").upsert(agents, { onConflict: "code" }).then(({ error }) => {
        if (error) console.error("[Supabase] Failed to bulk upsert agents:", error);
      });
    }
  },
  addAgent(agent) {
    const data = readData();
    const newAgent = {
      ...agent,
      id: "agent-" + Date.now() + "-" + Math.floor(Math.random() * 1e3),
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    data.agents.push(newAgent);
    writeData(data);
    if (supabaseTableStatus.agents) {
      supabase.from("agents").upsert(newAgent, { onConflict: "code" }).then(({ error }) => {
        if (error) console.error("[Supabase] Failed to insert/upsert agent:", error);
      });
    }
    return newAgent;
  },
  updateAgent(id, updates) {
    const data = readData();
    const index = data.agents.findIndex((a) => a.id === id);
    if (index === -1) return null;
    data.agents[index] = {
      ...data.agents[index],
      ...updates
    };
    writeData(data);
    if (supabaseTableStatus.agents) {
      supabase.from("agents").update(updates).eq("id", id).then(({ error }) => {
        if (error) console.error("[Supabase] Failed to update agent:", error);
      });
    }
    return data.agents[index];
  },
  deleteAgent(id) {
    const data = readData();
    const lengthBefore = data.agents.length;
    data.agents = data.agents.filter((a) => a.id !== id);
    writeData(data);
    if (supabaseTableStatus.agents) {
      supabase.from("agents").delete().eq("id", id).then(({ error }) => {
        if (error) console.error("[Supabase] Failed to delete agent:", error);
      });
    }
    return data.agents.length < lengthBefore;
  },
  // APKs CRUD
  getApks() {
    return readData().apks;
  },
  getApkById(id) {
    return readData().apks.find((apk) => apk.id === id) || null;
  },
  addApk(apk) {
    const data = readData();
    const newApk = {
      ...apk,
      id: "apk-" + Date.now() + "-" + Math.floor(Math.random() * 1e3),
      downloadsCount: 0,
      uploadedAt: (/* @__PURE__ */ new Date()).toISOString(),
      status: apk.status || "active"
    };
    data.apks.push(newApk);
    writeData(data);
    if (supabaseTableStatus.apks) {
      const payload = { ...newApk };
      if (!apksHasStatusColumn) {
        delete payload.status;
      }
      supabase.from("apks").insert(payload).then(({ error }) => {
        if (error) console.error("[Supabase] Failed to insert APK:", error);
      });
    }
    return newApk;
  },
  updateApkStatus(id, status) {
    const data = readData();
    const apkIdx = data.apks.findIndex((a) => a.id === id);
    if (apkIdx === -1) return null;
    data.apks[apkIdx].status = status;
    writeData(data);
    if (supabaseTableStatus.apks && apksHasStatusColumn) {
      supabase.from("apks").update({ status }).eq("id", id).then(({ error }) => {
        if (error) console.error("[Supabase] Failed to update APK status:", error);
      });
    }
    return data.apks[apkIdx];
  },
  deleteApk(id) {
    const data = readData();
    const apk = data.apks.find((a) => a.id === id);
    if (!apk) return false;
    const filePath = import_path.default.join(APK_DIR, `${id}.apk`);
    if (import_fs.default.existsSync(filePath)) {
      try {
        import_fs.default.unlinkSync(filePath);
      } catch (e) {
        console.error("Failed to delete physical APK file", e);
      }
    }
    data.apks = data.apks.filter((a) => a.id !== id);
    writeData(data);
    if (supabaseTableStatus.apks) {
      supabase.from("apks").delete().eq("id", id).then(({ error }) => {
        if (error) console.error("[Supabase] Failed to delete APK metadata:", error);
      });
    }
    return true;
  },
  incrementApkDownloads(id) {
    const data = readData();
    const apk = data.apks.find((a) => a.id === id);
    if (!apk) return false;
    apk.downloadsCount += 1;
    writeData(data);
    if (supabaseTableStatus.apks) {
      supabase.from("apks").update({ downloadsCount: apk.downloadsCount }).eq("id", id).then(({ error }) => {
        if (error) console.error("[Supabase] Failed to increment APK downloads:", error);
      });
    }
    return true;
  },
  // Activity Logs
  getLogs() {
    return readData().logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  },
  addLog(log) {
    const data = readData();
    const newLog = {
      ...log,
      id: "log-" + Date.now() + "-" + Math.floor(Math.random() * 1e3),
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
    data.logs.push(newLog);
    if (data.logs.length > 500) {
      data.logs = data.logs.slice(0, 500);
    }
    writeData(data);
    if (supabaseTableStatus.logs) {
      supabase.from("logs").insert(newLog).then(({ error }) => {
        if (error) console.error("[Supabase] Failed to insert log:", error);
      });
    }
    return newLog;
  },
  // System Updates / Announcements
  getSystemUpdates() {
    return readData().systemUpdates.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  },
  addSystemUpdate(update) {
    const data = readData();
    const newUpdate = {
      ...update,
      id: "update-" + Date.now() + "-" + Math.floor(Math.random() * 1e3),
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
    data.systemUpdates.push(newUpdate);
    writeData(data);
    if (supabaseTableStatus.systemUpdates) {
      supabase.from("system_updates").insert({
        id: newUpdate.id,
        title: newUpdate.title,
        description: newUpdate.description,
        timestamp: newUpdate.timestamp,
        version: newUpdate.version
      }).then(({ error }) => {
        if (error) console.error("[Supabase] Failed to insert system update:", error);
      });
    }
    return newUpdate;
  },
  deleteSystemUpdate(id) {
    const data = readData();
    const lengthBefore = data.systemUpdates.length;
    data.systemUpdates = data.systemUpdates.filter((u) => u.id !== id);
    writeData(data);
    if (supabaseTableStatus.systemUpdates) {
      supabase.from("system_updates").delete().eq("id", id).then(({ error }) => {
        if (error) console.error("[Supabase] Failed to delete system update:", error);
      });
    }
    return data.systemUpdates.length < lengthBefore;
  },
  verifyAgent(code, phone) {
    const agents = this.getAgents();
    const cleanCode = code.trim().toUpperCase();
    const cleanPhone = phone.trim().replace(/[\s-+]/g, "");
    const found = agents.find((a) => {
      const aCode = a.code.trim().toUpperCase();
      const aPhone = a.phone.trim().replace(/[\s-+]/g, "");
      return aCode === cleanCode && aPhone === cleanPhone;
    });
    return found || null;
  },
  getApkStoragePath(id) {
    const seededDummyPath = import_path.default.join(APK_DIR, `${id}.apk`);
    if (import_fs.default.existsSync(seededDummyPath)) {
      return seededDummyPath;
    }
    return import_path.default.join(APK_DIR, id);
  },
  getApkDirPath() {
    return APK_DIR;
  }
};

// server.ts
initDb();
var app = (0, import_express.default)();
var PORT = 3e3;
app.use(import_express.default.json());
app.use(import_express.default.urlencoded({ extended: true }));
var apkUploadStorage = import_multer.default.diskStorage({
  destination: (req, file, cb) => {
    cb(null, db.getApkDirPath());
  },
  filename: (req, file, cb) => {
    const apkId = "apk-" + Date.now() + "-" + Math.floor(Math.random() * 1e3);
    req.generatedApkId = apkId;
    cb(null, apkId);
  }
});
var uploadApk = (0, import_multer.default)({
  storage: apkUploadStorage,
  limits: { fileSize: 100 * 1024 * 1024 }
  // 100 MB limit
});
var uploadSheet = (0, import_multer.default)({
  storage: import_multer.default.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
  // 10 MB limit
});
var verifyAdminAuth = async (req, res, next) => {
  const adminPassword = req.headers["x-admin-password"];
  const authHeader = req.headers["authorization"];
  if (adminPassword === "Kaung1994") {
    return next();
  }
  let token = "";
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  } else if (typeof adminPassword === "string") {
    token = adminPassword;
  }
  if (token === "Kaung1994") {
    return next();
  }
  if (token) {
    try {
      const { data, error } = await supabase.auth.getUser(token);
      if (!error && data?.user) {
        if (data.user.email === "tartay.2200@gmail.com") {
          return next();
        }
      }
    } catch (err) {
      console.error("[verifyAdminAuth] Supabase Token Verification failed:", err);
    }
  }
  res.status(401).json({ error: "Unauthorized: Invalid Admin Password or Expired Session" });
};
app.post("/api/auth/login", (req, res) => {
  const { agentCode, phone } = req.body;
  const ip = req.ip || req.socket.remoteAddress;
  if (!agentCode || !phone) {
    return res.status(400).json({ error: "Agent Code and Phone number are required" });
  }
  const agent = db.verifyAgent(agentCode, phone);
  if (!agent) {
    db.addLog({
      type: "login_failed",
      agentCode: agentCode.toString(),
      phone: phone.toString(),
      details: `Failed authentication attempt. Agent Code or Phone did not match.`,
      ip
    });
    return res.status(401).json({ error: "Invalid Agent Code or Phone number" });
  }
  if (agent.status === "inactive") {
    db.addLog({
      type: "login_failed",
      agentCode: agent.code,
      phone: agent.phone,
      details: `Blocked authentication attempt for inactive agent ${agent.name} (${agent.code}).`,
      ip
    });
    return res.status(403).json({ error: "This agent account is inactive. Please contact the administrator." });
  }
  db.addLog({
    type: "login_success",
    agentCode: agent.code,
    phone: agent.phone,
    details: `Agent ${agent.name} (${agent.code}) logged in successfully.`,
    ip
  });
  res.json({ success: true, agent });
});
app.get("/api/apks", (req, res) => {
  const apks = db.getApks().filter((apk) => apk.status !== "inactive");
  const groups = {};
  for (const apk of apks) {
    const key = apk.name.trim().toLowerCase();
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(apk);
  }
  const filteredApks = [];
  for (const key of Object.keys(groups)) {
    const group = groups[key];
    group.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
    const latestApk = group[0];
    if (latestApk.allowOldVersions === false) {
      filteredApks.push(latestApk);
    } else {
      filteredApks.push(...group);
    }
  }
  filteredApks.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
  res.json(filteredApks);
});
app.get("/api/apks/:id/download", (req, res) => {
  const { id } = req.params;
  const { agentCode, phone } = req.query;
  const ip = req.ip || req.socket.remoteAddress;
  if (!agentCode || !phone) {
    return res.status(400).send("Unauthorized: Agent Code and Phone number query parameters are required to download.");
  }
  const agent = db.verifyAgent(agentCode, phone);
  if (!agent || agent.status === "inactive") {
    return res.status(403).send("Unauthorized: Invalid or inactive agent credentials.");
  }
  const apk = db.getApkById(id);
  if (!apk) {
    return res.status(404).send("APK file not found.");
  }
  const physicalPath = db.getApkStoragePath(id);
  if (!import_fs2.default.existsSync(physicalPath)) {
    return res.status(404).send("Physical APK file is missing on the server storage.");
  }
  db.incrementApkDownloads(id);
  db.addLog({
    type: "download",
    agentCode: agent.code,
    phone: agent.phone,
    details: `Agent ${agent.name} (${agent.code}) downloaded "${apk.name}" version ${apk.version} (Filename: ${apk.filename}).`,
    ip
  });
  res.setHeader("Content-Disposition", `attachment; filename="${apk.filename}"`);
  res.setHeader("Content-Type", "application/vnd.android.package-archive");
  const fileStream = import_fs2.default.createReadStream(physicalPath);
  fileStream.pipe(res);
});
app.get("/api/system-updates", (req, res) => {
  const updates = db.getSystemUpdates();
  res.json(updates);
});
app.get("/api/agent/activity", (req, res) => {
  const { agentCode, phone } = req.query;
  if (!agentCode || !phone) {
    return res.status(400).json({ error: "Agent credentials are required." });
  }
  const agent = db.verifyAgent(agentCode, phone);
  if (!agent || agent.status === "inactive") {
    return res.status(401).json({ error: "Invalid or inactive agent credentials." });
  }
  const logs = db.getLogs().filter((log) => log.agentCode === agent.code);
  res.json(logs);
});
app.post("/api/admin/login", async (req, res) => {
  const { email, password } = req.body;
  if (password === "Kaung1994" && (!email || email === "tartay.2200@gmail.com")) {
    return res.json({ success: true, token: "Kaung1994", email: "tartay.2200@gmail.com" });
  }
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (error) {
      return res.status(401).json({ error: error.message });
    }
    if (data?.session) {
      return res.json({
        success: true,
        token: data.session.access_token,
        email: data.user?.email || email
      });
    }
    return res.status(401).json({ error: "Invalid admin credentials" });
  } catch (err) {
    console.error("[Supabase Auth Server] Login handler crashed:", err);
    return res.status(500).json({ error: "Server authentication process encountered an error" });
  }
});
app.get("/api/admin/supabase-status", verifyAdminAuth, (req, res) => {
  res.json({
    status: supabaseTableStatus,
    schemaSql: SUPABASE_SCHEMA_SQL
  });
});
app.post("/api/admin/supabase-sync", verifyAdminAuth, async (req, res) => {
  try {
    await performTwoWaySync();
    res.json({ success: true, status: supabaseTableStatus });
  } catch (err) {
    res.status(500).json({ error: err.message || "Sync failed" });
  }
});
app.get("/api/admin/stats", verifyAdminAuth, (req, res) => {
  const agents = db.getAgents();
  const apks = db.getApks();
  const logs = db.getLogs();
  const totalAgents = agents.length;
  const activeAgents = agents.filter((a) => a.status === "active").length;
  const totalApks = apks.length;
  const totalDownloads = apks.reduce((sum, apk) => sum + apk.downloadsCount, 0);
  res.json({
    totalAgents,
    activeAgents,
    totalApks,
    totalDownloads,
    recentLogs: logs.slice(0, 100)
    // Give more logs for thorough auditing
  });
});
app.get("/api/admin/agents", verifyAdminAuth, (req, res) => {
  res.json(db.getAgents());
});
app.post("/api/admin/agents", verifyAdminAuth, (req, res) => {
  const { code, phone, name, status } = req.body;
  if (!code || !phone || !name) {
    return res.status(400).json({ error: "Agent Code, Phone, and Name are required." });
  }
  const existing = db.getAgents().find((a) => a.code.trim().toUpperCase() === code.trim().toUpperCase());
  if (existing) {
    return res.status(400).json({ error: `Agent with Code "${code}" already exists.` });
  }
  const newAgent = db.addAgent({
    code: code.trim().toUpperCase(),
    phone: phone.trim(),
    name: name.trim(),
    status: status === "inactive" ? "inactive" : "active"
  });
  db.addLog({
    type: "agent_created",
    details: `Admin added new agent: ${newAgent.name} (${newAgent.code}).`
  });
  res.status(201).json(newAgent);
});
app.put("/api/admin/agents/:id", verifyAdminAuth, (req, res) => {
  const { id } = req.params;
  const { code, phone, name, status } = req.body;
  const updated = db.updateAgent(id, {
    code: code?.trim().toUpperCase(),
    phone: phone?.trim(),
    name: name?.trim(),
    status
  });
  if (!updated) {
    return res.status(404).json({ error: "Agent not found." });
  }
  db.addLog({
    type: "agent_updated",
    details: `Admin updated agent: ${updated.name} (${updated.code}). Status: ${updated.status}.`
  });
  res.json(updated);
});
app.delete("/api/admin/agents/:id", verifyAdminAuth, (req, res) => {
  const { id } = req.params;
  const agents = db.getAgents();
  const agent = agents.find((a) => a.id === id);
  if (!agent) {
    return res.status(404).json({ error: "Agent not found." });
  }
  db.deleteAgent(id);
  db.addLog({
    type: "agent_deleted",
    details: `Admin deleted agent: ${agent.name} (${agent.code}).`
  });
  res.json({ success: true });
});
app.post(["/api/admin/agents/import", "/api/admin/agents/import-spreadsheet"], verifyAdminAuth, uploadSheet.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No spreadsheet file uploaded." });
  }
  try {
    const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rawRows = xlsx.utils.sheet_to_json(worksheet);
    if (rawRows.length === 0) {
      return res.status(400).json({ error: "The uploaded file does not contain any rows." });
    }
    const currentAgents = db.getAgents();
    let createdCount = 0;
    let updatedCount = 0;
    const errors = [];
    const agentsList = [...currentAgents];
    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];
      const code = (row["Agent Code"] || row["agent code"] || row["AgentCode"] || row["Code"] || row["code"] || row["AGENT CODE"] || "").toString().trim().toUpperCase();
      const phone = (row["Phone"] || row["phone"] || row["Phone Number"] || row["phone number"] || row["PhoneNumber"] || row["PHONE"] || "").toString().trim();
      const name = (row["Agent Name"] || row["agent name"] || row["AgentName"] || row["Name"] || row["name"] || row["NAME"] || "").toString().trim();
      const statusRaw = (row["Status"] || row["status"] || row["STATUS"] || "active").toString().trim().toLowerCase();
      const status = statusRaw === "inactive" || statusRaw === "blocked" || statusRaw === "0" ? "inactive" : "active";
      if (!code) {
        errors.push(`Row ${i + 2}: Missing Agent Code.`);
        continue;
      }
      if (!phone) {
        errors.push(`Row ${i + 2} (${code}): Missing Phone number.`);
        continue;
      }
      const displayName = name || `Agent ${code}`;
      const existingIdx = agentsList.findIndex((a) => a.code === code);
      if (existingIdx !== -1) {
        agentsList[existingIdx] = {
          ...agentsList[existingIdx],
          phone,
          name: displayName,
          status
        };
        updatedCount++;
      } else {
        agentsList.push({
          id: "agent-" + Date.now() + "-" + Math.floor(Math.random() * 1e3) + "-" + i,
          code,
          phone,
          name: displayName,
          status,
          createdAt: (/* @__PURE__ */ new Date()).toISOString()
        });
        createdCount++;
      }
    }
    db.saveAgents(agentsList);
    db.addLog({
      type: "agent_created",
      details: `Admin imported agents bulk list: Added ${createdCount} new agents, updated ${updatedCount} existing agents.`
    });
    res.json({
      success: true,
      createdCount,
      updatedCount,
      totalCount: rawRows.length,
      errors: errors.slice(0, 10)
      // Return first 10 errors if any
    });
  } catch (error) {
    console.error("Import spreadsheet failed", error);
    res.status(500).json({ error: `Failed to parse spreadsheet: ${error.message}` });
  }
});
app.get("/api/admin/apks", verifyAdminAuth, (req, res) => {
  const apks = db.getApks();
  apks.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
  res.json(apks);
});
app.post("/api/admin/apks", verifyAdminAuth, uploadApk.single("file"), (req, res) => {
  const { name, version, description } = req.body;
  const file = req.file;
  const generatedId = req.generatedApkId;
  if (!file) {
    return res.status(400).json({ error: "No APK file was uploaded." });
  }
  if (!name || !version) {
    const badFilePath = import_path2.default.join(db.getApkDirPath(), generatedId);
    if (import_fs2.default.existsSync(badFilePath)) {
      try {
        import_fs2.default.unlinkSync(badFilePath);
      } catch (e) {
      }
    }
    return res.status(400).json({ error: "App Name and Version are required." });
  }
  try {
    const allowOldVersions = req.body.allowOldVersions !== "false";
    const newApk = db.addApk({
      filename: file.originalname || `${name.toLowerCase().replace(/\s+/g, "-")}-${version}.apk`,
      name: name.trim(),
      version: version.trim(),
      size: file.size,
      description: (description || "").trim(),
      allowOldVersions
    });
    const uploadedPath = import_path2.default.join(db.getApkDirPath(), generatedId);
    const destinationPath = import_path2.default.join(db.getApkDirPath(), `${newApk.id}.apk`);
    import_fs2.default.renameSync(uploadedPath, destinationPath);
    db.addLog({
      type: "apk_uploaded",
      details: `Admin uploaded new APK: "${newApk.name}" version ${newApk.version} (${(newApk.size / (1024 * 1024)).toFixed(2)} MB). Show older versions: ${allowOldVersions ? "Yes" : "No"}.`
    });
    res.status(201).json(newApk);
  } catch (err) {
    console.error("APK registration failed", err);
    res.status(500).json({ error: `Failed to process uploaded APK: ${err.message}` });
  }
});
app.delete("/api/admin/apks/:id", verifyAdminAuth, (req, res) => {
  const { id } = req.params;
  const apk = db.getApkById(id);
  if (!apk) {
    return res.status(404).json({ error: "APK file record not found." });
  }
  const deleted = db.deleteApk(id);
  if (!deleted) {
    return res.status(500).json({ error: "Could not delete the file record." });
  }
  db.addLog({
    type: "apk_deleted",
    details: `Admin deleted APK: "${apk.name}" version ${apk.version}.`
  });
  res.json({ success: true });
});
app.put("/api/admin/apks/:id/status", verifyAdminAuth, (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (status !== "active" && status !== "inactive") {
    return res.status(400).json({ error: "Status must be active or inactive." });
  }
  const updated = db.updateApkStatus(id, status);
  if (!updated) {
    return res.status(404).json({ error: "APK file record not found." });
  }
  db.addLog({
    type: "apk_uploaded",
    details: `Admin changed status of APK "${updated.name}" version ${updated.version} to ${status}.`
  });
  res.json(updated);
});
app.post("/api/admin/system-updates", verifyAdminAuth, (req, res) => {
  const { title, description, version } = req.body;
  if (!title || !description) {
    return res.status(400).json({ error: "Update Title and Description are required." });
  }
  const newUpdate = db.addSystemUpdate({
    title: title.trim(),
    description: description.trim(),
    version: version ? version.trim() : void 0
  });
  db.addLog({
    type: "system_update_created",
    details: `Admin posted a system announcement: "${newUpdate.title}"`
  });
  res.status(201).json(newUpdate);
});
app.delete("/api/admin/system-updates/:id", verifyAdminAuth, (req, res) => {
  const { id } = req.params;
  const deleted = db.deleteSystemUpdate(id);
  if (!deleted) {
    return res.status(404).json({ error: "System update announcement not found." });
  }
  res.json({ success: true });
});
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path2.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path2.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] Running on http://localhost:${PORT}`);
  });
}
startServer().catch((err) => {
  console.error("[Server] Critical failure on startup:", err);
});
//# sourceMappingURL=server.cjs.map
