/**
 * EmpowerNet Utility Classes (Hardened)
 */

export class TokenBucket {
    constructor(capacity, fillRatePerMs) {
        this.capacity = capacity;
        this.fillRate = fillRatePerMs;
        this.tokens = capacity;
        this.lastUpdateTime = Date.now();
    }

    tryAcquire() {
        const now = Date.now();
        const delta = now - this.lastUpdateTime;
        this.tokens = Math.min(this.capacity, this.tokens + delta * this.fillRate);
        this.lastUpdateTime = now;

        if (this.tokens >= 1) {
            this.tokens -= 1;
            return true;
        }
        return false;
    }
}

export class RateLimiter {
    constructor(limitPerInterval, intervalMs) {
        this.limitPerInterval = limitPerInterval;
        this.intervalMs = intervalMs;
        this.history = [];
    }

    tryAcquire() {
        const now = Date.now();
        this.history = this.history.filter(t => now - t < this.intervalMs);
        if (this.history.length < this.limitPerInterval) {
            this.history.push(now);
            return true;
        }
        return false;
    }
}

export class APIQueue {
    constructor(maxConcurrent, maxQueueSize = 10) {
        this.maxConcurrent = maxConcurrent;
        this.maxQueueSize = maxQueueSize;
        this.activeCount = 0;
        this.queue = [];
    }

    async enqueue(requestFn) {
        if (this.activeCount >= this.maxConcurrent) {
            if (this.queue.length >= this.maxQueueSize) {
                return { status: "SKIPPED", error: "Queue full" };
            }
            return new Promise((resolve) => {
                this.queue.push({ requestFn, resolve });
            });
        }
        return this.execute(requestFn);
    }

    async execute(requestFn) {
        this.activeCount++;
        try {
            return await requestFn();
        } finally {
            this.activeCount--;
            this.processNext();
        }
    }

    processNext() {
        if (this.queue.length > 0 && this.activeCount < this.maxConcurrent) {
            const { requestFn, resolve } = this.queue.shift();
            this.execute(requestFn).then(resolve);
        }
    }
}

export class ResultCache {
    constructor(ttlMs = 30000) {
        this.cache = new Map();
        this.ttlMs = ttlMs;
    }

    get(key) {
        const entry = this.cache.get(key);
        if (!entry) return null;
        if (Date.now() - entry.timestamp > this.ttlMs) {
            this.cache.delete(key);
            return null;
        }
        return entry.data;
    }

    set(key, data) {
        this.cache.set(key, { data, timestamp: Date.now() });
    }
}

export class BoundingBoxRenderer {
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
