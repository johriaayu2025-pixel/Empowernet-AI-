# EmpowerNet: AI Forensic Security Suite

EmpowerNet is a cutting-edge forensic security platform designed to detect and verify digital threats in real-time. By combining advanced AI analysis with the **Hedera Consensus Service**, EmpowerNet provides immutable evidence logs for images, video, audio, and web content.

## 🚀 Overview
EmpowerNet mission is to restore trust in digital media. Whether it's a deepfake video or a sophisticated phishing site, EmpowerNet analyzes the content and anchors the results to a public ledger for lifetime verification.

## 🛠️ Tech Stack
- onsensus**Frontend**: React, Vite, Tailwind CSS, Zustand
- **Backend**: FastAPI (Python), TIMM (EfficientNet-B5), MTCNN
- **Ledger**: Hedera C Service (HCS)
- **Extension**: Chrome Extension Manifest V3
- **Forensics**: jsPDF for evidence reporting

## 🏛️ Architecture
1. **Detection Layer**: ML models analyze media for manipulation and text for scam patterns.
2. **Consensus Layer**: SHA-256 hashes of results are submitted to Hedera HCS to create a tamper-evident audit trail.
3. **Verification Layer**: Users can validate any forensic report against the public ledger to ensure its authenticity.

## 📦 Deployment

### Prerequisites
- Python 3.9+
- Node.js 18+
- Hedera Testnet Account (Optional: falls back to Local Forensic Registry)

### Backend Setup
1. `cd backend`
2. `pip install -r requirements.txt`
3. `uvicorn main:app --reload`

### Frontend Setup
1. `npm install`
2. `npm run dev`

### Extension Setup
1. Open Chrome → `chrome://extensions`
2. Enable "Developer Mode"
3. "Load unpacked" → select `empowernet-extension` folder.

## 🛡️ Verification
Every scan generates a **Forensic ID**. This ID can be cross-referenced with the Hedera network using the internal validation tool or any HCS-compatible explorer (e.g., HashScan).

---
*Built for the Future of Digital Trust.*
