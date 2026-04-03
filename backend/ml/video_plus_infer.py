import base64
import os
from PIL import Image
from ml.ml_service import ml_service
from ml.audio_infer import analyze_audio
from ml.explain import build_video_summary

def analyze_video_base64_plus(base64_video: str):
    import uuid
    import cv2
    import numpy as np
    temp_id = str(uuid.uuid4())
    temp_video_path = f"temp_video_{temp_id}.mp4"
    temp_audio_path = f"temp_audio_{temp_id}.wav"
    
    try:
        if "," in base64_video:
            base64_video = base64_video.split(",")[1]
        video_bytes = base64.b64decode(base64_video)
        with open(temp_video_path, "wb") as f:
            f.write(video_bytes)
    except Exception as e:
        return {"error": f"Invalid video data: {str(e)}"}

    # 1. Video Analysis at 5 positions
    cap = cv2.VideoCapture(temp_video_path)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps = cap.get(cv2.CAP_PROP_FPS)
    duration = total_frames / fps if fps > 0 else 0
    
    positions = [0.1, 0.3, 0.5, 0.7, 0.9]
    frame_scores = []
    
    for pos in positions:
        frame_idx = int(pos * total_frames)
        cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
        ret, frame = cap.read()
        if ret:
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            img_pil = Image.fromarray(rgb)
            
            # Use MLService for ensemble vision detection
            if ml_service.face_detector:
                results = ml_service.face_detector.process(cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR))
                if results and results.detections:
                    detection = results.detections[0]
                    bbox = detection.location_data.relative_bounding_box
                    h, w, _ = frame.shape
                    face_img = frame[max(0, int(bbox.ymin * h)):min(h, int((bbox.ymin + bbox.height) * h)), 
                                      max(0, int(bbox.xmin * w)):min(w, int((bbox.xmin + bbox.width) * w))]
                    if face_img.size > 0:
                        img_pil = Image.fromarray(cv2.cvtColor(face_img, cv2.COLOR_BGR2RGB))
            
            score = ml_service.get_vision_ensemble_score(img_pil)
            frame_scores.append(score)
            
            # OCR Scan (Preserved original feature - only if models are allowed)
            if pos == 0.5 and os.getenv("LOAD_MODELS", "false").lower() == "true":
                try:
                    import torch
                    import easyocr
                    reader = easyocr.Reader(['en'], gpu=torch.cuda.is_available(), verbose=False)
                    ocr_results = reader.readtext(rgb, detail=0)
                    extracted_text = " ".join(ocr_results)
                    if len(extracted_text) > 4:
                        from ml.text_infer import analyze_text
                        text_res = analyze_text(extracted_text)
                        text_risk = text_res.get("riskScore", 0) / 100.0
                        if text_risk > 0.4:
                            frame_scores[-1] = max(frame_scores[-1], text_risk)
                except Exception as e:
                    print(f"Video OCR Error: {e}")
        else:
            frame_scores.append(0.5) 
            
    cap.release()
    
    temporal_inconsistency = 0
    for i in range(1, len(frame_scores)):
        diff = abs(frame_scores[i] - frame_scores[i-1])
        if diff > 0.3:
            temporal_inconsistency += 0.1
            
    base_visual_score = sum(frame_scores) / len(frame_scores) if frame_scores else 0.5
    video_visual_score = min(1.0, base_visual_score + temporal_inconsistency)
    
    # Audio track analysis (FFmpeg fallback)
    video_audio_score = 0.5
    try:
        import subprocess
        from imageio_ffmpeg import get_ffmpeg_exe
        ffmpeg_exe = get_ffmpeg_exe()
        
        subprocess.run(
            [ffmpeg_exe, "-y", "-i", temp_video_path, "-vn", "-ar", "16000", "-ac", "1", temp_audio_path],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            check=True
        )
        if os.path.exists(temp_audio_path):
            with open(temp_audio_path, "rb") as af:
                audio_b64 = base64.b64encode(af.read()).decode('utf-8')
            audio_res = analyze_audio(audio_b64)
            video_audio_score = audio_res.get("riskScore", 50) / 100.0
    except Exception as e:
        print(f"Audio extraction failed: {e}")
        
    combined_score = (video_visual_score * 0.6) + (video_audio_score * 0.4)
    
    if os.path.exists(temp_video_path): os.remove(temp_video_path)
    if os.path.exists(temp_audio_path): os.remove(temp_audio_path)
    
    return {
        "deepfake_probability": float(round(combined_score, 4)),
        "visual_score": float(round(video_visual_score, 4)),
        "audio_score": float(round(video_audio_score, 4)), 
        "frame_scores": [float(round(s, 4)) for s in frame_scores],
        "temporal_inconsistency": float(round(temporal_inconsistency, 4)),
        "verdict": "DEEPFAKE" if combined_score > 0.5 else "AUTHENTIC",
        "confidence": float(round(abs(combined_score - 0.5) * 2, 4)) if combined_score != 0.5 else 0.0,
        "category": "DEEPFAKE" if combined_score > 0.5 else "REAL", 
        "riskScore": int(combined_score * 100)
    }

