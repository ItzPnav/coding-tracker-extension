// ─────────────────────────────────────────────────────────────────────────────
//  DCT — utils/logger.js
//  Centralized error logging system
// ─────────────────────────────────────────────────────────────────────────────

function logError(source, message, data = {}) {
  const entry = {
    id: `err_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
    source,       // 'content.js', 'firebase-sync', 'background'
    message,
    data,
    timestamp: new Date().toISOString(),
    url: typeof location !== 'undefined' ? location.href : 'background',
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'service-worker',
  };

  // Store locally (rolling 200 entries)
  chrome.storage.local.get(['errorLog'], (res) => {
    const log = (res.errorLog || []).slice(-199);
    log.push(entry);
    chrome.storage.local.set({ errorLog: log });
  });

  // Also push to Firestore if cloud enabled
  chrome.storage.local.get(['isCloudEnabled', 'user'], (res) => {
    if (res.isCloudEnabled && res.user?.id) {
      if (typeof FirebaseSync !== 'undefined' && FirebaseSync.pushError) {
        FirebaseSync.pushError(entry, res.user.id).catch(err => {
          console.error('[DCT:logger] Failed to push error to Firestore:', err);
        });
      }
    }
  });

  console.error(`[DCT:${source}]`, message, data);
}

// Expose globally
if (typeof globalThis !== 'undefined') {
  globalThis.logError = logError;
}
if (typeof window !== 'undefined') {
  window.logError = logError;
}
