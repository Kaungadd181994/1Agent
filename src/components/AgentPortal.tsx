import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  LogOut, 
  Download, 
  AlertCircle, 
  User, 
  Phone, 
  RefreshCw,
  Smartphone
} from 'lucide-react';
import { Agent, ApkFile } from '../types';

interface AgentPortalProps {
  agent: Agent;
  onLogout: () => void;
}

export default function AgentPortal({ agent, onLogout }: AgentPortalProps) {
  const [apks, setApks] = useState<ApkFile[]>([]);
  const [loadingApks, setLoadingApks] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchApks = async () => {
    try {
      setLoadingApks(true);
      setError(null);
      const res = await fetch('/api/apks');
      if (res.ok) {
        const data = await res.json();
        setApks(data);
      } else {
        setError('Unable to query secure binaries from server.');
      }
    } catch (err) {
      console.error('Error fetching APKs:', err);
      setError('Connection failed. Please check your network and try again.');
    } finally {
      setLoadingApks(false);
    }
  };

  useEffect(() => {
    fetchApks();
  }, [agent]);

  const handleDownload = async (apk: ApkFile) => {
    try {
      setDownloadingId(apk.id);
      setError(null);

      // Create download URL
      const downloadUrl = `/api/apks/${apk.id}/download?agentCode=${encodeURIComponent(agent.code)}&phone=${encodeURIComponent(agent.phone)}`;
      
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', apk.filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Simulate download connection handshake
      setTimeout(() => {
        setDownloadingId(null);
        fetchApks();
      }, 1500);

    } catch (err: any) {
      console.error('Download failed', err);
      setError('The server was unable to stream the APK package. Please contact administration.');
      setDownloadingId(null);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = 2;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div id="agent-portal-root" className="min-h-screen bg-slate-50 text-slate-800 flex flex-col antialiased">
      
      {/* Header Bar - Full Width, Edge to Edge */}
      <header id="agent-header" className="bg-white border-b border-slate-200/80 sticky top-0 z-40">
        <div className="w-full px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-slate-900 text-white p-2 rounded-xl flex items-center justify-center">
              <Smartphone size={20} />
            </div>
            <div>
              <h1 className="font-display font-bold text-base tracking-tight text-slate-900 leading-none">Agent Portal</h1>
              <p className="text-[10px] text-slate-500 font-mono mt-0.5">Secure Binaries Center</p>
            </div>
          </div>

          <button
            id="btn-logout"
            onClick={onLogout}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors text-xs font-semibold cursor-pointer"
          >
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Container - Responsive & Edge to Edge on Mobile */}
      <main className="flex-1 w-full max-w-full px-0 sm:px-6 lg:px-8 py-0 sm:py-6 flex flex-col gap-4">
        
        {/* Agent Information Header Block - Almost Flat, Less Shadow */}
        <div className="bg-white border-y sm:border border-slate-200/80 sm:rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="p-2.5 bg-slate-100 text-slate-700 rounded-xl border border-slate-200">
              <User size={20} />
            </div>
            <div>
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/50 mb-1">
                Verified Agent Connected
              </span>
              <h2 className="font-display font-bold text-lg text-slate-900 leading-tight">{agent.name}</h2>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-xs text-slate-500">
                <span className="flex items-center space-x-1">
                  <span className="font-semibold text-slate-400 font-mono text-[10px]">Code:</span>
                  <span className="bg-slate-100 border border-slate-200 px-1.5 py-0.2 rounded text-[10px] font-mono font-bold text-slate-800">{agent.code}</span>
                </span>
                <span className="text-slate-300">|</span>
                <span className="flex items-center space-x-1 font-mono text-[11px]">
                  <Phone size={11} className="text-slate-400" />
                  <span>{agent.phone}</span>
                </span>
              </div>
            </div>
          </div>
          
          <button
            onClick={fetchApks}
            className="self-end sm:self-center flex items-center space-x-1 px-3 py-1.5 text-xs text-slate-500 hover:text-slate-800 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 font-semibold cursor-pointer"
          >
            <RefreshCw size={12} className={loadingApks ? "animate-spin" : ""} />
            <span>Reload Repository</span>
          </button>
        </div>

        {error && (
          <div className="mx-4 sm:mx-0 p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-start space-x-2">
            <AlertCircle size={15} className="shrink-0 mt-0.5 text-red-500" />
            <span className="leading-relaxed font-medium">{error}</span>
          </div>
        )}

        {/* Centralized APK Catalog (No tabs, just clean application cards list!) */}
        <div className="px-4 sm:px-0 flex-1">
          <div className="flex items-center justify-between mb-4 mt-2">
            <h3 className="font-display font-bold text-sm uppercase tracking-wider text-slate-500">
              Available Binaries
            </h3>
            <span className="text-xs text-slate-500 font-mono font-bold">
              {apks.length} {apks.length === 1 ? 'Package' : 'Packages'}
            </span>
          </div>

          {loadingApks ? (
            <div className="bg-white border border-slate-200/80 rounded-2xl py-20 flex flex-col items-center justify-center text-center">
              <RefreshCw className="animate-spin text-slate-400 mb-3" size={28} />
              <p className="text-xs text-slate-500 font-medium">Streaming secure app catalogues...</p>
            </div>
          ) : apks.length === 0 ? (
            <div className="bg-white border border-slate-200/80 rounded-2xl py-16 text-center px-6">
              <Download className="mx-auto text-slate-300 mb-3" size={36} />
              <h4 className="font-display font-semibold text-sm text-slate-800">No Mobile Binaries Distributed</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                Operational files are being updated. Check back shortly or contact administration.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {apks.map((apk) => (
                <motion.div
                  key={apk.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-white border border-slate-200/80 sm:rounded-2xl p-5 flex flex-col justify-between hover:border-slate-350 transition-all duration-150 relative"
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <div className="bg-slate-100 text-slate-800 border border-slate-200 w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs font-mono">
                        APK
                      </div>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-900 text-white font-mono">
                        v{apk.version}
                      </span>
                    </div>

                    <h4 className="font-display font-bold text-base text-slate-900 mt-3.5">
                      {apk.name}
                    </h4>
                    
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5 select-all">
                      {apk.filename}
                    </p>

                    <p className="text-xs text-slate-600 mt-3.5 leading-relaxed whitespace-pre-wrap">
                      {apk.description || "No specific release instructions provided."}
                    </p>
                  </div>

                  <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] text-slate-400 font-mono">Size: {formatBytes(apk.size)}</span>
                      <span className="text-[10px] text-slate-400 font-mono">Date: {formatDate(apk.uploadedAt)}</span>
                    </div>

                    <button
                      id={`btn-download-${apk.id}`}
                      onClick={() => handleDownload(apk)}
                      disabled={downloadingId !== null}
                      className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        downloadingId === apk.id
                          ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                          : 'bg-slate-900 text-white hover:bg-slate-800 active:scale-97'
                      }`}
                    >
                      {downloadingId === apk.id ? (
                        <>
                          <RefreshCw size={12} className="animate-spin" />
                          <span>Preparing...</span>
                        </>
                      ) : (
                        <>
                          <Download size={12} />
                          <span>Download APK</span>
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200/80 py-5 text-center text-[10px] text-slate-400 font-mono">
        <div className="w-full px-4">
          <p>© 2026 Agent APK Portal. Authorized operational channels only.</p>
          <p className="mt-0.5 text-slate-350">Handshake authentication and download events are encrypted and logged.</p>
        </div>
      </footer>
    </div>
  );
}
