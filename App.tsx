
import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Scan,
  ShieldAlert,
  Bell,
  FileText,
  Flag,
  History,
  CreditCard,
  ChevronRight,
  User,
  LogOut,
  Chrome,
  Settings,
  Moon,
  Sun,
  Radar
} from 'lucide-react';
import Dashboard from './pages/Dashboard';
import ScanPage from './pages/ScanPage';
import DeepfakeDetection from './pages/DeepfakeDetection';
import ThreatIntelligence from './pages/ThreatIntelligence';
import HistoryAnalytics from './pages/HistoryAnalytics';
import EvidenceLog from './pages/EvidenceLog';
import Reports from './pages/Reports';
import Premium from './pages/Premium';
import LoginPage from './pages/LoginPage';
import ExtensionPage from './pages/ExtensionPage';
import SettingsPage from './pages/SettingsPage';
import LandingPage from './pages/LandingPage';
import { useAppStore } from './store/useAppStore';

type Page = 'landing' | 'login' | 'dashboard' | 'scan' | 'deepfake' | 'threats' | 'evidence' | 'reports' | 'history' | 'premium' | 'extension' | 'settings';

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentPage, setCurrentPage] = useState<Page>('landing');
  const { theme, setTheme } = useAppStore();

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const hydrate = useAppStore(state => state.hydrate);

  useEffect(() => {
    hydrate();
    const token = localStorage.getItem('auth_token');
    if (token) {
      setIsLoggedIn(true);
    }
  }, []); // Run ONLY once on mount

  // Optional: Redirect to dashboard IF and ONLY IF they just logged in or just loaded the app at '/'
  useEffect(() => {
    if (isLoggedIn && (currentPage === 'login')) {
      setCurrentPage('dashboard');
    }
  }, [isLoggedIn, currentPage]);

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    setIsLoggedIn(false);
  };

  if (!isLoggedIn) {
    if (currentPage === 'login' || (currentPage !== 'landing' && currentPage !== 'extension')) {
      return <LoginPage onLogoClick={() => setCurrentPage('landing')} onLogin={() => {
        setIsLoggedIn(true);
        setCurrentPage('dashboard');
      }} />;
    }
    
    if (currentPage === 'extension') {
      return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
           <nav className="p-6 flex justify-between items-center max-w-7xl mx-auto">
             <div className="flex items-center gap-2 cursor-pointer" onClick={() => setCurrentPage('landing')}>
               <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center">
                 <ShieldAlert className="text-white" size={20} />
               </div>
               <h1 className="font-bold text-lg text-violet-900 dark:text-violet-400">EmpowerNet</h1>
             </div>
             <button onClick={() => setCurrentPage('login')} className="px-6 py-2 bg-violet-600 text-white rounded-lg font-bold">Sign In</button>
           </nav>
           <div className="p-8"><ExtensionPage /></div>
        </div>
      );
    }

    return (
      <LandingPage 
        onLoginClick={() => setCurrentPage('login')} 
        onDashboardClick={() => setCurrentPage('dashboard')}
        onExtensionClick={() => setCurrentPage('extension')}
      />
    );
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <Dashboard setCurrentPage={setCurrentPage} />;
      case 'scan': return <ScanPage />;
      case 'deepfake': return <DeepfakeDetection />;
      case 'threats': return <ThreatIntelligence setCurrentPage={setCurrentPage} />;
      case 'history': return <HistoryAnalytics />;
      case 'evidence': return <EvidenceLog />;
      case 'reports': return <Reports />;
      case 'premium': return <Premium />;
      case 'extension': return <ExtensionPage />;
      case 'settings': return <SettingsPage />;
      default: return <Dashboard setCurrentPage={setCurrentPage} />;
    }
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { id: 'scan', label: 'Scan', icon: <Scan size={20} /> },
    { id: 'deepfake', label: 'Deepfake Detection', icon: <ShieldAlert size={20} /> },
    { id: 'threats', label: 'Threat Intelligence', icon: <Radar size={20} /> },
    { id: 'extension', label: 'Chrome Extension', icon: <Chrome size={20} /> },
    { id: 'evidence', label: 'Evidence Log', icon: <FileText size={20} /> },
    { id: 'reports', label: 'Reports', icon: <Flag size={20} /> },
    { id: 'history', label: 'History', icon: <History size={20} /> },
    { id: 'premium', label: 'Premium', icon: <CreditCard size={20} /> },
    { id: 'settings', label: 'Settings', icon: <Settings size={20} /> },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col fixed h-full z-10 transition-colors">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-8 cursor-pointer group" onClick={() => setCurrentPage('landing')}>
            <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
              <ShieldAlert className="text-white" size={20} />
            </div>
            <div>
              <h1 className="font-bold text-lg text-violet-900 dark:text-violet-400 leading-tight">EmpowerNet</h1>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-widest font-semibold">AI Scam Detection</p>
            </div>
          </div>
          <nav className="space-y-1">
            <p className="text-[10px] text-gray-400 font-bold uppercase mb-2 px-3">Navigation</p>
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setCurrentPage(item.id as Page)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm font-medium ${currentPage === item.id
                  ? 'bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 border-r-4 border-violet-600'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                  }`}
              >
                {item.icon} {item.label}
              </button>
            ))}
          </nav>
          <div className="mt-6 px-3">
            <button
              onClick={toggleTheme}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white border border-gray-100 dark:border-gray-700"
            >
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
              {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
            </button>
          </div>
        </div>
        <div className="mt-auto p-6 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded-xl transition-all" onClick={() => setCurrentPage('settings')}>
            <div className="w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-violet-600 dark:text-violet-400 font-bold text-xs">AJ</div>
            <div className="overflow-hidden flex-1"><p className="text-sm font-semibold truncate dark:text-gray-200">aayushijohn2025@gmail.com</p></div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2 text-gray-400 hover:text-red-500 text-sm font-bold border border-gray-100 dark:border-gray-700 rounded-lg transition-all hover:bg-red-50 dark:hover:bg-red-900/10"
          >
            <LogOut size={16} /> Logout
          </button>
        </div>
      </aside>
      <main className="ml-64 flex-1 p-8 bg-[#f8f9fc] dark:bg-gray-900 transition-colors">
        <header className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500">
            <LayoutDashboard size={18} /><ChevronRight size={14} /><span className="text-sm font-medium text-gray-600 dark:text-gray-400 capitalize">{currentPage}</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-700">Last synced: Just now</div>
            <button className="p-2 text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors" onClick={() => setCurrentPage('threats')}><Bell size={20} /></button>
          </div>
        </header>
        <div className="max-w-7xl mx-auto">{renderPage()}</div>
      </main>
    </div>
  );
};

export default App;
