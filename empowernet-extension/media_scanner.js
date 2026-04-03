// EmpowerNet Social Media AI Content & Scam Scanner (v3.0 - Hardened)
const DEBUG_MODE = true;
let isScannerEnabled = true; // DEFAULT TRUE — don't wait for storage
let backendBaseUrl = 'http://localhost:8001';
let scanObserver = null;
let scrollTimer = null;
const processedMedia = new WeakSet();

function logDebug(...args) {
    if (DEBUG_MODE) console.log("[EmpowerNet Social Scanner]", ...args);
}

function shouldAnalyzeCaption(text) {
    return text && text.trim().length > 10;
}

function extractInstagramCaption(postElement) {
    if (!postElement) return null;
    
    // Strategy 1: Known Instagram caption selectors
    const selectors = [
        'h1._ap3a', 'span._ap3a',
        'div._a9zs span', 'span[class*="x193iq5w"]',
        'div[data-testid="post-comment-root"] span',
    ];
    for (const sel of selectors) {
        const el = postElement.querySelector(sel);
        if (el && el.innerText && el.innerText.length > 10) {
            return el.innerText.trim();
        }
    }

    // Strategy 2: Find all spans with dir="auto" (Instagram's text container)
    const autoSpans = postElement.querySelectorAll('span[dir="auto"]');
    for (const span of autoSpans) {
        const text = span.innerText?.trim();
        if (text && text.length > 15) return text;
    }

    // Strategy 3: Get all text from the article/container
    const allText = postElement.innerText?.trim();
    if (allText && allText.length > 20) {
        // Return first 500 chars to avoid processing entire page
        return allText.substring(0, 500);
    }

    return null;
}


function initScanner() {
    // Read settings but DEFAULT to enabled
    chrome.storage.sync.get(['socialMediaScannerEnabled', 'backendUrl'], (data) => {
        // If key is explicitly false, disable. Otherwise enable by default.
        isScannerEnabled = data.socialMediaScannerEnabled !== false;
        if (data.backendUrl) backendBaseUrl = data.backendUrl;

        logDebug("Scanner enabled:", isScannerEnabled);
        if (isScannerEnabled) {
            startObserving();
            addScrollListener();
            // Run initial scan after DOM settles
            setTimeout(scanFeed, 2000);
        }
    });

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === "toggleSocialScanner") {
            isScannerEnabled = request.enabled;
            if (isScannerEnabled) {
                startObserving();
                addScrollListener();
                scanFeed();
            } else {
                stopObserving();
                removeScrollListener();
                clearAllBadges();
            }
        }
    });
}

function startObserving() {
    if (scanObserver) return;
    logDebug("Starting MutationObserver...");
    scanObserver = new MutationObserver(debounce(scanFeed, 1500));
    scanObserver.observe(document.body, { childList: true, subtree: true });
}

function stopObserving() {
    if (scanObserver) {
        scanObserver.disconnect();
        scanObserver = null;
    }
}

function addScrollListener() {
    window.addEventListener('scroll', handleScroll, { passive: true });
}

function removeScrollListener() {
    window.removeEventListener('scroll', handleScroll);
}

function handleScroll() {
    if (!isScannerEnabled) return;
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(() => {
        scanFeed();
    }, 800);
}

function scanFeed() {
    if (!isScannerEnabled) return;
    const isInstagram = window.location.hostname.includes('instagram.com');
    const isYouTube = window.location.hostname.includes('youtube.com');
    if (isInstagram) scanInstagram();
    // YouTube scanning can be added here
}

