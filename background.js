// ─────────────────────────────────────────────────────────────────────────────
//  DCT — background.js
//  Service worker for background tasks (Manifest V3)
// ─────────────────────────────────────────────────────────────────────────────

let authTabId = null;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

  // Called from congrats card or elsewhere to open the database viewer
  if (message.action === 'open_db_viewer') {
    chrome.tabs.create({ url: chrome.runtime.getURL('db-viewer.html') });
    return;
  }

  // Called from popup.js handleLogin() to open the OAuth tab
  if (message.action === 'start_auth') {
    chrome.tabs.create({ url: message.url }, (tab) => {
      authTabId = tab.id;
      console.debug('[DCT] Auth tab opened, id:', authTabId);
    });
    return;
  }

  // Called from Vercel bridge page (index.html) after OAuth completes
  if (message.type === 'DCT_AUTH_TOKEN') {
    console.debug('[DCT] Token received from bridge page');
    console.debug('[DCT] access_token present:', !!message.accessToken);
    console.debug('[DCT] refresh_token present:', !!message.refreshToken);

    const accessToken  = message.accessToken;
    const refreshToken = message.refreshToken;

    // Decode the JWT to extract user info (no library needed)
    let user = null;
    try {
      const payload = JSON.parse(atob(accessToken.split('.')[1]));
      console.debug('[DCT] JWT payload:', payload);
      user = {
        id:    payload.sub,
        email: payload.email,
        name:  payload.user_metadata?.full_name || payload.email,
      };
      console.debug('[DCT] User extracted:', user);
    } catch (e) {
      console.error('[DCT] Failed to decode JWT:', e);
    }

    // Save everything popup.js needs
    chrome.storage.local.set({
      dct_access_token:  accessToken,
      dct_refresh_token: refreshToken,
      user:              user,
      isCloudEnabled:    true,
    }, () => {
      console.debug('[DCT] user + tokens saved to storage');
    });

    // Close the auth tab
    const tabToClose = authTabId ?? sender?.tab?.id ?? null;
    if (tabToClose !== null) {
      chrome.tabs.remove(tabToClose, () => {
        console.debug('[DCT] Auth tab closed:', tabToClose);
        authTabId = null;
      });
    } else {
      console.warn('[DCT] No tab ID found to close');
    }

    sendResponse({ ok: true });
    return true;
  }

  // Legacy support
  if (message.action === 'close_tab' && sender.tab) {
    chrome.tabs.remove(sender.tab.id);
  }

});