import torch
import cv2
import numpy as np
import base64
from PIL import Image
import io
from transformers import AutoModelForImageClassification, AutoImageProcessor
import time
import librosa
import os
from openai import OpenAI
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

try:
    import mediapipe as mp
except ImportError:
    mp = None
    print("WARNING: mediapipe not found. Real-time protection might be degraded.")

class MLService:
    def __init__(self):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        print(f"Using device: {self.device}")
        
        # Initialize MediaPipe
        if mp and hasattr(mp, 'solutions'):
            self.mp_face_detection = mp.solutions.face_detection
            self.face_detector = self.mp_face_detection.FaceDetection(model_selection=1, min_detection_confidence=0.5)
            self.mp_face_mesh = mp.solutions.face_mesh
            self.face_mesh = self.mp_face_mesh.FaceMesh(static_image_mode=False, max_num_faces=1, refine_landmarks=True)
        else:
            self.face_detector = None
            self.face_mesh = None
            print("CRITICAL: MediaPipe solutions not available. Face detection disabled.")
        
        # --- IMAGE/VIDEO VISION MODELS ---
        self.load_heavy_models = os.getenv("LOAD_MODELS", "false").lower() == "true"
        
        if self.load_heavy_models:
            # 1. prithivMLmods/Deep-Fake-Detector-Model (GAN/Diffusion Specialist)
            try:
                self.deepfake_processor = AutoImageProcessor.from_pretrained("prithivMLmods/Deep-Fake-Detector-Model")
                self.deepfake_model = AutoModelForImageClassification.from_pretrained("prithivMLmods/Deep-Fake-Detector-Model").to(self.device).eval()
                print("SUCCESS: Deep-Fake-Detector-Model Loaded")
            except Exception as e:
                print(f"ERROR: Failed to load Deep-Fake-Detector-Model: {e}")
                self.deepfake_model = None

            # 2. prithivMLmods/Deep-Fake-Detector-v2-Model (ViT-based Binary Classifier)
            try:
                self.wvolf_processor = AutoImageProcessor.from_pretrained("prithivMLmods/Deep-Fake-Detector-v2-Model")
                self.wvolf_model = AutoModelForImageClassification.from_pretrained("prithivMLmods/Deep-Fake-Detector-v2-Model").to(self.device).eval()
                print("SUCCESS: Deep-Fake-Detector-v2-Model (ViT) Loaded")
            except Exception as e:
                print(f"ERROR: Failed to load Deep-Fake-Detector-v2: {e}")
                self.wvolf_model = None

            # 3. dima806/deepfake_vs_real_image_detection (Large-scale ViT)
            try:
                self.vit_processor = AutoImageProcessor.from_pretrained("dima806/deepfake_vs_real_image_detection")
                self.vit_model = AutoModelForImageClassification.from_pretrained("dima806/deepfake_vs_real_image_detection").to(self.device).eval()
                print("SUCCESS: dima806/deepfake_vs_real Loaded")
            except Exception as e:
                print(f"ERROR: Failed to load dima806/deepfake_vs_real: {e}")
                self.vit_model = None

            # --- VIDEO TEMPORAL MODELS ---
            
            # 4. Organika/sdxl-detector (Swin Transformer - AI vs Real per-frame)
            try:
                self.temporal_processor = AutoImageProcessor.from_pretrained("Organika/sdxl-detector")
                self.temporal_model = AutoModelForImageClassification.from_pretrained("Organika/sdxl-detector").to(self.device).eval()
                print("SUCCESS: Organika/sdxl-detector (Temporal) Loaded")
            except Exception as e:
                print(f"ERROR: Failed to load temporal model: {e}")
                self.temporal_model = None
            
            # 5. Synthetic Media (CLIP-based)
            try:
                self.clip_processor = AutoImageProcessor.from_pretrained("umm-maybe/AI-image-detector")
                self.clip_model = AutoModelForImageClassification.from_pretrained("umm-maybe/AI-image-detector").to(self.device).eval()
                print("SUCCESS: Synthetic Media Models Loaded")
            except Exception as e:
                print(f"ERROR: Failed to load clip model: {e}")
                self.clip_model = None

            # 6. EfficientNet-B5 (via timm)
            import timm
            try:
                self.b5_model = timm.create_model("efficientnet_b5", pretrained=True, num_classes=1000).to(self.device).eval()
                from torchvision import transforms
                self.b5_transform = transforms.Compose([
                    transforms.Resize((456, 456)),
                    transforms.ToTensor(),
                    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
                ])
                print("SUCCESS: EfficientNet-B5 Loaded")
            except Exception as e:
                print(f"ERROR: Failed to load EfficientNet-B5: {e}")
                self.b5_model = None
        else:
            self.deepfake_model = None
            self.wvolf_model = None
            self.vit_model = None
            self.temporal_model = None
            self.clip_model = None
            self.b5_model = None
            print("INFO: Heavy ML models are skipped to save MEMORY (Set LOAD_MODELS=true to enable)")

        self.participant_states = {} # Stores { 'video': [], 'liveness': [], 'audio': [] }
        self.last_vit_check = {}
        
        # OpenAI Client (Disabled due to user quota)
        self.openai_client = None

    def get_vision_ensemble_score(self, face_pil):
        weights = {"b5": 0.25, "wvolf": 0.35, "dima": 0.25, "temporal": 0.15}
        scores = []
        total_weight = 0

        # 1. EfficientNet-B5
        if self.b5_model:
            img_tensor = self.b5_transform(face_pil).unsqueeze(0).to(self.device)
            with torch.no_grad():
                features = self.b5_model.forward_features(img_tensor)
                feat_var = torch.var(features).item()
                # Heuristic mapping of feature variance to fake probability for B5
                b5_score = min(1.0, feat_var / 2.2) 
                scores.append(b5_score * weights["b5"])
                total_weight += weights["b5"]

        # 2. Wvolf/ViT
        if self.wvolf_model:
            inputs = self.wvolf_processor(images=face_pil, return_tensors="pt").to(self.device)
            with torch.no_grad():
                outputs = self.wvolf_model(**inputs)
                probs = torch.nn.functional.softmax(outputs.logits, dim=-1)
                scores.append(probs[0][1].item() * weights["wvolf"])
                total_weight += weights["wvolf"]

        # 3. dima806/ViT
        if self.vit_model:
            inputs = self.vit_processor(images=face_pil, return_tensors="pt").to(self.device)
            with torch.no_grad():
                outputs = self.vit_model(**inputs)
            probs = torch.nn.functional.softmax(outputs.logits, dim=-1)
            
            # Extrapolate deepfake confidence metrics.
            # Wvolf/ViT is highly conservative. We apply a 2.2x geometric boost 
            # specifically targeted at mitigating low-confidence AI generations on Social Media.
            fake_prob = probs[0][1].item()
            boosted_prob = min(1.0, fake_prob * 2.2)
            scores.append(boosted_prob * weights["dima"])
            total_weight += weights["dima"]

        # 4. Organika/sdxl-detector (Temporal/Swin)
        if self.temporal_model:
            inputs = self.temporal_processor(images=face_pil, return_tensors="pt").to(self.device)
            with torch.no_grad():
                outputs = self.temporal_model(**inputs)
                probs = torch.nn.functional.softmax(outputs.logits, dim=-1)
                # Label 0 = artificial, Label 1 = human (check model config)
                ai_prob = probs[0][0].item()  # artificial class
                scores.append(ai_prob * weights["temporal"])
                total_weight += weights["temporal"]

        if total_weight == 0: return 0.5
        return sum(scores) / total_weight

    def decode_base64_image(self, b64_str):
        try:
            if b64_str.startswith("http"):
                import requests
                response = requests.get(b64_str, timeout=5)
                img = Image.open(io.BytesIO(response.content)).convert("RGB")
                return np.array(img)
            
            if "," in b64_str:
                b64_str = b64_str.split(",")[1]
            img_data = base64.b64decode(b64_str)
            img = Image.open(io.BytesIO(img_data)).convert("RGB")
            return np.array(img)
        except Exception as e:
            print(f"Error decoding image: {e}")
            return np.zeros((224, 224, 3), dtype=np.uint8)

    def calculate_ear(self, landmarks, eye_indices):
        p1 = landmarks[eye_indices[0]]
        p2 = landmarks[eye_indices[1]]
        p3 = landmarks[eye_indices[2]]
        p4 = landmarks[eye_indices[3]]
        p5 = landmarks[eye_indices[4]]
        p6 = landmarks[eye_indices[5]]
        
        dist1 = np.linalg.norm(np.array([p2.x, p2.y]) - np.array([p6.x, p6.y]))
        dist2 = np.linalg.norm(np.array([p3.x, p3.y]) - np.array([p5.x, p5.y]))
        dist3 = np.linalg.norm(np.array([p1.x, p1.y]) - np.array([p4.x, p4.y]))
        return (dist1 + dist2) / (2.0 * dist3)

    async def process_video_frame(self, participant_id, frame_b64):
        img = self.decode_base64_image(frame_b64)
        h, w, _ = img.shape
        face_img = img
        
        if self.face_detector:
            results = self.face_detector.process(cv2.cvtColor(img, cv2.COLOR_RGB2BGR))
            if results and results.detections:
                detection = results.detections[0]
                bbox = detection.location_data.relative_bounding_box
                xmin, ymin = int(bbox.xmin * w), int(bbox.ymin * h)
                width, height = int(bbox.width * w), int(bbox.height * h)
                
                cropped = img[max(0, ymin):min(h, ymin+height), max(0, xmin):min(w, xmin+width)]
                if cropped.size > 0: face_img = cropped
            
        face_pil = Image.fromarray(face_img)
        
        # Ensemble Vision Detection
        deepfake_score = self.get_vision_ensemble_score(face_pil)

        # Liveness (EAR + Texture)
        final_liveness = 0.5
        if self.face_mesh:
            try:
                mesh_results = self.face_mesh.process(img)
                liveness_score = 0.5
                if mesh_results.multi_face_landmarks:
                    landmarks = mesh_results.multi_face_landmarks[0].landmark
                    left_ear = self.calculate_ear(landmarks, [362, 385, 387, 263, 373, 380])
                    right_ear = self.calculate_ear(landmarks, [33, 160, 158, 133, 153, 144])
                    liveness_score = min(1.0, ((left_ear + right_ear) / 2.0) * 4.0)

                gray_face = cv2.cvtColor(face_img, cv2.COLOR_RGB2GRAY)
                texture_score = min(1.0, cv2.Laplacian(gray_face, cv2.CV_64F).var() / 500.0)
                final_liveness = 0.7 * liveness_score + 0.3 * texture_score
            except Exception as e:
                print(f"Liveness calculation failed: {e}")

        # Temporal Smoothing
        if participant_id not in self.participant_states:
            self.participant_states[participant_id] = {"deepfake": [], "liveness": [], "audio": []}
        
        self.participant_states[participant_id]["deepfake"].append(deepfake_score)
        self.participant_states[participant_id]["liveness"].append(final_liveness)
        
        if len(self.participant_states[participant_id]["deepfake"]) > 10:
            self.participant_states[participant_id]["deepfake"].pop(0)
            self.participant_states[participant_id]["liveness"].pop(0)
            
        avg_deepfake = np.mean(self.participant_states[participant_id]["deepfake"])
        avg_liveness = np.mean(self.participant_states[participant_id]["liveness"])

        # Temporal Consistency (Difference-based)
        temporal_penalty = 0
        if len(self.participant_states[participant_id]["deepfake"]) > 1:
            diff = abs(self.participant_states[participant_id]["deepfake"][-1] - self.participant_states[participant_id]["deepfake"][-2])
            if diff > 0.3: temporal_penalty = 0.15

        risk = avg_deepfake + temporal_penalty
        if avg_liveness < 0.3: risk += (0.3 - avg_liveness) * 0.5

        status = "REAL"
        if risk > 0.75: status = "HIGH RISK"
        elif risk > 0.45: status = "SUSPICIOUS"

        return {
            "participant_id": participant_id,
            "deepfake": float(min(1.0, risk)),
            "liveness": float(avg_liveness),
            "status": status,
            "raw_deepfake": float(avg_deepfake),
            "temporal_anomaly": temporal_penalty > 0
        }

    async def process_audio_chunk(self, participant_id, audio_b64):
        from ml.audio_infer import analyze_audio
        res = analyze_audio(audio_b64)
        return {
            "voice_authenticity": 1.0 - (res.get("riskScore", 0) / 100.0),
            "voice_status": "REAL" if res.get("category") == "REAL" else "SUSPICIOUS"
        }

    async def detect_synthetic_media(self, image_b64):
        img_np = self.decode_base64_image(image_b64)
        img_pil = Image.fromarray(img_np)
        
        # Local Ensemble scoring (ViT + EfficientNet)
        ensemble_score = self.get_vision_ensemble_score(img_pil)
        
        # ELA / Texture analysis
        gray = cv2.cvtColor(img_np, cv2.COLOR_RGB2GRAY)
        lap_var = cv2.Laplacian(gray, cv2.CV_64F).var()
        texture_score = 1.0 - min(1.0, lap_var / 1000.0) 
        
        # Final weighted score for image analysis
        # 70% Ensemble Vision, 30% Texture/ELA
        fusion_score = 0.7 * ensemble_score + 0.3 * texture_score
        
        status = "REAL"
        if fusion_score > 0.5: status = "DEEPFAKE"
        elif fusion_score > 0.4: status = "UNCERTAIN"
        
        return {
            "synthetic_score": float(fusion_score),
            "status": status,
            "vision_ensemble": float(ensemble_score),
            "texture_score": float(texture_score),
            "model": "Local Ensemble (ViT/EfficientNet)"
        }

ml_service = MLService()