function scanInstagram() {
    logDebug("Scanning Instagram feed...");

    // UNIVERSAL STRATEGY: Find ALL large images and videos on page
    // Instagram changes DOM classes frequently, so we match by SIZE not selectors

    // 1. Find ALL images on page that are large enough to be post content
    const allImages = document.querySelectorAll('img:not([data-ep-badge-done])');
    let foundCount = 0;

    allImages.forEach(img => {
        if (processedMedia.has(img)) return;

        const rect = img.getBoundingClientRect();
        // Skip tiny images (profile pics, icons, emojis)
        if (rect.width < 200 || rect.height < 200) return;
        // Skip images not in viewport (too far away)
        if (rect.top > window.innerHeight * 3 || rect.bottom < -window.innerHeight) return;
        // Skip the user's own profile pic in sidebar
        if (img.alt && img.alt.includes('profile picture') && rect.width < 300) return;

        processedMedia.add(img);
        img.dataset.epBadgeDone = "true";
        foundCount++;

        // Try to find a caption near the image
        const parentArticle = img.closest('article') || img.closest('div[role="presentation"]') || img.closest('div[role="dialog"]');
        const caption = extractInstagramCaption(parentArticle);

        logDebug(`Found image: ${rect.width}x${rect.height}, src: ${img.src?.substring(0, 60)}...`);
        processInstagramContent(img, caption);
    });

    // 2. Find ALL videos (Reels, stories, post videos)
    const allVideos = document.querySelectorAll('video:not([data-ep-badge-done])');
    allVideos.forEach(v => {
        if (processedMedia.has(v)) return;

        const rect = v.getBoundingClientRect();
        if (rect.width < 100 || rect.height < 100) return;
        if (rect.top > window.innerHeight * 3 || rect.bottom < -window.innerHeight) return;

        processedMedia.add(v);
        v.dataset.epBadgeDone = "true";
        foundCount++;

        const parentHost = v.closest('article') || v.closest('div[role="presentation"]') || v.closest('div[role="dialog"]') || v.parentElement;
        const caption = extractInstagramCaption(parentHost);

        logDebug(`Found video: ${rect.width}x${rect.height}`);
        processInstagramContent(v, caption);
    });

    logDebug(`Scan complete. Found ${foundCount} new media elements.`);
}
// ===========================
// LOCAL AI/SCAM KEYWORD DETECTION (NO BACKEND NEEDED)
// ===========================
const AI_KEYWORDS = [
    'ai generated', 'ai art', 'aiart', 'ai_art', 'aigenerated', 'ai_generated',
    'midjourney', 'mid journey', 'dalle', 'dall-e', 'dall_e',
    'stable diffusion', 'stablediffusion', 'comfyui', 'automatic1111',
    'generative ai', 'genai', 'text to image', 'text2img',
    'sora', 'runway', 'pika', 'kling', 'luma',
    'aifilter', 'ai filter', 'ai edit', 'aiedit',
    'deepfake', 'deep fake', 'faceswap', 'face swap',
    'synthetically generated', '#aiartcommunity', '#aiartwork',
    '#artificialintelligence', '#generativeart', '#stablediffusionart',
    '#midjourneyart', '#midjourneyv5', '#dalle3', '#openai',
    'not real', 'ai made', 'made with ai', 'created by ai',
    'neural network', 'gan art', 'diffusion model'
];

const SCAM_KEYWORDS = [
    'click the link', 'win free', 'giveaway', 'claim now', 'limited offer',
    'send dm', 'dm me', 'make money fast', 'earn from home',
    'crypto profit', 'invest now', 'forex signal', 'binary option',
    'get rich', 'passive income guaranteed', 'financial freedom fast'
];

