// ─────────────────────────────────────────────────────────────────────────────
//  DCT — firebase-sync.js
//  Lightweight REST client for Firebase Firestore and Auth
// ─────────────────────────────────────────────────────────────────────────────

// Change these to your own Firebase and Google Client ID credentials
const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyAaQNm_8QfpbxyzQxoxB1uvLQMCZgHkC40',
  projectId: 'daily-coding-tracker-d4908',
  googleClientId: '1058662357108-ktqhncmqvcba95d8c2soag3hbb65rdrc.apps.googleusercontent.com',
  redirectUrl: 'https://success-page-for-dct.vercel.app/'
};

const FirebaseSync = {
  /**
   * Refresh the Firebase ID Token using the Refresh Token
   */
  async refreshFirebaseToken(refreshToken) {
    if (!refreshToken) return null;

    try {
      const res = await fetch(`https://securetoken.googleapis.com/v1/token?key=${FIREBASE_CONFIG.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(refreshToken)}`
      });

      if (!res.ok) {
        const err = await res.json();
        console.warn('[DCT-Firebase] Token refresh failed:', err.error?.message || err);
        return null;
      }

      const data = await res.json();
      const idToken = data.access_token;
      const newRefreshToken = data.refresh_token;
      const expiresIn = data.expires_in;

      await new Promise((resolve) => {
        chrome.storage.local.set({
          firebase_token: idToken,
          firebase_refresh_token: newRefreshToken,
          firebase_expires_at: Date.now() + (parseInt(expiresIn) * 1000)
        }, resolve);
      });

      return { idToken };
    } catch (e) {
      console.error('[DCT-Firebase] Error refreshing token:', e);
      return null;
    }
  },

  /**
   * Get a valid, unexpired Firebase ID Token
   */
  async getValidToken() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['firebase_token', 'firebase_refresh_token', 'firebase_expires_at'], async (r) => {
        if (!r.firebase_token) {
          resolve(null);
          return;
        }

        // If token expires in less than 5 minutes, refresh it
        if (Date.now() > (r.firebase_expires_at - 5 * 60 * 1000)) {
          console.log('[DCT-Firebase] Token expiring soon, refreshing...');
          const fresh = await this.refreshFirebaseToken(r.firebase_refresh_token);
          if (fresh) {
            resolve(fresh.idToken);
          } else {
            resolve(null);
          }
        } else {
          resolve(r.firebase_token);
        }
      });
    });
  },

  /**
   * Push a solve to Firebase Firestore
   */
  async pushSolve(data, userId, userEmail = '') {
    if (!userId || FIREBASE_CONFIG.projectId === 'YOUR_FIREBASE_PROJECT_ID') return;

    try {
      const token = await this.getValidToken();
      if (!token) {
        console.warn('[DCT-Firebase] No valid firebase token for push.');
        return;
      }

      // Map local schema to Firestore REST document fields
      const payload = {
        fields: {
          problemId:  { stringValue: data.problemId || '' },
          platform:   { stringValue: data.platform || '' },
          name:       { stringValue: data.name || '' },
          difficulty: { stringValue: data.difficulty || '' },
          url:        { stringValue: data.url || '' },
          openedAt:   { stringValue: data.openedAt || '' },
          timestamp:  { stringValue: data.timestamp || '' },
          userId:     { stringValue: userId || '' },
          userEmail:  { stringValue: userEmail || '' }
        }
      };

      const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_CONFIG.projectId}/databases/(default)/documents/users/${userId}/solves/${data.problemId}`;
      const res = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json();
        console.warn('[DCT-Firebase] Push failed:', err.error?.message || err);
      } else {
        console.log('[DCT-Firebase] Solve synced successfully.');
      }
    } catch (e) {
      console.error('[DCT-Firebase] Network error during push:', e);
    }
  },

  /**
   * Pull latest history from Firebase Firestore
   */
  async pullHistory(userId) {
    if (!userId || FIREBASE_CONFIG.projectId === 'YOUR_FIREBASE_PROJECT_ID') return [];

    try {
      const token = await this.getValidToken();
      if (!token) {
        console.warn('[DCT-Firebase] No valid firebase token for pull.');
        return [];
      }

      const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_CONFIG.projectId}/databases/(default)/documents/users/${userId}/solves?pageSize=100`;
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) {
        // If collection is not created yet, Firestore might return 404
        if (res.status === 404) return [];
        throw new Error('Fetch failed');
      }

      const data = await res.json();
      if (!data.documents) return [];

      // Map Firestore REST format back to local schema
      return data.documents.map(doc => {
        const f = doc.fields || {};
        return {
          problemId:  f.problemId?.stringValue || '',
          platform:   f.platform?.stringValue || '',
          name:       f.name?.stringValue || '',
          difficulty: f.difficulty?.stringValue || '',
          url:        f.url?.stringValue || '',
          openedAt:   f.openedAt?.stringValue || '',
          timestamp:  f.timestamp?.stringValue || ''
        };
      });
    } catch (e) {
      console.error('[DCT-Firebase] Pull failed:', e);
      throw e;
    }
  },

  /**
   * Delete a solve from Firebase Firestore
   */
  async deleteSolve(problemId, userId) {
    if (!userId || FIREBASE_CONFIG.projectId === 'YOUR_FIREBASE_PROJECT_ID') return;

    try {
      const token = await this.getValidToken();
      if (!token) {
        console.warn('[DCT-Firebase] No valid firebase token for delete.');
        return;
      }

      const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_CONFIG.projectId}/databases/(default)/documents/users/${userId}/solves/${problemId}`;
      const res = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) {
        const err = await res.json();
        console.warn('[DCT-Firebase] Delete failed:', err.error?.message || err);
      } else {
        console.log('[DCT-Firebase] Solve deleted successfully from cloud.');
      }
    } catch (e) {
      console.error('[DCT-Firebase] Network error during delete:', e);
    }
  },

  /**
   * Push an error entry to Firebase Firestore
   */
  async pushError(entry, userId) {
    if (!userId || FIREBASE_CONFIG.projectId === 'YOUR_FIREBASE_PROJECT_ID') return;
    try {
      const token = await this.getValidToken();
      if (!token) return;
      const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_CONFIG.projectId}/databases/(default)/documents/users/${userId}/errors/${entry.id}`;
      
      const payload = {
        fields: {
          id: { stringValue: entry.id },
          source: { stringValue: entry.source },
          message: { stringValue: entry.message },
          data: { stringValue: JSON.stringify(entry.data) },
          timestamp: { stringValue: entry.timestamp },
          url: { stringValue: entry.url },
          userAgent: { stringValue: entry.userAgent }
        }
      };

      const res = await fetch(url, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const err = await res.json();
        console.warn('[DCT-Firebase] Error push failed:', err.error?.message || err);
      }
    } catch (e) {
      console.error('[DCT-Firebase] Error push network failed:', e);
    }
  },

  /**
   * Capture OAuth token from URL hash and exchange for Firebase token
   */
  captureLoginToken() {
    const hostname = window.location.hostname;
    const isAllowedDomain = hostname.includes('firebaseapp.com') || hostname.includes('web.app') || hostname.includes('vercel.app');
    
    if (!isAllowedDomain || FIREBASE_CONFIG.apiKey === 'YOUR_FIREBASE_API_KEY') return;

    // Extract params from Hash
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const googleIdToken = hashParams.get('id_token');
    const errorMsg = hashParams.get('error') || hashParams.get('error_description');

    if (googleIdToken) {
      this.renderStatusPage(true, null);

      fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=${FIREBASE_CONFIG.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          postBody: `id_token=${googleIdToken}&providerId=google.com`,
          requestUri: FIREBASE_CONFIG.redirectUrl,
          returnIdpCredential: true,
          returnSecureToken: true
        })
      })
      .then(res => {
        if (!res.ok) return res.json().then(err => { throw new Error(err.error?.message || 'Exchange failed') });
        return res.json();
      })
      .then(data => {
        const user = {
          id: data.localId,
          email: data.email,
          name: data.displayName || data.email
        };

        chrome.storage.local.set({
          user: user,
          firebase_token: data.idToken,
          firebase_refresh_token: data.refreshToken,
          firebase_expires_at: Date.now() + (parseInt(data.expiresIn) * 1000),
          isCloudEnabled: true
        }, () => {
          this.updateStatusPageUser(data.email);
        });
      })
      .catch(err => {
        console.error('[DCT-Firebase] OAuth Exchange error:', err);
        this.renderStatusPage(false, err.message);
      });
    } else if (errorMsg) {
      this.renderStatusPage(false, errorMsg);
    }
  },

  /**
   * Injects a beautiful Neon UI into the page
   */
  renderStatusPage(isSuccess, errorMsg) {
    // Suppress favicon 404s
    const favicon = document.createElement('link');
    favicon.rel = 'icon';
    favicon.href = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    document.head.appendChild(favicon);

    // Hide original page content
    document.documentElement.innerHTML = '';
    document.title = isSuccess ? 'DCT — Login Successful' : 'DCT — Login Failed';

    // Add Fonts
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&family=Share+Tech+Mono&family=Inter:wght@400;500&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);

    // Add Styles
    const style = document.createElement('style');
    style.textContent = `
      :root {
        --bg: #060a10;
        --neon: #00d4ff;
        --green: #00ff88;
        --red: #ff4060;
        --text: #e1effa;
        --dim: #7da2c4;
      }
      body {
        background-color: var(--bg);
        color: var(--text);
        font-family: 'Inter', sans-serif;
        display: flex; align-items: center; justify-content: center;
        height: 100vh; margin: 0; overflow: hidden;
        background-image: 
          linear-gradient(rgba(0,212,255,0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,212,255,0.03) 1px, transparent 1px);
        background-size: 30px 30px;
      }
      .card {
        background: rgba(12,20,32,0.8);
        border: 1px solid #1a3050;
        border-radius: 12px;
        padding: 40px;
        text-align: center;
        max-width: 450px;
        width: 90%;
        box-shadow: 0 0 40px rgba(0,0,0,0.5);
        position: relative;
      }
      .card::before {
        content: ''; position: absolute; top: -1px; left: 10%; right: 10%; height: 1px;
        background: linear-gradient(90deg, transparent, var(--neon), transparent);
      }
      .icon {
        font-size: 48px; margin-bottom: 20px;
        filter: drop-shadow(0 0 10px ${isSuccess ? 'var(--green)' : 'var(--red)'});
      }
      h1 {
        font-family: 'Orbitron', sans-serif;
        font-weight: 900; font-size: 28px; letter-spacing: 4px;
        color: #fff; margin-bottom: 10px;
        text-shadow: 0 0 20px ${isSuccess ? 'var(--neon)' : 'var(--red)'};
      }
      p { color: var(--dim); line-height: 1.6; margin-bottom: 25px; font-size: 14px; }
      .email { color: var(--neon); font-family: 'Share Tech Mono', monospace; font-size: 12px; margin-top: -15px; margin-bottom: 20px; }
      .btn {
        background: rgba(0,212,255,0.1);
        border: 1px solid var(--neon);
        color: var(--neon);
        padding: 12px 24px;
        border-radius: 6px;
        font-family: 'Share Tech Mono', monospace;
        text-transform: uppercase;
        letter-spacing: 2px;
        cursor: pointer;
        transition: all 0.2s;
        text-decoration: none;
        display: inline-block;
      }
      .btn:hover {
        background: var(--neon);
        color: var(--bg);
        box-shadow: 0 0 20px rgba(0,212,255,0.4);
        transform: translateY(-2px);
      }
    `;
    document.head.appendChild(style);

    // Create Content
    const card = document.createElement('div');
    card.className = 'card';
    
    if (isSuccess) {
      card.innerHTML = `
        <div class="icon">🏆</div>
        <h1>SUCCESS!</h1>
        <p>Your session has been securely linked to Firebase. Your solve history will now sync automatically across devices without pausing.</p>
        <div class="email" id="success-email">Verifying account...</div>
        <button class="btn" id="dct-close-btn">Close This Tab</button>
      `;
    } else {
      card.innerHTML = `
        <div class="icon">⚠️</div>
        <h1>AUTH ERROR</h1>
        <p>Login failed. Firebase was unable to validate your credentials.</p>
        <p style="font-size:11px; color:var(--red); opacity:0.8;">Reason: ${errorMsg || 'Unknown Error'}</p>
        <button class="btn" id="dct-close-btn">Go Back</button>
      `;
    }
    
    document.body.appendChild(card);

    document.getElementById('dct-close-btn').addEventListener('click', () => {
      try {
        chrome.runtime.sendMessage({ action: 'close_tab' });
      } catch (e) {
        window.close(); // Fallback
      }
    });
  },

  updateStatusPageUser(email) {
    const el = document.getElementById('success-email');
    if (el) el.textContent = `Linked: ${email}`;
  },

  /**
   * Manually triggers a Firebase token refresh using stored refresh token
   */
  async refreshToken() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['firebase_refresh_token'], async (r) => {
        if (!r.firebase_refresh_token) {
          resolve(null);
          return;
        }
        const fresh = await this.refreshFirebaseToken(r.firebase_refresh_token);
        resolve(fresh ? fresh.idToken : null);
      });
    });
  }
};

window.FirebaseSync = FirebaseSync;

// Auto-run capture on allowed domains
const currentHost = window.location.hostname;
if (currentHost.includes('firebaseapp.com') || currentHost.includes('web.app') || currentHost.includes('vercel.app')) {
  FirebaseSync.captureLoginToken();
}
