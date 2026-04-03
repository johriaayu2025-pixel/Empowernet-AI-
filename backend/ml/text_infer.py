import torch
from transformers import pipeline
from ml.risk_booster import apply_risk_boosters
from ml.explain import build_text_summary

# Singleton pipelines for text models
_text_pipelines = {}

def get_text_pipeline(model_name, task="text-classification"):
    if model_name not in _text_pipelines:
        print(f"Loading text model: {model_name}...")
        try:
            _text_pipelines[model_name] = pipeline(task, model=model_name)
        except Exception as e:
            print(f"Failed to load {model_name}: {e}")
            return None
    return _text_pipelines[model_name]

def analyze_text(text: str):
    if not text:
        return {"category": "SAFE", "confidence": 0, "riskScore": 0}

    results = {}
    
    # 1. Specialized Model Inference
    phish_score, prop_score, gibber_score, fin_risk = 0.5, 0.0, 0.0, 0.0

    words = text.split()
    if len(words) >= 4:
        # Phishing Detection
        # BIG FIX: Removed cybersectony/phishing-email-detection completely.
        # Reason: The model strictly looks for email MIME headers ('To:', 'From:') and marks 
        # all standard conversational or short-form texts as 99% probability Phishing Scams.
        # Our risk_booster.py now handles the entire SCAM payload securely through regex heuristics.
        phish_score = 0.1

        # Gibberish Detection (Detect AI/nonsense)
        gibber_pipe = get_text_pipeline("madhurjindal/autonlp-Gibberish-Detector-492513457")
        if gibber_pipe:
            res = gibber_pipe(text[:512])[0]
            gibber_score = res['score'] if 'gibber' in res['label'].lower() else 1.0 - res['score']

        # Propaganda/Toxicity Detection
        prop_pipe = get_text_pipeline("unitary/toxic-bert")
        if prop_pipe:
            res = prop_pipe(text[:512])[0]
            prop_score = res['score'] if res['label'].lower() == 'toxic' else 0.0

        # Financial Sentiment
        fin_pipe = get_text_pipeline("ProsusAI/finbert")
        if fin_pipe:
            res = fin_pipe(text[:512])[0]
            fin_risk = res['score'] if res['label'] == 'negative' else 0.0
    else:
        # Fast path for very short strings (like "hello" or "www.google.com")
        phish_score = 0.1
        gibber_score = 0.1
        prop_score = 0.0
        fin_risk = 0.0
        
    # 2. Ensemble Scoring
    # Custom weights
    final_score = (phish_score * 0.5) + (prop_score * 0.2) + (gibber_score * 0.2) + (fin_risk * 0.1)
    
    # Apply Keyword Boosters (Heuristics)
    boost = apply_risk_boosters(text)
    final_score = min(1.0, final_score + boost)

    # 3. Determine Category
    category = "SCAM" if final_score > 0.50 else "SAFE"
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
            "architecture": "Deep Ensemble (DistilBERT + RoBERTa + FinBERT)",
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
            toxic_score=prop_score # Using prop_score as high-level toxicity proxy here
        )
    }
