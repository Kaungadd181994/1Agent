import { createClient } from '@supabase/supabase-js';
import { Agent, ApkFile, ActivityLog, SystemUpdate } from './types';

// Load publishable client-side variables
const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || '';

// Always use secure full-stack backend proxy endpoints to prevent RLS failures and client-side credential exposure
export const isServerlessMode = false;

export const supabaseClient = isServerlessMode
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true
      }
    })
  : null;

// Dual-mode API calls
export async function loginAgent(agentCode: string, phone: string) {
  if (isServerlessMode) {
    const cleanCode = agentCode.trim().toUpperCase();
    const cleanPhone = phone.trim().replace(/[\s-+]/g, '');

    const { data: agents, error } = await supabaseClient!
      .from('agents')
      .select('*');

    if (error) {
      // Log the failed login
      await supabaseClient!.from('logs').insert({
        id: 'log-' + Date.now(),
        type: 'login_failed',
        agentCode,
        phone,
        details: `Failed authentication attempt (Error): ${error.message}`,
        timestamp: new Date().toISOString()
      });
      throw new Error(error.message || 'Invalid Agent Code or Phone number');
    }

    const foundAgent = (agents || []).find(a => {
      const aCode = (a.code || '').trim().toUpperCase();
      const aPhone = (a.phone || '').trim().replace(/[\s-+]/g, '');
      return aCode === cleanCode && aPhone === cleanPhone;
    });

    if (!foundAgent) {
      // Log failed login due to invalid credentials
      await supabaseClient!.from('logs').insert({
        id: 'log-' + Date.now(),
        type: 'login_failed',
        agentCode,
        phone,
        details: `Failed authentication attempt: Agent Code (${agentCode}) or Phone (${phone}) did not match any active record.`,
        timestamp: new Date().toISOString()
      });
      throw new Error('Invalid Agent Code or Phone number');
    }

    if (foundAgent.status === 'inactive') {
      await supabaseClient!.from('logs').insert({
        id: 'log-' + Date.now(),
        type: 'login_failed',
        agentCode: foundAgent.code,
        phone: foundAgent.phone,
        details: `Blocked authentication attempt for inactive agent ${foundAgent.name} (${foundAgent.code}).`,
        timestamp: new Date().toISOString()
      });
      throw new Error('This agent account is inactive. Please contact the administrator.');
    }

    // Log successful login
    await supabaseClient!.from('logs').insert({
      id: 'log-' + Date.now(),
      type: 'login_success',
      agentCode: foundAgent.code,
      phone: foundAgent.phone,
      details: `Agent ${foundAgent.name} (${foundAgent.code}) logged in successfully via Serverless direct mode.`,
      timestamp: new Date().toISOString()
    });

    return { success: true, agent: foundAgent as Agent };
  } else {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentCode, phone })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Authentication failed');
    }
    return data;
  }
}

export async function loginAdmin(password: string) {
  if (isServerlessMode) {
    if (password === 'Kaung1994') {
      return { success: true, email: 'tartay.2200@gmail.com', token: 'Kaung1994' };
    }
    throw new Error('Invalid Admin Password');
  } else {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Login failed');
    }
    return data;
  }
}

export async function getApks(isAdmin = false, adminPassword?: string) {
  if (isServerlessMode) {
    const query = supabaseClient!.from('apks').select('*');
    const { data, error } = await query;
    if (error) throw new Error(error.message);

    const apks = (data || []) as ApkFile[];

    if (isAdmin) {
      return apks.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
    }

    // Agent list - filter inactive and handle allowOldVersions
    const activeApks = apks.filter(apk => apk.status !== 'inactive');
    const groups: { [name: string]: ApkFile[] } = {};
    for (const apk of activeApks) {
      const key = apk.name.trim().toLowerCase();
      if (!groups[key]) groups[key] = [];
      groups[key].push(apk);
    }

    const filteredApks: ApkFile[] = [];
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

    return filteredApks.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
  } else {
    const headers: Record<string, string> = {};
    if (adminPassword) {
      headers['x-admin-password'] = adminPassword;
      headers['Authorization'] = `Bearer ${adminPassword}`;
    }
    const endpoint = isAdmin ? '/api/admin/apks' : '/api/apks';
    const res = await fetch(endpoint, { headers });
    if (!res.ok) throw new Error('Failed to fetch APKs');
    return await res.json();
  }
}

