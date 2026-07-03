import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Smartphone, 
  KeyRound, 
  ArrowRight, 
  ShieldCheck, 
  LogIn, 
  Lock, 
  AlertCircle,
  RefreshCw,
  Phone
} from 'lucide-react';
import AgentPortal from './components/AgentPortal';
import AdminPortal from './components/AdminPortal';
import { Agent } from './types';
import { loginAgent, loginAdmin, isServerlessMode } from './apiClient';

type ScreenState = 'agent_login' | 'admin_login' | 'agent_dashboard' | 'admin_dashboard';

export default function App() {
  const [screen, setScreen] = useState<ScreenState>('agent_login');
  
  // Agent Login States
  const [agentCode, setAgentCode] = useState('');
  const [phone, setPhone] = useState('');
  const [agentError, setAgentError] = useState<string | null>(null);
  const [authenticatingAgent, setAuthenticatingAgent] = useState(false);
  const [activeAgent, setActiveAgent] = useState<Agent | null>(null);

  // Admin Login States
  const [adminEmail, setAdminEmail] = useState('tartay.2200@gmail.com');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState<string | null>(null);
  const [authenticatingAdmin, setAuthenticatingAdmin] = useState(false);
  const [isLoggedAdmin, setIsLoggedAdmin] = useState(false);

  // Hidden admin access controls
  const [adminClicks, setAdminClicks] = useState(0);
  const [showAdminSecretLink, setShowAdminSecretLink] = useState(false);

  // Auto-restore session from localStorage if present
  useEffect(() => {
    const savedAgent = localStorage.getItem('active_agent');
    if (savedAgent) {
      try {
        const agentObj = JSON.parse(savedAgent);
        setActiveAgent(agentObj);
        setScreen('agent_dashboard');
      } catch (e) {
        localStorage.removeItem('active_agent');
      }
    }

    const savedAdminPass = localStorage.getItem('admin_session');
    if (savedAdminPass) {
      setAdminPassword(savedAdminPass);
      setIsLoggedAdmin(true);
    }

    // Check query parameters to show admin link automatically (e.g., ?admin=true or ?admin=1)
    if (window.location.search.includes('admin=true') || window.location.search.includes('admin=1')) {
      setShowAdminSecretLink(true);
    }
  }, []);

  // Handler for hidden admin entry (removed click trigger to avoid accidental entry)
  const handleTitleClick = () => {
    // Left empty or disabled to remove the click trigger as requested
  };

  // Handlers
  const handleAgentLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agentCode.trim() || !phone.trim()) {
      setAgentError('Please enter both your Agent Code and Registered Phone number.');
      return;
    }

    try {
      setAuthenticatingAgent(true);
      setAgentError(null);

      const data = await loginAgent(agentCode.trim(), phone.trim());
      if (data.success) {
        setActiveAgent(data.agent);
        localStorage.setItem('active_agent', JSON.stringify(data.agent));
        setScreen('agent_dashboard');
      } else {
        setAgentError('Authentication failed. Please verify credentials.');
      }
    } catch (err: any) {
      console.error('Agent login failed', err);
      setAgentError(err?.message || 'Server connection timeout. Verify the backend is online and try again.');
    } finally {
      setAuthenticatingAgent(false);
    }
  };

  const handleAdminLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminPassword) {
      setAdminError('Please enter your password.');
      return;
    }

    try {
      setAuthenticatingAdmin(true);
      setAdminError(null);

      const data = await loginAdmin(adminPassword);
      if (data.success) {
        setIsLoggedAdmin(true);
        const sessionToken = data.token || adminPassword;
        setAdminPassword(sessionToken);
        localStorage.setItem('admin_session', sessionToken);
        setScreen('admin_dashboard');
      } else {
        setAdminError('Invalid credentials or failed to verify admin session.');
      }
    } catch (err: any) {
      console.error('Admin verification failed', err);
      setAdminError(err?.message || 'Failed to communicate with authorization server.');
    } finally {
      setAuthenticatingAdmin(false);
    }
  };

  const handleAgentLogout = () => {
    setActiveAgent(null);
    setAgentCode('');
    setPhone('');
    localStorage.removeItem('active_agent');
    setScreen('agent_login');
  };

  const handleAdminLogout = () => {
    setIsLoggedAdmin(false);
    setAdminPassword('');
    localStorage.removeItem('admin_session');
    setScreen('agent_login');
  };

  return (
    <div id="application-root" className="min-h-screen bg-[#F0F2F5] text-[#1c1e21] flex flex-col justify-between selection:bg-[#e7f3ff] selection:text-[#1877F2] antialiased font-sans">
      
      {/* Dynamic Screen Routing Render with AnimatePresence for transitions */}
      <div className="flex-1 flex flex-col w-full">
        <AnimatePresence mode="wait">
          
          {/* 1. AGENT LOGIN VIEW (Flat base, Confluence Mimicry, No Shadows) */}
          {screen === 'agent_login' && (
            <motion.div
              key="agent_login_screen"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.1 }}
              className="flex-1 flex items-center justify-center p-0 sm:p-4 bg-[#F4F5F7]"
            >
              <div className="bg-white border-0 sm:border border-[#DFE1E6] w-full max-w-md p-6 sm:p-10 relative overflow-hidden flex flex-col min-h-screen sm:min-h-0 justify-center rounded-md">
                
                <div className="text-center mb-8">
                  <div 
                    className="mx-auto bg-[#DEEBFF] text-[#0052CC] w-12 h-12 rounded flex items-center justify-center mb-5 border border-transparent"
                    title="Authorized Downloads Only"
                  >
                    <Smartphone size={22} />
                  </div>
                  <h2 
                    className="font-display font-bold text-xl tracking-tight text-[#172B4D] select-none"
                  >
                    App Download Portal
                  </h2>
                  <p className="text-xs text-[#5E6C84] mt-2 leading-relaxed">
                    Enter your Code and registered phone number to verify access and download the official application binaries.
                  </p>
                </div>

                {agentError && (
                  <div className="mb-6 p-3.5 bg-[#FFEBE6] border border-[#FF8F73] text-[#BF2600] text-xs rounded flex items-start space-x-2">
                    <AlertCircle size={15} className="shrink-0 mt-0.5 text-[#DE350B]" />
                    <span className="leading-normal font-medium">{agentError}</span>
                  </div>
                )}

                <form onSubmit={handleAgentLoginSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="agent-code-input" className="block text-[11px] font-bold text-[#5E6C84] uppercase tracking-wider mb-1.5">
                      User Code
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#5E6C84]">
                        <KeyRound size={14} />
                      </div>
                      <input
                        id="agent-code-input"
                        type="text"
                        placeholder="e.g., AGT001"
                        value={agentCode}
                        onChange={(e) => setAgentCode(e.target.value)}
                        className="pl-9 w-full px-3 py-2 bg-[#FAFBFC] border border-[#DFE1E6] text-[#172B4D] placeholder-[#A5ADBA] font-bold font-mono uppercase rounded outline-none focus:bg-white focus:border-[#0052CC] transition-all text-xs"
                        autoFocus
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="agent-phone-input" className="block text-[11px] font-bold text-[#5E6C84] uppercase tracking-wider mb-1.5">
                      Registered Phone
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#5E6C84]">
                        <Phone size={14} />
                      </div>
                      <input
                        id="agent-phone-input"
                        type="text"
                        placeholder="e.g., 0912345678"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="pl-9 w-full px-3 py-2 bg-[#FAFBFC] border border-[#DFE1E6] text-[#172B4D] placeholder-[#A5ADBA] font-bold font-mono rounded outline-none focus:bg-white focus:border-[#0052CC] transition-all text-xs"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    id="btn-agent-login-submit"
                    disabled={authenticatingAgent}
                    className="w-full flex items-center justify-center space-x-1.5 py-2.5 mt-4 rounded text-xs font-bold text-white bg-[#0052CC] hover:bg-[#0065FF] active:bg-[#0747A6] transition-colors cursor-pointer shadow-none"
                  >
                    {authenticatingAgent ? (
                      <>
                        <RefreshCw size={13} className="animate-spin text-white" />
                        <span>Verifying Authority...</span>
                      </>
                    ) : (
                      <>
                        <LogIn size={13} />
                        <span>Access Download Files</span>
                        <ArrowRight size={12} />
                      </>
                    )}
                  </button>
                </form>

                {/* Secure/Hidden operational entry link. Only shown if showAdminSecretLink is true */}
                {showAdminSecretLink && (
                  <div className="mt-8 pt-6 border-t border-[#DFE1E6] text-center">
                    <button
                      id="link-admin-panel"
                      onClick={() => {
                        setAdminError(null);
                        setAdminPassword('');
                        setScreen('admin_login');
                      }}
                      className="inline-flex items-center space-x-1.5 text-xs text-[#5E6C84] hover:text-[#0052CC] font-semibold transition-colors group"
                    >
                      <Lock size={12} className="group-hover:text-[#0052CC]" />
                      <span>Access Administrative Dashboard</span>
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* 2. ADMIN PASSWORD DOOR (Meta Design, Clean Light Layout) */}
          {screen === 'admin_login' && (
            <motion.div
              key="admin_login_screen"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex-1 flex items-center justify-center p-4 bg-[#F0F2F5]"
            >
              <div className="bg-white border border-[#e4e6eb] shadow-sm rounded-2xl p-8 sm:p-10 w-full max-w-md relative overflow-hidden">
                <div className="text-center mb-6">
                  <div className="mx-auto bg-[#e7f3ff] text-[#1877F2] w-12 h-12 rounded-2xl flex items-center justify-center mb-4 border border-transparent">
                    <Lock size={20} />
                  </div>
                  <h2 className="font-sans font-bold text-xl tracking-tight text-[#1c1e21]">
                    Admin Portal Login
                  </h2>
                  <p className="text-sm text-[#65676b] mt-2 leading-relaxed">
                    Sign in with your Supabase authenticated admin account.
                  </p>
                </div>

                {adminError && (
                  <div className="mb-6 p-4 bg-[#ffebe9] border border-[#ffc4c0] text-[#b30000] text-xs rounded-xl flex items-start space-x-2">
                    <AlertCircle size={16} className="shrink-0 mt-0.5 text-[#ff4d4d]" />
                    <span className="leading-normal font-medium">{adminError}</span>
                  </div>
                )}

                <form onSubmit={handleAdminLoginSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="admin-email-input" className="block text-xs font-bold text-[#65676b] uppercase tracking-wider mb-1.5">
                      Administrator Email
                    </label>
                    <input
                      id="admin-email-input"
                      type="email"
                      placeholder="email@example.com"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      className="w-full px-4 py-2.5 bg-[#F0F2F5] border border-[#ccd0d5] text-[#1c1e21] placeholder-[#8d949e] font-semibold rounded-xl outline-none focus:bg-white focus:border-[#1877F2] transition-all text-sm"
                    />
                  </div>

                  <div>
                    <label htmlFor="admin-password-input" className="block text-xs font-bold text-[#65676b] uppercase tracking-wider mb-1.5">
                      Passcode / Password
                    </label>
                    <input
                      id="admin-password-input"
                      type="password"
                      placeholder="••••••••"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      className="w-full px-4 py-2.5 bg-[#F0F2F5] border border-[#ccd0d5] text-[#1c1e21] placeholder-[#8d949e] font-bold rounded-xl outline-none focus:bg-white focus:border-[#1877F2] transition-all text-sm"
                      autoFocus
                    />
                  </div>

                  <button
                    type="submit"
                    id="btn-admin-login-submit"
                    disabled={authenticatingAdmin}
                    className="w-full flex items-center justify-center space-x-2 py-3 mt-4 rounded-xl text-sm font-bold text-white bg-[#1877F2] hover:bg-[#166FE5] active:scale-98 transition-all cursor-pointer shadow-none"
                  >
                    {authenticatingAdmin ? (
                      <>
                        <RefreshCw size={16} className="animate-spin text-white" />
                        <span>Verifying with Supabase Auth...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck size={16} />
                        <span>Sign In</span>
                      </>
                    )}
                  </button>
                </form>

                <div className="mt-8 pt-6 border-t border-[#e4e6eb] text-center">
                  <button
                    id="link-agent-panel"
                    onClick={() => {
                      setAgentError(null);
                      setScreen('agent_login');
                    }}
                    className="inline-flex items-center space-x-1 text-xs text-[#65676b] hover:text-[#1877F2] font-semibold transition-colors"
                  >
                    <span>Return to Agent Login</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* 3. AGENT OPERATIONS DASHBOARD VIEW */}
          {screen === 'agent_dashboard' && activeAgent && (
            <motion.div
              key="agent_dashboard_screen"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col w-full"
            >
              <AgentPortal agent={activeAgent} onLogout={handleAgentLogout} />
            </motion.div>
          )}

          {/* 4. SYSTEM ADMIN CONTROL PANEL */}
          {screen === 'admin_dashboard' && isLoggedAdmin && (
            <motion.div
              key="admin_dashboard_screen"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col w-full"
            >
              <AdminPortal adminPassword={adminPassword} onLogout={handleAdminLogout} />
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
