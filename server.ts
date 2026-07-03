import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import multer from 'multer';
import * as xlsx from 'xlsx';
import { db, initDb, supabaseTableStatus, performTwoWaySync } from './src/server/db.js';
import { SUPABASE_SCHEMA_SQL } from './src/server/supabase.js';
import { Agent, ApkFile } from './src/types.js';

// Initialize the database and data folders
initDb();

const app = express();
const PORT = 3000;

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Setup Multer for upload handling
// 1. Storage for APKs
const apkUploadStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, db.getApkDirPath());
  },
  filename: (req, file, cb) => {
    // Generate a unique ID for the APK
    const apkId = 'apk-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
    // Attach the id to request so we can reference it in the controller
    (req as any).generatedApkId = apkId;
    cb(null, apkId);
  }
});
const uploadApk = multer({
  storage: apkUploadStorage,
  limits: { fileSize: 100 * 1024 * 1024 } // 100 MB limit
});

// 2. Storage in-memory for xlsx spreadsheets
const uploadSheet = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10 MB limit
});

// Helper for admin authentication check
const verifyAdminAuth = (req: Request, res: Response, next: () => void) => {
  const adminPassword = req.headers['x-admin-password'];
  if (adminPassword === 'Kaung1994') {
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized: Invalid Admin Password' });
  }
};

// ==========================================
// PUBLIC & AGENT ENDPOINTS
// ==========================================

// 1. Agent Login
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { agentCode, phone } = req.body;
  const ip = req.ip || req.socket.remoteAddress;

  if (!agentCode || !phone) {
    return res.status(400).json({ error: 'Agent Code and Phone number are required' });
  }

  const agent = db.verifyAgent(agentCode, phone);

  if (!agent) {
    db.addLog({
      type: 'login_failed',
      agentCode: agentCode.toString(),
      phone: phone.toString(),
      details: `Failed authentication attempt. Agent Code or Phone did not match.`,
      ip
    });
    return res.status(401).json({ error: 'Invalid Agent Code or Phone number' });
  }

  if (agent.status === 'inactive') {
    db.addLog({
      type: 'login_failed',
      agentCode: agent.code,
      phone: agent.phone,
      details: `Blocked authentication attempt for inactive agent ${agent.name} (${agent.code}).`,
      ip
    });
    return res.status(403).json({ error: 'This agent account is inactive. Please contact the administrator.' });
  }

  // Log successful login
  db.addLog({
    type: 'login_success',
    agentCode: agent.code,
    phone: agent.phone,
    details: `Agent ${agent.name} (${agent.code}) logged in successfully.`,
    ip
  });

  res.json({ success: true, agent });
});

// 2. List available APK files
app.get('/api/apks', (req: Request, res: Response) => {
  const apks = db.getApks();
  
  // Group by application name (case-insensitive) to control showing old versions
  const groups: { [name: string]: typeof apks } = {};
  for (const apk of apks) {
    const key = apk.name.trim().toLowerCase();
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(apk);
  }

  const filteredApks: typeof apks = [];

  for (const key of Object.keys(groups)) {
    const group = groups[key];
    // Sort group so newest uploaded is first
    group.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
    
    const latestApk = group[0];
    
    // If the latest upload explicitly configures allowOldVersions = false,
    // we ONLY show the latest version to the public agent. Otherwise, we show all historical versions.
    if (latestApk.allowOldVersions === false) {
      filteredApks.push(latestApk);
    } else {
      filteredApks.push(...group);
    }
  }

  // Sort final array by uploadedAt descending
  filteredApks.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());

  res.json(filteredApks);
});

