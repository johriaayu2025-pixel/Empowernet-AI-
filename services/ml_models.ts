
import { runScan } from './api';

export interface ScanResult {
  riskScore: number;
  confidence: number;
  category: 'Safe' | 'Suspicious' | 'Fraudulent' | 'Deepfake' | 'REAL' | 'SCAM' | 'FAKE' | 'DEEPFAKE';
  explanation: string[];
  evidenceHash: string;
  modelDetails: {
    architecture: string;
    featuresAnalysed: string[];
  };
  userSummary?: {
    verdict: string;
    reason: string;
    triggers: string[];
  };
}

/**
 * Deterministic SHA-256 Simulation for Evidence Logging
 */
const generateEvidenceHash = (data: string) => {
  return '0x' + Array.from(data.substring(0, 1000)).reduce((hash, char) => 0 | (hash * 31 + char.charCodeAt(0)), 0).toString(16).padStart(40, '0');
};

/**
 * TEXT SCAM DETECTION (Now runs on Local Backend)
 */
export const analyzeTextScam = async (text: string): Promise<ScanResult> => {
  const res = await runScan({
    type: 'text',
    content: text,
    label: 'Deepfake Page Text Input'
  });

  return {
    riskScore: res.riskScore,
    confidence: res.confidence,
    category: res.category,
    explanation: res.explanation || [],
    evidenceHash: generateEvidenceHash(text),
    modelDetails: res.modelDetails || { architecture: "Local RoBERTa-Spam", featuresAnalysed: [] },
    userSummary: res.userSummary
  };
};

/**
 * MULTIMODAL FORENSIC DETECTION (Now runs on Local Backend)
 */
export const analyzeMediaDeepfake = async (base64Data: string, mimeType: string, type: 'image' | 'video' | 'audio', filename?: string): Promise<ScanResult> => {

  const res = await runScan({
    type: type,
    content: base64Data, // backend expects raw base64 without prefix
    label: filename || `Deepfake Page ${type} Scan`
  });

  return {
    riskScore: res.riskScore,
    confidence: res.confidence,
    category: res.category,
    explanation: res.explanation || [],
    evidenceHash: generateEvidenceHash(base64Data.substring(0, 100)),
    modelDetails: res.modelDetails || { architecture: "Local Forensic Engine", featuresAnalysed: [] },
    userSummary: res.userSummary
  };
};