function localCaptionAnalysis(caption) {
    if (!caption) return { aiScore: 0, isScam: false, flags: [] };
    
    const lower = caption.toLowerCase();
    const flags = [];
    let aiScore = 0;

    // Check for AI keywords
    for (const kw of AI_KEYWORDS) {
        if (lower.includes(kw)) {
            aiScore = Math.max(aiScore, 0.85);
            flags.push(`AI keyword: "${kw}"`);
            break; // One match is enough
        }
    }

    // Check hashtags specifically
    const hashtags = caption.match(/#\w+/g) || [];
    for (const tag of hashtags) {
        const tagLower = tag.toLowerCase();
        if (tagLower.includes('ai') || tagLower.includes('midjourney') || 
            tagLower.includes('dalle') || tagLower.includes('diffusion') ||
            tagLower.includes('deepfake') || tagLower.includes('generated') ||
            tagLower.includes('sora') || tagLower.includes('runway')) {
            aiScore = Math.max(aiScore, 0.90);
            flags.push(`AI hashtag: ${tag}`);
            break;
        }
    }

    // Check for scam
    let isScam = false;
    for (const kw of SCAM_KEYWORDS) {
        if (lower.includes(kw)) {
            isScam = true;
            flags.push(`Scam keyword: "${kw}"`);
            break;
        }
    }

    return { aiScore, isScam, flags };
}

async function processInstagramContent(mediaElement, caption) {
    // User requested a delay to make it look more natural
    await new Promise(r => setTimeout(r, 3000));

    // STEP 1: LOCAL caption analysis
    const localResult = localCaptionAnalysis(caption);
    let aiProbability = localResult.aiScore;

    if (localResult.isScam) {
        aiProbability = Math.max(aiProbability, 0.80);
    }

    // Page-level context boost (if page title mentions AI)
    if (checkContextBoost() && aiProbability < 0.5) {
        aiProbability = Math.max(aiProbability, 0.70);
    }

    if (localResult.flags.length > 0) {
        logDebug("Local detection:", localResult.flags);
    }

    // Initial injection with local result
    injectBadge(mediaElement, aiProbability);

    // STEP 3: Try backend API in background with 5s timeout (non-blocking update)
    try {
        let mediaData = null;
        let isBase64 = true;

        if (mediaElement.tagName === 'VIDEO') {
            mediaData = await Promise.race([
                captureVideoFrame(mediaElement),
                new Promise(r => setTimeout(() => r(null), 3000))
            ]);
        } else {
            const res = await Promise.race([
                getBase64FromImage(mediaElement),
                new Promise(r => setTimeout(() => r({ data: null, isBase64: false }), 3000))
            ]);
            mediaData = res.data;
            isBase64 = res.isBase64;
        }

        if (mediaData) {
            const payload = isBase64
                ? { action: 'socialScannerAnalyzeImage', image: mediaData }
                : { action: 'socialScannerAnalyzeImage', image_url: mediaData };

            // Non-blocking: race with 5s timeout
            const apiResult = await Promise.race([
                sendMessagePromise(payload),
                new Promise(r => setTimeout(() => r({ success: false, timeout: true }), 5000))
            ]);

            if (apiResult && apiResult.success && apiResult.result) {
                const backendProb = apiResult.result.deepfake_probability || apiResult.result.ai_probability || apiResult.result.vision_ensemble || 0;
                const verdict = apiResult.result.verdict || "REAL";

                logDebug("Backend result:", verdict, backendProb);

                // Only update badge if backend gives HIGHER confidence than local
                let finalProb = Math.max(aiProbability, backendProb);
                if (verdict === "DEEPFAKE" && finalProb < 0.6) finalProb = 0.85;

                if (finalProb !== aiProbability) {
                    injectBadge(mediaElement, finalProb);
                }
            } else {
                logDebug("Backend timeout or no result - local result stands");
            }
        }
    } catch (e) {
        logDebug("Background API error (non-blocking):", e);
    }
}


async function captureVideoFrame(video) {
    return new Promise((resolve) => {
        try {
            // If video is already playing and has data, capture current frame
            if (video.readyState >= 2 && video.videoWidth > 0) {
                const canvas = document.createElement('canvas');
                canvas.width = Math.min(video.videoWidth, 512);
                canvas.height = Math.min(video.videoHeight, 512);
                const ctx = canvas.getContext('2d');
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                const base64 = canvas.toDataURL('image/jpeg', 0.85).split(',')[1];
                resolve(base64);
                return;
            }

            // Otherwise wait for loadeddata
            const onLoadedData = () => {
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = Math.min(video.videoWidth || 512, 512);
                    canvas.height = Math.min(video.videoHeight || 512, 512);
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                    const base64 = canvas.toDataURL('image/jpeg', 0.85).split(',')[1];
                    resolve(base64);
                } catch (e) { resolve(null); }
            };

            if (video.readyState >= 2) {
                onLoadedData();
            } else {
                video.addEventListener('loadeddata', onLoadedData, { once: true });
            }

            // Timeout safety
            setTimeout(() => resolve(null), 4000);
        } catch (e) {
            resolve(null);
        }
    });
}

async function getBase64FromImage(img) {
    return new Promise((resolve) => {
        const extract = () => {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = Math.min(img.naturalWidth || 512, 512);
                canvas.height = Math.min(img.naturalHeight || 512, 512);
                const ctx = canvas.getContext('2d');

                const tempImg = new window.Image();
                tempImg.crossOrigin = "Anonymous";
                tempImg.onload = () => {
                    ctx.drawImage(tempImg, 0, 0, canvas.width, canvas.height);
                    resolve({ data: canvas.toDataURL('image/jpeg', 0.85).split(',')[1], isBase64: true });
                };
                tempImg.onerror = () => {
                    // CORS blocked — send URL directly for backend to fetch
                    logDebug("CORS blocked, sending URL instead:", img.src.substring(0, 80));
                    resolve({ data: img.src, isBase64: false });
                };
                tempImg.src = img.src;
            } catch (e) { resolve({ data: img.src, isBase64: false }); }
        };

        if (img.complete && img.naturalWidth > 50) {
            extract();
        } else {
            img.onload = extract;
            setTimeout(() => resolve({ data: img.src, isBase64: false }), 3000);
        }
    });
}

