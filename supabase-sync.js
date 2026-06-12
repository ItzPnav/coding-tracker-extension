// ─────────────────────────────────────────────────────────────────────────────
//  DCT — supabase-sync.js
//  Lightweight REST client for Supabase (Publishable Key Era)
// ─────────────────────────────────────────────────────────────────────────────

const SB_URL = 'https://dwksdyavbvtruxmupsom.supabase.co';
const SB_KEY = 'sb_publishable_IaSg-pAFrCi7peqBcoy62A_EqK4-46w';

const SupabaseSync = {
  // Headers required for Supabase REST API
  getHeaders() {
    return {
      'apikey': SB_KEY,
      'Authorization': `Bearer ${SB_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    };
  },

  /**
   * Push a solve to the cloud
   */
  async pushSolve(data, userId) {
    if (!userId) return;

    try {
      // Map local schema to DB schema
      const payload = {
        user_id:    userId,
        problem_id: data.problemId,
        platform:   data.platform,
        name:       data.name,
        difficulty: data.difficulty,
        url:        data.url,
        opened_at:  data.openedAt,
        timestamp:  data.timestamp
      };

      const res = await fetch(`${SB_URL}/rest/v1/solves`, {
        method: 'POST',
        headers: {
          ...this.getHeaders(),
          'Prefer': 'resolution=merge-duplicates' // Standard PostgREST upsert
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json();
        console.warn('[DCT-Cloud] Push failed:', err.message);
      } else {
        console.log('[DCT-Cloud] Solve synced successfully.');
      }
    } catch (e) {
      console.error('[DCT-Cloud] Network error during push:', e);
    }
  },

  /**
   * Pull latest history from cloud
   */
  async pullHistory(userId) {
    if (!userId) return [];

    try {
      const res = await fetch(`${SB_URL}/rest/v1/solves?user_id=eq.${userId}&order=timestamp.desc&limit=100`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (!res.ok) throw new Error('Fetch failed');
      
      const data = await res.json();
      
      // Map DB schema back to local schema
      return data.map(s => ({
        problemId:  s.problem_id,
        platform:   s.platform,
        name:       s.name,
        difficulty: s.difficulty,
        url:        s.url,
        openedAt:   s.opened_at,
        timestamp:  s.timestamp
      }));
    } catch (e) {
      console.error('[DCT-Cloud] Pull failed:', e);
      return [];
    }
  },

  /**
   * Capture OAuth token from URL hash (for Opera/Brave/Chrome)
   */
  captureLoginToken() {
    const isSupabase = window.location.hostname.includes('supabase.co');
    const isVercel   = window.location.hostname.includes('vercel.app');
    
    if (!isSupabase && !isVercel) return;

    // 1. Extract params from both Hash and Query
    const hashParams  = new URLSearchParams(window.location.hash.substring(1));
    const queryParams = new URLSearchParams(window.location.search);
    
    const accessToken = hashParams.get('access_token') || queryParams.get('access_token');
    const errorMsg    = hashParams.get('error_description') || queryParams.get('error_description');

    // 2. Process the token if found
    if (accessToken) {
      // Don't take over the UI on Vercel unless it's an error
      // This preserves your Vercel site's own design/animations
      if (!isVercel) {
        this.renderStatusPage(true, null);
      } else {
        console.log('[DCT] Token captured silently on Vercel bridge.');
      }

      fetch(`${SB_URL}/auth/v1/user`, {
        headers: {
          'apikey': SB_KEY,
          'Authorization': `Bearer ${accessToken}`
        }
      })
      .then(res => res.json())
      .then(user => {
        if (user && user.id) {
          // Extract provider ID (e.g. Google ID) to match existing database records
          // Supabase stores this in the 'sub' field of identities or user_metadata
          const googleId = user.identities?.[0]?.id || user.user_metadata?.sub || user.id;
          
          const userData = {
            id: googleId,
            email: user.email,
            name: user.user_metadata?.full_name || user.email,
            supabase_uuid: user.id // keep this just in case
          };
          chrome.storage.local.set({ user: userData, isCloudEnabled: true }, () => {
            this.updateStatusPageUser(userData.email);
          });
        }
      })
      .catch(() => {}); // Silent catch
    }
  },

  /**
   * Injects a beautiful Neon UI into the page
   */
  renderStatusPage(isSuccess, errorMsg) {
    // Suppress harmless favicon 404s by providing a transparent one
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
        <p>Your session has been securely linked to the cloud. Your solve history will now sync automatically across devices.</p>
        <div class="email" id="success-email">Verifying account...</div>
        <button class="btn" id="dct-close-btn">Close This Tab</button>
      `;
    } else {
      card.innerHTML = `
        <div class="icon">⚠️</div>
        <h1>404 ERROR</h1>
        <p>Login failed. Supabase was unable to validate your credentials.</p>
        <p style="font-size:11px; color:var(--red); opacity:0.8;">Reason: ${errorMsg || 'Unknown Error'}</p>
        <button class="btn" id="dct-close-btn">Go Back</button>
      `;
    }
    
    document.body.appendChild(card);

    // Use extension messaging to close the tab, as window.close() is often blocked
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
  }
};

// Auto-run capture on allowed domains
const isAuthHost = window.location.hostname.includes('supabase.co') || 
                   window.location.hostname.includes('vercel.app');

if (isAuthHost) {
  SupabaseSync.captureLoginToken();
}
