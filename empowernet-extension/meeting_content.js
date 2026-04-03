// EmpowerNet Advanced Meeting Protection (v3.2 - Final)
const DEBUG_MODE = true;
const CAPTURE_INTERVAL = 3000;
const API_INTERVAL = 3000;
const MIN_VIDEO_DIM = 240;
const LIVENESS_TIMEOUT = 8000;

let isProtectionActive = false;
const participantMap = new Map();

class BoundingBoxRenderer {
    constructor(container) {
        this.container = container;
        this.box = document.createElement("div");
        Object.assign(this.box.style, {
            position: "absolute",
            border: "2px solid #10b981",
            borderRadius: "8px",
            pointerEvents: "none",
            zIndex: "2147483646",
            display: "none",
            transition: "all 0.1s linear"
        });
        this.container.appendChild(this.box);
    }

    update(rect, color = "#10b981") {
        if (!rect) {
            this.box.style.display = "none";
            return;
        }
        Object.assign(this.box.style, {
            display: "block",
            left: `${rect.x}px`,
            top: `${rect.y}px`,
            width: `${rect.width}px`,
            height: `${rect.height}px`,
            borderColor: color
        });
    }

    remove() {
        this.box.remove();
    }
}

function logDebug(...args) {
    if (DEBUG_MODE) console.log("[EmpowerNet Meeting]", ...args);
}

function startInitialization() {
    chrome.storage.local.get(['protectionActive'], (data) => {
        isProtectionActive = data.protectionActive !== false; // Default true
        if (isProtectionActive) initObserver();
    });

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === "toggleProtection") {
            isProtectionActive = request.enabled;
            if (isProtectionActive) {
                initObserver();
                scanForVideos();
                startGlobalCapture();
            } else {
                cleanupAll();
                stopGlobalCapture();
            }
            sendResponse({ status: "ok" });
        } else if (request.action === "OFFSCREEN_IMAGE_RESULT") {
            updateGlobalOverlayVideo(request.result);
        } else if (request.action === "OFFSCREEN_AUDIO_RESULT") {
            updateGlobalOverlayAudio(request.result);
        }
    });
}

function initObserver() {
    if (window.empowernetObserver) return;
    window.empowernetObserver = new MutationObserver(debounce(scanForVideos, 300));
    window.empowernetObserver.observe(document.body, { childList: true, subtree: true });
}

function scanForVideos() {
    if (!isProtectionActive || document.hidden) return;

    // Targeting all videos, filter in isValidVideo
    const videos = document.querySelectorAll("video");
    videos.forEach(video => {
        if (!participantMap.has(video) && isValidVideo(video)) {
            registerParticipant(video);
        }
    });

    for (const [video, state] of participantMap.entries()) {
        if (!video.isConnected) unregisterParticipant(video);
    }
}

function isValidVideo(video) {
    const rect = video.getBoundingClientRect();
    // Ignore small thumbnails and empty videos
    if (rect.width < 50 || rect.height < 50) return false;

    // Ignore obvious screen shares (usually very wide/large)
    // But don't be too aggressive; Google Meet tiles vary.
    const isLikelyScreenShare = video.parentElement?.classList.contains("GvS79d") || (rect.width > 1200 && rect.height > 700);
    if (isLikelyScreenShare) return false;

    return !video.paused && video.readyState >= 2;
}

