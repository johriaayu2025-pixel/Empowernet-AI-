import base64
import io
import os
from ml.explain import build_audio_summary

# Singleton models for faster subsequent calls
_audio_classifiers = {}

def get_classifier(model_name):
    if os.getenv("LOAD_MODELS", "false").lower() != "true":
        return None

    if model_name not in _audio_classifiers:
        try:
            import torch
            from transformers import pipeline
            print(f"Loading {model_name}...")
            if model_name == "openai/whisper-tiny":
                _audio_classifiers[model_name] = pipeline("automatic-speech-recognition", model=model_name)
            else:
                _audio_classifiers[model_name] = pipeline("audio-classification", model=model_name)
        except Exception as e:
            print(f"Failed to load {model_name}: {e}")
            return None
    return _audio_classifiers[model_name]

def analyze_audio(base64_audio: str):
    import uuid
    import numpy as np
    import librosa
    temp_id = str(uuid.uuid4())
    temp_path = f"temp_audio_{temp_id}.tmp"
    
    try:
        if "," in base64_audio:
            base64_audio = base64_audio.split(",")[1]
        audio_bytes = base64.b64decode(base64_audio)
        
        with open(temp_path, "wb") as f:
            f.write(audio_bytes)

        y, sr = librosa.load(temp_path, sr=16000)

        if len(y) < 8000:
            if os.path.exists(temp_path): os.remove(temp_path)
            return {"error": "Audio too short for analysis (min 0.5 sec)"}

    except Exception as e:
        if os.path.exists(temp_path): os.remove(temp_path)
        return {"error": f"Invalid audio input/codec: {str(e)}"}

    features_list = []
    
    # 1. ML Model Inference (Conditional)
    ensemble_scores = []
    pipe1 = get_classifier("motheecreator/Deepfake-audio-detection")
    if pipe1:
        res1 = pipe1(base64_audio[:400000])[0] 
        score1 = res1['score'] if res1['label'] == 'fake' or res1['label'] == 'spoof' else 1 - res1['score']
        ensemble_scores.append(score1)

    ml_score = np.mean(ensemble_scores) if ensemble_scores else 0.5

    # 2. Advanced Feature Extraction (Heuristics)
    mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=40)
    mfcc_var = np.var(mfcc, axis=1).mean()
    
    rolloff = librosa.feature.spectral_rolloff(y=y, sr=sr, roll_percent=0.85)
    rolloff_mean = np.mean(rolloff)
    
    zcr = librosa.feature.zero_crossing_rate(y)
    zcr_mean = np.mean(zcr)
    
    chroma = librosa.feature.chroma_stft(y=y, sr=sr)
    chroma_var = np.var(chroma)
    
    f0, voiced_flag, voiced_probs = librosa.pyin(y, fmin=librosa.note_to_hz('C2'), fmax=librosa.note_to_hz('C7'))
    f0_valid = f0[~np.isnan(f0)]
    f0_var_norm = np.var(f0_valid) / (np.mean(f0_valid) + 1e-6) if len(f0_valid) > 0 else 1.0

    h_score = 0.0
    if mfcc_var < 400: h_score += 0.2
    if chroma_var < 0.05: h_score += 0.2 
    if rolloff_mean < 3000: h_score += 0.3
    heuristic_score = min(1.0, h_score)

    # 3. Speech-To-Text (Whisper - Conditional)
    text_risk = 0.0
    asr_pipe = get_classifier("openai/whisper-tiny")
    if asr_pipe:
        try:
             transcript = asr_pipe(y).get("text", "")
             if len(transcript.strip()) > 5:
                from ml.text_infer import analyze_text
                text_res = analyze_text(transcript)
                text_risk = text_res.get("riskScore", 0) / 100.0
                if text_risk > 0.4:
                    features_list.append(f"Scam Audio Transcript Identified: {text_res.get('category')}")
        except Exception as e:
            print("ASR failed:", e)

    # 4. Ensemble
    final_score = (ml_score * 0.45) + (heuristic_score * 0.20) + (text_risk * 0.35)
    
    if f0_var_norm < 0.02: 
        final_score = min(1.0, final_score + 0.15)
        features_list.append("Unnaturally Stable F0 (AI Pitch Profile)")
    
    if zcr_mean > 0.15:
        final_score = min(1.0, final_score + 0.10)
        features_list.append("High-Frequency Synthetic Artifacts")

    if os.path.exists(temp_path): os.remove(temp_path)

    category = "SCAM" if text_risk > 0.5 else ("FAKE" if final_score > 0.50 else "REAL")
    confidence = final_score if category != "REAL" else 1 - final_score

    return {
        "category": category,
        "confidence": float(round(confidence, 4)),
        "riskScore": int(final_score * 100),
        "explanation": [
            f"Pitch Stability status: {'Suspicious' if f0_var_norm < 0.02 else 'Natural'}",
            f"Spectral Consistency: {round(mfcc_var, 2)}",
            f"High-Freq Risk: {'High' if zcr_mean > 0.15 else 'Low'}"
        ],
        "modelDetails": {
            "architecture": "Heuristic Signal Engine" if not ensemble_scores else "Ensemble (Deep + Linguistic + Signal)",
            "featuresAnalysed": features_list if features_list else ["baseline speech profile"]
        },
        "userSummary": build_audio_summary(
            category=category,
            risk_score=int(final_score * 100),
            confidence=confidence,
            features=features_list
        )
    }

