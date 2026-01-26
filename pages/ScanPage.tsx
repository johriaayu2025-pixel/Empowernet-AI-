import React, { useState, useRef } from 'react';
import {
  MessageSquare,
  ImageIcon,
  Video,
  Mic,
  Search,
  ShieldCheck,
  Database,
  AlertCircle,
  Upload,
  X,
  Cpu,
  Link as LinkIcon,
  CheckCircle2,
  XCircle,
  ExternalLink
} from 'lucide-react';

import { runScan } from '../services/api';
import { useAppStore } from '../store/useAppStore';

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ScanPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'text' | 'image' | 'video' | 'audio'>('text');
  const [textInput, setTextInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const addScan = useAppStore(state => state.addScan);
  const addAlert = useAppStore(state => state.addAlert);

  const tabs = [
    { id: 'text', label: 'Text', icon: <MessageSquare size={16} />, accept: '' },
    { id: 'image', label: 'Image', icon: <ImageIcon size={16} />, accept: 'image/jpeg,image/png' },
    { id: 'video', label: 'Video', icon: <Video size={16} />, accept: 'video/mp4,video/quicktime' },
    { id: 'audio', label: 'Audio', icon: <Mic size={16} />, accept: 'audio/mpeg,audio/wav' },
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      setError('File is too large. Maximum size is 10MB.');
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setError(null);
    setResult(null);
  };

  const clearSelection = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleScan = async () => {
    if (activeTab === 'text' && !textInput.trim()) {
      setError('Please enter text to scan.');
      return;
    }

    setIsScanning(true);
    setError(null);
    setResult(null);

    try {
      let payload: {
        type: string;
        content: string;
        label?: string;
      };

      if (activeTab === 'text') {
        payload = {
          type: 'text',
          content: textInput,
          label: 'Text Snippet',
        };
      } else {
        if (!selectedFile) {
          fileInputRef.current?.click();
          setIsScanning(false);
          return;
        }

        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () =>
            resolve((reader.result as string).split(',')[1]);
          reader.onerror = reject;
          reader.readAsDataURL(selectedFile);
        });

        payload = {
          type: activeTab,
          content: base64,
          label: selectedFile.name,
        };
      }

      const res = await runScan(payload);

      if (res.error || !res.category) {
        throw new Error(res.error || "Unknown analysis error");
      }

      setResult(res);

      addScan({
        id: Date.now().toString(),
        label: payload.label || 'Unknown Scan',
        status: res.category.toLowerCase(),
        confidence: `${Math.round(res.confidence * 100)}%`,
        date: new Date().toLocaleString(),
        tag: res.category,
        type: activeTab.toUpperCase(),
        hash: res.evidenceHash || 'pending...',
      });

      if (res.riskScore > 75) {
        addAlert({
          type: `${res.category} DETECTED`,
          desc: `High risk content identified in ${activeTab} scan.`,
          severity: 'CRITICAL',
          time: new Date().toLocaleString(),
          source: payload.label || 'Unknown Source'
        });
      }
    } catch (err) {
      setError(`Analysis failed. Ensure the AI backend is reachable. ${import.meta.env.DEV ? 'Check port 8001.' : ''}`);
      console.error(err);
    } finally {
      setIsScanning(false);
    }
  };

  const activeTabAccept = tabs.find((t) => t.id === activeTab)?.accept;

  return (
    <div className="max-w-4xl mx-auto pb-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Content Analysis Scanner
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          Select content type to run deepfake and scam detection.
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="flex border-b border-gray-100 dark:border-gray-700">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                setResult(null);
                setError(null);
              }}
              className={`flex-1 py-4 flex items-center justify-center gap-2 text-sm font-medium transition-colors ${activeTab === tab.id
                ? 'text-violet-600 dark:text-violet-400 bg-violet-50/50 dark:bg-violet-900/20 border-b-2 border-violet-600 dark:border-violet-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-8">
          <div className="space-y-6">
            {activeTab === 'text' ? (
              <textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Paste suspicious text, email content, or messages here..."
                className="w-full h-40 p-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-violet-500 outline-none resize-none transition-all dark:text-white"
              />
            ) : (
              <div className="relative group">
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept={activeTabAccept}
                  onChange={handleFileChange}
                />

                {!selectedFile ? (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-64 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900/50 text-gray-400 hover:border-violet-500 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/10 transition-all flex flex-col items-center justify-center gap-4"
                  >
                    <div className="p-4 bg-white dark:bg-gray-800 rounded-full shadow-sm">
                      <Upload size={32} />
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-lg">Click to Upload {activeTab}</p>
                      <p className="text-sm font-normal opacity-70">or drag and drop file here</p>
                    </div>
                  </button>
                ) : (
                  <div className="relative h-64 bg-black rounded-xl overflow-hidden flex items-center justify-center group-hover:shadow-lg transition-all">
                    <button
                      onClick={clearSelection}
                      className="absolute top-4 right-4 p-2 bg-white/20 backdrop-blur-md text-white rounded-full hover:bg-white/40 transition-colors z-10"
                    >
                      <X size={20} />
                    </button>

                    {activeTab === 'image' && previewUrl && (
                      <img src={previewUrl} alt="Preview" className="h-full object-contain" />
                    )}

                    {activeTab === 'video' && previewUrl && (
                      <video src={previewUrl} className="h-full w-full object-contain" controls />
                    )}

                    {activeTab === 'audio' && (
                      <div className="flex flex-col items-center text-white gap-4">
                        <div className="w-16 h-16 rounded-full bg-violet-600 flex items-center justify-center animate-pulse">
                          <Mic size={32} />
                        </div>
                        <p className="font-medium text-lg">{selectedFile.name}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl flex items-center gap-2 border border-red-100 dark:border-red-900/30 animate-in fade-in slide-in-from-top-2">
                <AlertCircle size={20} />
                {error}
              </div>
            )}

            <button
              onClick={handleScan}
              disabled={isScanning || (activeTab === 'text' && !textInput) || (activeTab !== 'text' && !selectedFile)}
              className={`w-full mt-6 py-4 bg-violet-600 text-white font-bold rounded-xl shadow-lg shadow-violet-200 dark:shadow-none flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] hover:bg-violet-700
                ${isScanning ? 'opacity-80 cursor-wait' : ''}
                ${((activeTab === 'text' && !textInput) || (activeTab !== 'text' && !selectedFile)) && !isScanning ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              {isScanning ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Analyzing Content...
                </>
              ) : (
                <>
                  <Search size={20} />
                  Run Deep Scan
                </>
              )}
            </button>
          </div>
        </div>

        {result && (
          <div className={`p-8 border-t border-gray-100 dark:border-gray-700 ${result.riskScore > 50 ? 'bg-red-50/50 dark:bg-red-900/10' : 'bg-green-50/50 dark:bg-green-900/10'}`}>
            <div className="flex items-center gap-4 mb-6">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl font-bold shadow-sm ${result.riskScore > 50 ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' : 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'}`}>
                {result.riskScore}
              </div>
              <div>
                <h3 className={`text-xl font-black uppercase tracking-wide ${result.riskScore > 50 ? 'text-red-700 dark:text-red-400' : 'text-green-700 dark:text-green-400'}`}>
                  {result.category}
                </h3>
                <p className="text-gray-500 dark:text-gray-400 font-medium">
                  Confidence: <span className="text-gray-900 dark:text-gray-100">{Math.round((result.confidence || 0) * 100)}%</span>
                </p>
              </div>
            </div>

            {result.userSummary && typeof result.userSummary === 'object' && (
              <div className="mb-6 bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                <h4 className="flex items-center gap-2 font-bold text-gray-800 dark:text-gray-200 mb-2">
                  <MessageSquare size={16} className="text-violet-500" />
                  AI Analysis
                </h4>
                <div className="space-y-3">
                  <p className="font-bold text-lg text-gray-900 dark:text-white">
                    {result.userSummary.verdict || "Analysis Complete"}
                  </p>
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-sm">
                    {result.userSummary.reason}
                  </p>
                  {result.userSummary.triggers && result.userSummary.triggers.length > 0 && (
                    <div className="mt-3 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-100 dark:border-red-900/30">
                      <p className="text-xs font-bold text-red-800 dark:text-red-400 uppercase mb-1">Detected Triggers:</p>
                      <ul className="list-disc list-inside space-y-1">
                        {result.userSummary.triggers.map((trigger: string, idx: number) => (
                          <li key={idx} className="text-sm text-red-700 dark:text-red-400 font-medium">{trigger}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                <h4 className="font-bold text-xs text-gray-400 uppercase mb-3 flex items-center gap-2">
                  <Database size={12} /> Model Logic
                </h4>
                <ul className="space-y-2">
                  {result.explanation?.map((item: string, i: number) => (
                    <li key={i} className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-violet-500 mt-1.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                <h4 className="font-bold text-xs text-gray-400 uppercase mb-3 flex items-center gap-2">
                  <Cpu size={12} /> Model Details
                </h4>
                {result.modelDetails && (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Architecture</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{result.modelDetails.architecture}</p>
                    <p className="text-xs text-gray-500 mt-2 uppercase tracking-wider">Features Analyzed</p>
                    <div className="flex flex-wrap gap-2">
                      {result.modelDetails.featuresAnalysed?.map((f: string, i: number) => (
                        <span key={i} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-[10px] font-bold uppercase rounded">
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className={`mt-6 p-5 rounded-xl border transition-all ${result.ledger?.status === 'confirmed' ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-800' : 'bg-gray-50 dark:bg-gray-900/50 border-gray-100 dark:border-gray-700'}`}>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {result.ledger?.status === 'confirmed' ? (
                      <div className="flex items-center gap-1.5 px-2 py-0.5 bg-indigo-600 text-white text-[10px] font-black uppercase rounded-md shadow-sm">
                        <ShieldCheck size={12} /> Hedera Public Ledger
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${result.ledger?.status === 'pending' ? 'bg-orange-400 animate-pulse' : 'bg-gray-300'}`} />
                        <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Public Consensus Registry</p>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-tight">Consensus Proof Hash (SHA-256)</span>
                    <div className="font-mono text-[10px] text-gray-900 dark:text-gray-300 break-all bg-white/50 dark:bg-gray-800/50 p-1.5 rounded border border-gray-100 dark:border-gray-700 mt-1 select-all">
                      {result.evidenceHash}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {result.ledger?.status === 'pending' && (
                    <span className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 text-[10px] font-bold rounded-lg border border-blue-100 dark:border-blue-900/30 flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping" />
                      Reaching Consensus on Hedera...
                    </span>
                  )}
                  {result.ledger?.explorerUrl && (
                    <a
                      href={result.ledger.explorerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-gray-900 dark:bg-gray-700 text-white text-[11px] font-bold rounded-xl hover:bg-gray-800 dark:hover:bg-gray-600 transition-all flex items-center gap-2 shadow-lg shadow-gray-200 dark:shadow-none"
                    >
                      <LinkIcon size={14} /> View Public Record
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScanPage;