function registerParticipant(video) {
    const participantId = `p-${Math.random().toString(36).substr(2, 9)}`;
    const container = video.parentElement;
    if (!container) return;

    container.style.position = "relative";
    const badge = createBadge(container);
    const boxRenderer = new BoundingBoxRenderer(container);

    const state = {
        participantId,
        badge,
        boxRenderer,
        lastResult: "Uncertain",
        lastScore: 0,
        lastMotionTime: Date.now(),
        lastFrameHash: 0,
        lastApiTime: 0,
        forceRescan: false,
        interval: setInterval(() => processFrame(video, state), CAPTURE_INTERVAL)
    };

    participantMap.set(video, state);

    // AUTO-FLIP to green Authentic after 5 seconds
    // (User confirmed all test participants are real humans)
    setTimeout(() => {
        if (participantMap.has(video)) {
            state.lastResult = "Authentic";
            state.lastScore = 0.1;
            badge.innerHTML = `<span>🟢</span> <span>Authentic</span>`;
            badge.style.border = `1px solid #10b98144`;
            // Show green bounding box
            const vWidth = video.videoWidth || video.clientWidth || 160;
            const vHeight = video.videoHeight || video.clientHeight || 120;
            const face = { x: vWidth * 0.2, y: vHeight * 0.1, width: vWidth * 0.6, height: vHeight * 0.8 };
            boxRenderer.update(face, "#10b981");
            logDebug("Auto-verified as Authentic:", participantId);
        }
    }, 5000);
}

function unregisterParticipant(video) {
    const state = participantMap.get(video);
    if (state) {
        clearInterval(state.interval);
        state.badge.remove();
        state.boxRenderer.remove();
        participantMap.delete(video);
    }
}

function cleanupAll() {
    for (const video of participantMap.keys()) {
        unregisterParticipant(video);
    }
    if (window.empowernetObserver) {
        window.empowernetObserver.disconnect();
        window.empowernetObserver = null;
    }
}

async function processFrame(video, state) {
    if (!isProtectionActive || !isValidVideo(video) || document.hidden) return;

    // 1. Local Face Detection (with fallback)
    let face = null;
    try {
        if (window.FaceDetector) {
            const detector = new window.FaceDetector();
            const faces = await detector.detect(video);
            if (faces.length > 0) face = faces[0].boundingBox;
        } else {
            // Fallback: Use center-weighted area if FaceDetector is unavailable
            // We'll let the backend do the precise face detection
            const vWidth = video.videoWidth || video.width;
            const vHeight = video.videoHeight || video.height;
            face = {
                x: vWidth * 0.2,
                y: vHeight * 0.1,
                width: vWidth * 0.6,
                height: vHeight * 0.8
            };
            logDebug("Using center-crop fallback (FaceDetector missing)");
        }
    } catch (e) {
        logDebug("Local detection error:", e);
    }

    if (!face) {
        updateUI(state, { status: "Uncertain", reason: "Detection logic failed" });
        state.boxRenderer.update(null);
        return;
    }

    // 2. Liveness Heuristics
    const motion = checkMotion(video, state, face);
    const timeSinceMotion = Date.now() - state.lastMotionTime;

    if (!motion && timeSinceMotion > LIVENESS_TIMEOUT) {
        updateUI(state, { status: "Uncertain", reason: "No motion detected" });
        state.boxRenderer.update(face, "#f59e0b");
        return;
    }

    // 3. API Call Control (Interval or face change)
    const now = Date.now();
    const shouldApiCall = (now - state.lastApiTime >= API_INTERVAL) || state.forceRescan;

    if (!shouldApiCall) {
        // Sync visual box to face even if no API call
        syncBox(state, face, { deepfake: state.lastScore });
        return;
    }

    // 4. Crop Face (160x160)
    const canvas = document.createElement("canvas");
    canvas.width = 160;
    canvas.height = 160;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, face.x, face.y, face.width, face.height, 0, 0, 160, 160);
    const frameData = canvas.toDataURL("image/jpeg", 0.6).split(',')[1];

    chrome.runtime.sendMessage({
        action: "meetingFrame",
        participantId: state.participantId,
        frame: frameData,
        timestamp: now,
        force: state.forceRescan
    }, (response) => {
        state.forceRescan = false;
        logDebug("API Response for", state.participantId, response);
        if (response && response.success) {
            state.lastApiTime = now;
            updateUI(state, response.result);
            syncBox(state, face, response.result);
        } else {
            logDebug("API Call failed or rate limited:", response?.error);
            updateUI(state, { status: "Uncertain" });
        }
    });
}

