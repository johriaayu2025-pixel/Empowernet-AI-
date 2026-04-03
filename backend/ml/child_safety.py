import torch
from transformers import pipeline
from PIL import Image
import numpy as np
from ml.ml_service import ml_service

# Singleton pipelines
_safety_pipelines = {}

def get_safety_pipeline(model_name, task="text-classification"):
    if model_name not in _safety_pipelines:
        print(f"Loading safety model: {model_name}...")
        try:
            _safety_pipelines[model_name] = pipeline(task, model=model_name)
        except Exception as e:
            print(f"Failed to load {model_name}: {e}")
            return None
    return _safety_pipelines[model_name]

def analyze_child_safety_text(text: str):
    if not text:
        return {"toxic": False, "reason": "No content"}
    
    results = {
        "is_safe": True,
        "flags": [],
        "scores": {}
    }

    # 1. NSFW Text Classification
    nsfw_pipe = get_safety_pipeline("michellejieli/NSFW_text_classifier")
    if nsfw_pipe:
        res = nsfw_pipe(text[:512])[0]
        results['scores']['nsfw_text'] = res['score']
        if res['label'] == 'NSFW' and res['score'] > 0.7:
            results['is_safe'] = False
            results['flags'].append("Explicit content detected")

    # 2. Cyberbullying Detection
    bullying_pipe = get_safety_pipeline("unitary/toxic-bert")
    if bullying_pipe:
        res = bullying_pipe(text[:512])[0]
        results['scores']['cyberbullying'] = res['score'] if res['label'].lower() == 'toxic' else 0.0
        if res['label'].lower() == 'toxic' and res['score'] > 0.6:
            results['is_safe'] = False
            results['flags'].append("High toxicity/bullying detected")

    return results

def analyze_child_safety_image(image_input):
    """
    image_input can be base64 string or PIL Image
    """
    if isinstance(image_input, str):
        img_np = ml_service.decode_base64_image(image_input)
        img_pil = Image.fromarray(img_np)
    else:
        img_pil = image_input

    results = {
        "is_safe": True,
        "flags": [],
        "scores": {}
    }

    # 1. NSFW Image Detection
    nsfw_img_pipe = get_safety_pipeline("Falconsai/nsfw_image_detection", task="image-classification")
    if nsfw_img_pipe:
        res = nsfw_img_pipe(img_pil)
        # res is a list of dicts: [{'label': 'nsfw', 'score': 0.9}, ...]
        nsfw_score = next((item['score'] for item in res if item['label'] == 'nsfw'), 0.0)
        results['scores']['nsfw_image'] = nsfw_score
        if nsfw_score > 0.6:
            results['is_safe'] = False
            results['flags'].append("Explicit visual content detected")

    return results
