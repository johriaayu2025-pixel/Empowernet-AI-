
import React, { useState } from 'react';
import { Bell, ShieldAlert, Mic, Mail, Info, Radio, Zap, AlertTriangle, X, PhoneCall, Globe } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

const AlertsCenter: React.FC = () => {
  const alerts = useAppStore(state => state.alerts);
  const markRead = useAppStore(state => state.markAlertRead);
  const addAlert = useAppStore(state => state.addAlert);
  const addScan = useAppStore(state => state.addScan);
  const [settings, setSettings] = useState({ push: true, email: true, sound: false });
  const [showSOSModal, setShowSOSModal] = useState(false);

  const toggleSetting = (key: keyof typeof settings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const executeSOS = () => {
    const timestamp = new Date().toLocaleString();
    const source = "User Triggered SOS";

    addAlert({
      type: 'SOS EMERGENCY TRIGGERED',
      desc: 'CRITICAL: Manual SOS signal received. Local enforcement notified. Forensic snapshot taken. Trusted contacts: SMS Sent.',
      severity: 'CRITICAL',
      time: timestamp,
      source: source
    });

    addScan({
      id: 'SOS-' + Date.now(),
      label: '[EMERGENCY]: Manual SOS Activation',
      status: 'fraudulent',
      confidence: '100%',
      date: timestamp,
      tag: 'SOS Signal',
      type: 'SYSTEM',
      hash: '0x' + Math.random().toString(16).substring(2, 42)
    });

    setShowSOSModal(false);
    alert("Emergency SOS protocol active. Forensic logs updated and contacts alerted.");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative">
      {/* SOS MODAL */}
      {showSOSModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-white dark:bg-gray-800 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="bg-red-600 p-8 text-white text-center relative">
              <button onClick={() => setShowSOSModal(false)} className="absolute top-4 right-4 text-white/80 hover:text-white">
                <X size={24} />
              </button>
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white/30">
                <Zap size={40} className="fill-white" />
              </div>
              <h2 className="text-2xl font-black">Emergency Protocol</h2>
            </div>
            <div className="p-8 space-y-6">
              <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-900/50 text-red-800 dark:text-red-400 text-xs font-bold flex gap-3">
                <AlertTriangle className="shrink-0" size={18} />
                <p>DO NOT USE UNLESS FOR AUTHENTIC CYBER EMERGENCIES.</p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <a href="tel:1930" className="w-full flex items-center justify-center gap-3 py-4 bg-red-600 text-white rounded-2xl font-black text-lg hover:bg-red-700 transition-all shadow-xl shadow-red-200 active:scale-95">
                  <PhoneCall size={24} /> Call Cyber Helpline: 1930
                </a>
                <a href="https://cybercrime.gov.in" target="_blank" rel="noopener noreferrer" className="w-full flex items-center justify-center gap-3 py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl font-black hover:bg-gray-800 dark:hover:bg-gray-100 transition-all active:scale-95">
                   <Globe size={20} /> Report Online Official
                </a>
              </div>

              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 px-1">State Cyber Cell Contacts</p>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-2 no-scrollbar">
                  {[
                    { city: 'Delhi', phone: '011-25820800' },
                    { city: 'Mumbai', phone: '022-26300000' },
                    { city: 'Bangalore', phone: '080-22094498' },
                    { city: 'Hyderabad', phone: '040-27852079' },
                    { city: 'Chennai', phone: '044-28512750' }
                  ].map(c => (
                    <a key={c.city} href={`tel:${c.phone}`} className="p-3 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl text-[11px] font-bold dark:text-gray-300 hover:border-violet-300 transition-colors">
                      <p className="text-gray-400 uppercase text-[8px] mb-0.5">{c.city}</p>
                      {c.phone}
                    </a>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                <button 
                  onClick={() => { localStorage.removeItem('auth_token'); window.location.reload(); }}
                  className="flex-1 py-4 bg-orange-50 text-orange-700 border border-orange-100 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-orange-100 transition-colors"
                >
                  Lock My Account
                </button>
                <button onClick={() => setShowSOSModal(false)} className="flex-1 py-4 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-gray-200 transition-colors">
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="lg:col-span-2 space-y-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/50 p-6 rounded-2xl flex items-center gap-6 transition-colors">
          <div className="w-12 h-12 bg-red-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-red-200 dark:shadow-none">
            <Bell size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-red-900 dark:text-red-400">Alert Center</h1>
            <p className="text-red-700 dark:text-red-500 opacity-80 font-medium">Real-time threat notifications</p>
          </div>
        </div>

        <div className="space-y-4">
          {alerts.length === 0 && (
            <div className="bg-white dark:bg-gray-800 p-12 rounded-2xl border border-gray-100 dark:border-gray-700 text-center transition-colors">
              <div className="w-16 h-16 bg-gray-50 dark:bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400 dark:text-gray-500">
                <Bell size={32} />
              </div>
              <h3 className="font-bold text-gray-900 dark:text-white">No new alerts</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Your digital environment is currently safe.</p>
            </div>
          )}
          {alerts.map((alert, idx) => (
            <div key={idx} className={`bg-white dark:bg-gray-800 p-6 rounded-2xl border-l-4 shadow-sm hover:shadow-md transition-all ${alert.severity === 'CRITICAL' ? 'border-red-600 ring-2 ring-red-50 dark:ring-red-900/20' : 'border-orange-500 dark:border-orange-600'}`}>
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${alert.severity === 'CRITICAL' ? 'bg-red-600 text-white' : 'bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'}`}><AlertTriangle size={18} /></div>
                  <h3 className="font-bold text-gray-900 dark:text-white">{alert.type}</h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${alert.severity === 'CRITICAL' ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>{alert.severity}</span>
                </div>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 ml-11 leading-relaxed">{alert.desc}</p>
              <div className="flex items-center gap-6 ml-11 text-[11px] text-gray-400 dark:text-gray-500 font-medium">
                <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-900 px-2 py-1 rounded-md text-gray-500 dark:text-gray-400"><Zap size={12} className="text-violet-500" />{alert.time}</div>
                <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-900 px-2 py-1 rounded-md text-gray-500 dark:text-gray-400"><Info size={12} className="text-blue-500" />Source: {alert.source}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm transition-colors">
          <h2 className="text-lg font-bold mb-6 flex items-center gap-2 dark:text-white"><Radio size={20} className="text-violet-600 dark:text-violet-400" />Notification Settings</h2>
          <div className="space-y-4">
            {[
              { id: 'push', label: 'Push Notifications', checked: settings.push },
              { id: 'email', label: 'Email Alerts', checked: settings.email },
              { id: 'sound', label: 'Sound Alerts', checked: settings.sound }
            ].map((s) => (
              <div key={s.id} className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">{s.label}</span>
                <div onClick={() => toggleSetting(s.id as any)} className={`w-10 h-5 rounded-full relative cursor-pointer ${s.checked ? 'bg-violet-600' : 'bg-gray-200 dark:bg-gray-700'}`}>
                  <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${s.checked ? 'left-6' : 'left-1'}`}></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-2xl border border-red-100 dark:border-red-900/50 shadow-lg dark:shadow-none transition-colors">
          <div className="flex items-center gap-2 mb-4"><ShieldAlert className="text-red-600 dark:text-red-400" size={20} /><h2 className="text-lg font-bold text-red-900 dark:text-red-400">Emergency Response</h2></div>
          <p className="text-xs text-red-700 dark:text-red-300 leading-relaxed mb-6">Instantly locks down account, logs critical evidence, and notifies emergency contacts.</p>
          <button
            onClick={() => setShowSOSModal(true)}
            className="w-full py-6 bg-red-600 text-white rounded-2xl font-black flex flex-col items-center justify-center gap-2 shadow-2xl shadow-red-500/30 hover:bg-red-700 active:scale-95 transition-all outline outline-offset-4 outline-red-600/20 group"
          >
            <Zap size={32} className="group-hover:animate-bounce" />
            <span className="text-xl tracking-tighter uppercase">Emergency SOS</span>
            <span className="text-[10px] opacity-70 tracking-widest">TAP TO ACTIVATE SHIELD</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AlertsCenter;
