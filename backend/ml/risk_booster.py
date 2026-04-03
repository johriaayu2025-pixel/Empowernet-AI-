import re

# Strong scam indicators
SCAM_PATTERNS = [
    r"urgent",
    r"act now",
    r"limited time",
    r"verify your account",
    r"click here",
    r"http[s]?://",
    r"free money",
    r"winner",
    r"congratulations",
    r"gift card",
    r"otp",
    r"bank account",
    r"password",
    r"crypto",
    r"wallet",
    r"pay immediately",
    r"scamlink",
    r"free-iphone",
    r"claim your prize"
]

SAFE_DOMAINS = [
    r"onlinesbi\.sbi",
    r"delhivery\.com",
    r"parivahan\.gov\.in",
    r"google\.com",
    r"linkedin\.com",
    r"netflix\.com",
    r"amazon\.in",
    r"amazon\.com",
    r"icicibank\.com",
    r"hdfcbank\.com",
    r"apple\.com",
    r"microsoft\.com",
    r"instagram\.com",
    r"facebook\.com"
]

def apply_risk_boosters(text: str) -> float:
    """
    Returns a risk boost between -1.0 and 0.8
    """
    text = text.lower()
    
    # 1. Whitelist Safe Domains Verification
    for domain in SAFE_DOMAINS:
        if re.search(domain, text):
            return -1.0 # Force SAFE

    # 2. Heuristic Check
    boost = 0.0
    for pattern in SCAM_PATTERNS:
        if re.search(pattern, text):
            # Much stronger boost to replace the cybersectony NLP model
            boost += 0.35 if len(text.split()) < 4 else 0.20

    # Cap boost
    return min(boost, 0.80)