export async function downloadApkFile(apk: ApkFile, agent: Agent) {
  if (isServerlessMode) {
    // Increment local counter in Supabase
    await supabaseClient!
      .from('apks')
      .update({ downloadsCount: (apk.downloadsCount || 0) + 1 })
      .eq('id', apk.id);

    // Insert download log
    await supabaseClient!.from('logs').insert({
      id: 'log-' + Date.now(),
      type: 'download',
      agentCode: agent.code,
      phone: agent.phone,
      details: `Agent ${agent.name} (${agent.code}) downloaded direct APK package: ${apk.name} v${apk.version}.`,
      timestamp: new Date().toISOString()
    });

    // Download locally in browser (instantly bypasses server route!)
    const blob = new Blob(
      [
        `Secure APK Binary Content Stub\n\n` +
          `Package Name: ${apk.name}\n` +
          `Filename: ${apk.filename}\n` +
          `Version: ${apk.version}\n` +
          `Size: ${apk.size} bytes\n` +
          `Signature: ${Math.random().toString(36).substring(2, 15).toUpperCase()}\n` +
          `Timestamp: ${new Date().toISOString()}\n\n` +
          `[Serverless Direct Supabase Handshake Success]`
      ],
      { type: 'application/vnd.android.package-archive' }
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', apk.filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } else {
    const downloadUrl = `/api/apks/${apk.id}/download?agentCode=${encodeURIComponent(agent.code)}&phone=${encodeURIComponent(agent.phone)}`;
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', apk.filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

export async function addApk(formData: FormData, adminPassword?: string) {
  if (isServerlessMode) {
    const name = formData.get('name') as string;
    const version = formData.get('version') as string;
    const description = formData.get('description') as string;
    const allowOldVersions = formData.get('allowOldVersions') === 'true';
    const file = formData.get('file') as File | null;

    const id = 'apk-' + Date.now();
    const filename = file ? file.name : 'manual-upload.apk';
    const size = file ? file.size : 1024 * 1024 * 3; // 3MB fallback

    const newApk = {
      id,
      filename,
      name,
      version,
      size,
      description,
      downloadsCount: 0,
      uploadedAt: new Date().toISOString(),
      allowOldVersions,
      status: 'active'
    };

    const { error } = await supabaseClient!.from('apks').insert(newApk);
    if (error) throw new Error(error.message);

    // Insert operation log
    await supabaseClient!.from('logs').insert({
      id: 'log-' + Date.now(),
      type: 'apk_uploaded',
      details: `Admin uploaded new APK version: ${name} v${version} (${filename}).`,
      timestamp: new Date().toISOString()
    });

    return { success: true, apk: newApk };
  } else {
    const res = await fetch('/api/admin/apks', {
      method: 'POST',
      headers: {
        'x-admin-password': adminPassword || '',
        'Authorization': `Bearer ${adminPassword}`
      },
      body: formData
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to add APK');
    return data;
  }
}

export async function deleteApk(id: string, name: string, adminPassword?: string) {
  if (isServerlessMode) {
    const { error } = await supabaseClient!.from('apks').delete().eq('id', id);
    if (error) throw new Error(error.message);

    await supabaseClient!.from('logs').insert({
      id: 'log-' + Date.now(),
      type: 'apk_deleted',
      details: `Admin deleted APK version ID: ${id} (${name}).`,
      timestamp: new Date().toISOString()
    });

    return { success: true };
  } else {
    const res = await fetch(`/api/admin/apks/${id}`, {
      method: 'DELETE',
      headers: {
        'x-admin-password': adminPassword || '',
        'Authorization': `Bearer ${adminPassword}`
      }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to delete APK');
    return data;
  }
}

export async function toggleApkStatus(id: string, currentStatus?: 'active' | 'inactive', adminPassword?: string) {
  const nextStatus = currentStatus === 'inactive' ? 'active' : 'inactive';
  if (isServerlessMode) {
    const { error } = await supabaseClient!
      .from('apks')
      .update({ status: nextStatus })
      .eq('id', id);
    if (error) throw new Error(error.message);

    await supabaseClient!.from('logs').insert({
      id: 'log-' + Date.now(),
      type: 'apk_status_toggled',
      details: `Admin toggled APK status for ID: ${id} to ${nextStatus}.`,
      timestamp: new Date().toISOString()
    });

    return { success: true };
  } else {
    const res = await fetch(`/api/admin/apks/${id}/status`, {
      method: 'PUT',
      headers: {
        'x-admin-password': adminPassword || '',
        'Authorization': `Bearer ${adminPassword}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status: nextStatus })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to toggle APK status');
    return data;
  }
}

export async function getAgents(adminPassword?: string) {
  if (isServerlessMode) {
    const { data, error } = await supabaseClient!
      .from('agents')
      .select('*')
      .order('createdAt', { ascending: false });
    if (error) throw new Error(error.message);
    return data || [];
  } else {
    const res = await fetch('/api/admin/agents', {
      headers: {
        'x-admin-password': adminPassword || '',
        'Authorization': `Bearer ${adminPassword}`
      }
    });
    if (!res.ok) throw new Error('Failed to fetch agents');
    return await res.json();
  }
}

export async function addAgent(agent: Omit<Agent, 'id' | 'status' | 'createdAt'>, adminPassword?: string) {
  if (isServerlessMode) {
    const id = 'agent-' + Date.now();
    const newAgent = {
      id,
      ...agent,
      status: 'active',
      createdAt: new Date().toISOString()
    };
    const { error } = await supabaseClient!.from('agents').insert(newAgent);
    if (error) throw new Error(error.message);

    await supabaseClient!.from('logs').insert({
      id: 'log-' + Date.now(),
      type: 'agent_added',
      details: `Admin registered new agent: ${agent.name} (${agent.code}).`,
      timestamp: new Date().toISOString()
    });

    return { success: true, agent: newAgent };
  } else {
    const res = await fetch('/api/admin/agents', {
      method: 'POST',
      headers: {
        'x-admin-password': adminPassword || '',
        'Authorization': `Bearer ${adminPassword}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(agent)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to add agent');
    return data;
  }
}

export async function toggleAgentStatus(id: string, currentStatus: 'active' | 'inactive', adminPassword?: string) {
  const nextStatus = currentStatus === 'inactive' ? 'active' : 'inactive';
  if (isServerlessMode) {
    const { error } = await supabaseClient!
      .from('agents')
      .update({ status: nextStatus })
      .eq('id', id);
    if (error) throw new Error(error.message);

    await supabaseClient!.from('logs').insert({
      id: 'log-' + Date.now(),
      type: 'agent_status_toggled',
      details: `Admin updated Agent status for ID: ${id} to ${nextStatus}.`,
      timestamp: new Date().toISOString()
    });

    return { success: true };
  } else {
    const res = await fetch(`/api/admin/agents/${id}/status`, {
      method: 'PUT',
      headers: {
        'x-admin-password': adminPassword || '',
        'Authorization': `Bearer ${adminPassword}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status: nextStatus })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to toggle agent status');
    return data;
  }
}

export async function deleteAgent(id: string, name: string, adminPassword?: string) {
  if (isServerlessMode) {
    const { error } = await supabaseClient!.from('agents').delete().eq('id', id);
    if (error) throw new Error(error.message);

    await supabaseClient!.from('logs').insert({
      id: 'log-' + Date.now(),
      type: 'agent_deleted',
      details: `Admin wiped Agent account for ID: ${id} (${name}).`,
      timestamp: new Date().toISOString()
    });

    return { success: true };
  } else {
    const res = await fetch(`/api/admin/agents/${id}`, {
      method: 'DELETE',
      headers: {
        'x-admin-password': adminPassword || '',
        'Authorization': `Bearer ${adminPassword}`
      }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to delete agent');
    return data;
  }
}

export async function getStats(adminPassword?: string) {
  if (isServerlessMode) {
    const { count: agentsCount } = await supabaseClient!.from('agents').select('*', { count: 'exact', head: true });
    const { count: apksCount } = await supabaseClient!.from('apks').select('*', { count: 'exact', head: true });
    const { count: logsCount } = await supabaseClient!.from('logs').select('*', { count: 'exact', head: true });

    const { data: apkData } = await supabaseClient!.from('apks').select('downloadsCount');
    const totalDownloads = apkData?.reduce((sum, item) => sum + (item.downloadsCount || 0), 0) || 0;

    return {
      agentsCount: agentsCount || 0,
      apksCount: apksCount || 0,
      downloadsCount: totalDownloads,
      logsCount: logsCount || 0
    };
  } else {
    const res = await fetch('/api/admin/stats', {
      headers: {
        'x-admin-password': adminPassword || '',
        'Authorization': `Bearer ${adminPassword}`
      }
    });
    if (!res.ok) throw new Error('Failed to fetch stats');
    return await res.json();
  }
}

export async function getSystemUpdates() {
  if (isServerlessMode) {
    const { data, error } = await supabaseClient!
      .from('system_updates')
      .select('*')
      .order('timestamp', { ascending: false });
    if (error) throw new Error(error.message);
    return data || [];
  } else {
    const res = await fetch('/api/system-updates');
    if (!res.ok) throw new Error('Failed to fetch system announcements');
    return await res.json();
  }
}

export async function addSystemUpdate(title: string, description: string, version: string, adminPassword?: string) {
  if (isServerlessMode) {
    const id = 'update-' + Date.now();
    const newUpdate = {
      id,
      title,
      description,
      version,
      timestamp: new Date().toISOString()
    };
    const { error } = await supabaseClient!.from('system_updates').insert(newUpdate);
    if (error) throw new Error(error.message);

    await supabaseClient!.from('logs').insert({
      id: 'log-' + Date.now(),
      type: 'announcement_added',
      details: `Admin published new bulletin announcement: "${title}" (Target version: ${version}).`,
      timestamp: new Date().toISOString()
    });

    return { success: true, announcement: newUpdate };
  } else {
    const res = await fetch('/api/admin/system-updates', {
      method: 'POST',
      headers: {
        'x-admin-password': adminPassword || '',
        'Authorization': `Bearer ${adminPassword}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ title, description, version })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to publish update');
    return data;
  }
}

export async function deleteSystemUpdate(id: string, adminPassword?: string) {
  if (isServerlessMode) {
    const { error } = await supabaseClient!.from('system_updates').delete().eq('id', id);
    if (error) throw new Error(error.message);

    await supabaseClient!.from('logs').insert({
      id: 'log-' + Date.now(),
      type: 'announcement_deleted',
      details: `Admin deleted bulletin update ID: ${id}.`,
      timestamp: new Date().toISOString()
    });

    return { success: true };
  } else {
    const res = await fetch(`/api/admin/system-updates/${id}`, {
      method: 'DELETE',
      headers: {
        'x-admin-password': adminPassword || '',
        'Authorization': `Bearer ${adminPassword}`
      }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to delete update');
    return data;
  }
}

export async function getLogs(adminPassword?: string) {
  if (isServerlessMode) {
    const { data, error } = await supabaseClient!
      .from('logs')
      .select('*')
      .order('timestamp', { ascending: false });
    if (error) throw new Error(error.message);
    return data || [];
  } else {
    const res = await fetch('/api/admin/logs', {
      headers: {
        'x-admin-password': adminPassword || '',
        'Authorization': `Bearer ${adminPassword}`
      }
    });
    if (!res.ok) throw new Error('Failed to fetch logs');
    return await res.json();
  }
}

export async function clearLogs(adminPassword?: string) {
  if (isServerlessMode) {
    const { error } = await supabaseClient!.from('logs').delete().neq('id', '');
    if (error) throw new Error(error.message);

    // Re-create a single log indicating the wipe event
    await supabaseClient!.from('logs').insert({
      id: 'log-' + Date.now(),
      type: 'logs_cleared',
      details: `Operational tracking database cleared by administrator.`,
      timestamp: new Date().toISOString()
    });

    return { success: true };
  } else {
    const res = await fetch('/api/admin/logs/clear', {
      method: 'POST',
      headers: {
        'x-admin-password': adminPassword || '',
        'Authorization': `Bearer ${adminPassword}`
      }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to clear logs');
    return data;
  }
}
