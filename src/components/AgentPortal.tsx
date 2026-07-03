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
    <div id="agent-portal-root" className="min-h-screen bg-[#F0F2F5] text-[#1c1e21] flex flex-col antialiased">
      
      {/* Header Bar - Full Width, Edge to Edge */}
      <header id="agent-header" className="bg-white border-b border-[#e4e6eb] sticky top-0 z-40">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-[#1877F2] text-white p-2 rounded-full flex items-center justify-center">
              <Smartphone size={18} />
            </div>
            <div>
              <h1 className="font-sans font-bold text-base tracking-tight text-[#1c1e21] leading-none">Agent Portal</h1>
              <p className="text-[10px] text-[#65676b] font-mono mt-0.5">Secure Binaries Center</p>
            </div>
          </div>

          <button
            id="btn-logout"
            onClick={onLogout}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-[#ccd0d5] hover:bg-[#F0F2F5] text-[#65676b] hover:text-[#1c1e21] transition-colors text-xs font-bold cursor-pointer animate-fade-in"
          >
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Container - Responsive & Edge to Edge on Mobile */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-4">
        
        {/* Agent Information Header Block - Almost Flat, Less Shadow */}
        <div className="bg-white border border-[#e4e6eb] rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center space-x-4">
            <div className="p-2.5 bg-[#e7f3ff] text-[#1877F2] rounded-full">
              <User size={20} />
            </div>
            <div>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-[#e7f3ff] text-[#1877F2] mb-1">
                Verified Agent Connected
              </span>
              <h2 className="font-sans font-bold text-lg text-[#1c1e21] leading-tight">{agent.name}</h2>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-xs text-[#65676b]">
                <span className="flex items-center space-x-1">
                  <span className="font-semibold text-[#65676b] font-mono text-[10px]">Code:</span>
                  <span className="bg-[#F0F2F5] border border-[#e4e6eb] px-1.5 py-0.2 rounded text-[10px] font-mono font-bold text-[#1c1e21]">{agent.code}</span>
                </span>
                <span className="text-[#ccd0d5]">|</span>
                <span className="flex items-center space-x-1 font-mono text-[11px]">
                  <Phone size={11} className="text-[#65676b]" />
                  <span>{agent.phone}</span>
                </span>
              </div>
            </div>
          </div>
          
          <button
            onClick={fetchApks}
            className="self-end sm:self-center flex items-center space-x-1 px-3 py-1.5 text-xs text-[#65676b] hover:text-[#1c1e21] border border-[#ccd0d5] rounded-lg bg-white hover:bg-[#F0F2F5] font-bold cursor-pointer transition-colors"
          >
            <RefreshCw size={12} className={loadingApks ? "animate-spin text-[#1877F2]" : ""} />
            <span>Reload Repository</span>
          </button>
        </div>

        {error && (
          <div className="p-4 bg-[#ffebe9] border border-[#ffc4c0] text-[#b30000] text-xs rounded-xl flex items-start space-x-2">
            <AlertCircle size={15} className="shrink-0 mt-0.5 text-[#ff4d4d]" />
            <span className="leading-relaxed font-medium">{error}</span>
          </div>
        )}

        {/* Centralized APK Catalog (No tabs, just clean application cards list!) */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-4 mt-2">
            <h3 className="font-sans font-bold text-xs uppercase tracking-wider text-[#65676b]">
              Available Binaries
            </h3>
            <span className="text-xs text-[#65676b] font-mono font-bold">
              {apks.length} {apks.length === 1 ? 'Package' : 'Packages'}
            </span>
          </div>

          {loadingApks ? (
            <div className="bg-white border border-[#e4e6eb] rounded-xl py-20 flex flex-col items-center justify-center text-center shadow-sm">
              <RefreshCw className="animate-spin text-[#1877F2] mb-3" size={28} />
              <p className="text-xs text-[#65676b] font-medium">Streaming secure app catalogues...</p>
            </div>
          ) : apks.length === 0 ? (
            <div className="bg-white border border-[#e4e6eb] rounded-xl py-16 text-center px-6 shadow-sm">
              <Download className="mx-auto text-[#ccd0d5] mb-3" size={36} />
              <h4 className="font-sans font-bold text-sm text-[#1c1e21]">No Mobile Binaries Distributed</h4>
              <p className="text-xs text-[#65676b] mt-1 max-w-xs mx-auto">
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
                  className="bg-white border border-[#e4e6eb] rounded-xl p-5 flex flex-col justify-between hover:border-[#ccd0d5] hover:shadow-md transition-all duration-150 relative shadow-sm"
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <div className="bg-[#e7f3ff] text-[#1877F2] w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xs font-mono">
                        APK
                      </div>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-[#1877F2] text-white font-mono">
                        v{apk.version}
                      </span>
                    </div>

                    <h4 className="font-sans font-bold text-base text-[#1c1e21] mt-3.5">
                      {apk.name}
                    </h4>
                    
                    <p className="text-[10px] text-[#8d949e] font-mono mt-0.5 select-all">
                      {apk.filename}
                    </p>

                    <p className="text-xs text-[#65676b] mt-3.5 leading-relaxed whitespace-pre-wrap">
                      {apk.description || "No specific release instructions provided."}
                    </p>
                  </div>

                  <div className="mt-5 pt-4 border-t border-[#e4e6eb] flex items-center justify-between">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] text-[#65676b] font-mono">Size: {formatBytes(apk.size)}</span>
                      <span className="text-[10px] text-[#65676b] font-mono">Date: {formatDate(apk.uploadedAt)}</span>
                    </div>

                    <button
                      id={`btn-download-${apk.id}`}
                      onClick={() => handleDownload(apk)}
                      disabled={downloadingId !== null}
                      className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-none ${
                        downloadingId === apk.id
                          ? 'bg-[#F0F2F5] text-[#8d949e] border border-[#ccd0d5] cursor-not-allowed'
                          : 'bg-[#1877F2] text-white hover:bg-[#166FE5] active:scale-97'
                      }`}
                    >
                      {downloadingId === apk.id ? (
                        <>
                          <RefreshCw size={12} className="animate-spin text-[#1877F2]" />
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
      <footer className="bg-white border-t border-[#e4e6eb] py-5 text-center text-[10px] text-[#65676b] font-mono">
        <div className="w-full px-4">
          <p>© 2026 Agent APK Portal. Authorized operational channels only.</p>
          <p className="mt-0.5 text-[#8d949e]">Handshake authentication and download events are encrypted and logged.</p>
        </div>
      </footer>
    </div>
  );
}