function checkContextBoost() {
    const pageText = document.title + ' ' + (document.querySelector('header')?.innerText || '');
    const aiKeywords = ['ai generated', 'midjourney', 'stable diffusion', 'ai art', 'artificial intelligence', 'dall-e', 'sora', 'runway'];
    return aiKeywords.some(kw => pageText.toLowerCase().includes(kw));
}

function injectBadge(imgElement, aiProbability, customLabel) {
    // STRATEGY: Use a FIXED-position badge placed at the image's screen coordinates.
    // This CANNOT be clipped by any parent overflow:hidden.

    // Remove previous badge for this element
    const existingId = imgElement.dataset.epBadgeId;
    if (existingId) {
        const old = document.getElementById(existingId);
        if (old) old.remove();
    }

    const rect = imgElement.getBoundingClientRect();
    if (rect.width < 50 || rect.height < 50) return;

    const badgeId = 'ep-b-' + Math.random().toString(36).substr(2, 8);
    imgElement.dataset.epBadgeId = badgeId;

    const badge = document.createElement('div');
    badge.id = badgeId;
    badge.className = 'ep-badge';

    let bg, label;
    if (customLabel) {
        bg = 'rgba(59,130,246,0.90)';
        label = customLabel;
    } else if (aiProbability > 0.60) {
        bg = 'rgba(220,38,38,0.92)';
        label = `⚠ AI Generated ${Math.round(aiProbability * 100)}%`;
    } else if (aiProbability > 0.35) {
        bg = 'rgba(217,119,6,0.92)';
        label = `? Uncertain ${Math.round(aiProbability * 100)}%`;
    } else {
        bg = 'rgba(22,163,74,0.92)';
        label = `✓ Real ${Math.round((1 - aiProbability) * 100)}%`;
    }

    badge.setAttribute('style', [
        'position:fixed',
        `top:${rect.top + 12}px`,
        `left:${rect.left + 12}px`,
        'z-index:2147483647',
        'font-size:13px',
        'font-weight:900',
        'padding:7px 16px',
        'border-radius:24px',
        'pointer-events:none',
        'font-family:-apple-system,BlinkMacSystemFont,sans-serif',
        `background:${bg}`,
        'color:white',
        'line-height:1.4',
        'box-shadow:0 4px 20px rgba(0,0,0,0.5)',
        'letter-spacing:0.3px',
        'text-shadow:0 1px 2px rgba(0,0,0,0.3)',
        'backdrop-filter:blur(4px)',
        'border:1px solid rgba(255,255,255,0.2)'
    ].join(';') + ';');

    badge.textContent = label;
    document.body.appendChild(badge);

    logDebug('Badge injected:', label, 'at', rect.top.toFixed(0), rect.left.toFixed(0));

    // Reposition on scroll since we use fixed positioning
    const repositionHandler = () => {
        const newRect = imgElement.getBoundingClientRect();
        if (!imgElement.isConnected || newRect.width < 10) {
            badge.remove();
            window.removeEventListener('scroll', repositionHandler);
            return;
        }
        badge.style.top = (newRect.top + 12) + 'px';
        badge.style.left = (newRect.left + 12) + 'px';
    };
    window.addEventListener('scroll', repositionHandler, { passive: true });
}

function clearAllBadges() {
    document.querySelectorAll('.ep-badge').forEach(b => b.remove());
    document.querySelectorAll('[data-ep-scanned]').forEach(el => {
        delete el.dataset.epScanned;
    });
}

function sendMessagePromise(message) {
    return new Promise((resolve) => {
        try {
            chrome.runtime.sendMessage(message, (response) => {
                if (chrome.runtime.lastError) {
                    logDebug("sendMessage error:", chrome.runtime.lastError.message);
                    resolve({ success: false });
                    return;
                }
                resolve(response || { success: false });
            });
        } catch (e) {
            resolve({ success: false });
        }
    });
}

function debounce(func, wait) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// Initialize
logDebug("Media Scanner loaded on:", window.location.hostname);
initScanner();
