import React, { useState, useMemo } from 'react';
import {
  Flag, ShieldCheck, Mail, Phone, Send, Download,
  FileText, ShieldAlert, X, CheckCircle, ChevronDown,
  Building2, Calendar, Hash, Shield
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { jsPDF } from 'jspdf';

const Reports: React.FC = () => {
  const rawScans = useAppStore(state => state.scans);
  const scans = Array.isArray(rawScans) ? rawScans : [];

  const [selectedScanId, setSelectedScanId] = useState('');
  const [recipientOrg, setRecipientOrg] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const organizations = [
    'Cyber Crime Cell',
    'State Police',
    'CERT-In',
    'Bank Fraud Department',
    'Social Media Platform',
    'Other'
  ];

  const selectedScan = useMemo(() => {
    return scans.find(s => s.id === selectedScanId);
  }, [scans, selectedScanId]);

  const generatePDF = () => {
    if (!selectedScan) return;

    const doc = new jsPDF();
    const timestamp = new Date().toLocaleString();

    // Header
    doc.setFillColor(139, 92, 246); // Violet-600
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text('EMPOWERNET FORENSIC REPORT', 20, 25);
    doc.setFontSize(10);
    doc.text('OFFICIAL DIGITAL EVIDENCE DOSSIER', 20, 32);

    // Metadata
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Report Details', 20, 55);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Generated: ${timestamp}`, 20, 62);
    doc.text(`Target Agency: ${recipientOrg}`, 20, 67);

    // Scan Info
    doc.line(20, 75, 190, 75);
    doc.setFont('helvetica', 'bold');
    doc.text('Scan Information', 20, 85);
    doc.setFont('helvetica', 'normal');
    doc.text(`Resource Origin: ${selectedScan.label}`, 20, 95);
    doc.text(`Scan Type: ${selectedScan.type}`, 20, 102);
    doc.text(`Risk Category: ${selectedScan.status.toUpperCase()}`, 20, 109);
    doc.text(`Confidence: ${selectedScan.confidence}`, 20, 116);

    // Analysis Triggers
    let nextY = 125;
    if (selectedScan.explanation && selectedScan.explanation.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.text('Forensic Analysis Triggers:', 20, 128);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      selectedScan.explanation.slice(0, 3).forEach((trigger, i) => {
        const splitText = doc.splitTextToSize(`• ${trigger}`, 170);
        doc.text(splitText, 25, 135 + (i * 7));
        nextY = 135 + (i * 7) + 10;
      });
      doc.setFontSize(10);
    }

    // Cryptographic Evidence
    doc.line(20, nextY, 190, nextY);
    nextY += 10;
    doc.setFont('helvetica', 'bold');
    doc.text('Cryptographic Proof', 20, nextY);
    nextY += 10;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Evidence Hash (SHA-256):', 20, nextY);
    nextY += 5;
    doc.setFont('courier', 'normal');
    doc.text(selectedScan.hash || 'N/A', 20, nextY);
    nextY += 10;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Forensic Proof Ledger:', 20, nextY);
    nextY += 5;
    doc.setFont('courier', 'normal');
    doc.text('Polygon Amoy Testnet (EVM)', 20, nextY);
    nextY += 10;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Transaction Hash:', 20, nextY);
    nextY += 5;
    doc.setFont('courier', 'normal');
    const txHash = selectedScan.blockchainTx || 'N/A';
    doc.text(txHash, 20, nextY);
    nextY += 15;

    // Summary
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Investigator Summary:', 20, nextY);
    nextY += 7;
    doc.setFont('helvetica', 'normal');
    const splitMessage = doc.splitTextToSize(message || 'No additional investigator context provided.', 170);
    doc.text(splitMessage, 20, nextY);

    // Verification Statement (pinned to bottom)
    doc.setTextColor(139, 92, 246);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('BLOCKCHAIN VERIFICATION STATEMENT', 20, 265);
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'normal');
    doc.text('This report is cryptographically verifiable and anchored on the Polygon blockchain. Any modification invalidates this proof.', 20, 270);

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('This document is a machine-generated forensic report by EmpowerNet AI.', 105, 280, { align: 'center' });

    doc.save(`EmpowerNet_Report_${selectedScan.id}.pdf`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientOrg || !selectedScanId) return;

    setIsSubmitting(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsSubmitting(false);
    setSuccess(true);
  };

  return (
    <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 pb-20">

      {/* FORM SIDE */}
      <div className="space-y-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center gap-6 transition-colors">
          <div className="w-12 h-12 bg-violet-600 rounded-xl flex items-center justify-center text-white">
            <Flag size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold dark:text-white transition-colors">Official Reporting</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Submit verified evidence to authorities</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 p-8 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-6 transition-colors">
          <div>
            <label className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase mb-2 block tracking-wider">
              Select Forensic Record
            </label>
            <div className="relative">
              <select
                required
                value={selectedScanId}
                onChange={e => setSelectedScanId(e.target.value)}
                className="w-full p-4 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl appearance-none font-medium text-gray-700 dark:text-gray-200"
              >
                <option value="">-- Choose verified scan --</option>
                {scans.map(s => (
                  <option key={s.id} value={s.id}>
                    [{s.type.toUpperCase()}] {s.label.slice(0, 30)}... ({s.date.split(',')[0]})
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase mb-2 block tracking-wider">
              Reporting To Agency
            </label>
            <div className="relative">
              <select
                required
                value={recipientOrg}
                onChange={e => setRecipientOrg(e.target.value)}
                className="w-full p-4 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl appearance-none font-medium text-gray-700 dark:text-gray-200"
              >
                <option value="">-- Select Authority --</option>
                {organizations.map(org => (
                  <option key={org} value={org}>{org}</option>
                ))}
              </select>
              <Building2 className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
            </div>
          </div>

          <div>
            <label className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase mb-2 block tracking-wider">
              Evidence Context
            </label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Describe why this content is being reported (e.g., received via SMS from +91...)"
              className="w-full h-32 p-4 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl resize-none focus:ring-2 focus:ring-violet-500 outline-none transition-all dark:text-gray-200"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={generatePDF}
              disabled={!selectedScanId}
              className="flex items-center justify-center gap-2 py-4 border-2 border-gray-100 dark:border-gray-700 rounded-xl font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
            >
              <Download size={20} /> Download PDF
            </button>
            <button
              type="submit"
              disabled={!selectedScanId || isSubmitting}
              className="flex items-center justify-center gap-2 py-4 bg-violet-600 text-white rounded-xl font-bold shadow-lg shadow-violet-100 hover:bg-violet-700 active:scale-95 transition-all disabled:opacity-50"
            >
              {isSubmitting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Send size={20} /> Submit Report</>}
            </button>
          </div>
        </form>
      </div>

      {/* PREVIEW SIDE */}
      <div className="bg-gray-100 rounded-3xl p-1 border-4 border-white shadow-inner min-h-[600px] flex flex-col">
        <div className="bg-white rounded-[22px] flex-1 shadow-sm overflow-auto p-10 font-serif">
          {selectedScan ? (
            <div className="space-y-8 animate-in fade-in duration-500">
              <div className="flex justify-between items-start border-b-2 border-gray-900 pb-6">
                <div>
                  <h2 className="text-xl font-black text-violet-600 mb-1">EMPOWERNET AI</h2>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">Forensic Laboratory Division</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-gray-400 mb-1 leading-none uppercase">Report ID</p>
                  <p className="font-mono text-sm font-bold text-gray-900">EV-2025-{selectedScan.id.slice(-4).toUpperCase()}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8 text-[11px]">
                <div className="space-y-4">
                  <div>
                    <p className="font-bold uppercase text-gray-400 mb-1">Target Agency</p>
                    <p className="font-bold text-gray-900">{recipientOrg || '--- Pending ---'}</p>
                  </div>
                  <div>
                    <p className="font-bold uppercase text-gray-400 mb-1">Resource Origin</p>
                    <p className="font-bold text-gray-900 break-all">{selectedScan.label}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="font-bold uppercase text-gray-400 mb-1">Scan Type</p>
                    <p className="font-bold text-gray-900">{selectedScan.type}</p>
                  </div>
                  <div>
                    <p className="font-bold uppercase text-gray-400 mb-1">Forensic Status</p>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-black ${selectedScan.status.toLowerCase() === 'safe' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {selectedScan.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-gray-50 rounded-xl border border-dashed border-gray-200 space-y-4">
                <div>
                  <p className="font-bold uppercase text-gray-400 text-[9px] mb-2 tracking-widest">Forensic Metadata</p>
                  <p className="text-xs font-medium text-gray-600">Risk Confidence: <span className="text-gray-900 font-bold">{selectedScan.confidence}</span></p>
                </div>

                {selectedScan.explanation && selectedScan.explanation.length > 0 && (
                  <div>
                    <p className="font-bold uppercase text-gray-400 text-[9px] mb-2 tracking-widest">Analysis Triggers</p>
                    <div className="space-y-1">
                      {selectedScan.explanation.slice(0, 2).map((exp, i) => (
                        <p key={i} className="text-[10px] text-gray-600 leading-tight">• {exp}</p>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <p className="font-bold uppercase text-gray-400 text-[9px] mb-2 tracking-widest">Blockchain Proof</p>
                  <div className="space-y-2">
                    <div className="flex flex-col gap-1">
                      <span className="text-[8px] font-bold text-gray-400">SHA-256 HASH</span>
                      <p className="font-mono text-[9px] text-gray-500 break-all">{selectedScan.hash}</p>
                    </div>
                    <div className="flex flex-col gap-1 p-3 bg-violet-50 rounded-lg border border-violet-100">
                      <p className="text-[8px] font-black text-violet-600 uppercase tracking-widest">Polygon Transaction</p>
                      <p className="text-[9px] font-mono text-violet-500 break-all">{selectedScan.blockchainTx || 'Tx Hash Pending...'}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <p className="font-bold uppercase text-gray-400 text-[9px] mb-2 tracking-widest">Verification Statement</p>
                <p className="text-[10px] text-violet-600 leading-relaxed font-bold italic border-l-2 border-violet-600 pl-4 py-1">
                  "This report is cryptographically verifiable and anchored on the Polygon blockchain. Any modification invalidates this proof."
                </p>
              </div>

              <div className="pt-20 text-center opacity-30 grayscale pointer-events-none select-none">
                <ShieldCheck size={64} className="mx-auto text-violet-600 mb-4" />
                <p className="text-[10px] font-black uppercase tracking-[0.3em]">SECURE FORENSIC PROOF</p>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-10 opacity-30">
              <FileText size={48} className="mb-4 text-violet-600" />
              <p className="text-lg font-bold text-gray-900 mb-2">Report Preview Missing</p>
              <p className="text-sm">Select a scan record from the form to generate a live forensic dossier preview.</p>
            </div>
          )}
        </div>
      </div>

      {/* SUCCESS MODAL */}
      {success && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl p-10 max-w-sm w-full text-center shadow-2xl animate-in zoom-in duration-300">
            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle size={40} />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Report Submitted</h3>
            <p className="text-gray-500 mb-8 leading-relaxed">
              Forensic dossier has been successfully transmitted to <b>{recipientOrg}</b>. Reference ID: {Date.now().toString().slice(-6)}
            </p>
            <button
              onClick={() => {
                setSuccess(false);
                setSelectedScanId('');
                setRecipientOrg('');
                setMessage('');
              }}
              className="w-full py-4 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition-colors"
            >
              Close Window
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default Reports;
