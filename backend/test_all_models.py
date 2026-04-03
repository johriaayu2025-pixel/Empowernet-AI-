import requests
import base64
import os
import time

BASE_URL = "http://localhost:8001"

def print_res(name, res):
    print(f"--- {name} ---")
    try:
        print(res.json())
    except:
        print(res.text)
    print()

def test_text():
    # 1. Normal safe text
    res = requests.post(f"{BASE_URL}/analyze/text", json={"text": "hello i am a normal user just browsing instagram today"})
    print_res("Text (Safe)", res)

    # 2. Scam text
    res = requests.post(f"{BASE_URL}/analyze/text", json={"text": "URGENT: Click here to claim your free-iphone from http://scamlink.com immediately! Provide your wallet password."})
    print_res("Text (Scam Link)", res)

    # 3. Toxic text
    res = requests.post(f"{BASE_URL}/analyze/text", json={"text": "You are a stupid idiot and nobody likes you, kill yourself"})
    print_res("Text (Cyberbullying)", res)

def generate_black_image_b64():
    from PIL import Image
    import io
    img = Image.new('RGB', (160, 160), color = 'black')
    buffer = io.BytesIO()
    img.save(buffer, format='JPEG')
    return base64.b64encode(buffer.getvalue()).decode('utf-8')

def generate_text_image_b64(text):
    from PIL import Image, ImageDraw
    import io
    img = Image.new('RGB', (300, 100), color = 'white')
    d = ImageDraw.Draw(img)
    d.text((10,10), text, fill=(0,0,0))
    buffer = io.BytesIO()
    img.save(buffer, format='JPEG')
    return base64.b64encode(buffer.getvalue()).decode('utf-8')

def test_image():
    # 1. Black image (Safe/Uncertain)
    b64 = generate_black_image_b64()
    res = requests.post(f"{BASE_URL}/analyze/image", json={"image": b64})
    print_res("Image (Black box - checking deepfake ensemble)", res)

    # 2. Image with OCR scam text
    b64_scam = generate_text_image_b64("Click here for a free-iphone link")
    res = requests.post(f"{BASE_URL}/analyze/image", json={"image": b64_scam})
    print_res("Image (With Scam Text OCR)", res)

def test_meeting():
    b64 = generate_black_image_b64()
    res = requests.post(f"{BASE_URL}/realtime/video", json={"participant_id": "test", "frame": b64, "timestamp": int(time.time()*1000)})
    print_res("Meeting Realtime Frame (Checking fallback crop)", res)

def test_synthetic():
    b64_scam = generate_text_image_b64("Fake AI Generated Art")
    res = requests.post(f"{BASE_URL}/detect/synthetic-media", json={"image": b64_scam})
    print_res("Synthetic Media Image (Checking AI threshold)", res)

def test_audio():
    # Create simple sine wave audio for 1 second
    import numpy as np
    import scipy.io.wavfile as wavfile
    import io
    
    sr = 16000
    t = np.linspace(0, 1, sr, False)
    # Extremely stable pitch (sine wave) should heavily trigger the "Unnaturally Stable F0" heuristic
    note = np.sin(440 * 2 * np.pi * t) 
    audio = np.int16(note * 32767)
    
    buffer = io.BytesIO()
    wavfile.write(buffer, sr, audio)
    audio_b64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
    
    res = requests.post(f"{BASE_URL}/api/scan", json={"type": "audio", "content": audio_b64, "label": "API Test"})
    print_res("Audio (Sine Wave - Should trigger stable pitch heuristic fake)", res)

if __name__ == "__main__":
    import sys
    with open("test_out.txt", "w", encoding="utf-8") as f:
        sys.stdout = f
        print("Testing ALL Endpoints to satisfy user request...")
        test_text()
        test_image()
        test_meeting()
        test_synthetic()
        test_audio()
        print("Tests completed.")
