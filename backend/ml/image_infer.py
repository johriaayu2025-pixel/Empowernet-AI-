import base64
import io
import torch
import timm
import cv2
import numpy as np
try:
    import easyocr
except ImportError:
    easyocr = None
    print("WARNING: EasyOCR not found. OCR features will be disabled.")
from PIL import Image, ImageChops
from torchvision import transforms
try:
    from facenet_pytorch import MTCNN
except Exception:
    MTCNN = None
    print("WARNING: facenet_pytorch not available. Face cropping will use OpenCV fallback.")
from ml.explain import build_image_summary
from ml.text_infer import analyze_text # Reuse text logic

from ml.ml_service import ml_service
from ml.child_safety import analyze_child_safety_image
from ml.explain import build_image_summary
from ml.text_infer import analyze_text 

def error_level_analysis(image: Image.Image) -> float:
    try:
        buffer = io.BytesIO()
        image.save(buffer, "JPEG", quality=90)
        buffer.seek(0)
        resaved = Image.open(buffer)
        ela_image = ImageChops.difference(image, resaved)
        extrema = ela_image.getextrema()
        max_diff = max([ex[1] for ex in extrema])
        scale = 255.0 / max_diff if max_diff > 0 else 1.0
        ela_image = ImageChops.multiply(ela_image, scale)
        np_ela = np.array(ela_image)
        mean_artifact = np.mean(np_ela)
        return min(1.0, mean_artifact / 40.0)
    except Exception:
        return 0.0

async def analyze_image_base64(base64_str: str):
    try:
        if "," in base64_str:
            base64_str = base64_str.split(",")[1]
        
        image_bytes = base64.b64decode(base64_str)
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        np_image = np.array(image)

        features_list = []
        
        # 1. Unified Synthetic Media Detection (OpenAI Vision + Local Ensemble)
        synthetic_res = await ml_service.detect_synthetic_media(base64_str)
        synthetic_score = synthetic_res.get("synthetic_score", 0.5)
        
        if synthetic_res.get("status") == "DEEPFAKE":
            features_list.append(f"AI Detection ({synthetic_res.get('model')}): {synthetic_res.get('explanation', 'High Confidence Artifacts Detected')}")
        
        # 2. ELA
        ela_score = error_level_analysis(image)
        if ela_score > 0.6:
            features_list.append("High Error Level Analysis (ELA) Artifacts")

        # 3. Child Safety
        safety_res = analyze_child_safety_image(image)
        if not safety_res.get("is_safe"):
            features_list.extend(safety_res.get("flags", []))

        # 4. OCR Scan (Preserved original feature)
        text_risk_score = 0.0
        try:
            if easyocr:
                reader = easyocr.Reader(['en'], gpu=torch.cuda.is_available(), verbose=False)
                ocr_results = reader.readtext(np_image, detail=0)
                extracted_text = " ".join(ocr_results)
                if len(extracted_text) > 4:
                    text_res = analyze_text(extracted_text)
                    text_risk_score = text_res.get("riskScore", 0) / 100.0
                    if text_risk_score > 0.5:
                        features_list.append(f"Scam Text Detected: {text_res.get('category')}")
        except Exception as e:
            print(f"OCR Error: {e}")
            
        # Ensemble Logic: (Synthetic 75%) + (ELA 25%)
        # Modified to account for safety flags
        base_score = (synthetic_score * 0.75) + (ela_score * 0.25)
        if text_risk_score > 0.4:
            base_score = max(base_score, text_risk_score)
        
        if not safety_res.get("is_safe"):
            base_score = max(base_score, 0.85)

        category = "DEEPFAKE" if base_score > 0.5 else "REAL"
        if not safety_res.get("is_safe"): category = "FLAGGED"
        
        confidence = base_score if base_score > 0.5 else 1 - base_score

        return {
            "category": category,
            "confidence": float(round(confidence, 4)),
            "riskScore": int(base_score * 100),
            "is_safe_for_children": safety_res.get("is_safe"),
            "explanation": [
                f"Vision Ensemble Risk: {int(synthetic_score*100)}%",
                f"ELA Compression Risk: {int(ela_score*100)}%",
                f"Safety Status: {'Safe' if safety_res.get('is_safe') else 'Flagged'}"
            ],
            "modelDetails": {
                "architecture": "Ensemble (EfficientNet-B5 + Deep-Fake-Detector-v2 ViT + dima806/ViT + Organika/sdxl-detector + ELA)",
                "featuresAnalysed": features_list if features_list else ["No visual anomalies detected"]
            },
            "userSummary": build_image_summary(
                category=category,
                risk_score=int(base_score * 100),
                confidence=confidence,
                features=features_list
            )
        }
    except Exception as e:
        return {"error": f"Internal Inference Error: {str(e)}"}