// 3. Download APK with verification
app.get('/api/apks/:id/download', (req: Request, res: Response) => {
  const { id } = req.params;
  const { agentCode, phone } = req.query;
  const ip = req.ip || req.socket.remoteAddress;

  if (!agentCode || !phone) {
    return res.status(400).send('Unauthorized: Agent Code and Phone number query parameters are required to download.');
  }

  const agent = db.verifyAgent(agentCode as string, phone as string);
  if (!agent || agent.status === 'inactive') {
    return res.status(403).send('Unauthorized: Invalid or inactive agent credentials.');
  }

  const apk = db.getApkById(id);
  if (!apk) {
    return res.status(404).send('APK file not found.');
  }

  const physicalPath = db.getApkStoragePath(id);
  if (!fs.existsSync(physicalPath)) {
    return res.status(404).send('Physical APK file is missing on the server storage.');
  }

  // Increment download counter
  db.incrementApkDownloads(id);

  // Add download log
  db.addLog({
    type: 'download',
    agentCode: agent.code,
    phone: agent.phone,
    details: `Agent ${agent.name} (${agent.code}) downloaded "${apk.name}" version ${apk.version} (Filename: ${apk.filename}).`,
    ip
  });

  // Set download headers
  res.setHeader('Content-Disposition', `attachment; filename="${apk.filename}"`);
  res.setHeader('Content-Type', 'application/vnd.android.package-archive');
  
  // Stream file to user
  const fileStream = fs.createReadStream(physicalPath);
  fileStream.pipe(res);
});

// 4. Get System updates for agents
app.get('/api/system-updates', (req: Request, res: Response) => {
  const updates = db.getSystemUpdates();
  res.json(updates);
});

// 5. Get download and activity history for a specific agent
app.get('/api/agent/activity', (req: Request, res: Response) => {
  const { agentCode, phone } = req.query;

  if (!agentCode || !phone) {
    return res.status(400).json({ error: 'Agent credentials are required.' });
  }

  const agent = db.verifyAgent(agentCode as string, phone as string);
  if (!agent || agent.status === 'inactive') {
    return res.status(401).json({ error: 'Invalid or inactive agent credentials.' });
  }

  // Filter logs where agentCode matches
  const logs = db.getLogs().filter(log => log.agentCode === agent.code);
  res.json(logs);
});


// ==========================================
// ADMIN DASHBOARD ENDPOINTS (PROTECTED)
// ==========================================

// 1. Admin login verification
app.post('/api/admin/login', (req: Request, res: Response) => {
  const { password } = req.body;
  if (password === 'Kaung1994') {
    res.json({ success: true });
  } else {
    res.status(401).json({ error: 'Incorrect admin password' });
  }
});

// 1b. Get Supabase Status & SQL Schema
app.get('/api/admin/supabase-status', verifyAdminAuth, (req: Request, res: Response) => {
  res.json({
    status: supabaseTableStatus,
    schemaSql: SUPABASE_SCHEMA_SQL
  });
});

// 1c. Trigger Manual Supabase Sync
app.post('/api/admin/supabase-sync', verifyAdminAuth, async (req: Request, res: Response) => {
  try {
    await performTwoWaySync();
    res.json({ success: true, status: supabaseTableStatus });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Sync failed' });
  }
});

// 2. Admin stats dashboard summary
app.get('/api/admin/stats', verifyAdminAuth, (req: Request, res: Response) => {
  const agents = db.getAgents();
  const apks = db.getApks();
  const logs = db.getLogs();

  const totalAgents = agents.length;
  const activeAgents = agents.filter(a => a.status === 'active').length;
  const totalApks = apks.length;
  const totalDownloads = apks.reduce((sum, apk) => sum + apk.downloadsCount, 0);

  // Return stats and top 50 logs
  res.json({
    totalAgents,
    activeAgents,
    totalApks,
    totalDownloads,
    recentLogs: logs.slice(0, 100) // Give more logs for thorough auditing
  });
});

// 3. GET all agents (Admin)
app.get('/api/admin/agents', verifyAdminAuth, (req: Request, res: Response) => {
  res.json(db.getAgents());
});

// 4. Create single agent
app.post('/api/admin/agents', verifyAdminAuth, (req: Request, res: Response) => {
  const { code, phone, name, status } = req.body;
  if (!code || !phone || !name) {
    return res.status(400).json({ error: 'Agent Code, Phone, and Name are required.' });
  }

  // Check if agent code already exists
  const existing = db.getAgents().find(a => a.code.trim().toUpperCase() === code.trim().toUpperCase());
  if (existing) {
    return res.status(400).json({ error: `Agent with Code "${code}" already exists.` });
  }

  const newAgent = db.addAgent({
    code: code.trim().toUpperCase(),
    phone: phone.trim(),
    name: name.trim(),
    status: status === 'inactive' ? 'inactive' : 'active'
  });

  db.addLog({
    type: 'agent_created',
    details: `Admin added new agent: ${newAgent.name} (${newAgent.code}).`
  });

  res.status(201).json(newAgent);
});

