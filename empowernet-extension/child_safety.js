// EmpowerNet Child Safety Mode v3.0
// LOCAL keyword detection + backend ML fallback

let childSafetyEnabled = false;
let childSafetyAge = "Under 16";
let hiddenItemsCount = 0;

const processedElements = new WeakSet();

// ===========================
// LOCAL GROOMING / TOXIC KEYWORDS (NO BACKEND NEEDED)
// ===========================
const GROOMING_PATTERNS = [
    /keep\s+(this|it)\s+a?\s*secret/i,
    /don'?t\s+tell\s+(anyone|your\s+parents|your\s+mom|your\s+dad|anybody)/i,
    /send\s+(me\s+)?(a\s+)?(pic|picture|photo|selfie|video|nude)/i,
    /our\s+little\s+secret/i,
    /just\s+between\s+(us|you\s+and\s+me)/i,
    /you'?re?\s+(so\s+)?(mature|special|different)\s+for\s+your\s+age/i,
    /i\s+love\s+you\s+more\s+than/i,
    /have\s+you\s+ever\s+(kissed|touched|been\s+with)/i,
    /what\s+are\s+you\s+wearing/i,
    /turn\s+on\s+(your\s+)?(camera|cam|webcam)/i,
    /meet\s+(me\s+)?alone/i,
    /age\s+is\s+just\s+a\s+number/i,
    /you'?re\s+not\s+like\s+other\s+(kids|girls|boys)/i,
    /if\s+you\s+really\s+loved?\s+me/i,
    /i'?ll?\s+delete\s+(it|them)\s+after/i,
];

const TOXIC_PATTERNS = [
    /kill\s+your\s*self/i,
    /you\s+should\s+die/i,
    /nobody\s+(likes|loves|cares\s+about)\s+you/i,
    /you'?re?\s+(so\s+)?(ugly|fat|stupid|worthless|trash|disgusting)/i,
    /go\s+die/i,
    /end\s+your\s+life/i,
    /cut\s+your\s*self/i,
    /no\s+one\s+will\s+miss\s+you/i,
];

const SCAM_PRESSURE_PATTERNS = [
    /give\s+me\s+your\s+(password|login|credentials)/i,
    /your\s+account\s+will\s+be\s+(deleted|suspended|banned|terminated)/i,
    /urgent\s+action\s+required/i,
    /verify\s+your\s+(identity|account)\s+immediately/i,
    /click\s+(here|now|this\s+link)\s+or\s+(lose|your)/i,
    /send\s+(money|payment|gift\s+card|bitcoin|crypto)/i,
];

function localKeywordScan(text) {
    const lowerText = text.toLowerCase();
    const flags = [];
    let maxScore = 0;

    for (const pattern of GROOMING_PATTERNS) {
        if (pattern.test(text)) {
            flags.push("Grooming / Manipulation");
            maxScore = Math.max(maxScore, 0.95);
            break;
        }
    }

    for (const pattern of TOXIC_PATTERNS) {
        if (pattern.test(text)) {
            flags.push("Cyberbullying / Harassment");
            maxScore = Math.max(maxScore, 0.90);
            break;
        }
    }

    for (const pattern of SCAM_PRESSURE_PATTERNS) {
        if (pattern.test(text)) {
            flags.push("Scam / Pressure Tactics");
            maxScore = Math.max(maxScore, 0.85);
            break;
        }
    }

    return { score: maxScore, flags };
}

// ===========================
// INIT
// ===========================
function init() {
    chrome.storage.sync.get(['childSafetyEnabled', 'childSafetyAge'], (data) => {
        // Default to ENABLED if not explicitly set to false
        childSafetyEnabled = data.childSafetyEnabled !== false;
        childSafetyAge = data.childSafetyAge || "Under 16";

        console.log("[EmpowerNet] Child Safety init:", childSafetyEnabled, "Age:", childSafetyAge);
        if (childSafetyEnabled) {
            startSafetyScan();
        }
    });

    chrome.storage.onChanged.addListener((changes) => {
        if (changes.childSafetyEnabled) {
            childSafetyEnabled = changes.childSafetyEnabled.newValue;
            if (childSafetyEnabled) {
                startSafetyScan();
            } else {
                location.reload();
            }
        }
        if (changes.childSafetyAge) {
            childSafetyAge = changes.childSafetyAge.newValue;
            if (childSafetyEnabled) startSafetyScan();
        }
    });

    chrome.runtime.onMessage.addListener((request) => {
        if (request.action === "toggleChildSafety") {
            childSafetyEnabled = request.enabled;
            if (childSafetyEnabled) {
                startSafetyScan();
            } else {
                location.reload();
            }
        }
    });
}

function startSafetyScan() {
    console.log("[EmpowerNet] Child Safety Mode Active (Age: " + childSafetyAge + ")");
    scanTextElements();
    scanImages();

    const observer = new MutationObserver(debounce(() => {
        scanTextElements();
        scanImages();
    }, 1500));
    observer.observe(document.body, { childList: true, subtree: true });
}

