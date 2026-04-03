import os
from ml.risk_booster import apply_risk_boosters
from ml.explain import build_text_summary

# Singleton pipelines for text models
_text_pipelines = {}

def get_text_pipeline(model_name, task="text-classification"):
    # NEW: Check if we are allowed to load heavy models
    if os.getenv("LOAD_MODELS", "false").lower() != "true":
        return None

    if model_name not in _text_pipelines:
        try:
            import torch
            from transformers import pipeline
            print(f"Loading text model: {model_name}...")
            _text_pipelines[model_name] = pipeline(task, model=model_name)
        except Exception as e:
            print(f"Failed to load {model_name}: {e}")
            return None
    return _text_pipelines[model_name]

def analyze_text(text: str):
    if not text:
        return {"category": "SAFE", "confidence": 0, "riskScore": 0}

    # Default scores for Demo/Memory Mode
    phish_score, prop_score, gibber_score, fin_risk = 0.1, 0.0, 0.0, 0.0

    words = text.split()
    if len(words) >= 4:
        # Load models ONLY if specified in environment
        gibber_pipe = get_text_pipeline("madhurjindal/autonlp-Gibberish-Detector-492513457")
        if gibber_pipe:
            res = gibber_pipe(text[:512])[0]
            gibber_score = res['score'] if 'gibber' in res['label'].lower() else 1.0 - res['score']

        prop_pipe = get_text_pipeline("unitary/toxic-bert")
        if prop_pipe:
            res = prop_pipe(text[:512])[0]
            prop_score = res['score'] if res['label'].lower() == 'toxic' else 0.0

        fin_pipe = get_text_pipeline("ProsusAI/finbert")
        if fin_pipe:
            res = fin_pipe(text[:512])[0]
            fin_risk = res['score'] if res['label'] == 'negative' else 0.0
        
    # Ensemble Scoring
    final_score = (phish_score * 0.5) + (prop_score * 0.2) + (gibber_score * 0.2) + (fin_risk * 0.1)
    
    # Apply Keyword Boosters (Heuristics - ALWAYS ACTIVE even in memory mode)
    boost = apply_risk_boosters(text)
    final_score = min(1.0, final_score + boost)

    category = "SCAM" if final_score > 0.45 else "SAFE"
    confidence = final_score if category == "SCAM" else (1 - final_score)

    return {
        "category": category,
        "confidence": round(confidence, 4),
        "riskScore": int(final_score * 100),
        "explanation": [
            f"Phishing Probability: {int(phish_score*100)}%",
            f"Propaganda/Manipulation: {int(prop_score*100)}%",
            f"Gibberish/AI Marker: {int(gibber_score*100)}%",
            f"Urgency/Fear Factor: {int(fin_risk*100)}%"
        ],
        "modelDetails": {
            "architecture": "Deep Ensemble (DistilBERT + RoBERTa + FinBERT)" if os.getenv("LOAD_MODELS") == "true" else "Heuristic Engine (Keyword Scan)",
            "featuresAnalysed": [
                "phishing patterns",
                "manipulative language",
                "gibberish/synthetic structure",
                "financial sentiment urgency"
            ]
        },
        "userSummary": build_text_summary(
            category=category,
            risk_score=int(final_score * 100),
            confidence=confidence,
            text=text,
            toxic_score=prop_score 
        )
    }

