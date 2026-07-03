import fs from 'fs';
import path from 'path';
import { Agent, ApkFile, ActivityLog, SystemUpdate } from '../types.js';
import { supabase } from './supabase.js';

const DATA_DIR = path.join(process.cwd(), 'data');
const APK_DIR = path.join(DATA_DIR, 'apks');
const DB_FILE = path.join(DATA_DIR, 'db.json');

interface Schema {
  agents: Agent[];
  apks: ApkFile[];
  logs: ActivityLog[];
  systemUpdates: SystemUpdate[];
}

const defaultData: Schema = {
  agents: [
    {
      id: 'agent-1',
      code: 'AGT001',
      phone: '0912345678',
      name: 'Kaung Htet',
      status: 'active',
      createdAt: new Date('2026-06-25T10:00:00Z').toISOString()
    },
    {
      id: 'agent-2',
      code: 'AGT002',
      phone: '0998765432',
      name: 'Aung Kyaw',
      status: 'active',
      createdAt: new Date('2026-06-28T12:30:00Z').toISOString()
    },
    {
      id: 'agent-3',
      code: 'AGT003',
      phone: '0955544433',
      name: 'Mya Mya',
      status: 'inactive',
      createdAt: new Date('2026-07-01T08:15:00Z').toISOString()
    }
  ],
  apks: [
    {
      id: 'apk-1',
      filename: 'agent-portal-v1.0.0.apk',
      name: 'Agent Operations App',
      version: '1.0.0',
      size: 15420000, // ~14.7 MB
      description: 'Initial release of the official Agent Operations mobile application. Features agent reporting, task logging, and instant notification capabilities.',
      downloadsCount: 45,
      uploadedAt: new Date('2026-06-25T11:00:00Z').toISOString(),
      status: 'active'
    },
    {
      id: 'apk-2',
      filename: 'agent-pos-v1.1.2.apk',
      name: 'Agent POS Terminal',
      version: '1.1.2',
      size: 24850000, // ~23.7 MB
      description: 'Stable version of the Agent POS merchant terminal interface. Improved receipt layout, bluetooth printer pairing, and offline sales logging.',
      downloadsCount: 128,
      uploadedAt: new Date('2026-06-30T15:45:00Z').toISOString(),
      status: 'active'
    }
  ],
  logs: [
    {
      id: 'log-1',
      type: 'login_success',
      timestamp: new Date('2026-07-02T09:12:00Z').toISOString(),
      agentCode: 'AGT001',
      phone: '0912345678',
      details: 'Agent Kaung Htet (AGT001) successfully logged in.',
      ip: '192.168.1.100'
    },
    {
      id: 'log-2',
      type: 'download',
      timestamp: new Date('2026-07-02T09:15:00Z').toISOString(),
      agentCode: 'AGT001',
      phone: '0912345678',
      details: 'Agent Kaung Htet (AGT001) downloaded Agent POS Terminal (v1.1.2).',
      ip: '192.168.1.100'
    },
    {
      id: 'log-3',
      type: 'login_failed',
      timestamp: new Date('2026-07-02T14:22:00Z').toISOString(),
      agentCode: 'AGT002',
      phone: '0900000000',
      details: 'Failed login attempt: Agent code matches but phone number is incorrect.',
      ip: '203.81.71.42'
    }
  ],
  systemUpdates: [
    {
      id: 'update-1',
      title: 'Server Maintenance Notice',
      description: 'The Agent Portal server will undergo scheduled security updates on July 5, 2026, between 02:00 AM and 04:00 AM UTC. Portals may experience brief timeouts.',
      timestamp: new Date('2026-07-01T06:00:00Z').toISOString()
    },
    {
      id: 'update-2',
      title: 'New POS Terminal Update (v1.1.2)',
      description: 'We have rolled out POS Terminal v1.1.2 to address critical receipt layout issues for agents using Bluetooth thermal printers. All agents are advised to upgrade.',
      timestamp: new Date('2026-06-30T15:50:00Z').toISOString(),
      version: '1.1.2'
    }
  ]
};

// Tracks which tables are verified and active on Supabase
export const supabaseTableStatus = {
  connected: false,
  agents: false,
  apks: false,
  logs: false,
  systemUpdates: false,
  lastSyncTime: null as string | null,
  syncError: null as string | null
};

// Cache and helper to dynamically verify if 'status' column is present in the Supabase 'apks' table
let apksHasStatusColumnChecked = false;
let apksHasStatusColumn = false;

