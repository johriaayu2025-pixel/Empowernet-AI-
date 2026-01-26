
import React, { useState, useRef } from 'react';
import { Upload, ShieldCheck, Zap, Info, ShieldAlert, X, FileVideo, FileImage, Mic, AlertCircle, Database, Cpu } from 'lucide-react';
import { analyzeMediaDeepfake, ScanResult } from '../services/ml_models';
import { useAppStore } from '../store/useAppStore';

const DeepfakeDetection: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const addScan = useAppStore(state => state.addScan);
  const addAlert = useAppStore(state => state.addAlert);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setResult(null);
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const clearSelection = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;
    setIsScanning(true);
    setError(null);

    try {
      const reader = new FileReader();
      const filePromise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
      });

      reader.readAsDataURL(selectedFile);
      const base64 = await filePromise;

      let mediaType: 'image' | 'video' | 'audio' = 'image';
      if (selectedFile.type.startsWith('video/')) mediaType = 'video';
      if (selectedFile.type.startsWith('audio/')) mediaType = 'audio';

      const res = await analyzeMediaDeepfake(base64, selectedFile.type, mediaType, selectedFile.name);

      setResult(res);
      addScan({
        id: Date.now().toString(),
        label: `[DEEP-FORENSIC]: ${selectedFile.name.length > 25 ? selectedFile.name.substring(0, 22) + '...' : selectedFile.name}`,
        status: res.category.toLowerCase(),
        confidence: `${Math.round(res.confidence * 100)}%`,
        date: new Date().toLocaleString(),
        tag: res.category,
        type: mediaType.toUpperCase(),
        hash: res.evidenceHash
      });

      if (res.riskScore > 60) {
        addAlert({
          type: `${res.category} Detected`,
          desc: res.explanation.join('. '),
          severity: res.riskScore > 85 ? 'CRITICAL' : 'HIGH',
          time: new Date().toLocaleString(),
          source: selectedFile.name
        });
      }
    } catch (err) {
      setError(`Analysis failed. Ensure the AI backend is reachable. ${import.meta.env.DEV ? 'Check port 8001.' : ''}`);
      console.error(err);
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white transition-colors">Deepfake Detection</h1>
        <p className="text-gray-500 dark:text-gray-400">Upload images, videos, or audio files for AI-powered deepfake analysis</p>
      </div>

      <div className="bg-white dark:bg-gray-800 p-1 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-xl overflow-hidden transition-colors">
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          onChange={handleFileChange}
          accept="image/*,video/*,audio/*"
        />

        <div className="p-8 border-2 border-dashed border-gray-100 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-gray-900/50 flex flex-col items-center justify-center min-h-[400px] relative">
          {!selectedFile ? (
            <div onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center cursor-pointer group">
              <div className="mb-6 flex items-center gap-2">
                <ShieldAlert className="text-violet-600 dark:text-violet-400" size={20} />
                <h2 className="text-lg font-bold dark:text-gray-200">Upload Media for Analysis</h2>
              </div>
              <div className="p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-sm flex flex-col items-center group-hover:shadow-md transition-all border border-gray-100 dark:border-gray-700">
                <div className="w-16 h-16 bg-violet-50 dark:bg-violet-900/30 rounded-full flex items-center justify-center text-violet-600 dark:text-violet-400 mb-4 group-hover:scale-110 transition-transform">
                  <Upload size={32} />
                </div>
                <p className="text-sm font-bold text-gray-700 dark:text-gray-200">Choose file</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Images, Videos, or Audio</p>
              </div>
            </div>
          ) : (
            <div className="w-full max-w-lg space-y-4">
              <div className="relative aspect-video bg-black rounded-xl overflow-hidden flex items-center justify-center border border-gray-200 dark:border-gray-700">
                <button
                  onClick={clearSelection}
                  className="absolute top-4 right-4 p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/40 z-20"
                >
                  <X size={20} />
                </button>
                {selectedFile.type.startsWith('image/') && previewUrl && (
                  <img src={previewUrl} className="max-h-full object-contain" />
                )}
                {selectedFile.type.startsWith('video/') && previewUrl && (
                  <video src={previewUrl} className="max-h-full w-full object-contain" controls />
                )}
                {selectedFile.type.startsWith('audio/') && (
                  <div className="flex flex-col items-center text-white">
                    <Mic size={64} className="mb-4" />
                    <p className="font-bold">{selectedFile.name}</p>
                  </div>
                )}
              </div>
              <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-100 dark:border-gray-700">
                <span className="font-bold">{selectedFile.name}</span>
                <span>{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</span>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={handleAnalyze}
          disabled={!selectedFile || isScanning}
          className={`w-full py-4 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold flex items-center justify-center gap-2 transition-all ${(!selectedFile || isScanning) ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90 active:scale-[0.99]'}`}
        >
          {isScanning ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Executing Neural Inference...
            </>
          ) : (
            <>
              <Zap size={20} />
              Analyze for Deepfake
            </>
          )}
        </button>
      </div>

      {result && (
        <div className={`p-8 rounded-2xl border ${result.riskScore > 60 ? 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800' : 'bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800'} animate-in fade-in slide-in-from-bottom-4 duration-500 shadow-lg shadow-gray-100 dark:shadow-none transition-colors`}>
          <div className="flex items-center gap-4 mb-6">
            <div className={`p-3 rounded-xl ${result.riskScore > 60 ? 'bg-red-600' : 'bg-green-600'} text-white shadow-lg`}>
              {result.riskScore > 60 ? <AlertCircle size={32} /> : <ShieldCheck size={32} />}
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-2xl font-black dark:text-white">{result.category} Content Detected</h3>
                  <p className="text-sm font-medium opacity-70 dark:text-gray-300">Detection Score: {result.riskScore}/100</p>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-1">Confidence</div>
                  <div className="text-2xl font-black text-violet-600 dark:text-violet-400">{Math.round(result.confidence * 100)}%</div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400 flex items-center gap-2">
                <Cpu size={14} /> Forensic Artifacts Found
              </h4>
              <div className="flex flex-wrap gap-2">
                {result.explanation.map((item, i) => (
                  <span key={i} className="px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg text-xs font-bold text-gray-700 dark:text-gray-200 shadow-sm flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${result.riskScore > 60 ? 'bg-red-500' : 'bg-green-500'}`} />
                    {item}
                  </span>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400 flex items-center gap-2">
                <Database size={14} /> Neural Metadata
              </h4>
              <div className="bg-white/60 dark:bg-gray-800/60 p-4 rounded-xl border border-gray-100 dark:border-gray-700 space-y-3 font-mono">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-gray-400 dark:text-gray-500">ARCH:</span>
                  <span className="text-violet-600 dark:text-violet-400 font-bold">{result.modelDetails.architecture}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {result.modelDetails.featuresAnalysed.map((f, i) => (
                    <span key={i} className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-900 rounded text-[9px] text-gray-500 dark:text-gray-400 uppercase">{f}</span>
                  ))}
                </div>
                <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                  <p className="text-[9px] text-gray-400 dark:text-gray-500 mb-1 uppercase">Evidence Hash</p>
                  <p className="text-[10px] truncate text-gray-600 dark:text-gray-400">{result.evidenceHash}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* How it works */}
      <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm transition-colors">
        <h3 className="font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <Info className="text-violet-600 dark:text-violet-400" size={18} />
          How It Works
        </h3>
        <ul className="space-y-4">
          {[
            'Our AI analyzes facial features, lighting, and pixel-level artifacts in images',
            'Videos are examined frame-by-frame for temporal inconsistencies',
            'Audio files are checked for voice cloning, pitch manipulation, and synthetic patterns',
            'Results include confidence scores and detailed indicator explanations'
          ].map((text, i) => (
            <li key={i} className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-300">
              <div className="w-1.5 h-1.5 rounded-full bg-violet-600 dark:bg-violet-400 mt-1.5"></div>
              {text}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default DeepfakeDetection;
