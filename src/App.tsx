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
    if (savedAdminPass === 'Kaung1994') {
      setAdminPassword('Kaung1994');
      setIsLoggedAdmin(true);
    }

    // Check query parameters to show admin link automatically (e.g., ?admin=true or ?admin=1)
    if (window.location.search.includes('admin=true') || window.location.search.includes('admin=1')) {
      setShowAdminSecretLink(true);
    }
  }, []);

  // Handler for hidden admin entry (click the Smartphone icon or title 5 times)
  const handleTitleClick = () => {
    setAdminClicks(prev => {
      const next = prev + 1;
      if (next >= 5) {
        setShowAdminSecretLink(true);
        setAdminError(null);
        setAdminPassword('');
        setScreen('admin_login');
        return 0;
      }
      return next;
    });
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

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          agentCode: agentCode.trim(),
          phone: phone.trim()
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setActiveAgent(data.agent);
        localStorage.setItem('active_agent', JSON.stringify(data.agent));
        setScreen('agent_dashboard');
      } else {
        setAgentError(data.error || 'Authentication failed. Please verify credentials.');
      }
    } catch (err) {
      console.error('Agent login failed', err);
      setAgentError('Server connection timeout. Verify the backend is online and try again.');
    } finally {
      setAuthenticatingAgent(false);
    }
  };

  const handleAdminLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminPassword) {
      setAdminError('Please provide the administrator key code.');
      return;
    }

    try {
      setAuthenticatingAdmin(true);
      setAdminError(null);

      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ password: adminPassword })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setIsLoggedAdmin(true);
        localStorage.setItem('admin_session', adminPassword);
        setScreen('admin_dashboard');
      } else {
        setAdminError(data.error || 'The entered administrator key is incorrect.');
      }
    } catch (err) {
      console.error('Admin verification failed', err);
      setAdminError('Failed to communicate with authorization server.');
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
    <div id="application-root" className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between selection:bg-emerald-100 selection:text-emerald-900 antialiased font-sans">
      
      {/* Dynamic Screen Routing Render with AnimatePresence for transitions */}
      <div className="flex-1 flex flex-col w-full">
        <AnimatePresence mode="wait">
          
          {/* 1. AGENT LOGIN VIEW (Mobile First design, Flat base, No Shadows) */}
          {screen === 'agent_login' && (
            <motion.div
              key="agent_login_screen"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex-1 flex items-center justify-center p-0 sm:p-4 bg-slate-50"
            >
              <div className="bg-white border-0 sm:border border-slate-200 shadow-none sm:rounded-2xl p-6 sm:p-10 w-full max-w-md relative overflow-hidden flex flex-col min-h-screen sm:min-h-0 justify-center">
                
                <div className="text-center mb-8">
                  {/* Subtle interactive trigger: Clicking the icon 5 times reveals Admin Login */}
                  <div 
                    onClick={handleTitleClick}
                    className="mx-auto bg-slate-100 text-slate-700 w-14 h-14 rounded-2xl flex items-center justify-center mb-5 border border-slate-250 cursor-pointer active:scale-95 transition-transform"
                    title="Agent secure key"
                  >
                    <Smartphone size={24} />
                  </div>
                  <h2 
                    onClick={handleTitleClick}
                    className="font-display font-bold text-2xl tracking-tight text-slate-900 cursor-pointer select-none"
                  >
                    Agent Downloads Portal
                  </h2>
                  <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                    Identify using your unique Agent Code and verified phone number to access secure app binaries.
                  </p>
                </div>

                {agentError && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-start space-x-2">
                    <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-500" />
                    <span className="leading-normal font-medium">{agentError}</span>
                  </div>
                )}

                <form onSubmit={handleAgentLoginSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="agent-code-input" className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                      Agent Code
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <KeyRound size={16} />
                      </div>
                      <input
                        id="agent-code-input"
                        type="text"
                        placeholder="e.g., AGT001"
                        value={agentCode}
                        onChange={(e) => setAgentCode(e.target.value)}
                        className="pl-10 w-full px-3.5 py-2.5 bg-white border border-slate-250 text-slate-900 placeholder-slate-400 font-bold font-mono uppercase rounded-xl outline-none focus:bg-slate-50/50 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/25 transition-all text-sm"
                        autoFocus
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="agent-phone-input" className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                      Registered Phone
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Phone size={16} />
                      </div>
                      <input
                        id="agent-phone-input"
                        type="text"
                        placeholder="e.g., 0912345678"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="pl-10 w-full px-3.5 py-2.5 bg-white border border-slate-250 text-slate-900 placeholder-slate-400 font-bold font-mono rounded-xl outline-none focus:bg-slate-50/50 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/25 transition-all text-sm"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    id="btn-agent-login-submit"
                    disabled={authenticatingAgent}
                    className="w-full flex items-center justify-center space-x-2 py-3.5 mt-4 rounded-xl text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 transition-all cursor-pointer shadow-none active:scale-98"
                  >
                    {authenticatingAgent ? (
                      <>
                        <RefreshCw size={16} className="animate-spin text-white" />
                        <span>Verifying Authorization...</span>
                      </>
                    ) : (
                      <>
                        <LogIn size={16} />
                        <span>Authenticate Access</span>
                        <ArrowRight size={15} />
                      </>
                    )}
                  </button>
                </form>

                {/* Secure/Hidden operational entry link. Only shown if showAdminSecretLink is true */}
                {showAdminSecretLink && (
                  <div className="mt-8 pt-6 border-t border-slate-100 text-center animate-fade-in">
                    <button
                      id="link-admin-panel"
                      onClick={() => {
                        setAdminError(null);
                        setAdminPassword('');
                        setScreen('admin_login');
                      }}
                      className="inline-flex items-center space-x-1.5 text-xs text-slate-500 hover:text-emerald-600 font-semibold transition-colors group"
                    >
                      <Lock size={12} className="group-hover:text-emerald-600" />
                      <span>Access Operational Admin Panel</span>
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* 2. ADMIN PASSWORD DOOR (Light Theme, Almost Flat, No Shadows) */}
          {screen === 'admin_login' && (
            <motion.div
              key="admin_login_screen"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex-1 flex items-center justify-center p-4 bg-slate-50"
            >
              <div className="bg-white border border-slate-200 shadow-none rounded-2xl p-8 sm:p-10 w-full max-w-md relative overflow-hidden">
                <div className="text-center mb-8">
                  <div className="mx-auto bg-slate-100 text-slate-700 w-12 h-12 rounded-2xl flex items-center justify-center mb-4 border border-slate-200">
                    <Lock size={20} />
                  </div>
                  <h2 className="font-display font-bold text-xl tracking-tight text-slate-900">
                    Administrative Access Lock
                  </h2>
                  <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                    Provide the master passcode to access administrator dashboards, agent catalogs, and transaction audits.
                  </p>
                </div>

                {adminError && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-start space-x-2">
                    <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-500" />
                    <span className="leading-normal font-medium">{adminError}</span>
                  </div>
                )}

                <form onSubmit={handleAdminLoginSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="admin-password-input" className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                      Administrator Passcode
                    </label>
                    <input
                      id="admin-password-input"
                      type="password"
                      placeholder="••••••••"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border border-slate-250 text-slate-900 placeholder-slate-400 font-bold tracking-widest text-center rounded-xl outline-none focus:bg-slate-50/50 focus:border-emerald-600 transition-all text-base"
                      autoFocus
                    />
                  </div>

                  <button
                    type="submit"
                    id="btn-admin-login-submit"
                    disabled={authenticatingAdmin}
                    className="w-full flex items-center justify-center space-x-2 py-3.5 mt-4 rounded-xl text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 active:scale-98 transition-all cursor-pointer"
                  >
                    {authenticatingAdmin ? (
                      <>
                        <RefreshCw size={16} className="animate-spin text-white" />
                        <span>Validating Key...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck size={16} />
                        <span>Unlock Administration</span>
                      </>
                    )}
                  </button>
                </form>

                <div className="mt-8 pt-6 border-t border-slate-100 text-center">
                  <button
                    id="link-agent-panel"
                    onClick={() => {
                      setAgentError(null);
                      setScreen('agent_login');
                    }}
                    className="inline-flex items-center space-x-1 text-xs text-slate-500 hover:text-emerald-600 font-semibold transition-colors"
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
