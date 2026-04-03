import { scanContent } from './api.js';
import { RateLimiter, APIQueue, ResultCache, TokenBucket } from './utils.js';

// Meeting Logic Control (Hardened)
const meetingQueue = new APIQueue(4, 10); // Max 4 parallel
const meetingParticipantRateLimiters = new Map(); // participantId -> RateLimiter
const meetingCache = new ResultCache(60000); // Larger TTL for identity cache

// Short-form Logic Control (Hardened)
const shortFormQueue = new APIQueue(2, 5);
const shortFormGlobalBucket = new TokenBucket(3, 1 / 2000); // 3 concurrent bursts, 1 every 2s
const shortFormCache = new ResultCache(3600000); // 1 hour

chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: "scanImage",
        title: "Scan Image with EmpowerNet",
        contexts: ["image"]
    });

    // AUTO-ENABLE all features on install so everything works out of the box
    chrome.storage.sync.set({
        socialMediaScannerEnabled: true,
        childSafetyEnabled: true,
        childSafetyAge: "Under 16"
    });
    // One-time cleanup: Remove empty string domains that block all local files
    chrome.storage.local.get(['blockedDomains'], (data) => {
        let blocked = data.blockedDomains || [];
        const initialLen = blocked.length;
        blocked = blocked.filter(b => b.domain && b.domain.trim() !== "");
        if (blocked.length !== initialLen) {
            chrome.storage.local.set({ blockedDomains: blocked });
            console.log("[EmpowerNet] Cleaned up accidental local file blocks.");
        }
    });
    chrome.storage.local.set({
        protectionActive: true
    });
    console.log("[EmpowerNet] All features auto-enabled on install.");
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === "scanImage") {
        const imageUrl = info.srcUrl;
        try {
            const response = await fetch(imageUrl);
            const blob = await response.blob();
            const reader = new FileReader();

            reader.onloadend = async () => {
                const base64data = reader.result.split(',')[1];
                const result = await scanContent('image', base64data, 'Context Menu Image');
                chrome.storage.local.set({ lastScanResult: result, lastScanType: 'image' }, () => {
                    chrome.action.openPopup();
                });
            };
            reader.readAsDataURL(blob);
        } catch (error) {
            console.error("Context menu scan failed:", error);
        }
    }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "meetingFrame") {
        handleMeetingFrame(request, sendResponse);
        return true;
    }
    if (request.action === "shortFormFrame") {
        handleShortFormFrame(request, sendResponse);
        return true;
    }
    if (request.action === "autoScanText") {
        scanContent('text', request.content, request.label)
            .then(result => {
                chrome.storage.local.set({ lastAutoScan: result, lastAutoScanTime: Date.now() });
                sendResponse({ success: true, result });
            })
            .catch(err => sendResponse({ success: false, error: err.message }));
        return true;
    }
    if (request.action === "START_TAB_CAPTURE") {
        setupOffscreenCapture(sender.tab.id, sendResponse);
        return true;
    }
    if (request.action === "STOP_TAB_CAPTURE") {
        stopOffscreenCapture(sendResponse);
        return true;
    }
    if (request.action === "socialScannerAnalyzeImage") {
        handleSocialImage(request, sendResponse);
        return true;
    }
    if (request.action === "socialScannerAnalyzeText") {
        handleSocialText(request, sendResponse);
        return true;
    }
    if (request.action === "updateBadge") {
        const count = request.count || 0;
        if (count > 0) {
            chrome.action.setBadgeText({ text: count.toString(), tabId: sender.tab.id });
            chrome.action.setBadgeBackgroundColor({ color: "#ef4444" });
        } else {
            chrome.action.setBadgeText({ text: "", tabId: sender.tab.id });
        }
    }
    if (request.action === "UNBLOCK_SITE") {
        const domain = request.domain;
        chrome.storage.local.get(['blockedDomains'], (data) => {
            let blocked = data.blockedDomains || [];
            blocked = blocked.filter(b => b.domain !== domain);
            chrome.storage.local.set({ blockedDomains: blocked }, () => {
                sendResponse({ success: true });
            });
        });
        return true;
    }
    // Handle analyzeMedia from content.js (Instagram video frames / images)
    if (request.action === "analyzeMedia") {
        const mediaType = request.type;
        const mediaContent = request.content;
        if (mediaType === "video_frame" || mediaType === "image") {
            // Route to social image analysis
            handleSocialImage({ image: mediaContent, image_url: mediaContent }, sendResponse);
            return true;
        }
    }
});

async function handleMeetingFrame(request, sendResponse) {
    const { participantId, frame, timestamp, force } = request;

    // 1. Check Cache (Ignore if forced)
    const cached = meetingCache.get(participantId);
    if (!force && cached && Date.now() - cached.timestamp < 12000) {
        return sendResponse({ success: true, result: cached, fromCache: true });
    }

    // 2. Check Rate Limit (1 per 3s per participant)
    let limiter = meetingParticipantRateLimiters.get(participantId);
    if (!limiter) {
        limiter = new RateLimiter(1, 3000);
        meetingParticipantRateLimiters.set(participantId, limiter);
    }

    if (!force && !limiter.tryAcquire()) {
        return sendResponse({ success: false, error: "Rate limit (3s) violation" });
    }

    // 3. Enqueue Request
    const result = await meetingQueue.enqueue(async () => {
        try {
            const res = await fetch("http://localhost:8001/realtime/video", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ participant_id: participantId, frame, timestamp })
            });
            const data = await res.json();

            // Confidence Logic Refinement
            if (data.deepfake === undefined) {
                data.status = "Uncertain"; // Force uncertain if API fails logic
            }

            meetingCache.set(participantId, data);

            // Descriptive error mapping
            if (data.status === "SERVICE_ERROR_MP") {
                data.userSummary = { verdict: "Service Degraded", reason: "Face detection service is unavailable on the server." };
            } else if (data.status === "NO_FACE") {
                data.userSummary = { verdict: "Uncertain", reason: "No clear face found in the current frame." };
            }

            return data;
        } catch (err) {
            return { status: "Uncertain", error: err.message };
        }
    });

    sendResponse({ success: true, result });
}