// 5. Update single agent
app.put('/api/admin/agents/:id', verifyAdminAuth, (req: Request, res: Response) => {
  const { id } = req.params;
  const { code, phone, name, status } = req.body;

  const updated = db.updateAgent(id, {
    code: code?.trim().toUpperCase(),
    phone: phone?.trim(),
    name: name?.trim(),
    status: status
  });

  if (!updated) {
    return res.status(404).json({ error: 'Agent not found.' });
  }

  db.addLog({
    type: 'agent_updated',
    details: `Admin updated agent: ${updated.name} (${updated.code}). Status: ${updated.status}.`
  });

  res.json(updated);
});

// 6. Delete single agent
app.delete('/api/admin/agents/:id', verifyAdminAuth, (req: Request, res: Response) => {
  const { id } = req.params;
  const agents = db.getAgents();
  const agent = agents.find(a => a.id === id);

  if (!agent) {
    return res.status(404).json({ error: 'Agent not found.' });
  }

  db.deleteAgent(id);

  db.addLog({
    type: 'agent_deleted',
    details: `Admin deleted agent: ${agent.name} (${agent.code}).`
  });

  res.json({ success: true });
});

// 7. Bulk Import Agents via Excel (.xlsx / .csv)
app.post('/api/admin/agents/import', verifyAdminAuth, uploadSheet.single('file'), (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No spreadsheet file uploaded.' });
  }

  try {
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rawRows = xlsx.utils.sheet_to_json<any>(worksheet);

    if (rawRows.length === 0) {
      return res.status(400).json({ error: 'The uploaded file does not contain any rows.' });
    }

    const currentAgents = db.getAgents();
    let createdCount = 0;
    let updatedCount = 0;
    const errors: string[] = [];

    const agentsList: Agent[] = [...currentAgents];

    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];
      
      // Flexible case-insensitive headers check
      const code = (row['Agent Code'] || row['agent code'] || row['AgentCode'] || row['Code'] || row['code'] || row['AGENT CODE'] || '').toString().trim().toUpperCase();
      const phone = (row['Phone'] || row['phone'] || row['Phone Number'] || row['phone number'] || row['PhoneNumber'] || row['PHONE'] || '').toString().trim();
      const name = (row['Agent Name'] || row['agent name'] || row['AgentName'] || row['Name'] || row['name'] || row['NAME'] || '').toString().trim();
      const statusRaw = (row['Status'] || row['status'] || row['STATUS'] || 'active').toString().trim().toLowerCase();
      const status: 'active' | 'inactive' = (statusRaw === 'inactive' || statusRaw === 'blocked' || statusRaw === '0') ? 'inactive' : 'active';

      if (!code) {
        errors.push(`Row ${i + 2}: Missing Agent Code.`);
        continue;
      }
      if (!phone) {
        errors.push(`Row ${i + 2} (${code}): Missing Phone number.`);
        continue;
      }
      
      const displayName = name || `Agent ${code}`;

      // Check if code already exists
      const existingIdx = agentsList.findIndex(a => a.code === code);
      if (existingIdx !== -1) {
        // Update existing agent
        agentsList[existingIdx] = {
          ...agentsList[existingIdx],
          phone,
          name: displayName,
          status
        };
        updatedCount++;
      } else {
        // Insert new agent
        agentsList.push({
          id: 'agent-' + Date.now() + '-' + Math.floor(Math.random() * 1000) + '-' + i,
          code,
          phone,
          name: displayName,
          status,
          createdAt: new Date().toISOString()
        });
        createdCount++;
      }
    }

    // Save complete agent array back
    db.saveAgents(agentsList);

    // Log the bulk action
    db.addLog({
      type: 'agent_created',
      details: `Admin imported agents bulk list: Added ${createdCount} new agents, updated ${updatedCount} existing agents.`
    });

    res.json({
      success: true,
      createdCount,
      updatedCount,
      totalCount: rawRows.length,
      errors: errors.slice(0, 10) // Return first 10 errors if any
    });

  } catch (error: any) {
    console.error('Import spreadsheet failed', error);
    res.status(500).json({ error: `Failed to parse spreadsheet: ${error.message}` });
  }
});