async function checkApksStatusColumn() {
  if (apksHasStatusColumnChecked) return apksHasStatusColumn;
  try {
    const { error } = await supabase.from('apks').select('status').limit(1);
    if (!error) {
      apksHasStatusColumn = true;
    } else {
      // Quietly handle column absence to avoid triggering platform warning hooks
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

// Local read/write
function readData(): Schema {
  try {
    if (!fs.existsSync(DB_FILE)) {
      return defaultData;
    }
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
  } catch (e) {
    console.error('[Database] Failed to read db.json, returning defaults', e);
    return defaultData;
  }
}

function writeData(data: Schema): void {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error('[Database] Failed to write db.json', e);
  }
}

// Ensure local directories exist
export function initDb() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(APK_DIR)) {
    fs.mkdirSync(APK_DIR, { recursive: true });
  }

  // Create dummy physical files for default APKs if missing
  const dummyApk1Path = path.join(APK_DIR, 'apk-1.apk');
  if (!fs.existsSync(dummyApk1Path)) {
    fs.writeFileSync(dummyApk1Path, Buffer.alloc(1024 * 100)); // 100 KB
  }
  const dummyApk2Path = path.join(APK_DIR, 'apk-2.apk');
  if (!fs.existsSync(dummyApk2Path)) {
    fs.writeFileSync(dummyApk2Path, Buffer.alloc(1024 * 100)); // 100 KB
  }

  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(defaultData, null, 2), 'utf-8');
  } else {
    try {
      const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
      if (!data.agents || !data.apks || !data.logs || !data.systemUpdates) {
        const merged = { ...defaultData, ...data };
        fs.writeFileSync(DB_FILE, JSON.stringify(merged, null, 2), 'utf-8');
      }
    } catch (e) {
      fs.writeFileSync(DB_FILE, JSON.stringify(defaultData, null, 2), 'utf-8');
    }
  }

  // Kick off background Supabase Sync
  runSupabaseSyncLoop();
}

// Background sync loop to coordinate with Supabase
let syncTimeout: NodeJS.Timeout | null = null;
async function runSupabaseSyncLoop() {
  try {
    await performTwoWaySync();
  } catch (err) {
    console.error('[Supabase Sync] Loop failure:', err);
  }
  // Schedule next sync in 15 seconds
  syncTimeout = setTimeout(runSupabaseSyncLoop, 15000);
}