async function handleShortFormFrame(request, sendResponse) {
    const { videoHash, frame } = request;

    // 1. Check Cache
    const cached = shortFormCache.get(videoHash);
    if (cached) {
        return sendResponse({ success: true, result: cached, fromCache: true });
    }

    // 2. Global Token Bucket (1 request every 2.5s)
    if (!shortFormGlobalBucket.tryAcquire()) {
        return sendResponse({ success: false, error: "Global token bucket empty" });
    }

    // 3. Enqueue Request
    const result = await shortFormQueue.enqueue(async () => {
        try {
            const res = await fetch("http://localhost:8001/detect/synthetic-media", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ image: frame })
            });
            const data = await res.json();
            shortFormCache.set(videoHash, data);
            return data;
        } catch (err) {
            return { status: "Uncertain", error: err.message };
        }
    });

    sendResponse({ success: true, result });
}

async function handleSocialImage(request, sendResponse) {
    chrome.storage.sync.get(['backendUrl'], async (data) => {
        const backendUrl = data.backendUrl || 'http://localhost:8001';
        try {
            let b64Image = request.image;
            if (!b64Image && request.image_url) {
                try {
                    const imgRes = await fetch(request.image_url);
                    const blob = await imgRes.blob();
                    b64Image = await new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result.split(',')[1]);
                        reader.onerror = reject;
                        reader.readAsDataURL(blob);
                    });
                } catch (e) {
                    console.error("Failed to fetch image locally:", e);
                    // Fallback to sending URL if fetch fails
                }
            }
            
            const payload = b64Image ? { image: b64Image } : { image_url: request.image_url };
            const res = await fetch(`${backendUrl}/analyze/image`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await res.json();
            sendResponse({ success: true, result });
        } catch (err) {
            sendResponse({ success: false, error: err.message });
        }
    });
}

async function handleSocialText(request, sendResponse) {
    chrome.storage.sync.get(['backendUrl'], async (data) => {
        const backendUrl = data.backendUrl || 'http://localhost:8001';
        try {
            const res = await fetch(`${backendUrl}/analyze/text`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: request.text })
            });
            const result = await res.json();
            sendResponse({ success: true, result });
        } catch (err) {
            sendResponse({ success: false, error: err.message });
        }
    });
}

// Enforce Site Blocking
chrome.webNavigation.onBeforeNavigate.addListener((details) => {
    if (details.frameId !== 0) return;
    const url = new URL(details.url);
    const domain = url.hostname;
    chrome.storage.local.get(['blockedDomains'], (data) => {
        const blocked = data.blockedDomains || [];
        if (blocked.some(b => b.domain === domain)) {
            const blockedUrl = chrome.runtime.getURL(`blocked.html?site=${encodeURIComponent(domain)}&url=${encodeURIComponent(details.url)}`);
            chrome.tabs.update(details.tabId, { url: blockedUrl });
        }
    });
});

// Offscreen and TabCapture Management
async function setupOffscreenCapture(tabId, sendResponse) {
    try {
        const existingContexts = await chrome.runtime.getContexts({
            contextTypes: ['OFFSCREEN_DOCUMENT'],
            documentUrls: [chrome.runtime.getURL('offscreen.html')]
        });

        if (existingContexts.length === 0) {
            await chrome.offscreen.createDocument({
                url: 'offscreen.html',
                reasons: ['USER_MEDIA'],
                justification: 'Capturing tab audio and video for deepfake and scam analysis'
            });
        }

        chrome.tabCapture.getMediaStreamId({ targetTabId: tabId }, async (streamId) => {
            if (!streamId) {
                console.error("Failed to get MediaStreamId:", chrome.runtime.lastError);
                return sendResponse({ success: false, error: "Failed to get stream ID" });
            }

            const data = await chrome.storage.local.get(['backendUrl']); // Using local as sync might not be set
            const backendUrl = data.backendUrl || 'http://localhost:8001';

            chrome.runtime.sendMessage({
                action: 'START_OFFSCREEN_CAPTURE',
                streamId: streamId,
                backendUrl: backendUrl
            }, (res) => {
                sendResponse(res || { success: true });
            });
        });
    } catch (err) {
        console.error("Error setting up offscreen capture:", err);
        sendResponse({ success: false, error: err.message });
    }
}

async function stopOffscreenCapture(sendResponse) {
    try {
        chrome.runtime.sendMessage({ action: 'STOP_OFFSCREEN_CAPTURE' });
        // Give it a moment to stop tracks
        setTimeout(async () => {
            const existingContexts = await chrome.runtime.getContexts({
                contextTypes: ['OFFSCREEN_DOCUMENT'],
                documentUrls: [chrome.runtime.getURL('offscreen.html')]
            });
            if (existingContexts.length > 0) {
                await chrome.offscreen.closeDocument();
            }
            sendResponse({ success: true });
        }, 500);
    } catch (err) {
        console.error("Error stopping offscreen document:", err);
        sendResponse({ success: false, error: err.message });
    }
}