// 8. Upload New APK File
app.post('/api/admin/apks', verifyAdminAuth, uploadApk.single('file'), (req: Request, res: Response) => {
  const { name, version, description } = req.body;
  const file = req.file;
  const generatedId = (req as any).generatedApkId;

  if (!file) {
    return res.status(400).json({ error: 'No APK file was uploaded.' });
  }

  if (!name || !version) {
    // Delete file if metadata is missing to avoid orphan files
    const badFilePath = path.join(db.getApkDirPath(), generatedId);
    if (fs.existsSync(badFilePath)) {
      try { fs.unlinkSync(badFilePath); } catch(e) {}
    }
    return res.status(400).json({ error: 'App Name and Version are required.' });
  }

  try {
    const allowOldVersions = req.body.allowOldVersions !== 'false';
    const newApk = db.addApk({
      filename: file.originalname || `${name.toLowerCase().replace(/\s+/g, '-')}-${version}.apk`,
      name: name.trim(),
      version: version.trim(),
      size: file.size,
      description: (description || '').trim(),
      allowOldVersions: allowOldVersions
    });

    // Rename the disk file to match the newly generated DB id
    const uploadedPath = path.join(db.getApkDirPath(), generatedId);
    const destinationPath = path.join(db.getApkDirPath(), `${newApk.id}.apk`);
    fs.renameSync(uploadedPath, destinationPath);

    db.addLog({
      type: 'apk_uploaded',
      details: `Admin uploaded new APK: "${newApk.name}" version ${newApk.version} (${(newApk.size / (1024 * 1024)).toFixed(2)} MB). Show older versions: ${allowOldVersions ? 'Yes' : 'No'}.`
    });

    res.status(201).json(newApk);
  } catch (err: any) {
    console.error('APK registration failed', err);
    res.status(500).json({ error: `Failed to process uploaded APK: ${err.message}` });
  }
});

// 9. Delete APK File
app.delete('/api/admin/apks/:id', verifyAdminAuth, (req: Request, res: Response) => {
  const { id } = req.params;
  const apk = db.getApkById(id);

  if (!apk) {
    return res.status(404).json({ error: 'APK file record not found.' });
  }

  const deleted = db.deleteApk(id);
  if (!deleted) {
    return res.status(500).json({ error: 'Could not delete the file record.' });
  }

  db.addLog({
    type: 'apk_deleted',
    details: `Admin deleted APK: "${apk.name}" version ${apk.version}.`
  });

  res.json({ success: true });
});

// 10. Post System Update
app.post('/api/admin/system-updates', verifyAdminAuth, (req: Request, res: Response) => {
  const { title, description, version } = req.body;
  if (!title || !description) {
    return res.status(400).json({ error: 'Update Title and Description are required.' });
  }

  const newUpdate = db.addSystemUpdate({
    title: title.trim(),
    description: description.trim(),
    version: version ? version.trim() : undefined
  });

  db.addLog({
    type: 'system_update_created',
    details: `Admin posted a system announcement: "${newUpdate.title}"`
  });

  res.status(201).json(newUpdate);
});

// 11. Delete System Update
app.delete('/api/admin/system-updates/:id', verifyAdminAuth, (req: Request, res: Response) => {
  const { id } = req.params;
  const deleted = db.deleteSystemUpdate(id);
  if (!deleted) {
    return res.status(404).json({ error: 'System update announcement not found.' });
  }
  res.json({ success: true });
});

// ==========================================
// STATIC FILES & DEV ENVIRONMENT ROUTER
// ==========================================

async function startServer() {
  // Vite dev middleware setup
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    // Mount Vite dev server middlewares
    app.use(vite.middlewares);
  } else {
    // Serve production static assets from the standard build build
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('[Server] Critical failure on startup:', err);
});
