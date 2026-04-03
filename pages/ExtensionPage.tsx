
import React from 'react';
import { Chrome, Download, ShieldCheck, Zap, Monitor, Globe, Bell, History, ArrowRight, Lock } from 'lucide-react';
import { generateExtensionZip } from '../services/extension_generator';

const ExtensionPage: React.FC = () => {
  const downloadExtension = () => {
    const link = document.createElement('a');
    link.href = '/empowernet-extension.zip';
    link.download = 'empowernet-extension.zip';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-20">
      <div className="bg-gradient-to-br from-violet-600 to-indigo-700 rounded-3xl p-12 text-white shadow-2xl overflow-hidden relative">
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
          <div className="flex-1 space-y-6">
            <div className="w-16 h-16 bg-white/20 rounded-2xl backdrop-blur-md flex items-center justify-center">
              <Chrome size={40} className="text-white" />
            </div>
            <h1 className="text-4xl font-black">EmpowerNet Browser Extension</h1>
            <p className="text-lg opacity-90 leading-relaxed">
              Real-time protection directly in your browser. Detect scams, block fraudulent domains, and identify AI deepfakes during calls.
            </p>
            <button
              onClick={downloadExtension}
              className="px-8 py-4 bg-white text-violet-700 rounded-xl font-black text-lg shadow-xl hover:bg-violet-50 transition-all flex items-center gap-3"
            >
              <Download size={22} />
              Download Build (V3)
            </button>
          </div>
          <div className="hidden md:block w-72 h-72 bg-white/10 rounded-full border border-white/20 flex items-center justify-center animate-pulse">
            <div className="w-56 h-56 bg-white/20 rounded-full border border-white/40 flex items-center justify-center">
              <ShieldCheck size={80} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { icon: <Monitor />, title: 'Real-time Page Scanning', desc: 'Instant risk score analysis for any website you visit.' },
          { icon: <Download />, title: 'Media Analysis', desc: 'Upload images, audio, or video for forensic AI deepfake detection.' },
          { icon: <Globe />, title: 'Malicious Site Blocking', desc: 'Automatically prevent access to known phishing and scam domains.' },
          { icon: <Bell />, title: 'Live Meeting Protection', desc: 'Detects deepfakes and AI voices during Google Meet and Zoom calls.' },
          { icon: <Zap />, title: 'Social Media Scanner', desc: 'Automatically labels AI-generated content on Instagram and YouTube.' },
          { icon: <Lock />, title: 'Child Safety Mode', desc: 'Automatically hides cyberbullying and explicit content from any page.' },
          { icon: <ShieldCheck />, title: 'Fake News Detection', desc: 'Flags manipulative and biased content while you browse.' },
          { icon: <History />, title: 'Evidence Auto-Sync', desc: 'Saves all detected threats to your local forensic log instantly.' },
        ].map((item, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all">
            <div className="w-10 h-10 bg-violet-50 dark:bg-violet-900/30 rounded-lg flex items-center justify-center text-violet-600 dark:text-violet-400 mb-4">
              {item.icon}
            </div>
            <h3 className="font-bold text-gray-900 dark:text-white mb-2 leading-tight">{item.title}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{item.desc}</p>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-3xl p-10 border border-gray-100 dark:border-gray-700 shadow-sm transition-colors">
        <h2 className="text-2xl font-bold mb-10 flex items-center gap-3 dark:text-white">
          <History size={24} className="text-violet-600 dark:text-violet-400" />
          Live Cloud Synchronization
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
          <div className="space-y-4">
            <div className="w-12 h-12 bg-violet-600 text-white rounded-full flex items-center justify-center font-bold text-xl">1</div>
            <h4 className="font-bold dark:text-white">Extension Scan</h4>
            <p className="text-sm text-gray-500 dark:text-gray-400">Extension detects a threat while you browse or attend a virtual meeting.</p>
          </div>
          <div className="space-y-4">
            <div className="w-12 h-12 bg-violet-600 text-white rounded-full flex items-center justify-center font-bold text-xl">2</div>
            <h4 className="font-bold dark:text-white">Backend Sync</h4>
            <p className="text-sm text-gray-500 dark:text-gray-400">Forensic data is encrypted and sent to EmpowerNet Cloud for verification.</p>
          </div>
          <div className="space-y-4">
            <div className="w-12 h-12 bg-violet-600 text-white rounded-full flex items-center justify-center font-bold text-xl">3</div>
            <h4 className="font-bold dark:text-white">Instant Dashboard</h4>
            <p className="text-sm text-gray-500 dark:text-gray-400">Results appear instantly in your dashboard, alerts, and evidence log.</p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-3xl p-10 border border-gray-100 dark:border-gray-700 shadow-sm transition-colors">
        <h2 className="text-2xl font-bold mb-8 dark:text-white">Installation Steps</h2>
        <div className="space-y-6">
          {[
            { step: 'Download the source file', icon: <Download /> },
            { step: 'Follow manifest definitions in source', icon: <Globe /> },
            { step: 'Open Chrome and navigate to chrome://extensions', icon: <Chrome /> },
            { step: 'Enable "Developer Mode" in the top right', icon: <Zap /> },
            { step: 'Click "Load unpacked" and select the extension folder', icon: <ArrowRight /> },
            { step: 'Pin EmpowerNet to your toolbar for instant access', icon: <ShieldCheck /> }
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-all border border-transparent hover:border-violet-100 dark:hover:border-violet-800 group">
              <span className="text-xl font-black text-violet-200 dark:text-violet-800 group-hover:text-violet-400 w-8">0{i + 1}</span>
              <div className="p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm group-hover:text-violet-600 transition-colors dark:text-gray-300">
                {item.icon}
              </div>
              <p className="font-bold text-gray-700 dark:text-gray-200">{item.step}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-3xl p-10 flex items-start gap-6 border border-indigo-100 dark:border-indigo-800/50">
        <div className="p-4 bg-white dark:bg-gray-800 rounded-2xl shadow-sm text-indigo-600 dark:text-indigo-400">
          <Lock size={32} />
        </div>
        <div>
          <h3 className="text-xl font-bold text-indigo-900 dark:text-indigo-300 mb-2">Privacy & Security Commitment</h3>
          <p className="text-sm text-indigo-700 dark:text-indigo-400 leading-relaxed max-w-2xl">
            EmpowerNet scans content locally on your device. Only metadata of detected threats is sent to our servers for analysis. We never store raw browsing history or call transcripts. All requests are end-to-end encrypted.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ExtensionPage;
