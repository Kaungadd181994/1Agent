import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { 
  Users, 
  Download, 
  AlertCircle, 
  CheckCircle, 
  Trash2, 
  Edit2, 
  Plus, 
  Upload, 
  Search, 
  RefreshCw,
  Clock,
  LogOut,
  ArrowLeft,
  FileSpreadsheet,
  Megaphone,
  Check,
  X,
  Shield,
  FileText,
  Database,
  AlertTriangle,
  Server
} from 'lucide-react';
import { Agent, ApkFile, ActivityLog, SystemUpdate, DashboardStats } from '../types';
import { 
  getStats, 
  getAgents, 
  addAgent, 
  toggleAgentStatus, 
  deleteAgent, 
  getApks, 
  addApk, 
  deleteApk, 
  toggleApkStatus, 
  getSystemUpdates, 
  addSystemUpdate, 
  deleteSystemUpdate, 
  getLogs, 
  clearLogs, 
  isServerlessMode 
} from '../apiClient';

interface AdminPortalProps {
  adminPassword: string;
  onLogout: () => void;
}

export default function AdminPortal({ adminPassword, onLogout }: AdminPortalProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [apks, setApks] = useState<ApkFile[]>([]);
  const [systemUpdates, setSystemUpdates] = useState<SystemUpdate[]>([]);
  
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingAgents, setLoadingAgents] = useState(true);
  const [loadingApks, setLoadingApks] = useState(true);
  const [loadingUpdates, setLoadingUpdates] = useState(true);

  const [activeTab, setActiveTab] = useState<'dashboard' | 'agents' | 'apks' | 'announcements' | 'supabase'>('dashboard');

  // Supabase Integration states
  const [supabaseStatus, setSupabaseStatus] = useState<{
    status: {
      connected: boolean;
      agents: boolean;
      apks: boolean;
      logs: boolean;
      systemUpdates: boolean;
      lastSyncTime: string | null;
      syncError: string | null;
    };
    schemaSql: string;
  } | null>(null);
  const [loadingSupabase, setLoadingSupabase] = useState(false);
  const [syncingSupabase, setSyncingSupabase] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  // Agent Search & Form states
  const [agentSearch, setAgentSearch] = useState('');
  const [showAgentModal, setShowAgentModal] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [agentForm, setAgentForm] = useState({
    code: '',
    name: '',
    phone: '',
    status: 'active' as 'active' | 'inactive'
  });
  const [agentFormError, setAgentFormError] = useState<string | null>(null);
  const [submittingAgent, setSubmittingAgent] = useState(false);

  // Agent Table Pagination State
  const [agentPage, setAgentPage] = useState(1);
  const [agentPerPage, setAgentPerPage] = useState(10); // options up to 100

  // Excel spreadsheet upload state
  const [spreadsheetFile, setSpreadsheetFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    createdCount: number;
    updatedCount: number;
    error?: string;
  } | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // APK Upload form state
  const [showApkModal, setShowApkModal] = useState(false);
  const [apkFile, setApkFile] = useState<File | null>(null);
  const [apkForm, setApkForm] = useState({
    name: '',
    version: '',
    description: '',
    allowOldVersions: true
  });
  const [apkFormError, setApkFormError] = useState<string | null>(null);
  const [uploadingApk, setUploadingApk] = useState(false);
  const apkFileInputRef = useRef<HTMLInputElement>(null);

  // Announcement form state
  const [updateForm, setUpdateForm] = useState({
    title: '',
    description: '',
    version: ''
  });
  const [announcementError, setAnnouncementError] = useState<string | null>(null);
  const [postingAnnouncement, setPostingAnnouncement] = useState(false);

  // Logs filters & detail modal
  const [logFilterType, setLogFilterType] = useState<string>('all');
  const [logSearchQuery, setLogSearchQuery] = useState<string>('');
  const [logActorFilter, setLogActorFilter] = useState<'all' | 'admin' | 'agent'>('all');
  const [logPage, setLogPage] = useState<number>(1);
  const [logPerPage, setLogPerPage] = useState<number>(15);
  const [selectedLogForDetails, setSelectedLogForDetails] = useState<ActivityLog | null>(null);

  const headers = {
    'x-admin-password': adminPassword,
    'Authorization': `Bearer ${adminPassword}`,
    'Content-Type': 'application/json'
  };

  // Fetch functions
  const fetchStats = async () => {
    try {
      setLoadingStats(true);
      const baseStats = await getStats(adminPassword);
      if (isServerlessMode) {
        const logs = await getLogs(adminPassword);
        setStats({
          ...baseStats,
          recentLogs: logs as ActivityLog[]
        });
      } else {
        setStats(baseStats);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchAgents = async () => {
    try {
      setLoadingAgents(true);
      const data = await getAgents(adminPassword);
      setAgents(data);
    } catch (err) {
      console.error('Error fetching agents:', err);
    } finally {
      setLoadingAgents(false);
    }
  };

  const fetchApks = async () => {
    try {
      setLoadingApks(true);
      const data = await getApks(true, adminPassword);
      setApks(data);
    } catch (err) {
      console.error('Error fetching APKs:', err);
    } finally {
      setLoadingApks(false);
    }
  };

  const fetchUpdates = async () => {
    try {
      setLoadingUpdates(true);
      const data = await getSystemUpdates();
      setSystemUpdates(data);
    } catch (err) {
      console.error('Error fetching updates:', err);
    } finally {
      setLoadingUpdates(false);
    }
  };

  const fetchSupabaseStatus = async () => {
    if (isServerlessMode) {
      setSupabaseStatus({
        status: {
          connected: true,
          agents: true,
          apks: true,
          logs: true,
          systemUpdates: true,
          lastSyncTime: new Date().toISOString(),
          syncError: null
        },
        schemaSql: `-- Connected directly via VITE_SUPABASE_URL.\n-- No middle server running, true serverless BaaS architecture!`
      });
      return;
    }
    try {
      setLoadingSupabase(true);
      const res = await fetch('/api/admin/supabase-status', {
        headers: { 'x-admin-password': adminPassword }
      });
      if (res.ok) {
        const data = await res.json();
        setSupabaseStatus(data);
      }
    } catch (err) {
      console.error('Error fetching Supabase status:', err);
    } finally {
      setLoadingSupabase(false);
    }
  };

  const handleSupabaseSync = async () => {
    try {
      setSyncingSupabase(true);
      const res = await fetch('/api/admin/supabase-sync', {
        method: 'POST',
        headers: { 'x-admin-password': adminPassword }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setSupabaseStatus(prev => prev ? { ...prev, status: data.status } : null);
          // Refresh statistics
          fetchStats();
          fetchAgents();
          fetchApks();
          fetchUpdates();
        }
      }
    } catch (err) {
      console.error('Error triggering manual sync:', err);
    } finally {
      setSyncingSupabase(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchAgents();
    fetchApks();
    fetchUpdates();
    fetchSupabaseStatus();
  }, []);

  // Reset agent page when search terms change
  useEffect(() => {
    setAgentPage(1);
  }, [agentSearch]);

  // Reset log page when log search or filters change
  useEffect(() => {
    setLogPage(1);
  }, [logSearchQuery, logFilterType, logActorFilter]);

  // Agent CRUD triggers
  const openAddAgent = () => {
    setEditingAgent(null);
    setAgentForm({ code: '', name: '', phone: '', status: 'active' });
    setAgentFormError(null);
    setShowAgentModal(true);
  };

  const openEditAgent = (agent: Agent) => {
    setEditingAgent(agent);
    setAgentForm({
      code: agent.code,
      name: agent.name,
      phone: agent.phone,
      status: agent.status
    });
    setAgentFormError(null);
    setShowAgentModal(true);
  };

  const handleAgentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agentForm.code.trim() || !agentForm.phone.trim() || !agentForm.name.trim()) {
      setAgentFormError('All fields (Code, Name, Phone) are required.');
      return;
    }

    try {
      setSubmittingAgent(true);
      setAgentFormError(null);

      if (isServerlessMode) {
        const { supabaseClient } = await import('../apiClient');
        if (editingAgent) {
          const { error } = await supabaseClient!
            .from('agents')
            .update({
              code: agentForm.code.trim().toUpperCase(),
              name: agentForm.name.trim(),
              phone: agentForm.phone.trim(),
              status: agentForm.status
            })
            .eq('id', editingAgent.id);
          if (error) throw error;
        } else {
          const { error } = await supabaseClient!
            .from('agents')
            .insert({
              id: 'agent-' + Date.now(),
              code: agentForm.code.trim().toUpperCase(),
              name: agentForm.name.trim(),
              phone: agentForm.phone.trim(),
              status: agentForm.status,
              createdAt: new Date().toISOString()
            });
          if (error) throw error;
        }
        setShowAgentModal(false);
        fetchAgents();
        fetchStats();
      } else {
        const url = editingAgent ? `/api/admin/agents/${editingAgent.id}` : '/api/admin/agents';
        const method = editingAgent ? 'PUT' : 'POST';

        const res = await fetch(url, {
          method,
          headers,
          body: JSON.stringify({
            code: agentForm.code.trim().toUpperCase(),
            name: agentForm.name.trim(),
            phone: agentForm.phone.trim(),
            status: agentForm.status
          })
        });

        const data = await res.json();
        if (res.ok) {
          setShowAgentModal(false);
          fetchAgents();
          fetchStats();
        } else {
          setAgentFormError(data.error || 'Failed to persist agent details.');
        }
      }
    } catch (err: any) {
      console.error('Agent submit error:', err);
      setAgentFormError(err?.message || 'Connection timeout to master gateway.');
    } finally {
      setSubmittingAgent(false);
    }
  };

  const handleDeleteAgent = async (id: string, name: string) => {
    if (!confirm(`Are you absolutely sure you want to completely de-register Agent "${name}"? All subsequent logins under this code will fail.`)) {
      return;
    }

    try {
      if (isServerlessMode) {
        await deleteAgent(id, name, adminPassword);
        fetchAgents();
        fetchStats();
      } else {
        const res = await fetch(`/api/admin/agents/${id}`, {
          method: 'DELETE',
          headers
        });

        if (res.ok) {
          fetchAgents();
          fetchStats();
        } else {
          const errData = await res.json();
          alert(errData.error || 'Error during operational deletion.');
        }
      }
    } catch (err: any) {
      console.error('Error deleting agent:', err);
      alert(err?.message || 'Error deleting agent');
    }
  };

  // Spreadsheet upload logic
  const handleSpreadsheetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSpreadsheetFile(e.target.files[0]);
      setImportResult(null);
    }
  };

  const handleSpreadsheetImport = async () => {
    if (!spreadsheetFile) return;

    try {
      setImporting(true);
      setImportResult(null);

      if (isServerlessMode) {
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const data = new Uint8Array(e.target?.result as ArrayBuffer);
            const { read, utils } = await import('xlsx');
            const workbook = read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const jsonData = utils.sheet_to_json<any>(worksheet);

            let createdCount = 0;
            let updatedCount = 0;

            const { supabaseClient } = await import('../apiClient');

            for (const row of jsonData) {
              const code = (row.agentCode || row.code || row.AgentCode || row.Agent_Code || '').toString().trim().toUpperCase();
              const name = (row.agentName || row.name || row.AgentName || row.Name || '').toString().trim();
              const phone = (row.agentPhone || row.phone || row.AgentPhone || row.Phone || '').toString().trim();

              if (!code || !phone) continue;

              const { data: existingAgent } = await supabaseClient!
                .from('agents')
                .select('id')
                .eq('code', code)
                .maybeSingle();

              if (existingAgent) {
                const { error } = await supabaseClient!
                  .from('agents')
                  .update({ name, phone })
                  .eq('id', existingAgent.id);
                if (!error) updatedCount++;
              } else {
                const { error } = await supabaseClient!
                  .from('agents')
                  .insert({
                    id: 'agent-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
                    code,
                    name,
                    phone,
                    status: 'active',
                    createdAt: new Date().toISOString()
                  });
                if (!error) createdCount++;
              }
            }

            setImportResult({
              success: true,
              createdCount,
              updatedCount
            });
            setSpreadsheetFile(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
            fetchAgents();
            fetchStats();
          } catch (err: any) {
            console.error('Failed to parse client-side excel:', err);
            setImportResult({
              success: false,
              createdCount: 0,
              updatedCount: 0,
              error: err?.message || 'Spreadsheet parsing error. Ensure the format is valid.'
            });
          } finally {
            setImporting(false);
          }
        };
        reader.readAsArrayBuffer(spreadsheetFile);
        return;
      }

      const formData = new FormData();
      formData.append('file', spreadsheetFile);

      const res = await fetch('/api/admin/agents/import-spreadsheet', {
        method: 'POST',
        headers: {
          'x-admin-password': adminPassword
        },
        body: formData
      });

      const data = await res.json();
      if (res.ok) {
        setImportResult({
          success: true,
          createdCount: data.createdCount || 0,
          updatedCount: data.updatedCount || 0
        });
        setSpreadsheetFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        fetchAgents();
        fetchStats();
      } else {
        setImportResult({
          success: false,
          createdCount: 0,
          updatedCount: 0,
          error: data.error || 'The spreadsheet format could not be verified.'
        });
      }
    } catch (err: any) {
      console.error('Import spreadsheet error:', err);
      setImportResult({
        success: false,
        createdCount: 0,
        updatedCount: 0,
        error: err?.message || 'Network transport failure. Check server telemetry.'
      });
    } finally {
      if (!isServerlessMode) {
        setImporting(false);
      }
    }
  };

  const downloadCsvTemplate = () => {
    const csvContent = "agentCode,agentName,agentPhone\nAGT001,Kaung Htet,0912345678\nAGT002,Min Thaw,0987654321\n";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'agent_bulk_import_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // APK file handling
  const handleApkFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setApkFile(file);
      // Auto fill name if empty
      if (!apkForm.name) {
        const cleanedName = file.name
          .replace(/\.apk$/i, '')
          .split(/[-_]/)
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        setApkForm(prev => ({ ...prev, name: cleanedName }));
      }
    }
  };

  const handleApkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apkFile) {
      setApkFormError('You must select a physical .apk installation package.');
      return;
    }
    if (!apkForm.name.trim() || !apkForm.version.trim()) {
      setApkFormError('Application Name and Package Version are mandatory.');
      return;
    }

    try {
      setUploadingApk(true);
      setApkFormError(null);

      const formData = new FormData();
      formData.append('file', apkFile);
      formData.append('name', apkForm.name.trim());
      formData.append('version', apkForm.version.trim());
      formData.append('description', apkForm.description.trim());
      formData.append('allowOldVersions', String(apkForm.allowOldVersions));

      await addApk(formData, adminPassword);

      setShowApkModal(false);
      setApkFile(null);
      setApkForm({ name: '', version: '', description: '', allowOldVersions: true });
      if (apkFileInputRef.current) apkFileInputRef.current.value = '';
      fetchApks();
      fetchStats();
    } catch (err: any) {
      console.error('APK upload failed:', err);
      setApkFormError(err?.message || 'Connection lost during transmission block.');
    } finally {
      setUploadingApk(false);
    }
  };

  const handleDeleteApk = async (id: string, name: string) => {
    if (!confirm(`Confirm complete wipe of "${name}" binary? This will break download routes for all clients instantly.`)) {
      return;
    }

    try {
      await deleteApk(id, name, adminPassword);
      fetchApks();
      fetchStats();
    } catch (err: any) {
      console.error('Error deleting APK:', err);
      alert(err?.message || 'Failed to delete APK.');
    }
  };

  const handleToggleApkStatus = async (id: string, currentStatus?: 'active' | 'inactive') => {
    try {
      await toggleApkStatus(id, currentStatus, adminPassword);
      fetchApks();
      fetchStats();
    } catch (err: any) {
      console.error('Error toggling APK status:', err);
      alert(err?.message || 'Failed to update APK status.');
    }
  };

  // Announcements triggers
  const handleAnnouncementSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!updateForm.title.trim() || !updateForm.description.trim()) {
      setAnnouncementError('Title and description are required.');
      return;
    }

    try {
      setPostingAnnouncement(true);
      setAnnouncementError(null);

      await addSystemUpdate(
        updateForm.title.trim(),
        updateForm.description.trim(),
        updateForm.version.trim(),
        adminPassword
      );

      setUpdateForm({ title: '', description: '', version: '' });
      fetchUpdates();
      fetchStats();
    } catch (err: any) {
      console.error('Announcement submit error:', err);
      setAnnouncementError(err?.message || 'Server connection error.');
    } finally {
      setPostingAnnouncement(false);
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    if (!confirm('Retract this announcement? It will immediately disappear from agent notices.')) {
      return;
    }

    try {
      await deleteSystemUpdate(id, adminPassword);
      fetchUpdates();
    } catch (err: any) {
      console.error('Announcement deletion error:', err);
      alert(err?.message || 'Failed to retract notice.');
    }
  };

  // Filters & Helpers
  const filteredAgents = agents.filter(agent => {
    const q = agentSearch.toLowerCase().trim();
    return agent.name.toLowerCase().includes(q) || agent.code.toLowerCase().includes(q) || agent.phone.includes(q);
  });

  const filteredLogs = (stats?.recentLogs || []).filter(log => {
    // 1. Role / Actor Filter (Admin vs User/Agent)
    if (logActorFilter !== 'all') {
      const isAdminType = log.type.startsWith('apk_') || log.type.startsWith('agent_') || log.type.startsWith('system_') || log.type.includes('admin') || log.type === 'clear_logs';
      const isAgentType = log.type === 'download' || log.type === 'login_success' || log.type === 'login_failed';
      if (logActorFilter === 'admin' && !isAdminType) return false;
      if (logActorFilter === 'agent' && !isAgentType) return false;
    }

    // 2. Type Filter
    if (logFilterType !== 'all') {
      if (logFilterType === 'login' && !log.type.startsWith('login')) return false;
      if (logFilterType === 'download' && log.type !== 'download') return false;
      if (logFilterType === 'agent_crud' && !log.type.startsWith('agent_')) return false;
      if (logFilterType === 'apk_crud' && !log.type.startsWith('apk_')) return false;
    }

    // 3. Search Query Filter
    if (logSearchQuery.trim()) {
      const q = logSearchQuery.toLowerCase();
      const matchDetails = log.details.toLowerCase().includes(q);
      const matchCode = log.agentCode?.toLowerCase().includes(q) || false;
      const matchPhone = log.phone?.includes(q) || false;
      const matchIp = log.ip?.toLowerCase().includes(q) || false;
      return matchDetails || matchCode || matchPhone || matchIp;
    }

    return true;
  });

  // pagination slicing
  const totalAgentPages = Math.ceil(filteredAgents.length / agentPerPage) || 1;
  const paginatedAgents = filteredAgents.slice((agentPage - 1) * agentPerPage, agentPage * agentPerPage);

  const totalLogPages = Math.ceil(filteredLogs.length / logPerPage) || 1;
  const paginatedLogs = filteredLogs.slice((logPage - 1) * logPerPage, logPage * logPerPage);

  // CSV Export for Logs
  const exportLogsToCsv = () => {
    const csvHeaders = ['Timestamp', 'Type', 'Agent Code', 'Phone', 'IP Address', 'Details'];
    const rows = filteredLogs.map(log => [
      new Date(log.timestamp).toLocaleString('en-US'),
      log.type,
      log.agentCode || 'System/Admin',
      log.phone || 'N/A',
      log.ip || 'N/A',
      `"${log.details.replace(/"/g, '""')}"`
    ]);

    const csvContent = [csvHeaders.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `system_audit_logs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    return (bytes / (k * k)).toFixed(2) + ' MB';
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div id="admin-portal-root" className="min-h-screen bg-slate-50 text-slate-800 flex flex-col antialiased font-sans">
      
      {/* Admin Panel Header - Edge to Edge, High Contrast */}
      <header id="admin-header" className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40">
        <div className="w-full px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-emerald-500 text-slate-950 p-2 rounded-xl flex items-center justify-center">
              <Shield size={20} />
            </div>
            <div>
              <h1 className="font-display font-bold text-base tracking-tight leading-none text-white">Administration Workspace</h1>
              <p className="text-[10px] text-emerald-400 font-mono mt-0.5">Systems Management Node</p>
            </div>
          </div>

          <button
            id="btn-admin-logout"
            onClick={onLogout}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors text-xs font-semibold cursor-pointer border border-slate-700"
          >
            <LogOut size={14} />
            <span>Lock Panel</span>
          </button>
        </div>
      </header>

      {/* Main Container - Full Width edge-to-edges */}
      <main className="flex-1 w-full max-w-full px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6">
        
        {/* Navigation Tab Rails */}
        <div className="flex flex-wrap items-center justify-between border-b border-slate-200 pb-2 gap-4">
          <div className="flex space-x-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'dashboard' 
                  ? 'bg-white text-slate-900 border border-slate-200 shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Audits Dashboard
            </button>
            <button
              onClick={() => setActiveTab('agents')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'agents' 
                  ? 'bg-white text-slate-900 border border-slate-200 shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Agent Directory
            </button>
            <button
              onClick={() => setActiveTab('apks')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'apks' 
                  ? 'bg-white text-slate-900 border border-slate-200 shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              APK Packages
            </button>
            <button
              onClick={() => setActiveTab('announcements')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'announcements' 
                  ? 'bg-white text-slate-900 border border-slate-200 shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Announcements
            </button>
            <button
              onClick={() => {
                setActiveTab('supabase');
                fetchSupabaseStatus();
              }}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'supabase' 
                  ? 'bg-white text-slate-900 border border-slate-200 shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Supabase DB
            </button>
          </div>

          <div className="flex items-center space-x-2 text-xs text-slate-500 font-mono font-bold bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
            {supabaseStatus?.status?.connected ? (
              <span className="flex items-center gap-1 text-emerald-600">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Supabase: Connected
              </span>
            ) : (
              <span className="flex items-center gap-1 text-slate-500">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                Local Mode
              </span>
            )}
          </div>
        </div>

        {/* ==========================================
            TAB CONTENT: DASHBOARD & AUDIT LOGS
            ========================================== */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            
            {/* Stat Counters Row */}
            {loadingStats ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-24 bg-white border border-slate-200 rounded-xl" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200 p-5 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Registered Agents</span>
                    <span className="text-2xl font-black text-slate-900 block mt-1 font-mono">{stats?.agentsCount || 0}</span>
                  </div>
                  <div className="bg-slate-100 text-slate-800 p-2.5 rounded-xl border border-slate-200">
                    <Users size={18} />
                  </div>
                </div>

                <div className="bg-white border border-slate-200 p-5 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Active Packages</span>
                    <span className="text-2xl font-black text-slate-900 block mt-1 font-mono">{stats?.apksCount || 0}</span>
                  </div>
                  <div className="bg-slate-100 text-slate-800 p-2.5 rounded-xl border border-slate-200">
                    <Download size={18} />
                  </div>
                </div>

                <div className="bg-white border border-slate-200 p-5 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Downloads</span>
                    <span className="text-2xl font-black text-slate-900 block mt-1 font-mono">{stats?.totalDownloads || 0}</span>
                  </div>
                  <div className="bg-slate-100 text-slate-800 p-2.5 rounded-xl border border-slate-200">
                    <CheckCircle size={18} />
                  </div>
                </div>

                <div className="bg-white border border-slate-200 p-5 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Announcements</span>
                    <span className="text-2xl font-black text-slate-900 block mt-1 font-mono">{stats?.systemUpdatesCount || 0}</span>
                  </div>
                  <div className="bg-slate-100 text-slate-800 p-2.5 rounded-xl border border-slate-200">
                    <Megaphone size={18} />
                  </div>
                </div>
              </div>
            )}

            {/* Live Audit Log Stream Console */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col">
              
              {/* Log Section Header & Filter Controls */}
              <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="font-display font-bold text-sm uppercase tracking-wider text-slate-800">Operational Log Monitor</h3>
                  <p className="text-[11px] text-slate-500 font-mono mt-0.5">Real-time authentication handshake and filesystem delivery ledger.</p>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
                    <input
                      type="text"
                      placeholder="Search code, IP, log details..."
                      value={logSearchQuery}
                      onChange={(e) => setLogSearchQuery(e.target.value)}
                      className="pl-8 pr-3 py-1.5 w-60 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-slate-400"
                    />
                  </div>

                  <select
                    value={logFilterType}
                    onChange={(e) => setLogFilterType(e.target.value)}
                    className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold outline-none"
                  >
                    <option value="all">All Logs</option>
                    <option value="login">Login Events</option>
                    <option value="download">APK Downloads</option>
                    <option value="agent_crud">Agent Changes</option>
                    <option value="apk_crud">APK Uploads</option>
                  </select>

                  <button
                    onClick={exportLogsToCsv}
                    title="Export logs as standard comma-separated-value roster"
                    className="flex items-center space-x-1 px-3 py-1.5 bg-slate-900 hover:bg-slate-850 text-white rounded-lg text-xs font-bold cursor-pointer"
                  >
                    <FileSpreadsheet size={13} />
                    <span>Export Logs</span>
                  </button>

                  <button
                    onClick={fetchStats}
                    className="p-1.5 border border-slate-200 hover:bg-white rounded-lg cursor-pointer bg-slate-50"
                  >
                    <RefreshCw size={13} className={loadingStats ? "animate-spin" : ""} />
                  </button>
                </div>
              </div>

              {/* Logs List Container */}
              {loadingStats ? (
                <div className="py-20 flex flex-col items-center justify-center">
                  <RefreshCw className="animate-spin text-slate-400 mb-2" size={24} />
                  <p className="text-xs text-slate-500 font-mono">Re-indexing log indexes...</p>
                </div>
              ) : filteredLogs.length === 0 ? (
                <div className="py-20 text-center text-xs text-slate-500 font-mono">
                  No transaction audit logs found matching the current search parameters.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 overflow-y-auto max-h-[500px] text-xs">
                  {filteredLogs.map((log) => (
                    <div key={log.id} className="p-3.5 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono">
                      <div className="flex items-start space-x-3 flex-1 min-w-0">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase shrink-0 ${
                          log.type === 'download' 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-155' 
                            : log.type.startsWith('login') 
                            ? 'bg-blue-50 text-blue-700 border border-blue-155'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}>
                          {log.type}
                        </span>
                        
                        <div className="min-w-0 flex-1">
                          <p className="text-slate-800 font-semibold truncate leading-normal">{log.details}</p>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-[10px] text-slate-400">
                            <span className="flex items-center space-x-1">
                              <Clock size={10} />
                              <span>{formatDate(log.timestamp)}</span>
                            </span>
                            <span>•</span>
                            <span>IP: {log.ip || 'Local/Service'}</span>
                            {log.agentCode && (
                              <>
                                <span>•</span>
                                <span className="text-slate-500 font-bold">Agent: {log.agentCode}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => setSelectedLogForDetails(log)}
                        className="self-end sm:self-center px-2.5 py-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 rounded-lg text-[10px] font-bold cursor-pointer transition-colors"
                      >
                        Details
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==========================================
            TAB CONTENT: AGENTS DIRECTORY (CRUD)
            ========================================== */}
        {activeTab === 'agents' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-display font-bold text-lg text-slate-900 leading-tight">Agent Personnel Roster</h3>
                <p className="text-xs text-slate-500 mt-0.5">Define unique operational codes and registered keys for validation checks.</p>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
                  <input
                    type="text"
                    placeholder="Search by name, code, phone..."
                    value={agentSearch}
                    onChange={(e) => setAgentSearch(e.target.value)}
                    className="pl-8 pr-3 py-1.5 w-60 bg-white border border-slate-250 rounded-lg text-xs outline-none focus:border-slate-400"
                  />
                </div>

                <button
                  onClick={openAddAgent}
                  className="flex items-center space-x-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold shadow-none cursor-pointer"
                >
                  <Plus size={14} />
                  <span>Register Agent</span>
                </button>
              </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-6 items-start">
              
              {/* Roster Directory Table with Pagination Controls */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 flex-1 w-full flex flex-col justify-between">
                
                {loadingAgents ? (
                  <div className="py-20 flex flex-col items-center justify-center">
                    <RefreshCw className="animate-spin text-slate-400 mb-2" size={24} />
                    <p className="text-xs text-slate-500 font-mono">Indexing agent catalog...</p>
                  </div>
                ) : paginatedAgents.length === 0 ? (
                  <div className="py-20 text-center text-xs text-slate-500 font-mono">
                    No active agent records found matching your query criteria.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-400 font-mono font-bold uppercase tracking-wider">
                          <th className="pb-3 px-2">Code</th>
                          <th className="pb-3 px-2">Personnel Name</th>
                          <th className="pb-3 px-2">Registered Phone</th>
                          <th className="pb-3 px-2">Validation Status</th>
                          <th className="pb-3 px-2 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {paginatedAgents.map((agent) => (
                          <tr key={agent.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-3.5 px-2 font-mono font-bold text-slate-900 text-xs">
                              {agent.code}
                            </td>
                            <td className="py-3.5 px-2">
                              <p className="font-bold text-slate-800 leading-tight">{agent.name}</p>
                              <p className="text-[10px] text-slate-400 mt-0.5 font-mono">Added {formatDate(agent.createdAt)}</p>
                            </td>
                            <td className="py-3.5 px-2 font-mono text-slate-600">
                              {agent.phone}
                            </td>
                            <td className="py-3.5 px-2">
                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                agent.status === 'active' 
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-150' 
                                  : 'bg-red-50 text-red-700 border border-red-150'
                              }`}>
                                {agent.status}
                              </span>
                            </td>
                            <td className="py-3.5 px-2 text-right space-x-1">
                              <button
                                onClick={() => openEditAgent(agent)}
                                className="p-1 text-slate-500 hover:text-slate-900 rounded-md hover:bg-slate-100 transition-colors inline-block cursor-pointer"
                                title="Edit"
                              >
                                <Edit2 size={13} />
                              </button>
                              <button
                                onClick={() => handleDeleteAgent(agent.id, agent.name)}
                                className="p-1 text-slate-500 hover:text-red-600 rounded-md hover:bg-slate-100 transition-colors inline-block cursor-pointer"
                                title="Delete"
                              >
                                <Trash2 size={13} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Table-based Pagination Controls (Max 100 per page) */}
                {!loadingAgents && filteredAgents.length > 0 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-150 mt-4">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 font-mono">
                      <span>Rows per page:</span>
                      <select
                        value={agentPerPage}
                        onChange={(e) => {
                          setAgentPerPage(Number(e.target.value));
                          setAgentPage(1);
                        }}
                        className="px-2 py-1 border border-slate-200 rounded-lg bg-white outline-none focus:border-slate-400 text-xs font-semibold"
                      >
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                      </select>
                      <span className="ml-2 font-medium text-slate-500">
                        Showing {(agentPage - 1) * agentPerPage + 1} to {Math.min(agentPage * agentPerPage, filteredAgents.length)} of {filteredAgents.length} agents
                      </span>
                    </div>

                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => setAgentPage(prev => Math.max(prev - 1, 1))}
                        disabled={agentPage === 1}
                        className="px-2.5 py-1.5 border border-slate-250 text-slate-600 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:bg-slate-50 text-[11px] font-bold rounded-lg cursor-pointer disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      
                      {Array.from({ length: totalAgentPages }).map((_, idx) => {
                        const pageNum = idx + 1;
                        if (totalAgentPages <= 5 || pageNum === 1 || pageNum === totalAgentPages || Math.abs(pageNum - agentPage) <= 1) {
                          return (
                            <button
                              key={pageNum}
                              onClick={() => setAgentPage(pageNum)}
                              className={`px-3 py-1.5 text-[11px] font-bold rounded-lg cursor-pointer ${
                                agentPage === pageNum
                                  ? 'bg-slate-900 text-white border border-slate-900'
                                  : 'bg-white border border-slate-250 text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        } else if (pageNum === 2 || pageNum === totalAgentPages - 1) {
                          return <span key={pageNum} className="text-slate-400 text-xs px-1 font-mono">...</span>;
                        }
                        return null;
                      })}

                      <button
                        onClick={() => setAgentPage(prev => Math.min(prev + 1, totalAgentPages))}
                        disabled={agentPage === totalAgentPages}
                        className="px-2.5 py-1.5 border border-slate-250 text-slate-600 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:bg-slate-50 text-[11px] font-bold rounded-lg cursor-pointer disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* CSV/XLS Roster spreadsheet import */}
              <div className="bg-white border border-slate-200 p-5 rounded-xl w-full lg:w-96 shrink-0 flex flex-col justify-between">
                <div>
                  <h3 className="font-display font-bold text-sm text-slate-800 flex items-center gap-1.5">
                    <FileSpreadsheet className="text-emerald-600" size={18} />
                    <span>Roster Bulk Import</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Upload a roster spreadsheet (.xlsx, .xls, or .csv) to batch import agents. Existing codes are updated, and new records are instantly registered.
                  </p>

                  <div className="mt-4 border border-dashed border-slate-250 rounded-lg p-5 text-center hover:border-slate-400 transition-colors relative bg-slate-50">
                    <input
                      id="agent-excel-upload"
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleSpreadsheetChange}
                      className="absolute inset-0 opacity-0 cursor-pointer font-bold"
                      disabled={importing}
                    />
                    <Upload className="mx-auto text-slate-400 mb-2" size={24} />
                    <p className="text-[11px] font-semibold text-slate-700">
                      {spreadsheetFile ? spreadsheetFile.name : 'Choose spreadsheet file'}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1">Accepts CSV, XLSX, XLS formats</p>
                  </div>

                  <button
                    onClick={downloadCsvTemplate}
                    className="mt-3.5 flex items-center justify-center space-x-1 text-xs text-slate-600 hover:text-slate-900 mx-auto font-bold cursor-pointer bg-transparent border-0"
                  >
                    <Download size={12} />
                    <span>Download CSV Import Template</span>
                  </button>

                  {importResult && (
                    <div className={`mt-4 p-3.5 rounded-lg text-xs border ${
                      importResult.success 
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-150' 
                        : 'bg-red-50 text-red-800 border-red-150'
                    }`}>
                      {importResult.success ? (
                        <div>
                          <p className="font-bold flex items-center gap-1">
                            <CheckCircle size={13} className="text-emerald-600" />
                            <span>Import Processing Success</span>
                          </p>
                          <p className="mt-1 leading-relaxed">
                            Successfully added <strong>{importResult.createdCount}</strong> records, and updated <strong>{importResult.updatedCount}</strong> credentials.
                          </p>
                        </div>
                      ) : (
                        <div>
                          <p className="font-bold flex items-center gap-1">
                            <AlertCircle size={13} className="text-red-600" />
                            <span>Roster Processing Failure</span>
                          </p>
                          <p className="mt-1 leading-normal text-red-700 font-medium">{importResult.error}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="mt-5 pt-4 border-t border-slate-100">
                  <button
                    onClick={handleSpreadsheetImport}
                    disabled={!spreadsheetFile || importing}
                    className="w-full flex items-center justify-center space-x-2 py-2.5 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 disabled:bg-slate-200 disabled:text-slate-400 cursor-pointer disabled:cursor-not-allowed"
                  >
                    {importing ? (
                      <>
                        <RefreshCw size={13} className="animate-spin" />
                        <span>Processing spreadsheet...</span>
                      </>
                    ) : (
                      <>
                        <FileSpreadsheet size={13} />
                        <span>Execute Bulk Import</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==========================================
            TAB CONTENT: APK PACKAGES LIST
            ========================================== */}
        {activeTab === 'apks' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display font-bold text-lg text-slate-900">Registered Installation Binaries</h3>
                <p className="text-xs text-slate-500 mt-0.5 font-mono">Master directory for distributed Android .apk release blocks.</p>
              </div>
              <button
                onClick={() => {
                  setApkFile(null);
                  setApkForm({ name: '', version: '', description: '', allowOldVersions: true });
                  setApkFormError(null);
                  setShowApkModal(true);
                }}
                className="flex items-center space-x-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold cursor-pointer"
              >
                <Plus size={14} />
                <span>Publish Package</span>
              </button>
            </div>

            {loadingApks ? (
              <div className="bg-white border border-slate-200 rounded-xl py-20 flex flex-col items-center justify-center">
                <RefreshCw className="animate-spin text-slate-400 mb-2" size={24} />
                <p className="text-xs text-slate-500 font-mono">Indexing binaries repo...</p>
              </div>
            ) : apks.length === 0 ? (
              <div className="bg-white border border-dashed border-slate-250 rounded-xl py-16 text-center">
                <Upload className="mx-auto text-slate-300 mb-3" size={32} />
                <h4 className="font-display font-bold text-sm text-slate-800">No Binaries Distributed</h4>
                <p className="text-xs text-slate-500 mt-1">You have not registered or uploaded any APK files yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {apks.map((apk) => (
                  <div key={apk.id} className="bg-white border border-[#e4e6eb] rounded-xl p-5 flex flex-col justify-between shadow-sm hover:border-[#ccd0d5] transition-all duration-150">
                    <div>
                      <div className="flex items-start justify-between">
                        <span className="bg-[#e7f3ff] text-[#1877F2] border border-transparent px-2 py-0.5 rounded text-[10px] font-bold font-mono">
                          v{apk.version}
                        </span>
                        <div className="flex items-center space-x-1.5">
                          {/* Active/Inactive toggler button */}
                          <button
                            onClick={() => handleToggleApkStatus(apk.id, apk.status)}
                            className={`px-2 py-0.5 text-[10px] font-bold rounded-lg border cursor-pointer transition-all ${
                              apk.status === 'inactive'
                                ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
                                : 'bg-[#e7f3ff] text-[#1877F2] border-transparent hover:bg-blue-100'
                            }`}
                            title={`Toggle version availability. Currently: ${apk.status || 'active'}`}
                          >
                            {(apk.status || 'active') === 'active' ? 'Active' : 'Inactive'}
                          </button>

                          <button
                            onClick={() => handleDeleteApk(apk.id, apk.name)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200 cursor-pointer"
                            title="Wipe binary package"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      <h4 className="font-display font-bold text-base text-slate-900 mt-3">{apk.name}</h4>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">{apk.filename}</p>

                      <p className="text-xs text-slate-600 mt-3 leading-relaxed whitespace-pre-wrap line-clamp-3">
                        {apk.description || 'No release instructions provided.'}
                      </p>
                    </div>

                    <div className="mt-5 pt-4 border-t border-[#e4e6eb] flex items-center justify-between text-[10px] font-mono text-[#65676b]">
                      <div className="flex flex-col gap-0.5">
                        <span>Size: {formatBytes(apk.size)}</span>
                        <span>Date: {formatDate(apk.uploadedAt)}</span>
                        <span>
                          Show Old: {apk.allowOldVersions !== false ? 'Yes' : 'No'}
                        </span>
                      </div>

                      <div className="flex items-center space-x-1 bg-[#F0F2F5] text-[#1c1e21] font-bold px-2 py-1 rounded-lg border border-[#e4e6eb] text-[10px]">
                        <Download size={10} className="text-[#1877F2]" />
                        <span>{apk.downloadsCount} dl</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ==========================================
            TAB CONTENT: ANNOUNCEMENTS BULLETIN
            ========================================== */}
        {activeTab === 'announcements' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Create bulletin form */}
            <div className="bg-white border border-slate-200 p-5 rounded-xl flex flex-col justify-between lg:col-span-1">
              <div>
                <h3 className="font-display font-bold text-sm text-slate-800 flex items-center gap-1.5">
                  <Megaphone className="text-slate-800" size={18} />
                  <span>Publish Alert Announcement</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed mb-4">
                  Publish text bulletins or advisory alerts that will show on active personnel dashboards instantly.
                </p>

                <form onSubmit={handleAnnouncementSubmit} className="space-y-4">
                  {announcementError && (
                    <div className="p-3 bg-red-50 text-red-800 text-xs rounded-xl border border-red-150 flex items-start space-x-1.5">
                      <AlertCircle size={13} className="shrink-0 mt-0.5 text-red-600" />
                      <span>{announcementError}</span>
                    </div>
                  )}

                  <div>
                    <label htmlFor="announcement-title" className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Title Title
                    </label>
                    <input
                      id="announcement-title"
                      type="text"
                      placeholder="e.g., POS Upgrade Notice"
                      value={updateForm.title}
                      onChange={(e) => setUpdateForm(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full px-3 py-2 bg-white border border-slate-250 text-slate-900 placeholder-slate-400 text-xs rounded-lg outline-none focus:border-slate-400 font-semibold"
                    />
                  </div>

                  <div>
                    <label htmlFor="announcement-version" className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      App Version Context (Optional)
                    </label>
                    <input
                      id="announcement-version"
                      type="text"
                      placeholder="e.g., 1.14"
                      value={updateForm.version}
                      onChange={(e) => setUpdateForm(prev => ({ ...prev, version: e.target.value }))}
                      className="w-full px-3 py-2 bg-white border border-slate-250 text-slate-900 placeholder-slate-400 text-xs rounded-lg outline-none focus:border-slate-400 font-bold font-mono"
                    />
                  </div>

                  <div>
                    <label htmlFor="announcement-description" className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Bulletin Content
                    </label>
                    <textarea
                      id="announcement-description"
                      rows={4}
                      placeholder="Enter the alert instructions..."
                      value={updateForm.description}
                      onChange={(e) => setUpdateForm(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full px-3 py-2 bg-white border border-slate-250 text-slate-900 placeholder-slate-400 text-xs rounded-lg outline-none focus:border-slate-400 font-semibold resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={postingAnnouncement}
                    className="w-full py-2.5 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    {postingAnnouncement ? 'Publishing Notice...' : 'Publish Announcement'}
                  </button>
                </form>
              </div>
            </div>

            {/* List announcements */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-bold text-sm uppercase tracking-wider text-slate-500">Announcements Ledger</h3>
                <span className="text-xs text-slate-500 font-mono font-bold">{systemUpdates.length} Bulletins</span>
              </div>

              {loadingUpdates ? (
                <div className="bg-white border border-slate-200 rounded-xl py-20 flex flex-col items-center justify-center">
                  <RefreshCw className="animate-spin text-slate-400 mb-2" size={24} />
                  <p className="text-xs text-slate-500 font-mono">Indexing bulletins...</p>
                </div>
              ) : systemUpdates.length === 0 ? (
                <div className="bg-white border border-dashed border-slate-250 rounded-xl py-16 text-center text-xs text-slate-500 font-mono">
                  No active bulletins or outage schedules posted to the directory.
                </div>
              ) : (
                <div className="space-y-3">
                  {systemUpdates.map((update) => (
                    <div key={update.id} className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h4 className="font-bold text-sm text-slate-900 leading-snug">{update.title}</h4>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">Posted {formatDate(update.timestamp)}</p>
                        </div>
                        <div className="flex items-center space-x-1.5">
                          {update.version && (
                            <span className="bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold text-slate-600">
                              Ver {update.version}
                            </span>
                          )}
                          <button
                            onClick={() => handleDeleteAnnouncement(update.id)}
                            className="p-1 text-slate-400 hover:text-red-650 hover:bg-slate-50 rounded-lg border border-slate-200 cursor-pointer"
                            title="Retract bulletin"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-slate-600 mt-3 leading-relaxed whitespace-pre-wrap">{update.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

        {activeTab === 'supabase' && (
          <div className="space-y-6">
            
            {/* Header / Intro card */}
            <div className="bg-white border border-slate-200 p-6 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h3 className="font-display font-bold text-lg text-slate-900 flex items-center gap-2">
                  <Database className="text-slate-800" size={20} />
                  <span>Supabase Backend Sync Engine</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed max-w-2xl">
                  This administration panel connects directly with your external Supabase PostgreSQL database. It automatically synchronizes personnel registries, release binaries metadata, activity logs, and advisories to the cloud while keeping a resilient local database fallback copy.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleSupabaseSync}
                  disabled={syncingSupabase}
                  className="flex items-center space-x-1.5 px-4.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white transition-colors text-xs font-bold cursor-pointer disabled:bg-slate-400"
                >
                  <RefreshCw className={`shrink-0 ${syncingSupabase ? 'animate-spin' : ''}`} size={13} />
                  <span>{syncingSupabase ? 'Syncing...' : 'Force Global Sync'}</span>
                </button>
              </div>
            </div>

            {/* Sync Diagnostics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Left Column: Diagnostics status */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between md:col-span-1">
                <div>
                  <h4 className="font-display font-bold text-xs uppercase tracking-wider text-slate-500 mb-4">Connection Diagnostics</h4>
                  
                  {loadingSupabase ? (
                    <div className="py-12 flex flex-col items-center justify-center">
                      <RefreshCw className="animate-spin text-slate-400 mb-2" size={20} />
                      <p className="text-xs text-slate-500 font-mono">Pinging cloud database...</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Connection status card */}
                      <div className={`p-4 rounded-xl border flex items-center gap-3 ${
                        supabaseStatus?.status?.connected 
                          ? 'bg-emerald-50 border-emerald-150 text-emerald-800' 
                          : 'bg-slate-50 border-slate-200 text-slate-600'
                      }`}>
                        {supabaseStatus?.status?.connected ? (
                          <>
                            <div className="bg-emerald-500 text-white p-1.5 rounded-full">
                              <Check size={16} />
                            </div>
                            <div>
                              <p className="text-xs font-bold">Supabase Connected</p>
                              <p className="text-[10px] opacity-80 font-mono mt-0.5">Host Status: Ready</p>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="bg-slate-400 text-white p-1.5 rounded-full">
                              <AlertCircle size={16} />
                            </div>
                            <div>
                              <p className="text-xs font-bold">Local Off-Grid Mode</p>
                              <p className="text-[10px] opacity-80 font-mono mt-0.5">Could not reach cloud API</p>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Sync logs info */}
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5 text-xs font-mono">
                        <div className="flex justify-between border-b border-slate-150 pb-2">
                          <span className="text-slate-400">Database Engine</span>
                          <span className="font-bold text-slate-700">PostgreSQL</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-150 pb-2">
                          <span className="text-slate-400">Sync Interval</span>
                          <span className="font-bold text-slate-700">15s Auto</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-150 pb-2">
                          <span className="text-slate-400">Last Sync</span>
                          <span className="font-bold text-slate-700">
                            {supabaseStatus?.status?.lastSyncTime 
                              ? new Date(supabaseStatus.status.lastSyncTime).toLocaleTimeString() 
                              : 'Pending First Sync'}
                          </span>
                        </div>
                        {supabaseStatus?.status?.syncError && (
                          <div className="pt-2 text-[10px] text-red-650 leading-normal break-words font-semibold">
                            <span className="font-bold">Error:</span> {supabaseStatus.status.syncError}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-4 mt-4 border-t border-slate-100">
                  <p className="text-[10px] text-slate-400 leading-relaxed font-mono">
                    * If you introduce any changes via this Admin panel, they are instantly streamed to Supabase in a non-blocking background transaction.
                  </p>
                </div>
              </div>

              {/* Right Column: Schema Table Synchronizer Status */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 md:col-span-2 flex flex-col justify-between">
                <div>
                  <h4 className="font-display font-bold text-xs uppercase tracking-wider text-slate-500 mb-4">Table Synchronization Status</h4>
                  
                  {loadingSupabase ? (
                    <div className="py-16 flex flex-col items-center justify-center">
                      <RefreshCw className="animate-spin text-slate-400 mb-2" size={24} />
                      <p className="text-xs text-slate-500 font-mono">Querying relation catalogs...</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* 1. Agents table status */}
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col justify-between h-28">
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-[10px] font-bold text-slate-450 uppercase font-mono tracking-wider">Table Relation</span>
                            <h5 className="font-display font-bold text-sm text-slate-800">agents</h5>
                          </div>
                          {supabaseStatus?.status?.agents ? (
                            <span className="bg-emerald-50 text-emerald-700 border border-emerald-150 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              Active
                            </span>
                          ) : (
                            <span className="bg-amber-50 text-amber-750 border border-amber-150 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                              Missing
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500 leading-snug">
                          Stores registered operational codes, names, phone numbers, and status.
                        </p>
                      </div>

                      {/* 2. APKs table status */}
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col justify-between h-28">
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-[10px] font-bold text-slate-450 uppercase font-mono tracking-wider">Table Relation</span>
                            <h5 className="font-display font-bold text-sm text-slate-800">apks</h5>
                          </div>
                          {supabaseStatus?.status?.apks ? (
                            <span className="bg-emerald-50 text-emerald-700 border border-emerald-150 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              Active
                            </span>
                          ) : (
                            <span className="bg-amber-50 text-amber-750 border border-amber-150 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                              Missing
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500 leading-snug">
                          Logs published package metadata including file size, download counts, and release version history.
                        </p>
                      </div>

                      {/* 3. System Updates table status */}
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col justify-between h-28">
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-[10px] font-bold text-slate-450 uppercase font-mono tracking-wider">Table Relation</span>
                            <h5 className="font-display font-bold text-sm text-slate-800 font-bold">system_updates</h5>
                          </div>
                          {supabaseStatus?.status?.systemUpdates ? (
                            <span className="bg-emerald-50 text-emerald-700 border border-emerald-150 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              Active
                            </span>
                          ) : (
                            <span className="bg-amber-50 text-amber-750 border border-amber-150 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                              Missing
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500 leading-snug">
                          Handles real-time advisory alerts and maintenance notices published on active personnel feeds.
                        </p>
                      </div>

                      {/* 4. Logs table status */}
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col justify-between h-28">
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-[10px] font-bold text-slate-450 uppercase font-mono tracking-wider">Table Relation</span>
                            <h5 className="font-display font-bold text-sm text-slate-800">logs</h5>
                          </div>
                          {supabaseStatus?.status?.logs ? (
                            <span className="bg-emerald-50 text-emerald-700 border border-emerald-150 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              Active
                            </span>
                          ) : (
                            <span className="bg-amber-50 text-amber-750 border border-amber-150 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                              Missing
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500 leading-snug">
                          Audits system access logs, failed authorization logs, downloads activity, and administrative changes.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {!loadingSupabase && (
                  <div className="mt-4 pt-3.5 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-500 leading-normal font-mono text-[10px]">
                    <span className="flex items-center gap-1 text-slate-450 font-sans">
                      <Shield className="text-slate-400 shrink-0" size={13} />
                      Bypasses Row Level Security (RLS) safely via administrative backchannel.
                    </span>
                    {(!supabaseStatus?.status?.agents || !supabaseStatus?.status?.apks || !supabaseStatus?.status?.logs || !supabaseStatus?.status?.systemUpdates) && (
                      <span className="text-amber-800 bg-amber-50 border border-amber-150 px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 text-[11px] font-sans">
                        <AlertTriangle size={12} className="shrink-0 text-amber-600" />
                        Some tables are missing. Copy SQL script below to provision.
                      </span>
                    )}
                  </div>
                )}
              </div>

            </div>

            {/* Schema Setup SQL Script Copy/Paste Panel */}
            {supabaseStatus?.schemaSql && (
              <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="font-display font-bold text-sm text-slate-800 flex items-center gap-1.5">
                      <Server className="text-slate-800" size={16} />
                      <span>Supabase SQL Bootstrapper Script</span>
                    </h4>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      If you are setting up this Supabase database for the first time, copy this standard SQL script and run it inside the <strong>SQL Editor</strong> page on your Supabase project dashboard.
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(supabaseStatus.schemaSql);
                      setCopiedSql(true);
                      setTimeout(() => setCopiedSql(false), 2000);
                    }}
                    className={`flex items-center space-x-1 px-3.5 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                      copiedSql 
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800' 
                        : 'bg-white hover:bg-slate-50 border-slate-250 text-slate-700'
                    }`}
                  >
                    {copiedSql ? (
                      <>
                        <Check size={12} />
                        <span>SQL Copied!</span>
                      </>
                    ) : (
                      <>
                        <FileText size={12} />
                        <span>Copy SQL Script</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="relative">
                  <pre className="bg-slate-900 text-slate-300 text-[10.5px] font-mono leading-relaxed p-4 rounded-xl border border-slate-800 overflow-x-auto max-h-72 select-all scrollbar-thin">
                    {supabaseStatus.schemaSql}
                  </pre>
                </div>
              </div>
            )}

          </div>
        )}

      </main>

      {/* ==========================================
          MODALS & INSPECTOR OVERLAYS
          ========================================== */}

      {/* 1. AGENT MODAL (ADD / EDIT) */}
      {showAgentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 shadow-xl rounded-2xl p-6 w-full max-w-md relative">
            <button
              onClick={() => setShowAgentModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X size={18} />
            </button>

            <h3 className="font-display font-bold text-lg text-slate-900 flex items-center gap-1.5 mb-4">
              <Users className="text-slate-800" size={18} />
              <span>{editingAgent ? 'Edit Agent Personnel' : 'Register New Agent'}</span>
            </h3>

            {agentFormError && (
              <div className="mb-4 p-3 bg-red-50 text-red-800 text-xs rounded-xl border border-red-150 flex items-start space-x-1.5">
                <AlertCircle size={13} className="shrink-0 mt-0.5 text-red-600" />
                <span>{agentFormError}</span>
              </div>
            )}

            <form onSubmit={handleAgentSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Agent Operational Code
                </label>
                <input
                  type="text"
                  placeholder="e.g., AGT099"
                  disabled={!!editingAgent}
                  value={agentForm.code}
                  onChange={(e) => setAgentForm(prev => ({ ...prev, code: e.target.value }))}
                  className="w-full px-3 py-2 bg-white border border-slate-250 text-slate-900 text-xs font-bold font-mono uppercase rounded-lg outline-none focus:border-slate-400 disabled:bg-slate-100 disabled:text-slate-400"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Full Name Name
                </label>
                <input
                  type="text"
                  placeholder="e.g., Kaung Htet Aung"
                  value={agentForm.name}
                  onChange={(e) => setAgentForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 bg-white border border-slate-250 text-slate-900 text-xs font-semibold rounded-lg outline-none focus:border-slate-400"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Registered Mobile Phone
                </label>
                <input
                  type="text"
                  placeholder="e.g., 0912345678"
                  value={agentForm.phone}
                  onChange={(e) => setAgentForm(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-3 py-2 bg-white border border-slate-250 text-slate-900 text-xs font-bold font-mono rounded-lg outline-none focus:border-slate-400"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Validation Status
                </label>
                <div className="flex space-x-2 mt-1">
                  <button
                    type="button"
                    onClick={() => setAgentForm(prev => ({ ...prev, status: 'active' }))}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                      agentForm.status === 'active'
                        ? 'bg-emerald-55 border-emerald-400 text-emerald-800'
                        : 'bg-white border-slate-200 text-slate-500'
                    }`}
                  >
                    Active
                  </button>
                  <button
                    type="button"
                    onClick={() => setAgentForm(prev => ({ ...prev, status: 'inactive' }))}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                      agentForm.status === 'inactive'
                        ? 'bg-red-55 border-red-400 text-red-800'
                        : 'bg-white border-slate-200 text-slate-500'
                    }`}
                  >
                    Inactive
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={submittingAgent}
                className="w-full py-2.5 mt-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                {submittingAgent ? 'Saving Details...' : editingAgent ? 'Save Changes' : 'Register Agent'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 2. APK UPLOAD MODAL */}
      {showApkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 shadow-xl rounded-2xl p-6 w-full max-w-md relative">
            <button
              onClick={() => setShowApkModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X size={18} />
            </button>

            <h3 className="font-display font-bold text-lg text-slate-900 flex items-center gap-1.5 mb-4">
              <Download className="text-slate-850" size={18} />
              <span>Publish APK Package</span>
            </h3>

            {apkFormError && (
              <div className="mb-4 p-3 bg-red-50 text-red-800 text-xs rounded-xl border border-red-150 flex items-start space-x-1.5">
                <AlertCircle size={13} className="shrink-0 mt-0.5 text-red-600" />
                <span>{apkFormError}</span>
              </div>
            )}

            <form onSubmit={handleApkSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  File Binary Source (.apk)
                </label>
                <div className="border border-dashed border-slate-250 bg-slate-50 p-4 rounded-xl text-center relative hover:border-slate-400 transition-colors">
                  <input
                    ref={apkFileInputRef}
                    type="file"
                    accept=".apk"
                    onChange={handleApkFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer font-bold"
                  />
                  <Upload className="mx-auto text-slate-400 mb-1" size={20} />
                  <p className="text-[11px] font-semibold text-slate-700">
                    {apkFile ? apkFile.name : 'Select physical APK bundle'}
                  </p>
                  <p className="text-[9px] text-slate-450">Only verified Android APK structures are accepted</p>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  App Label Name
                </label>
                <input
                  type="text"
                  placeholder="e.g., POS Agent Portal"
                  value={apkForm.name}
                  onChange={(e) => setApkForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 bg-white border border-slate-250 text-slate-900 text-xs font-semibold rounded-lg outline-none focus:border-slate-400"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Release Version
                </label>
                <input
                  type="text"
                  placeholder="e.g., 2.4.1"
                  value={apkForm.version}
                  onChange={(e) => setApkForm(prev => ({ ...prev, version: e.target.value }))}
                  className="w-full px-3 py-2 bg-white border border-slate-250 text-slate-900 text-xs font-bold font-mono rounded-lg outline-none focus:border-slate-400"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Change History / Notes
                </label>
                <textarea
                  rows={3}
                  placeholder="Describe bug fixes or deployment advisories here..."
                  value={apkForm.description}
                  onChange={(e) => setApkForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 bg-white border border-slate-250 text-slate-900 text-xs font-medium rounded-lg outline-none focus:border-slate-400 resize-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Historical Version Control
                </label>
                <div className="flex items-start space-x-2.5 bg-slate-50 border border-slate-200 p-3 rounded-xl">
                  <input
                    id="apk-allow-old"
                    type="checkbox"
                    checked={apkForm.allowOldVersions}
                    onChange={(e) => setApkForm(prev => ({ ...prev, allowOldVersions: e.target.checked }))}
                    className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-950 mt-0.5 cursor-pointer"
                  />
                  <div>
                    <label htmlFor="apk-allow-old" className="text-xs font-bold text-slate-800 cursor-pointer block select-none">
                      Show historical versions in catalog
                    </label>
                    <span className="text-[10px] text-slate-500 block leading-tight mt-0.5">
                      If unchecked, older versions of this app are hidden from public downloads.
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={uploadingApk}
                className="w-full py-2.5 mt-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                {uploadingApk ? 'Transmitting bundle...' : 'Publish Package'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 3. LOGS DETAILS INSPECTOR MODAL */}
      {selectedLogForDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white border border-slate-200 shadow-xl rounded-2xl p-6 w-full max-w-lg relative">
            <button
              onClick={() => setSelectedLogForDetails(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer animate-none"
            >
              <X size={18} />
            </button>

            <h3 className="font-display font-bold text-base text-slate-900 flex items-center gap-1.5 mb-4 border-b border-slate-100 pb-2">
              <FileText className="text-slate-700" size={16} />
              <span>Audit Ledger Details</span>
            </h3>

            <div className="space-y-3.5 text-xs font-mono">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="font-bold text-slate-400 uppercase tracking-wider">Log UID</span>
                <span className="text-slate-700 font-bold select-all">{selectedLogForDetails.id}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="font-bold text-slate-400 uppercase tracking-wider">Timestamp</span>
                <span className="text-slate-700 font-bold">{new Date(selectedLogForDetails.timestamp).toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="font-bold text-slate-400 uppercase tracking-wider">Event Class</span>
                <span className="px-1.5 py-0.2 rounded font-bold uppercase bg-slate-100 border border-slate-200 text-slate-700 text-[10px]">
                  {selectedLogForDetails.type}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="font-bold text-slate-400 uppercase tracking-wider">Agent Code</span>
                <span className="text-slate-800 font-bold">{selectedLogForDetails.agentCode || 'System / Admin'}</span>
              </div>
              {selectedLogForDetails.phone && (
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="font-bold text-slate-400 uppercase tracking-wider">Credentials Phone</span>
                  <span className="text-slate-800 font-bold">{selectedLogForDetails.phone}</span>
                </div>
              )}
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="font-bold text-slate-400 uppercase tracking-wider">Network Host Address</span>
                <span className="text-slate-800 font-bold">{selectedLogForDetails.ip || 'Local Network Address'}</span>
              </div>
              <div className="py-2.5 flex flex-col gap-1.5">
                <span className="font-bold text-slate-400 uppercase tracking-wider">Detailed Narrative Log</span>
                <p className="bg-slate-50 border border-slate-200 p-3 rounded-lg text-slate-800 font-semibold leading-relaxed whitespace-pre-wrap select-all">
                  {selectedLogForDetails.details}
                </p>
              </div>
            </div>

            <button
              onClick={() => setSelectedLogForDetails(null)}
              className="w-full py-2.5 mt-4 bg-slate-900 hover:bg-slate-850 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Acknowledge Record
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