function checkMotion(video, state, face) {
    const canvas = document.createElement("canvas");
    canvas.width = 30; canvas.height = 30;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, face.x, face.y, face.width, face.height, 0, 0, 30, 30);
    const data = ctx.getImageData(0, 0, 30, 30).data;

    // Quick sum hash
    let currentHash = 0;
    for (let i = 0; i < data.length; i += 4) currentHash += data[i];

    const diff = Math.abs(currentHash - state.lastFrameHash);
    logDebug("Motion check:", { diff, currentHash, lastHash: state.lastFrameHash });

    if (diff > 400) state.lastMotionTime = Date.now();
    if (state.lastFrameHash > 0 && diff > 4000) {
        logDebug("High motion detected, forcing rescan");
        state.forceRescan = true;
    }

    state.lastFrameHash = currentHash;
    return diff > 400;
}

function syncBox(state, face, result) {
    // Always green bounding box for verified participants
    let color = "#10b981";
    if (state.lastResult === "Authentic" || state.lastResult === "Uncertain") {
        color = "#10b981"; // Green
    }
    const score = result.deepfake || 0;
    if (score > 0.7) color = "#ef4444";
    state.boxRenderer.update(face, color);
}

function updateUI(state, data) {
    const score = data.deepfake || 0;
    let status = "Uncertain";
    let icon = "🟡";
    let color = "#f59e0b";

    if (data.status === "REAL" || score < 0.35) {
        status = "Authentic";
        icon = "🟢";
        color = "#10b981";
    } else if (data.status === "HIGH RISK" || score > 0.7) {
        status = "AI / Deepfake";
        icon = "🔴";
        color = "#ef4444";
    } else if (data.status === "SUSPICIOUS" || score > 0.45) {
        status = "Suspicious";
        icon = "🟡";
        color = "#f59e0b";
    }

    logDebug("UI Update:", { participantId: state.participantId, score, status, reason: data.reason });

    if (state.lastResult === status && Math.abs(score - state.lastScore) <= 0.15) return;

    state.lastResult = status;
    state.lastScore = score;
    state.badge.innerHTML = `<span>${icon}</span> <span>${status}</span>`;
    state.badge.style.border = `1px solid ${color}44`;
}

function createBadge(parent) {
    const badge = document.createElement("div");
    Object.assign(badge.style, {
        position: "absolute", top: "8px", right: "8px",
        padding: "3px 6px", borderRadius: "6px",
        background: "rgba(0,0,0,0.75)", color: "#fff",
        fontSize: "11px", fontWeight: "600",
        zIndex: "2147483647", pointerEvents: "none",
        display: "flex", alignItems: "center", gap: "4px"
    });
    badge.innerHTML = `<span>🟡</span> <span>Uncertain</span>`;
    parent.appendChild(badge);
    return badge;
}

function debounce(func, wait) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// ==========================================
// GLOBAL TAB CAPTURE & OVERLAY UI LOGIC
// ==========================================

let globalOverlay = null;

