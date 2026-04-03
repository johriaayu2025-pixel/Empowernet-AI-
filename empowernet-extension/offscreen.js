// Offscreen document to handle chrome.tabCapture and media stream manipulation

let isCapturing = false;
let mediaStream = null;
let videoElement = null;
let audioRecorder = null;
let frameInterval = null;
let captureCanvas = null;
let canvasCtx = null;
let backendBaseUrl = 'http://localhost:8001';

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'START_OFFSCREEN_CAPTURE') {
        startCapture(request.streamId, request.backendUrl)
            .then(() => sendResponse({ success: true }))
            .catch(err => sendResponse({ success: false, error: err.message }));
        return true;
    } else if (request.action === 'STOP_OFFSCREEN_CAPTURE') {
        stopCapture();
        sendResponse({ success: true });
    }
});

async function startCapture(streamId, backendUrl) {
    if (isCapturing) return;
    isCapturing = true;
    if (backendUrl) backendBaseUrl = backendUrl;

    try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
            audio: {
                mandatory: {
                    chromeMediaSource: 'tab',
                    chromeMediaSourceId: streamId
                }
            },
            video: {
                mandatory: {
                    chromeMediaSource: 'tab',
                    chromeMediaSourceId: streamId,
                    minWidth: 640,
                    maxWidth: 1280,
                    minHeight: 360,
                    maxHeight: 720,
                    minFrameRate: 15,
                    maxFrameRate: 30
                }
            }
        });

        startVideoProcessing();
        startAudioProcessing();
    } catch (err) {
        console.error('Error starting getUserMedia in offscreen:', err);
        isCapturing = false;
        throw err;
    }
}

function startVideoProcessing() {
    videoElement = document.getElementById('captureVideo');
    videoElement.srcObject = mediaStream;
    
    captureCanvas = document.getElementById('captureCanvas');
    canvasCtx = captureCanvas.getContext('2d');

    videoElement.onloadedmetadata = () => {
        captureCanvas.width = videoElement.videoWidth;
        captureCanvas.height = videoElement.videoHeight;
        
        // Extract a frame every 3 seconds
        frameInterval = setInterval(extractAndSendFrame, 3000);
    };
}

function extractAndSendFrame() {
    if (!isCapturing || !videoElement.videoWidth) return;

    // Draw the current video frame to canvas
    canvasCtx.drawImage(videoElement, 0, 0, captureCanvas.width, captureCanvas.height);
    
    // Convert to base64
    const frameData = captureCanvas.toDataURL('image/jpeg', 0.6).split(',')[1];
    
    // Post to backend
    fetch(`${backendBaseUrl}/analyze/image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: frameData })
    })
    .then(res => res.json())
    .then(data => {
        // Broadcast result to extension (content script will listen to it)
        chrome.runtime.sendMessage({
            action: 'OFFSCREEN_IMAGE_RESULT',
            result: data
        });
    })
    .catch(err => {
        console.error('Error analyzing image frame:', err);
    });
}

function startAudioProcessing() {
    const audioContent = new MediaStream(mediaStream.getAudioTracks());
    if (audioContent.getTracks().length === 0) return;

    audioRecorder = new MediaRecorder(audioContent, { mimeType: 'audio/webm' });
    
    audioRecorder.ondataavailable = async (e) => {
        if (e.data.size > 0 && isCapturing) {
            const formData = new FormData();
            formData.append('audio', e.data, 'chunk.webm');

            try {
                const res = await fetch(`${backendBaseUrl}/analyze/audio`, {
                    method: 'POST',
                    body: formData
                });
                const data = await res.json();
                
                chrome.runtime.sendMessage({
                    action: 'OFFSCREEN_AUDIO_RESULT',
                    result: data
                });
            } catch (err) {
                console.error('Error analyzing audio chunk:', err);
            }
        }
    };

    // The MediaRecorder emits 'dataavailable' every 5000ms
    audioRecorder.start(5000);
}

function stopCapture() {
    isCapturing = false;
    if (frameInterval) {
        clearInterval(frameInterval);
        frameInterval = null;
    }
    if (audioRecorder && audioRecorder.state !== 'inactive') {
        audioRecorder.stop();
        audioRecorder = null;
    }
    if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
        mediaStream = null;
    }
    if (videoElement) {
        videoElement.srcObject = null;
    }
}
