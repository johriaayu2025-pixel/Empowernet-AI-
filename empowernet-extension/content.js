let lastScannedText = "";
const SCAN_INTERVAL = 3000;
let scrollTimeout = null;

function extractVisibleText() {
    const bodyText = document.body.innerText;
    if (window.location.hostname === "mail.google.com") {
        const emailBody = document.querySelector(".adn.ads");
        if (emailBody) return emailBody.innerText;
    }
    if (window.location.hostname === "meet.google.com") {
        const captions = document.querySelector(".iT388c");
        if (captions) return captions.innerText;
    }
    return bodyText.slice(0, 5000);
}

function shouldAnalyzeCaption(text) {
    return text && text.trim().length > 10;
}

function handleScroll() {
    if (scrollTimeout) clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
        performScan();
    }, 800);
}

function performScan() {
    // Skip Instagram — that's handled by media_scanner.js
    if (window.location.hostname.includes("instagram.com")) return;

    let currentText = extractVisibleText();
    if (currentText.length < 30 || currentText === lastScannedText) return;
    lastScannedText = currentText;

    let label = "Webpage";
    if (window.location.hostname === "mail.google.com") label = "Gmail";
    if (window.location.hostname === "meet.google.com") label = "Meeting Caption";

    chrome.runtime.sendMessage({
        action: "autoScanText",
        content: currentText,
        label: label
    }, (response) => {
        if (response && response.success && response.result) {
            const result = response.result;

            // ===== SCAM / THREAT DETECTION OVERLAY =====
            const isScam = result.category === "SCAM" || result.category === "PHISHING" || 
                           result.category === "PROPAGANDA" || result.category === "DEEPFAKE";
            const riskScore = result.riskScore || 0;

            if (isScam && riskScore >= 40) {
                showScamWarning(result);
            }

            // ===== CHILD SAFETY OVERLAY (separate from scam) =====
            if (result.is_safe_for_children === false) {
                showChildSafetyBlock(result);
            }
        }
    });
}

function showScamWarning(result) {
    if (document.getElementById('empowernet-scam-warning')) return;

    const banner = document.createElement('div');
    banner.id = 'empowernet-scam-warning';
    banner.style.cssText = 'position:fixed;top:0;left:0;width:100vw;padding:0;z-index:9999998;font-family:system-ui,sans-serif;';
    
    const riskColor = result.riskScore >= 70 ? '#dc2626' : '#f59e0b';
    const riskLabel = result.riskScore >= 70 ? '🚨 HIGH RISK' : '⚠️ WARNING';

    banner.innerHTML = `
        <div style="background:${riskColor};color:white;padding:14px 24px;display:flex;align-items:center;justify-content:space-between;gap:16px;">
            <div style="display:flex;align-items:center;gap:12px;">
                <span style="font-size:20px;font-weight:900;">${riskLabel}</span>
                <span style="font-size:14px;font-weight:600;">EmpowerNet detected <strong>${result.category}</strong> content (Risk: ${result.riskScore}%)</span>
            </div>
            <div style="display:flex;gap:8px;">
                <button id="ep-scam-details-btn" style="background:rgba(255,255,255,0.2);color:white;border:none;padding:6px 14px;border-radius:6px;cursor:pointer;font-weight:700;font-size:12px;">Details</button>
                <button id="ep-scam-dismiss-btn" style="background:rgba(0,0,0,0.2);color:white;border:none;padding:6px 14px;border-radius:6px;cursor:pointer;font-weight:700;font-size:12px;">Dismiss</button>
            </div>
        </div>
        <div id="ep-scam-details" style="display:none;background:#1e1e2e;color:#e2e8f0;padding:20px 24px;border-bottom:2px solid ${riskColor};font-size:13px;line-height:1.6;">
            <strong>Explanation:</strong><br/>
            ${(result.explanation || []).map(e => `• ${e}`).join('<br/>')}
            ${result.userSummary ? `<br/><br/><strong>Verdict:</strong> ${result.userSummary.verdict}<br/>${result.userSummary.reason || ''}` : ''}
        </div>
    `;

    document.body.appendChild(banner);
    document.body.style.marginTop = '52px';

    document.getElementById('ep-scam-dismiss-btn').onclick = () => {
        banner.remove();
        document.body.style.marginTop = '';
    };
    document.getElementById('ep-scam-details-btn').onclick = () => {
        const details = document.getElementById('ep-scam-details');
        details.style.display = details.style.display === 'none' ? 'block' : 'none';
    };
}

function showChildSafetyBlock(result) {
    if (document.getElementById('empowernet-safety-block')) return;

    const block = document.createElement('div');
    block.id = 'empowernet-safety-block';
    block.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.92);color:white;z-index:9999999;display:flex;align-items:center;justify-content:center;font-family:system-ui,sans-serif;text-align:center;padding:40px;';
    block.innerHTML = `<div>
        <h1 style="color:#ef4444;font-size:36px;margin-bottom:20px;">🛑 Content Blocked</h1>
        <p style="font-size:20px;">EmpowerNet Child Safety has detected inappropriate content on this page.</p>
        <p style="margin-top:10px;font-size:16px;color:#cbd5e1;">Reason: ${result.safety_flags?.join(', ') || 'Explicit Material'}</p>
        <button id="ep-proceed-btn" style="margin-top:30px;padding:10px 20px;background:#334155;color:white;border:none;border-radius:8px;cursor:pointer;font-weight:700;">Proceed Anyway</button>
    </div>`;
    document.body.appendChild(block);
    document.body.style.overflow = 'hidden';
    document.getElementById('ep-proceed-btn').onclick = () => {
        block.remove();
        document.body.style.overflow = 'auto';
    };
}

// Event Listeners
window.addEventListener('scroll', handleScroll, { passive: true });
setTimeout(performScan, 1000);
setInterval(performScan, SCAN_INTERVAL);

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getLatestContent") {
        sendResponse({
            content: extractVisibleText(),
            label: "Webpage",
            url: window.location.href,
            domain: window.location.hostname
        });
    }
});
