import cv2
import numpy as np
from PIL import Image

try:
    from facenet_pytorch import MTCNN
    mtcnn = MTCNN(keep_all=True, device="cpu")
except Exception:
    mtcnn = None
    print("WARNING: face_detect: MTCNN unavailable, using OpenCV Haar cascade fallback.")

def extract_faces(image: np.ndarray):
    """
    image: BGR (OpenCV)
    returns: list of face PIL images
    """
    img_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    pil_img = Image.fromarray(img_rgb)

    if mtcnn is not None:
        boxes, _ = mtcnn.detect(pil_img)
    else:
        # OpenCV Haar cascade fallback
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
        detections = cascade.detectMultiScale(gray, 1.1, 5, minSize=(30, 30))
        boxes = [[x, y, x+w, y+h] for (x, y, w, h) in detections] if len(detections) > 0 else None

    faces = []
    if boxes is not None:
        for box in boxes:
            x1, y1, x2, y2 = map(int, box)
            face = pil_img.crop((x1, y1, x2, y2))
            faces.append(face)

    return faces
