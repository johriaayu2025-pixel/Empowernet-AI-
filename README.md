# 🛡️ EmpowerNet AI  
**Multi-Modal Deepfake & Scam Detection Platform**

EmpowerNet AI is an explainable, multi-modal security system that detects **scams, phishing, social engineering, and AI-generated deepfakes** across **text, images, audio, and video**.  
It combines transformer models, computer vision, signal forensics, and heuristic risk scoring to deliver **real-time, trustworthy threat analysis**.


DEMO VIDEO-https://drive.google.com/file/d/1N0-l76tcmqyVLoJneCnO7WZ6s42YjIZt/view?usp=sharing
PPT-https://drive.google.com/file/d/1ZtSXO3dTaolsT6nSjgyIdRULqXTgTIYL/view?usp=sharing

---

# 🚀 Features

## 🔎 Text Analysis
Detects phishing, fraud intent, coercion, and social-engineering language.

**Models & Methods**
- `mshenoda/roberta-spam` → Scam, phishing, and financial fraud detection  
- `unitary/toxic-bert` → Threats, blackmail, harassment, coercion detection  
- **Heuristic Risk Engine** → Boosts risk when:
  - Urgency language is present  
  - Financial pressure is detected  
  - Authority impersonation appears  
  - Emotional manipulation is used  

**Output:** Risk score + detected scam signals

---

## 🖼️ Image Analysis
Detects manipulated images and deepfakes using AI + forensic techniques.

**Pipeline**
- **MTCNN** → Face detection and alignment  
- **EfficientNet-B5** → Deepfake artifact detection (GAN textures, blending issues)  
- **Error Level Analysis (ELA)** → Edited region detection via compression inconsistencies  
- **EasyOCR** → Extracts embedded text for scam analysis  

**Output:** Deepfake probability + tampering heatmap

---

## 🔊 Audio Analysis
Identifies AI-generated or cloned voices using signal forensics.

**Techniques**
- **Spectral Flatness & Centroid** → Detect unnatural frequency distributions  
- **MFCC** → Flags missing human micro-variations in speech  
- **Rule-based Vocal Tract Forensics** → Detects synthetic resonance patterns  

**Output:** Human vs AI likelihood + anomaly indicators

---

## 🎥 Video Analysis
Performs frame-level deepfake detection with temporal consistency checks.

**Pipeline**
- **Keyframe Extraction + EfficientNet-B5** → Artifact detection per frame  
- **MTCNN Landmark Tracking** → Facial stability across frames  
- **Temporal Flicker Detection** → GAN frame instability detection  
- **Lighting & Shadow Analysis** → Physically inconsistent illumination detection  

**Output:** Frame-wise risk timeline + overall deepfake score

---

# 🧠 Explainable Risk Scoring
- Unified **risk score (0–100)**  
- Modality-wise breakdown (text, image, audio, video)  
- Human-readable **reason codes** for transparency  

---

# 🏗️ System Workflow
1. Input ingestion (text / image / audio / video)  
2. Modality-specific analysis pipelines  
3. Feature extraction and forensic checks  
4. Heuristic risk engine  
5. Explainable scoring API  
6. Dashboard / Chrome extension output  

---

# 🌐 Use Cases
- Social media scam detection  
- Deepfake media verification  
- Voice clone fraud prevention  
- KYC and identity verification  
- Cybercrime and digital forensics  

---

# 🔐 Privacy & Security
- Stateless processing by default (no permanent storage)  
- Optional encrypted storage for forensic workflows  
- Data minimization and secure inference pipelines  

---

# ⚙️ Tech Stack
- **NLP:** RoBERTa, Toxic-BERT  
- **Computer Vision:** EfficientNet-B5, MTCNN, ELA  
- **OCR:** EasyOCR  
- **Audio Forensics:** MFCC, spectral analysis  
- **Backend:** Python, FastAPI  
- **Frontend:** React / Chrome Extension  
- **Deployment:** Docker, GPU inference support  

---

# 📊 Example Output
```json
{
  "risk_score": 87,
  "modality_scores": {
    "text": 82,
    "image": 91,
    "audio": 12,
    "video": 0
  },
  "flags": [
    "financial_urgency_detected",
    "face_blending_artifacts",
    "ela_edit_regions"
  ],
  "verdict": "High likelihood scam/deepfake"
}