// Perform two-way sync between local and Supabase
export async function performTwoWaySync() {
  try {
    supabaseTableStatus.connected = true;
    supabaseTableStatus.syncError = null;

    const hasStatusCol = await checkApksStatusColumn();

    const localData = readData();

    // 1. Sync Agents Table
    try {
      const { data: remoteAgents, error: agentsError } = await supabase.from('agents').select('*');
      if (agentsError) {
        if (agentsError.code === '42P01' || agentsError.code === 'PGRST205') {
          supabaseTableStatus.agents = false;
          console.warn('[Supabase Sync] Table "agents" does not exist in Supabase.');
        } else {
          throw agentsError;
        }
      } else {
        supabaseTableStatus.agents = true;
        // Merge Agents: Match by ID
        const remoteMap = new Map<string, Agent>();
        (remoteAgents || []).forEach(a => remoteMap.set(a.id, a));

        let localModified = false;
        
        // Push local agents to remote if not existing or updated
        for (const localAgent of localData.agents) {
          const remoteAgent = remoteMap.get(localAgent.id);
          if (!remoteAgent) {
            // Upload to Supabase with conflict resolution on agent code
            await supabase.from('agents').upsert(localAgent, { onConflict: 'code' });
          } else if (
            remoteAgent.code !== localAgent.code ||
            remoteAgent.phone !== localAgent.phone ||
            remoteAgent.name !== localAgent.name ||
            remoteAgent.status !== localAgent.status
          ) {
            // Update Supabase with conflict resolution on agent code
            await supabase.from('agents').upsert(localAgent, { onConflict: 'code' });
          }
        }

        // Pull remote agents to local
        for (const remoteAgent of (remoteAgents || [])) {
          const localAgentIdx = localData.agents.findIndex(a => a.id === remoteAgent.id);
          if (localAgentIdx === -1) {
            localData.agents.push(remoteAgent);
            localModified = true;
          } else {
            const localAgent = localData.agents[localAgentIdx];
            if (
              localAgent.code !== remoteAgent.code ||
              localAgent.phone !== remoteAgent.phone ||
              localAgent.name !== remoteAgent.name ||
              localAgent.status !== remoteAgent.status
            ) {
              localData.agents[localAgentIdx] = remoteAgent;
              localModified = true;
            }
          }
        }

        if (localModified) {
          writeData(localData);
        }
      }
    } catch (err: any) {
      console.error('[Supabase Sync] Error syncing Agents:', err);
      supabaseTableStatus.syncError = err.message || 'Agents sync failed';
    }

    // 2. Sync APK Metadata Table
    try {
      const { data: remoteApks, error: apksError } = await supabase.from('apks').select('*');
      if (apksError) {
        if (apksError.code === '42P01' || apksError.code === 'PGRST205') {
          supabaseTableStatus.apks = false;
          console.warn('[Supabase Sync] Table "apks" does not exist in Supabase.');
        } else {
          throw apksError;
        }
      } else {
        supabaseTableStatus.apks = true;
        const remoteMap = new Map<string, ApkFile>();
        (remoteApks || []).forEach(a => remoteMap.set(a.id, a));

        let localModified = false;

        for (const localApk of localData.apks) {
          const remoteApk = remoteMap.get(localApk.id);
          if (!remoteApk) {
            const payload = { ...localApk };
            if (!hasStatusCol) {
              delete payload.status;
            }
            await supabase.from('apks').insert(payload);
          } else if (
            remoteApk.downloadsCount !== localApk.downloadsCount ||
            remoteApk.allowOldVersions !== localApk.allowOldVersions ||
            remoteApk.name !== localApk.name ||
            remoteApk.version !== localApk.version ||
            remoteApk.description !== localApk.description ||
            (hasStatusCol && remoteApk.status !== localApk.status)
          ) {
            const payload = { ...localApk };
            if (!hasStatusCol) {
              delete payload.status;
            }
            await supabase.from('apks').update(payload).eq('id', localApk.id);
          }
        }

        for (const remoteApk of (remoteApks || [])) {
          const localIdx = localData.apks.findIndex(a => a.id === remoteApk.id);
          if (localIdx === -1) {
            localData.apks.push({
              ...remoteApk,
              status: remoteApk.status || 'active'
            });
            localModified = true;
          } else {
            const localApk = localData.apks[localIdx];
            if (
              localApk.downloadsCount !== remoteApk.downloadsCount ||
              localApk.allowOldVersions !== remoteApk.allowOldVersions ||
              localApk.name !== remoteApk.name ||
              localApk.version !== remoteApk.version ||
              localApk.description !== remoteApk.description ||
              (hasStatusCol && localApk.status !== remoteApk.status)
            ) {
              localData.apks[localIdx] = {
                ...remoteApk,
                status: remoteApk.status || localApk.status || 'active'
              };
              localModified = true;
            }
          }
        }

        if (localModified) {
          writeData(localData);
        }
      }
    } catch (err: any) {
      console.error('[Supabase Sync] Error syncing APKs:', err);
    }

    // 3. Sync System Updates Table
    try {
      const { data: remoteUpdates, error: updatesError } = await supabase.from('system_updates').select('*');
      if (updatesError) {
        if (updatesError.code === '42P01' || updatesError.code === 'PGRST205') {
          supabaseTableStatus.systemUpdates = false;
          console.warn('[Supabase Sync] Table "system_updates" does not exist in Supabase.');
        } else {
          throw updatesError;
        }
      } else {
        supabaseTableStatus.systemUpdates = true;
        const remoteMap = new Map<string, SystemUpdate>();
        (remoteUpdates || []).forEach(u => remoteMap.set(u.id, u));

        let localModified = false;

        for (const localUpdate of localData.systemUpdates) {
          const remoteUpdate = remoteMap.get(localUpdate.id);
          if (!remoteUpdate) {
            await supabase.from('system_updates').insert({
              id: localUpdate.id,
              title: localUpdate.title,
              description: localUpdate.description,
              timestamp: localUpdate.timestamp,
              version: localUpdate.version
            });
          }
        }

        for (const remoteUpdate of (remoteUpdates || [])) {
          const localIdx = localData.systemUpdates.findIndex(u => u.id === remoteUpdate.id);
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
    } catch (err: any) {
      console.error('[Supabase Sync] Error syncing System Updates:', err);
    }

    // 4. Sync Logs Table
    try {
      const { data: remoteLogs, error: logsError } = await supabase.from('logs').select('*').order('timestamp', { ascending: false }).limit(200);
      if (logsError) {
        if (logsError.code === '42P01' || logsError.code === 'PGRST205') {
          supabaseTableStatus.logs = false;
          console.warn('[Supabase Sync] Table "logs" does not exist in Supabase.');
        } else {
          throw logsError;
        }
      } else {
        supabaseTableStatus.logs = true;
        const remoteMap = new Map<string, ActivityLog>();
        (remoteLogs || []).forEach(l => remoteMap.set(l.id, l));

        let localModified = false;

        // Sync local logs to Supabase
        for (const localLog of localData.logs.slice(0, 100)) {
          if (!remoteMap.has(localLog.id)) {
            await supabase.from('logs').insert({
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

        // Pull remote logs to local
        for (const remoteLog of (remoteLogs || [])) {
          const localIdx = localData.logs.findIndex(l => l.id === remoteLog.id);
          if (localIdx === -1) {
            localData.logs.push({
              id: remoteLog.id,
              type: remoteLog.type as any,
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
          // Keep local logs list sorted and capped
          localData.logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          if (localData.logs.length > 500) {
            localData.logs = localData.logs.slice(0, 500);
          }
          writeData(localData);
        }
      }
    } catch (err: any) {
      console.error('[Supabase Sync] Error syncing Logs:', err);
    }

    supabaseTableStatus.lastSyncTime = new Date().toISOString();
  } catch (err: any) {
    supabaseTableStatus.connected = false;
    supabaseTableStatus.syncError = err?.message || 'Connection failure';
    console.error('[Supabase Sync] Connection checking failure:', err);
  }
}

// Public API
export const db = {
  // Agents CRUD
  getAgents(): Agent[] {
    return readData().agents;
  },
  
  saveAgents(agents: Agent[]) {
    const data = readData();
    data.agents = agents;
    writeData(data);
    
    // Non-blocking upload to Supabase with conflict resolution on agent code
    if (supabaseTableStatus.agents) {
      supabase.from('agents').upsert(agents, { onConflict: 'code' }).then(({ error }) => {
        if (error) console.error('[Supabase] Failed to bulk upsert agents:', error);
      });
    }
  },

  addAgent(agent: Omit<Agent, 'id' | 'createdAt'>): Agent {
    const data = readData();
    const newAgent: Agent = {
      ...agent,
      id: 'agent-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      createdAt: new Date().toISOString()
    };
    data.agents.push(newAgent);
    writeData(data);

    // Non-blocking upload to Supabase with conflict resolution on agent code
    if (supabaseTableStatus.agents) {
      supabase.from('agents').upsert(newAgent, { onConflict: 'code' }).then(({ error }) => {
        if (error) console.error('[Supabase] Failed to insert/upsert agent:', error);
      });
    }

    return newAgent;
  },

  updateAgent(id: string, updates: Partial<Omit<Agent, 'id' | 'createdAt'>>): Agent | null {
    const data = readData();
    const index = data.agents.findIndex(a => a.id === id);
    if (index === -1) return null;
    
    data.agents[index] = {
      ...data.agents[index],
      ...updates
    };
    writeData(data);

    // Non-blocking update to Supabase
    if (supabaseTableStatus.agents) {
      supabase.from('agents').update(updates).eq('id', id).then(({ error }) => {
        if (error) console.error('[Supabase] Failed to update agent:', error);
      });
    }

    return data.agents[index];
  },

  deleteAgent(id: string): boolean {
    const data = readData();
    const lengthBefore = data.agents.length;
    data.agents = data.agents.filter(a => a.id !== id);
    writeData(data);

    // Non-blocking delete from Supabase
    if (supabaseTableStatus.agents) {
      supabase.from('agents').delete().eq('id', id).then(({ error }) => {
        if (error) console.error('[Supabase] Failed to delete agent:', error);
      });
    }

    return data.agents.length < lengthBefore;
  },

  // APKs CRUD
  getApks(): ApkFile[] {
    return readData().apks;
  },

  getApkById(id: string): ApkFile | null {
    return readData().apks.find(apk => apk.id === id) || null;
  },

  addApk(apk: Omit<ApkFile, 'id' | 'downloadsCount' | 'uploadedAt'>): ApkFile {
    const data = readData();
    const newApk: ApkFile = {
      ...apk,
      id: 'apk-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      downloadsCount: 0,
      uploadedAt: new Date().toISOString(),
      status: apk.status || 'active'
    };
    data.apks.push(newApk);
    writeData(data);

    // Non-blocking upload to Supabase
    if (supabaseTableStatus.apks) {
      const payload = { ...newApk };
      if (!apksHasStatusColumn) {
        delete payload.status;
      }
      supabase.from('apks').insert(payload).then(({ error }) => {
        if (error) console.error('[Supabase] Failed to insert APK:', error);
      });
    }

    return newApk;
  },

  updateApkStatus(id: string, status: 'active' | 'inactive'): ApkFile | null {
    const data = readData();
    const apkIdx = data.apks.findIndex(a => a.id === id);
    if (apkIdx === -1) return null;
    
    data.apks[apkIdx].status = status;
    writeData(data);

    // Non-blocking update to Supabase
    if (supabaseTableStatus.apks && apksHasStatusColumn) {
      supabase.from('apks').update({ status }).eq('id', id).then(({ error }) => {
        if (error) console.error('[Supabase] Failed to update APK status:', error);
      });
    }

    return data.apks[apkIdx];
  },

  deleteApk(id: string): boolean {
    const data = readData();
    const apk = data.apks.find(a => a.id === id);
    if (!apk) return false;
    
    // Attempt to delete physical file
    const filePath = path.join(APK_DIR, `${id}.apk`);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (e) {
        console.error('Failed to delete physical APK file', e);
      }
    }

    data.apks = data.apks.filter(a => a.id !== id);
    writeData(data);

    // Non-blocking delete from Supabase
    if (supabaseTableStatus.apks) {
      supabase.from('apks').delete().eq('id', id).then(({ error }) => {
        if (error) console.error('[Supabase] Failed to delete APK metadata:', error);
      });
    }

    return true;
  },

  incrementApkDownloads(id: string): boolean {
    const data = readData();
    const apk = data.apks.find(a => a.id === id);
    if (!apk) return false;
    apk.downloadsCount += 1;
    writeData(data);

    // Non-blocking count update to Supabase
    if (supabaseTableStatus.apks) {
      supabase.from('apks').update({ downloadsCount: apk.downloadsCount }).eq('id', id).then(({ error }) => {
        if (error) console.error('[Supabase] Failed to increment APK downloads:', error);
      });
    }

    return true;
  },

  // Activity Logs
  getLogs(): ActivityLog[] {
    return readData().logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  },

  addLog(log: Omit<ActivityLog, 'id' | 'timestamp'>): ActivityLog {
    const data = readData();
    const newLog: ActivityLog = {
      ...log,
      id: 'log-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      timestamp: new Date().toISOString()
    };
    data.logs.push(newLog);
    // Limit log size to 500
    if (data.logs.length > 500) {
      data.logs = data.logs.slice(0, 500);
    }
    writeData(data);

    // Non-blocking upload to Supabase
    if (supabaseTableStatus.logs) {
      supabase.from('logs').insert(newLog).then(({ error }) => {
        if (error) console.error('[Supabase] Failed to insert log:', error);
      });
    }

    return newLog;
  },

  // System Updates / Announcements
  getSystemUpdates(): SystemUpdate[] {
    return readData().systemUpdates.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  },

  addSystemUpdate(update: Omit<SystemUpdate, 'id' | 'timestamp'>): SystemUpdate {
    const data = readData();
    const newUpdate: SystemUpdate = {
      ...update,
      id: 'update-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      timestamp: new Date().toISOString()
    };
    data.systemUpdates.push(newUpdate);
    writeData(data);

    // Non-blocking upload to Supabase
    if (supabaseTableStatus.systemUpdates) {
      supabase.from('system_updates').insert({
        id: newUpdate.id,
        title: newUpdate.title,
        description: newUpdate.description,
        timestamp: newUpdate.timestamp,
        version: newUpdate.version
      }).then(({ error }) => {
        if (error) console.error('[Supabase] Failed to insert system update:', error);
      });
    }

    return newUpdate;
  },

  deleteSystemUpdate(id: string): boolean {
    const data = readData();
    const lengthBefore = data.systemUpdates.length;
    data.systemUpdates = data.systemUpdates.filter(u => u.id !== id);
    writeData(data);

    // Non-blocking delete from Supabase
    if (supabaseTableStatus.systemUpdates) {
      supabase.from('system_updates').delete().eq('id', id).then(({ error }) => {
        if (error) console.error('[Supabase] Failed to delete system update:', error);
      });
    }

    return data.systemUpdates.length < lengthBefore;
  },

  verifyAgent(code: string, phone: string): Agent | null {
    const agents = this.getAgents();
    const cleanCode = code.trim().toUpperCase();
    const cleanPhone = phone.trim().replace(/[\s-+]/g, '');

    const found = agents.find(a => {
      const aCode = a.code.trim().toUpperCase();
      const aPhone = a.phone.trim().replace(/[\s-+]/g, '');
      return aCode === cleanCode && aPhone === cleanPhone;
    });

    return found || null;
  },

  getApkStoragePath(id: string): string {
    const seededDummyPath = path.join(APK_DIR, `${id}.apk`);
    if (fs.existsSync(seededDummyPath)) {
      return seededDummyPath;
    }
    return path.join(APK_DIR, id);
  },
  
  getApkDirPath(): string {
    return APK_DIR;
  }
};
