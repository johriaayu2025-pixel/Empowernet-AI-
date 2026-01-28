import React, { useState } from 'react';
import {
  Database,
  Download,
  ExternalLink,
  ShieldCheck,
  X,
  FileText,
  Cpu,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { verifyEvidence } from '../services/api';
import { jsPDF } from 'jspdf';

const EvidenceLog: React.FC = () => {
  /* ===============================
     SAFE STORE ACCESS
  ================================ */
  const rawScans = useAppStore((state) => state.scans);
  const scans = Array.isArray(rawScans) ? rawScans : [];

  const verifyScan = useAppStore((state) => state.verifyScan);

  const [selectedScan, setSelectedScan] = useState<any>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [currentVerifyingId, setCurrentVerifyingId] = useState<string | null>(null);

  const handleVerify = async (id: string, hash: string) => {
    setIsVerifying(true);
    setCurrentVerifyingId(id);
    try {
      const res = await verifyEvidence(hash);
      verifyScan(id, res);
      // If modal is open for this scan, update it locally too
      if (selectedScan && selectedScan.id === id) {
        setSelectedScan({ ...selectedScan, verificationStatus: res.status === 'verified' ? 'verified' : 'failed' });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsVerifying(false);
      setCurrentVerifyingId(null);
    }
  };

  const downloadPDF = (scan: any) => {
    const doc = new jsPDF();
    const margin = 20;
    const lineHeight = 10;
    let y = margin;

    // Header
    doc.setFontSize(22);
    doc.setTextColor(139, 92, 246); // violet-600
    doc.text("EMPOWERNET FORENSIC AUDIT", margin, y);
    y += lineHeight * 1.5;

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Report ID: EV-2025-${scan.id.slice(-6).toUpperCase()}`, margin, y);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 120, y);
    y += lineHeight * 2;

    // Scan Details
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text("SCAN ANALYSIS SUMMARY", margin, y);
    y += lineHeight;

    doc.setFontSize(11);
    const details = [
      ["Target Label:", scan.label || "N/A"],
      ["Content Type:", scan.type.toUpperCase()],
      ["Analysis Date:", scan.date],
      ["Result Status:", scan.status.toUpperCase()],
      ["Confidence Score:", scan.confidence]
    ];

    details.forEach(([label, value]) => {
      doc.setFont("helvetica", "bold");
      doc.text(label, margin, y);
      doc.setFont("helvetica", "normal");
      doc.text(value, margin + 45, y);
      y += 8;
    });

    y += lineHeight;

    // Blockchain Evidence
    doc.setFontSize(14);
    doc.text("BLOCKCHAIN EVIDENCE PROOF", margin, y);
    y += lineHeight;

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Evidence Hash (SHA-256):", margin, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(scan.hash, margin, y, { maxWidth: 170 });
    y += 12;

    doc.setFontSize(11);
    doc.text("Blockchain Network:", margin, y);
    doc.text("Polygon Amoy Testnet (EVM)", margin + 45, y);
    y += 8;
    doc.text("Transaction Hash:", margin, y);
    doc.setFontSize(9);
    doc.text(scan.blockchainTx || "N/A", margin + 45, y, { maxWidth: 125 });
    y += lineHeight;

    // Verification Statement
    y = 250;
    doc.setFontSize(9);
    doc.setTextColor(139, 92, 246);
    doc.setFont("helvetica", "bold");
    doc.text("VERIFICATION STATEMENT", margin, y);
    y += 6;
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.setFont("helvetica", "normal");
    doc.text("This report is cryptographically verifiable and anchored on the Polygon blockchain.", margin, y);
    y += 4;
    doc.text("Any modification to the original file or this document invalidates this digital proof.", margin, y);

    doc.save(`Forensic_Report_${scan.id}.pdf`);
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center justify-between transition-colors">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <Database size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white transition-colors">Forensic Evidence Log</h1>
            <p className="text-gray-500 dark:text-gray-400 font-medium">
              Cryptographically secured public consensus proofs
            </p>
          </div>
        </div>
        <span className="text-xs font-bold bg-violet-600 text-white px-4 py-2 rounded-full shadow-lg">
          ✅ Polygon Amoy Testnet
        </span>
      </div>

      {/* TABLE */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-x-auto transition-colors">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-900/50 text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-gray-700">
              <th className="px-6 py-4">Timestamp</th>
              <th className="px-6 py-4">Type</th>
              <th className="px-6 py-4">Content</th>
              <th className="px-6 py-4">Confidence</th>
              <th className="px-6 py-4">Forensic Proof Hash</th>
              <th className="px-6 py-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
            {scans.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-6 py-10 text-center text-sm text-gray-400 italic"
                >
                  No forensic evidence records available yet.
                </td>
              </tr>
            )}

            {scans.map((r, i) => (
              <tr
                key={i}
                className="hover:bg-gray-50/50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <td className="px-6 py-4 text-xs font-medium text-gray-600 dark:text-gray-300">
                  {r.date}
                </td>
                <td className="px-6 py-4">
                  <span className={`text-[10px] font-bold px-2 py-1 rounded ${r.tag === 'RED FLAG' ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' : 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'}`}>
                    {r.tag}
                  </span>
                </td>
                <td className="px-6 py-4 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase">
                  {r.type}
                </td>
                <td className="px-6 py-4 text-xs font-bold text-gray-700 dark:text-gray-200">
                  {r.confidence}
                </td>
                <td className="px-6 py-4 font-mono text-[10px] text-gray-400 dark:text-gray-500 break-all">
                  {r.hash}
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => setSelectedScan(r)}
                      className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold hover:underline"
                    >
                      <ExternalLink size={12} />
                      View Certificate
                    </button>
                    <button
                      onClick={() => handleVerify(r.id, r.hash)}
                      disabled={isVerifying && currentVerifyingId === r.id}
                      className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black tracking-wider uppercase transition-all ${r.verificationStatus === 'verified'
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200'
                          : r.verificationStatus === 'failed'
                            ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border border-gray-200 hover:bg-gray-200'
                        }`}
                    >
                      {isVerifying && currentVerifyingId === r.id ? (
                        <Loader2 size={10} className="animate-spin" />
                      ) : (
                        <ShieldCheck size={10} />
                      )}
                      {r.verificationStatus === 'verified' ? 'Verified' : r.verificationStatus === 'failed' ? 'Retry' : 'Verify'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL */}
      {selectedScan && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-white dark:bg-gray-800 rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="bg-violet-600 dark:bg-violet-700 p-8 text-white relative">
              <button
                onClick={() => {
                  setSelectedScan(null);
                }}
                className="absolute top-4 right-4 text-white/80 hover:text-white"
              >
                <X size={24} />
              </button>
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-md">
                  <ShieldCheck size={32} />
                </div>
                <div>
                  <h2 className="text-xl font-bold uppercase tracking-tight">
                    Forensic Evidence Certificate
                  </h2>
                  <p className="text-sm opacity-80 font-medium">
                    "This report is cryptographically verifiable and anchored on the Polygon blockchain."
                  </p>
                </div>
              </div>
            </div>

            <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
              {/* 1. Analysis Summary */}
              <div className="space-y-4">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2">1. Analysis Summary</h3>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Resource Origin</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{selectedScan.label}</p>
                  </div>
                  <div className="space-y-1 text-right">
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Forensic Verdict</p>
                    <span className={`text-[10px] font-black px-2 py-1 rounded-md uppercase ${selectedScan.status === 'SCAM' || selectedScan.status === 'DEEPFAKE' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                      {selectedScan.status}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl">
                  <div>
                    <p className="text-[9px] font-bold text-gray-400 uppercase">Type</p>
                    <p className="text-xs font-bold dark:text-white">{selectedScan.type}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-gray-400 uppercase">Confidence</p>
                    <p className="text-xs font-bold dark:text-white">{selectedScan.confidence}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-gray-400 uppercase">Timestamp</p>
                    <p className="text-[10px] font-medium dark:text-white">{selectedScan.date.split(',')[0]}</p>
                  </div>
                </div>
              </div>

              {/* 2. Blockchain Evidence (NEW) */}
              <div className="space-y-4">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2">2. Blockchain Evidence</h3>

                <div className="space-y-3">
                  <div className="p-4 bg-gray-50 dark:bg-gray-900/80 rounded-xl border border-gray-100 dark:border-gray-700">
                    <p className="text-[9px] font-bold text-gray-400 uppercase mb-2">Evidence Hash (SHA-256)</p>
                    <p className="font-mono text-[10px] text-gray-800 dark:text-gray-300 break-all select-all">{selectedScan.hash}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 dark:bg-gray-900/80 rounded-xl border border-gray-100 dark:border-gray-700">
                      <p className="text-[9px] font-bold text-gray-400 uppercase mb-1">Network</p>
                      <p className="text-xs font-bold dark:text-white flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 bg-violet-500 rounded-full" />
                        Polygon Amoy
                      </p>
                    </div>
                    <div className="p-4 bg-gray-50 dark:bg-gray-900/80 rounded-xl border border-gray-100 dark:border-gray-700">
                      <p className="text-[9px] font-bold text-gray-400 uppercase mb-1">Status</p>
                      <p className={`text-xs font-bold ${selectedScan.verificationStatus === 'verified' ? 'text-green-600' : 'text-gray-500'}`}>
                        {selectedScan.verificationStatus === 'verified' ? 'Verified (On-Chain)' : 'Unverified'}
                      </p>
                    </div>
                  </div>

                  {selectedScan.blockchainTx && (
                    <div className="p-4 bg-gray-50 dark:bg-gray-900/80 rounded-xl border border-gray-100 dark:border-gray-700">
                      <p className="text-[9px] font-bold text-gray-400 uppercase mb-2">Transaction Hash</p>
                      <a
                        href={`https://amoy.polygonscan.com/tx/${selectedScan.blockchainTx}`}
                        target="_blank"
                        className="font-mono text-[9px] text-indigo-600 hover:underline break-all"
                      >
                        {selectedScan.blockchainTx}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-4 pt-2">
                <button
                  onClick={() => handleVerify(selectedScan.id, selectedScan.hash)}
                  disabled={isVerifying}
                  className="flex-1 py-4 bg-violet-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-violet-700 transition-all shadow-lg"
                >
                  {isVerifying ? <Loader2 size={18} className="animate-spin" /> : <ShieldCheck size={18} />}
                  Validate Consensus
                </button>
                <button
                  onClick={() => downloadPDF(selectedScan)}
                  className="flex-1 py-4 border border-gray-200 dark:border-gray-700 rounded-xl font-bold text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all flex items-center justify-center gap-2"
                >
                  <Download size={18} />
                  Download Forensic PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EvidenceLog;
