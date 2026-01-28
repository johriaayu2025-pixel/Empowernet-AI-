import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification
from ml.risk_booster import apply_risk_boosters
from ml.explain import build_text_summary

# ✅ MODEL 1: Spam/Phishing Detection
MODEL_SPAM = "mshenoda/roberta-spam"

# ✅ MODEL 2: Toxicity/Threat Detection (For Coercion/Blackmail)
MODEL_TOXIC = "unitary/toxic-bert"

print(f"Loading Text Models...")
models = {}

try:
    print(f"   - Loading {MODEL_SPAM}...")
    models['spam_tokenizer'] = AutoTokenizer.from_pretrained(MODEL_SPAM)
    models['spam_model'] = AutoModelForSequenceClassification.from_pretrained(MODEL_SPAM)
    models['spam_model'].eval()
    
    print(f"   - Loading {MODEL_TOXIC}...")
    models['toxic_tokenizer'] = AutoTokenizer.from_pretrained(MODEL_TOXIC)
    models['toxic_model'] = AutoModelForSequenceClassification.from_pretrained(MODEL_TOXIC)
    models['toxic_model'].eval()
    
    print("SUCCESS: Text Ensemble Loaded Successfully.")
except Exception as e:
    print(f"ERROR: Failed to load text models: {e}")

def get_model_score(text, key_prefix):
    tokenizer = models.get(f'{key_prefix}_tokenizer')
    model = models.get(f'{key_prefix}_model')
    
    if not tokenizer or not model:
        return 0.0

    inputs = tokenizer(
        text,
        truncation=True,
        padding=True,
        max_length=512,
        return_tensors="pt"
    )
    
    with torch.no_grad():
        outputs = model(**inputs)
        probs = torch.nn.functional.softmax(outputs.logits, dim=-1)
    
    # RoBERTa-spam: Label 1 is Spam
    # Toxic-BERT: Multi-label, usually Label 0=safe, 1=toxic. We take specific toxic classes avg if possible
    # For unitary/toxic-bert, it outputs 6 classes: [toxic, severe_toxic, obscene, threat, insult, identity_hate]
    # We want max of these.
    
    if key_prefix == 'toxic':
        # Max probability across all toxic classes
        score = probs[0].max().item()
    else:
        # Scam score (Label 1)
        score = probs[0][1].item()
        
    return score

def analyze_text(text: str):
    if not models:
        return {"error": "Models not loaded"}

    # 1. Ensemble Inference
    spam_score = get_model_score(text, 'spam')
    toxic_score = get_model_score(text, 'toxic')
    
    # 2. Apply Heuristics (Risk Booster)
    boost = apply_risk_boosters(text)
    
    # 3. Final Risk Formula
    # Base is spam score. Toxicity adds weight (e.g. for sextortion). Boost adds strict keyword penalty.
    final_score = spam_score + (0.25 * toxic_score) + boost
    final_score = min(1.0, final_score)

    # 4. Determine Category
    category = "SCAM" if final_score > 0.50 else "SAFE"
    confidence = final_score if category == "SCAM" else (1 - final_score)

    # 5. Generate Explanation
    return {
        "category": category,
        "confidence": round(confidence, 4),
        "riskScore": int(final_score * 100),
        "explanation": [
            f"Phishing Probability: {int(spam_score*100)}%",
            f"Coercion/Threat Level: {int(toxic_score*100)}%",
            f"Keyword Risk Factor: +{int(boost*100)}%"
        ],
        "modelDetails": {
            "architecture": "Ensemble (RoBERTa + ToxicBERT)",
            "featuresAnalysed": [
                "semantic intent",
                "aggression levels",
                "urgent keyword patterns"
            ]
        },
        "userSummary": build_text_summary(
            category=category,
            risk_score=int(final_score * 100),
            confidence=confidence,
            text=text,
            toxic_score=toxic_score
        )
    }
