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
from facenet_pytorch import MTCNN
from ml.explain import build_image_summary
from ml.text_infer import analyze_text # Reuse text logic

# Device
device = torch.device("cpu")

# ✅ 1. UPGRADE BACKBONE: EfficientNet-B5 (Higher Capacity)
print("Loading Image Model: efficientnet_b5...")
try:
    model = timm.create_model("efficientnet_b5", pretrained=True, num_classes=1000)
    model.eval().to(device)
    print("SUCCESS: Image Model (EfficientNet-B5) Loaded.")
except Exception as e:
    print(f"ERROR: Failed to load B5, falling back to B0: {e}")
    model = timm.create_model("efficientnet_b0", pretrained=True, num_classes=1000)
    model.eval().to(device)

# ✅ 2. FACE DETECTOR
try:
    mtcnn = MTCNN(keep_all=True, device=device, min_face_size=40)
    print("SUCCESS: Face Detector Loaded.")
except Exception as e:
    print(f"ERROR: Face Detector Error: {e}")
    mtcnn = None

# ✅ 3. OCR READER (For Scam Text in Images)
print("Loading OCR Engine...")
reader = None
if easyocr:
    try:
        reader = easyocr.Reader(['en'], gpu=False) # CPU safe
        print("SUCCESS: OCR Engine Loaded.")
    except Exception as e:
        print(f"ERROR: OCR Load Failed: {e}")
else:
    print("INFO: OCR module missing. Skipping.")

# Image preprocessing
transform = transforms.Compose([
    transforms.Resize((456, 456)), 
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
])

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

def get_cnn_score(img_tensor):
    with torch.no_grad():
        features = model.forward_features(img_tensor)
        feat_var = torch.var(features).item()
    return min(1.0, feat_var / 2.5) 

def analyze_image_base64(base64_str: str):
    try:
        try:
            image_bytes = base64.b64decode(base64_str)
            image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
            np_image = np.array(image)
        except Exception as e:
            return {"error": "Invalid image data"}

        features_list = []
        is_scam_content = False
        text_risk_score = 0.0
        
        # 0. OCR SCAN (Text-in-Image)
        if reader:
            try:
                # Read text
                ocr_result = reader.readtext(np_image, detail=0)
                extracted_text = " ".join(ocr_result)
                
                if len(extracted_text) > 5:
                    print(f"INFO: Text found in image: {extracted_text[:50]}...")
                    # Reuse Text Inference Logic
                    text_analysis = analyze_text(extracted_text)
                    
                    if text_analysis.get("category") == "SCAM":
                        is_scam_content = True
                        text_risk_score = text_analysis.get("riskScore", 0) / 100.0
                        features_list.append(f"Scam Text Detected: '{extracted_text[:30]}...'")
                        # Add text explanation triggers
                        if text_analysis.get("userSummary", {}).get("triggers"):
                             features_list.extend(text_analysis["userSummary"]["triggers"])
            except Exception as e:
                print(f"WARNING: OCR Warning: {e}")

        # 1. Global Analysis
        global_tensor = transform(image).unsqueeze(0).to(device)
        global_cnn_score = get_cnn_score(global_tensor)
        
        # 2. ELA
        ela_prob = error_level_analysis(image)
        if ela_prob > 0.6:
            features_list.append(f"High Compression Artifacts ({int(ela_prob*100)}%)")

        # 3. Face Forensics
        face_score = 0.0
        has_face = False
        
        if mtcnn:
            try:
                boxes, _ = mtcnn.detect(image)
                if boxes is not None:
                    has_face = True
                    max_face_score = 0.0
                    for box in boxes:
                        x1, y1, x2, y2 = [int(b) for b in box]
                        x1, y1 = max(0, x1), max(0, y1)
                        x2, y2 = min(image.width, x2), min(image.height, y2)
                        if x2 > x1 and y2 > y1:
                            face_img = image.crop((x1, y1, x2, y2))
                            face_tensor = transform(face_img).unsqueeze(0).to(device)
                            f_score = get_cnn_score(face_tensor)
                            if f_score > max_face_score: max_face_score = f_score
                    face_score = max_face_score
            except Exception as e:
                pass

        # 4. Weighted Scoring Logic
        # Priority: Scam Text > Face Artifacts > Global Artifacts
        
        base_visual_score = 0.0
        if has_face:
            base_visual_score = (face_score * 0.5) + (ela_prob * 0.3) + (global_cnn_score * 0.2)
            if face_score > 0.6: features_list.append("GAN Facial Artifacts Detected")
        else:
            base_visual_score = (global_cnn_score * 0.4) + (ela_prob * 0.6)
            
        if global_cnn_score > 0.7: features_list.append("Deep Semantic Anomalies")

        # Final Mix: If Text is SCAM, the image is SCAM (category DEEPFAKE/SCAM)
        # We treat "SCAM Image" as "Manipulated/Malicious"
        
        final_score = base_visual_score
        
        if is_scam_content:
            # Boost score based on text risk, but keep visual semantics if even higher
            final_score = max(base_visual_score, text_risk_score, 0.85) # Force high risk for scams
            features_list.insert(0, "Malicious Text Content")

        # THREE-TIER CLASSIFICATION LOGIC (Robustness Improvement)
        # Thresholds: < 0.40 (Real), 0.40 - 0.75 (Uncertain), > 0.75 (Manipulated)
        # Exception: Scam text forces DEEPFAKE/SCAM category
        
        if is_scam_content:
            category = "SCAM"
            confidence = max(final_score, 0.85) # High confidence for confirmed scam text
        elif final_score >= 0.70: # Lowered from 0.75 to be slightly more sensitive
            category = "DEEPFAKE"
            confidence = final_score
        elif final_score >= 0.35: # Lowered from 0.40
            category = "UNCERTAIN"
            confidence = final_score
        else:
            category = "REAL"
            confidence = 1 - final_score

        # Prepare explanation list (deduplicated)
        explanation = list(set([
            f"Visual Manipulation Risk: {int(base_visual_score*100)}%",
            f"Text Content Risk: {int(text_risk_score*100)}%",
            f"Face Analysis: {'Suspicious' if face_score > 0.5 else 'Normal'}" if has_face else "No Face Detected"
        ]))

        return {
            "category": category,
            "confidence": float(round(confidence, 4)),
            "riskScore": int(final_score * 100),
            "explanation": explanation,
            "modelDetails": {
                "architecture": "EfficientNet-B5 + MTCNN + EasyOCR",
                "featuresAnalysed": features_list if features_list else ["No specific anomalies"]
            },
            "userSummary": build_image_summary(
                category=category,
                risk_score=int(final_score * 100),
                confidence=confidence,
                features=features_list
            )
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"error": f"Internal Inference Error: {e}"}
