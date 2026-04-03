try:
    from facenet_pytorch import MTCNN
except Exception:
    MTCNN = None

from PIL import Image
import torch

device = "cuda" if torch.cuda.is_available() else "cpu"

if MTCNN is not None:
    mtcnn = MTCNN(
        image_size=224,
        margin=20,
        keep_all=False,
        device=device
    )
else:
    mtcnn = None
    print("WARNING: face_utils: MTCNN unavailable, face extraction disabled.")

def extract_face(image: Image.Image):
    if mtcnn is None:
        return None
    face = mtcnn(image)
    return face