// ===========================
// TEXT SCANNING — LOCAL FIRST, BACKEND FALLBACK
// ===========================
function scanTextElements() {
    const SELECTORS = 'p, h1, h2, h3, h4, h5, h6, li, blockquote, td';
    const elements = Array.from(document.querySelectorAll(SELECTORS))
        .filter(el => {
            if (processedElements.has(el)) return false;
            // Only scan leaf-ish elements with actual text
            const text = el.innerText?.trim();
            if (!text || text.length < 15) return false;
            // Skip elements that are parents of other scannable elements
            if (el.querySelector('p, h1, h2, h3, h4, h5, h6')) return false;
            return true;
        });

    for (const el of elements) {
        processedElements.add(el);
        const text = el.innerText.trim();

        // STEP 1: LOCAL keyword scan (instant, no network)
        const localResult = localKeywordScan(text);
        const threshold = getToxicityThreshold();

        if (localResult.score > threshold) {
            console.log("[EmpowerNet Child Safety] LOCAL match:", localResult.flags, "on:", text.substring(0, 80));
            blurElement(el, localResult.flags.join(", "));
            continue; // No need for backend
        }

        // STEP 2: Backend ML fallback for subtle cases
        sendMessagePromise({ action: 'socialScannerAnalyzeText', text }).then(res => {
            if (res && res.success && res.result) {
                const data = res.result;
                const toxScore = data.toxicity_score || 0;
                if (toxScore > threshold || data.is_safe_for_children === false) {
                    blurElement(el, data.intent_label || data.safety_flags?.join(", ") || "Harmful content detected");
                }
            }
        }).catch(() => {});
    }
}

// ===========================
// IMAGE SCANNING
// ===========================
function scanImages() {
    const images = Array.from(document.querySelectorAll('img:not([data-ep-safety-scanned])'));
    const flaggedDomains = ['deepfake-hub.com', 'fake-media.net', 'suspicious-cdn.biz'];

    for (const img of images) {
        img.dataset.epSafetyScanned = "true";
        const src = img.src;

        const isFlaggedDomain = flaggedDomains.some(d => src.includes(d));
        if (isFlaggedDomain) {
            blurImage(img, "Flagged source domain");
            continue;
        }

        // Backend deepfake check
        sendMessagePromise({ action: 'socialScannerAnalyzeImage', image_url: src }).then(res => {
            if (res && res.success && res.result) {
                const data = res.result;
                if (data.ai_probability > 0.7 || data.is_safe_for_children === false) {
                    blurImage(img, data.safety_flags?.join(", ") || "Synthetic / Deepfake Image");
                }
            }
        }).catch(() => {});
    }
}

// ===========================
// UI: BLUR / BLOCK
// ===========================
function blurElement(el, label) {
    if (el.dataset.epHidden) return;
    el.dataset.epHidden = "true";
    hiddenItemsCount++;
    updateBadge();

    const placeholder = document.createElement('div');
    placeholder.className = 'ep-child-safety-placeholder';
    placeholder.style.cssText = `
        background: #fef2f2;
        border: 2px solid #fecaca;
        padding: 16px;
        border-radius: 12px;
        margin: 10px 0;
        font-family: system-ui, sans-serif;
        text-align: center;
        position: relative;
    `;

    placeholder.innerHTML = `
        <div style="color: #dc2626; font-weight: 800; font-size: 14px; margin-bottom: 8px;">🛡️ ${label}</div>
        <div style="color: #9ca3af; font-size: 12px; margin-bottom: 10px;">Content hidden by EmpowerNet Child Safety</div>
        <button style="background: #fff; border: 1px solid #e5e7eb; padding: 4px 14px; border-radius: 6px; font-size: 11px; cursor: pointer; color: #6b7280;">Show anyway</button>
    `;

    el.style.display = 'none';
    el.after(placeholder);

    placeholder.querySelector('button').onclick = () => {
        el.style.display = '';
        placeholder.remove();
        hiddenItemsCount--;
        updateBadge();
    };
}

function blurImage(img, label) {
    if (img.dataset.epHidden) return;
    img.dataset.epHidden = "true";
    hiddenItemsCount++;
    updateBadge();

    img.style.filter = 'blur(30px)';
    img.style.transition = 'filter 0.3s ease';

    const wrapper = document.createElement('div');
    wrapper.style.position = 'relative';
    wrapper.style.display = 'inline-block';
    img.before(wrapper);
    wrapper.appendChild(img);

    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: absolute;
        top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.5);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        color: white;
        font-family: sans-serif;
        cursor: pointer;
        z-index: 100;
        border-radius: 8px;
    `;
    overlay.innerHTML = `
        <div style="font-weight: 800; font-size: 14px; text-shadow: 0 2px 4px rgba(0,0,0,0.5);">🛡️ ${label}</div>
        <div style="font-size: 10px; opacity: 0.8; margin-top: 4px;">Click to reveal</div>
    `;

    wrapper.appendChild(overlay);

    overlay.onclick = () => {
        img.style.filter = 'none';
        overlay.remove();
        hiddenItemsCount--;
        updateBadge();
    };
}

// ===========================
// UTILITIES
// ===========================
function getToxicityThreshold() {
    switch (childSafetyAge) {
        case "Under 13": return 0.4;
        case "Under 16": return 0.55;
        case "Under 18": return 0.7;
        default: return 0.55;
    }
}

function updateBadge() {
    try {
        chrome.runtime.sendMessage({ action: "updateBadge", count: hiddenItemsCount });
    } catch(e) {}
}

function sendMessagePromise(message) {
    return new Promise((resolve) => {
        try {
            chrome.runtime.sendMessage(message, (response) => {
                resolve(response || { success: false });
            });
        } catch(e) { resolve({ success: false }); }
    });
}

function debounce(func, wait) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}

init();
