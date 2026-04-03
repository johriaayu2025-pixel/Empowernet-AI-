import { scanContent } from './api.js';

document.addEventListener('DOMContentLoaded', () => {
    const tabs = document.querySelectorAll('.tab-btn');
    const panes = document.querySelectorAll('.tab-pane');
    const globalStatus = document.getElementById('global-status');
    const liveScanResult = document.getElementById('live-scan-result');
    const historyList = document.getElementById('scan-history');
    const blockBtn = document.getElementById('block-site-btn');
    const scanNowBtn = document.getElementById('scan-now-btn');

    // Tab Switching
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            panes.forEach(p => p.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById(`tab-${tab.dataset.tab}`).classList.add('active');
        });
    });

    // Load Last Auto-Scan
    function updateLiveScan() {
        chrome.storage.local.get(['lastAutoScan', 'lastAutoScanTime'], (data) => {
            if (data.lastAutoScan) {
                renderResult(liveScanResult, data.lastAutoScan);
                updateGlobalStatus(data.lastAutoScan.riskScore);
            }
        });
    }

    // Refresh live scan occasionally
    updateLiveScan();
    setInterval(updateLiveScan, 5000);

    // Scan Now Button
    scanNowBtn.addEventListener('click', async () => {
        scanNowBtn.innerText = '⏳ Scanning...';
        scanNowBtn.disabled = true;
        try {
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, { action: 'getLatestContent' }, async (pageData) => {
                    if (pageData && pageData.content) {
                        const result = await scanContent('text', pageData.content, pageData.label || 'Webpage');
                        renderResult(liveScanResult, result);
                        updateGlobalStatus(result.riskScore);
                    } else {
                        liveScanResult.innerHTML = '<p class="error">Could not read page content. Try refreshing the page.</p>';
                    }
                    scanNowBtn.innerText = '🔍 Scan Current Page';
                    scanNowBtn.disabled = false;
                });
            }
        } catch (e) {
            liveScanResult.innerHTML = `<p class="error">Error: ${e.message}</p>`;
            scanNowBtn.innerText = '🔍 Scan Current Page';
            scanNowBtn.disabled = false;
        }
    });

    // Block This Site Button
    blockBtn.addEventListener('click', async () => {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs[0]) {
            const url = new URL(tabs[0].url);
            const domain = url.hostname;

            if (!domain || domain.trim() === "") {
                blockBtn.innerText = '🛡️ Local/System Page';
                blockBtn.style.background = '#6b7280';
                setTimeout(() => { blockBtn.innerText = '🚫 Block This Site'; blockBtn.style.background = ''; }, 2000);
                return;
            }

            chrome.storage.local.get(['blockedDomains'], (data) => {
                let blocked = data.blockedDomains || [];
                const alreadyBlocked = blocked.some(b => b.domain === domain);
                if (!alreadyBlocked) {
                    blocked.push({ domain, blockedAt: Date.now() });
                    chrome.storage.local.set({ blockedDomains: blocked }, () => {
                        blockBtn.innerText = '✅ Site Blocked!';
                        blockBtn.style.background = '#166534';
                        // Navigate to blocked page
                        const blockedUrl = chrome.runtime.getURL(`blocked.html?site=${encodeURIComponent(domain)}&url=${encodeURIComponent(tabs[0].url)}`);
                        chrome.tabs.update(tabs[0].id, { url: blockedUrl });
                    });
                } else {
                    blockBtn.innerText = '⚠️ Already Blocked';
                }
            });
        }
    });

    // Global Status Helper
    function updateGlobalStatus(score) {
        globalStatus.className = 'status-badge';
        if (score > 75) {
            globalStatus.classList.add('danger');
            globalStatus.innerText = '🔴 HIGH RISK DETECTED';
        } else if (score > 40) {
            globalStatus.classList.add('suspicious');
            globalStatus.innerText = '🟡 SUSPICIOUS ACTIVITY';
        } else {
            globalStatus.classList.add('safe');
            globalStatus.innerText = '🟢 SYSTEM SECURE';
        }
    }

    // Result Rendering Helper
    function renderResult(container, result) {
        if (!result || result.error) {
            container.innerHTML = `<p class="error">Error: ${result?.error || 'Unknown error'}</p>`;
            return;
        }

        const categoryClass = result.category;
        container.innerHTML = `
            <div class="result-card">
                <div class="result-header">
                    <span class="result-category ${categoryClass}">${result.category}</span>
                    <span class="result-score ${categoryClass}">${result.riskScore}%</span>
                </div>
                <p class="summary-text">${result.userSummary?.verdict || ''}</p>
                <p class="reason-text" style="font-size: 12px; color: var(--text-dim); margin-top: 8px;">
                    ${result.userSummary?.reason || ''}
                </p>
                <ul class="explanation-list" style="margin-top: 12px;">
                    ${(result.explanation || []).map(exp => `<li>${exp}</li>`).join('')}
                </ul>
                ${result.ledger?.status === 'confirmed' ? `
                <div style="margin-top: 15px; padding: 10px; background: rgba(99, 102, 241, 0.05); border: 1px solid rgba(99, 102, 241, 0.1); border-radius: 8px;">
                    <p style="font-size: 10px; font-weight: 800; color: var(--primary); margin-bottom: 4px;">
                        <span style="display: flex; align-items: center; gap: 4px;">✔️ HEDERA VERIFIED</span>
                    </p>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-size: 9px; color: var(--text-dim); font-family: monospace; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 140px;">
                            ${result.evidenceHash}
                        </span>
                        <a href="${result.ledger.explorerUrl}" target="_blank" style="font-size: 9px; font-weight: 800; color: var(--primary); text-decoration: none; border-bottom: 1px solid var(--primary);">
                            VIEW RECORD
                        </a>
                    </div>
                </div>
                ` : ''}
            </div>
        `;

        // Save to history
        addToHistory(result);
    }

    function addToHistory(result) {
        chrome.storage.local.get(['scanHistory'], (data) => {
            let history = data.scanHistory || [];
            // Check if already in history (simple check)
            if (history.length > 0 && history[0].evidenceHash === result.evidenceHash) return;

            history.unshift({ ...result, timestamp: Date.now() });
            history = history.slice(0, 10); // Keep last 10
            chrome.storage.local.set({ scanHistory: history }, renderHistory);
        });
    }

    function renderHistory() {
        chrome.storage.local.get(['scanHistory'], (data) => {
            if (!data.scanHistory || data.scanHistory.length === 0) {
                historyList.innerHTML = '<p class="placeholder">No recent scans</p>';
                return;
            }
            historyList.innerHTML = data.scanHistory.map(item => `
                <div class="card" style="padding: 10px; font-size: 12px; margin-bottom: 8px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span class="${item.category}" style="font-weight: 800;">${item.category}</span>
                        <span style="color: var(--text-dim);">${new Date(item.timestamp).toLocaleTimeString()}</span>
                    </div>
                </div>
            `).join('');
        });
    }
    renderHistory();

    // Unified File Upload Handler (Media Scan)
    const dropArea = document.getElementById('image-upload');
    const input = document.getElementById('image-input');
    const resultArea = document.getElementById('image-result');

    dropArea.addEventListener('click', () => input.click());

    input.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        dropArea.innerHTML = `<p>Scanning ${file.name}...</p>`;

        const reader = new FileReader();
        reader.onload = async () => {
            const base64 = reader.result.split(',')[1];
            let type = 'image';
            if (file.type.startsWith('video/')) type = 'video';
            if (file.type.startsWith('audio/')) type = 'audio';

            const result = await scanContent(type, base64, file.name);
            renderResult(resultArea, result);
            dropArea.innerHTML = `<p>Upload another file</p>`;
            updateGlobalStatus(result.riskScore);
        };
        reader.readAsDataURL(file);
    });

    // Real-Time Protection Toggle
    const toggleProtectionBtn = document.getElementById('toggle-protection-btn');
    let isProtectionActive = false;

    chrome.storage.local.get(['protectionActive'], (data) => {
        isProtectionActive = data.protectionActive !== false; // Default true
        updateProtectionUI();
    });

    toggleProtectionBtn.addEventListener('click', () => {
        isProtectionActive = !isProtectionActive;
        chrome.storage.local.set({ protectionActive: isProtectionActive });
        updateProtectionUI();

        // Broadcast to content scripts
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: "toggleProtection",
                    enabled: isProtectionActive
                });
            }
        });
    });

    function updateProtectionUI() {
        if (isProtectionActive) {
            toggleProtectionBtn.innerText = '⏹ Stop Live Protection';
            toggleProtectionBtn.style.background = '#ef4444';
        } else {
            toggleProtectionBtn.innerText = '▶ Start Live Protection';
            toggleProtectionBtn.style.background = '#10b981';
        }
    }

    // AI Persona Scanner Polling
    function updateSyntheticStats() {
        chrome.storage.local.get(['syntheticResults'], (data) => {
            const results = data.syntheticResults || [];
            document.getElementById('synthetic-count').innerText = results.length;
            document.getElementById('ai-count').innerText = results.filter(r => r.status !== 'REAL HUMAN').length;

            const syntheticHistory = document.getElementById('synthetic-history');
            if (results.length > 0) {
                syntheticHistory.innerHTML = results.slice(0, 5).map(r => `
                    <div class="card" style="padding: 10px; font-size: 11px; margin-bottom: 5px;">
                        <span style="font-weight: 800; color: ${r.status === 'REAL HUMAN' ? '#10b981' : '#ef4444'}">${r.status}</span>
                        <div style="font-size: 9px; color: #999;">Scanned recently</div>
                    </div>
                `).join('');
            }
        });
    }
    setInterval(updateSyntheticStats, 2000);

    // Social Media Scanner Toggle
    const toggleSocialBtn = document.getElementById('toggle-social-btn');
    let isSocialScanningActive = false;

    chrome.storage.sync.get(['socialMediaScannerEnabled'], (data) => {
        isSocialScanningActive = data.socialMediaScannerEnabled !== false; // Default true
        updateSocialUI();
    });

    toggleSocialBtn.addEventListener('click', () => {
        isSocialScanningActive = !isSocialScanningActive;
        chrome.storage.sync.set({ socialMediaScannerEnabled: isSocialScanningActive });
        updateSocialUI();

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: "toggleSocialScanner",
                    enabled: isSocialScanningActive
                });
            }
        });
    });

    function updateSocialUI() {
        if (isSocialScanningActive) {
            toggleSocialBtn.innerText = '⏹ Stop Social Scanning';
            toggleSocialBtn.style.background = '#ef4444';
        } else {
            toggleSocialBtn.innerText = '▶ Start Social Scanning';
            toggleSocialBtn.style.background = '#10b981';
        }
    }

    // Child Safety Mode Setup
    const safetyToggle = document.getElementById('child-safety-toggle');
    const safetyAge = document.getElementById('child-safety-age');
    const hiddenCountLabel = document.getElementById('hidden-items-count');

    chrome.storage.sync.get(['childSafetyEnabled', 'childSafetyAge'], (data) => {
        safetyToggle.checked = data.childSafetyEnabled !== false; // Default true
        safetyAge.value = data.childSafetyAge || "Under 16";
    });

    safetyToggle.addEventListener('change', () => {
        const enabled = safetyToggle.checked;
        chrome.storage.sync.set({ childSafetyEnabled: enabled });
        
        // Notify active tab
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: "toggleChildSafety",
                    enabled: enabled
                });
            }
        });
    });

    safetyAge.addEventListener('change', () => {
        chrome.storage.sync.set({ childSafetyAge: safetyAge.value });
    });

    // Poll for hidden items count from current tab
    function updateHiddenCount() {
        chrome.action.getBadgeText({}, (text) => {
            hiddenCountLabel.innerText = `${text || 0} items`;
        });
    }
    setInterval(updateHiddenCount, 1000);
});