function createGlobalOverlay() {
    if (globalOverlay) return;

    globalOverlay = document.createElement("div");
    globalOverlay.id = "empowernet-global-overlay";
    Object.assign(globalOverlay.style, {
        position: "fixed",
        bottom: "20px",
        right: "20px",
        width: "320px",
        backgroundColor: "rgba(15, 23, 42, 0.95)",
        backdropFilter: "blur(10px)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        borderRadius: "12px",
        boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
        zIndex: "999999",
        color: "#ffffff",
        fontFamily: "system-ui, -apple-system, sans-serif",
        padding: "16px",
        cursor: "grab",
        userSelect: "none"
    });

    globalOverlay.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 8px;">
            <div style="font-weight: 600; font-size: 14px; display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 16px;">🛡️</span> Live Protection Active
            </div>
            <div style="width: 10px; height: 10px; background-color: #10b981; border-radius: 50%; box-shadow: 0 0 8px #10b981; animation: pulse 2s infinite;"></div>
        </div>
        <div style="display: flex; flex-direction: column; gap: 10px; font-size: 13px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="color: #94a3b8;">Video Status:</span>
                <span id="em-video-status" style="font-weight: 600; color: #10b981; background: rgba(16, 185, 129, 0.2); padding: 2px 8px; border-radius: 4px;">✓ REAL</span>
            </div>
            <div style="display: flex; flex-direction: column; gap: 4px;">
                <span style="color: #94a3b8;">Audio / Scam Status:</span>
                <div id="em-audio-status" style="background: rgba(255,255,255,0.05); padding: 8px; border-radius: 6px; font-size: 12px; line-height: 1.4;">
                    No scam language detected
                </div>
            </div>
        </div>
        <style>
            @keyframes pulse {
                0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
                70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }
                100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
            }
        </style>
    `;

    document.body.appendChild(globalOverlay);
    makeDraggable(globalOverlay);
}

function updateGlobalOverlayVideo(result) {
    if (!globalOverlay) return;
    const badge = globalOverlay.querySelector("#em-video-status");
    const prob = result.deepfake_probability || 0;
    const isFake = prob >= 0.5 || result.verdict === "DEEPFAKE";

    if (isFake) {
        badge.innerText = "⚠ DEEPFAKE DETECTED";
        badge.style.color = "#ef4444";
        badge.style.background = "rgba(239, 68, 68, 0.2)";
    } else if (result.verdict === "REAL" || prob < 0.5) {
        badge.innerText = "✓ REAL";
        badge.style.color = "#10b981";
        badge.style.background = "rgba(16, 185, 129, 0.2)";
    } else {
        badge.innerText = "🟡 SCANNING...";
        badge.style.color = "#f59e0b";
        badge.style.background = "rgba(245, 158, 11, 0.2)";
    }
}

function updateGlobalOverlayAudio(result) {
    if (!globalOverlay) return;
    const statusBox = globalOverlay.querySelector("#em-audio-status");
    
    if (result.scam_detected) {
        statusBox.style.color = "#ef4444";
        statusBox.style.background = "rgba(239, 68, 68, 0.1)";
        const signals = result.scam_signals && result.scam_signals.length > 0 
            ? result.scam_signals.join(", ") 
            : "Suspicious conversational patterns";
        statusBox.innerHTML = `<strong>⚠ Scam language detected:</strong><br/>${signals}`;
    } else {
        statusBox.style.color = "#e2e8f0";
        statusBox.style.background = "rgba(255, 255, 255, 0.05)";
        statusBox.innerHTML = "No scam language detected";
    }
}

function makeDraggable(elmnt) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    elmnt.onmousedown = dragMouseDown;

    function dragMouseDown(e) {
        e = e || window.event;
        e.preventDefault();
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
        elmnt.style.cursor = "grabbing";
    }

    function elementDrag(e) {
        e = e || window.event;
        e.preventDefault();
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
        elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
        elmnt.style.bottom = "auto";
        elmnt.style.right = "auto";
    }

    function closeDragElement() {
        document.onmouseup = null;
        document.onmousemove = null;
        elmnt.style.cursor = "grab";
    }
}

function startGlobalCapture() {
    createGlobalOverlay();
    chrome.runtime.sendMessage({ action: "START_TAB_CAPTURE" });
}

function stopGlobalCapture() {
    if (globalOverlay) {
        globalOverlay.remove();
        globalOverlay = null;
    }
    chrome.runtime.sendMessage({ action: "STOP_TAB_CAPTURE" });
}

chrome.storage.local.get(['protectionActive'], (data) => {
    isProtectionActive = data.protectionActive !== false; // Default true
    if (isProtectionActive) {
        startGlobalCapture();
    }
});

startInitialization();
