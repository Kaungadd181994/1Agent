export interface Agent {
  id: string;
  code: string;
  phone: string;
  name: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface ApkFile {
  id: string;
  filename: string;
  name: string;
  version: string;
  size: number;
  description: string;
  downloadsCount: number;
  uploadedAt: string;
  allowOldVersions?: boolean;
}

export interface ActivityLog {
  id: string;
  type: 'login_success' | 'login_failed' | 'download' | 'agent_created' | 'agent_updated' | 'agent_deleted' | 'apk_uploaded' | 'apk_deleted' | 'system_update_created';
  timestamp: string;
  agentCode?: string;
  phone?: string;
  details: string;
  ip?: string;
}

export interface SystemUpdate {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  version?: string;
}

export interface DashboardStats {
  totalAgents: number;
  activeAgents: number;
  totalApks: number;
  totalDownloads: number;
  recentLogs: ActivityLog[];
}
