// ─────────────────────────────────────────────────────────────────────────────
//  DCT — admin/admin.js
//  Standalone admin console dashboard logic
// ─────────────────────────────────────────────────────────────────────────────

let ID_TOKEN = null;
let ALL_SOLVES = [];
let ALL_ERRORS = [];
let EXPANDED_USERS = new Set();
let OPENED_DAYS = new Set();

const PLAT_ICON = { leetcode: '🟡', hackerrank: '🟢', codechef: '🟤', codeforces: '🔵' };

function showCustomConfirm(title, message, isWarning, onConfirm) {
  const modal = document.getElementById('custom-modal');
  const iconEl = document.getElementById('custom-modal-icon');
  const titleEl = document.getElementById('custom-modal-title');
  const messageEl = document.getElementById('custom-modal-message');
  const cancelBtn = document.getElementById('custom-modal-btn-cancel');
  const confirmBtn = document.getElementById('custom-modal-btn-confirm');
  
  if (!modal) return;
  
  iconEl.textContent = isWarning ? '⚠️' : '⚡';
  titleEl.textContent = title;
  titleEl.style.color = isWarning ? 'var(--red)' : 'var(--neon)';
  titleEl.style.textShadow = isWarning ? '0 0 10px rgba(255,64,96,0.3)' : '0 0 10px rgba(0,212,255,0.3)';
  messageEl.textContent = message;
  
  confirmBtn.style.display = 'inline-block';
  confirmBtn.textContent = 'CONFIRM';
  if (isWarning) {
    confirmBtn.style.background = 'rgba(255,64,96,0.1)';
    confirmBtn.style.borderColor = 'var(--red)';
    confirmBtn.style.color = 'var(--red)';
  } else {
    confirmBtn.style.background = 'rgba(0,212,255,0.1)';
    confirmBtn.style.borderColor = 'var(--neon)';
    confirmBtn.style.color = 'var(--neon)';
  }
  
  cancelBtn.textContent = 'CANCEL';
  
  const newCancelBtn = cancelBtn.cloneNode(true);
  const newConfirmBtn = confirmBtn.cloneNode(true);
  cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
  confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
  
  newCancelBtn.addEventListener('click', () => {
    modal.style.display = 'none';
  });
  
  newConfirmBtn.addEventListener('click', () => {
    modal.style.display = 'none';
    if (onConfirm) onConfirm();
  });
  
  modal.style.display = 'flex';
}

function showCustomAlert(title, message, isSuccess) {
  const modal = document.getElementById('custom-modal');
  const iconEl = document.getElementById('custom-modal-icon');
  const titleEl = document.getElementById('custom-modal-title');
  const messageEl = document.getElementById('custom-modal-message');
  const cancelBtn = document.getElementById('custom-modal-btn-cancel');
  const confirmBtn = document.getElementById('custom-modal-btn-confirm');
  
  if (!modal) return;
  
  iconEl.textContent = isSuccess ? '🏆' : '⚠️';
  titleEl.textContent = title;
  titleEl.style.color = isSuccess ? 'var(--green)' : 'var(--red)';
  titleEl.style.textShadow = isSuccess ? '0 0 10px rgba(0,255,136,0.3)' : '0 0 10px rgba(255,64,96,0.3)';
  messageEl.textContent = message;
  
  confirmBtn.style.display = 'none';
  cancelBtn.textContent = 'OK';
  
  const newCancelBtn = cancelBtn.cloneNode(true);
  cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
  
  newCancelBtn.addEventListener('click', () => {
    modal.style.display = 'none';
  });
  
  modal.style.display = 'flex';
}

function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}

const PLAT_COLOR = {
  leetcode:   '#f5a623',
  codeforces: '#4a90d9',
  codechef:   '#9b6b3a',
  hackerrank: '#00b388',
};

function getDiffColor(d) {
  if (!d) return 'var(--text-dim)';
  if (/easy/i.test(d)) return 'var(--easy)';
  if (/medium/i.test(d)) return 'var(--mid)';
  if (/hard/i.test(d)) return 'var(--hard)';
  if (/expert/i.test(d)) return '#ff6bff';
  return 'var(--text-dim)';
}

function parseTS(ts) {
  if (!ts) return Date.now();
  const d = new Date(ts);
  return isNaN(d.getTime()) ? Date.now() : d.getTime();
}

function todayKey() {
  return new Date().toLocaleDateString('en-CA');
}

function getItemDay(item) {
  return new Date(parseTS(item.timestamp)).toLocaleDateString('en-CA');
}

function calcStreak(log) {
  if (!log.length) return 0;
  const daySet = new Set(log.map(p => getItemDay(p)));
  const days   = [...daySet].sort().reverse();
  
  const today = todayKey();
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const yesterday = d.toLocaleDateString('en-CA');

  if (days[0] !== today && days[0] !== yesterday) return 0;
  
  let streak = 1;
  for (let i = 1; i < days.length; i++) {
    const diff = Math.round(
      (new Date(days[i-1]) - new Date(days[i])) / 86400000
    );
    if (diff === 1) streak++;
    else break;
  }
  return streak;
}

function calcAvg(log) {
  if (!log.length) return '0.0';
  const dayMap = {};
  log.forEach(p => {
    const k = getItemDay(p);
    dayMap[k] = (dayMap[k] || 0) + 1;
  });
  const days = Object.keys(dayMap).length || 1;
  return (log.length / days).toFixed(1);
}

document.addEventListener('DOMContentLoaded', () => {
  // Check if already authenticated in session storage
  const storedToken = sessionStorage.getItem('dct_admin_token');
  const storedExpiry = sessionStorage.getItem('dct_admin_expires_at');
  
  if (storedToken && storedExpiry && Date.now() < parseInt(storedExpiry)) {
    ID_TOKEN = storedToken;
    document.getElementById('auth-overlay').classList.add('hidden');
    loadDashboardData();
  }

  // Bind Login
  document.getElementById('btn-login').addEventListener('click', handleAuthLogin);
  
  // Bind Tab switching
  document.getElementById('btn-tab-users').addEventListener('click', () => switchTab('users'));
  document.getElementById('btn-tab-errors').addEventListener('click', () => switchTab('errors'));
  
  // Bind Logout
  document.getElementById('btn-logout').addEventListener('click', handleAuthLogout);
  
  // Bind Error Filters
  document.getElementById('filter-err-user').addEventListener('change', renderErrorLogs);
  document.getElementById('filter-err-source').addEventListener('change', renderErrorLogs);
  document.getElementById('filter-err-search').addEventListener('input', renderErrorLogs);
  
  // Bind Clear Errors
  document.getElementById('btn-clear-errors').addEventListener('click', handleClearAllErrors);

  // Initialize and Bind Dev Mode Toggle
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(['devMode'], (res) => {
      const btnToggleDevText = document.getElementById('btn-toggle-dev-text');
      if (btnToggleDevText) {
        btnToggleDevText.textContent = res.devMode ? 'LOCK DEV MODE' : 'UNLOCK DEV MODE';
      }
    });

    const btnToggleDev = document.getElementById('btn-toggle-dev');
    if (btnToggleDev) {
      btnToggleDev.addEventListener('click', () => {
        chrome.storage.local.get(['devMode'], (res) => {
          const nextState = !res.devMode;
          const updates = { devMode: nextState };
          
          if (nextState) {
            // Automatically log in developer testing mail and UID
            updates.user = {
              id: 'gyVjCcPntNd9ijrslECh0x1aUjx2',
              email: 'katakam.sripranav@gmail.com',
              name: 'katakam.sripranav'
            };
            updates.isCloudEnabled = true;
          }
          
          chrome.storage.local.set(updates, () => {
            const btnToggleDevText = document.getElementById('btn-toggle-dev-text');
            if (btnToggleDevText) {
              btnToggleDevText.textContent = nextState ? 'LOCK DEV MODE' : 'UNLOCK DEV MODE';
            }
            const msg = nextState 
              ? 'Developer Mode Unlocked for all users.' 
              : 'Developer Mode Locked.';
            showCustomAlert(nextState ? 'DEV MODE UNLOCKED' : 'DEV MODE LOCKED', msg, nextState);
          });
        });
      });
    }
  } else {
    const btnToggleDev = document.getElementById('btn-toggle-dev');
    if (btnToggleDev) btnToggleDev.style.display = 'none';
  }
});

// ── AUTHENTICATION ───────────────────────────────────────────────────────────

async function handleAuthLogin() {
  const email = document.getElementById('admin-email').value.trim();
  const password = document.getElementById('admin-password').value;
  const errorEl = document.getElementById('auth-error');
  
  if (!email || !password) {
    errorEl.textContent = 'Email and password are required.';
    errorEl.style.display = 'block';
    return;
  }

  if (typeof FIREBASE_CONFIG === 'undefined' || FIREBASE_CONFIG.apiKey === 'YOUR_FIREBASE_API_KEY') {
    errorEl.textContent = 'FIREBASE_CONFIG is not configured. Edit firebase-sync.js first.';
    errorEl.style.display = 'block';
    return;
  }

  errorEl.style.display = 'none';

  try {
    const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_CONFIG.apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true })
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error?.message || 'Login failed');
    }

    const data = await res.json();
    ID_TOKEN = data.idToken;
    const uid = data.localId;

    // Verify admin role in Firestore whitelist collection before proceeding
    const projectId = FIREBASE_CONFIG.projectId;
    const adminCheckRes = await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/admins/${uid}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${ID_TOKEN}`
      }
    });

    if (!adminCheckRes.ok) {
      throw new Error('Access Denied: Your account is not whitelisted in the admins collection.');
    }

    const expiresAt = Date.now() + (parseInt(data.expiresIn) * 1000);
    
    sessionStorage.setItem('dct_admin_token', ID_TOKEN);
    sessionStorage.setItem('dct_admin_expires_at', expiresAt);
    
    document.getElementById('auth-overlay').classList.add('hidden');
    loadDashboardData();
  } catch (err) {
    console.error('[DCT-Admin] Login error:', err);
    errorEl.textContent = `Error: ${err.message}`;
    errorEl.style.display = 'block';
  }
}

function handleAuthLogout() {
  sessionStorage.removeItem('dct_admin_token');
  sessionStorage.removeItem('dct_admin_expires_at');
  ID_TOKEN = null;
  
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.set({ devMode: false });
  }

  document.getElementById('auth-overlay').classList.remove('hidden');
  document.getElementById('users-tbody').innerHTML = `
    <tr>
      <td colspan="5" style="text-align: center; color: var(--text-dim); padding: 40px 0; font-family:'Share Tech Mono', monospace;">
        🔐 AUTHENTICATE TO POPULATE DATABASE RECORDS
      </td>
    </tr>
  `;
}

// Automatically logout and lock developer tools if admin page is closed
window.addEventListener('unload', () => {
  sessionStorage.removeItem('dct_admin_token');
  sessionStorage.removeItem('dct_admin_expires_at');
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.set({ devMode: false });
  }
});

// ── TAB SYSTEM ───────────────────────────────────────────────────────────────

function switchTab(tabName) {
  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.tab-view').forEach(view => view.classList.add('hidden'));
  
  if (tabName === 'users') {
    document.getElementById('btn-tab-users').classList.add('active');
    document.getElementById('view-users').classList.remove('hidden');
  } else {
    document.getElementById('btn-tab-errors').classList.add('active');
    document.getElementById('view-errors').classList.remove('hidden');
  }
}

// ── DATA FETCHING ────────────────────────────────────────────────────────────

async function loadDashboardData() {
  const usersCountEl = document.getElementById('users-count');
  if (usersCountEl) usersCountEl.textContent = 'FETCHING SOLVES & ERRORS...';
  
  try {
    const projectId = FIREBASE_CONFIG.projectId;
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`;
    
    // 1. Fetch Solves (Collection Group Query)
    const solvesRes = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ID_TOKEN}`
      },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: 'solves', allDescendants: true }]
        }
      })
    });
    
    if (!solvesRes.ok) throw new Error(`Solves fetch failed: HTTP ${solvesRes.status}`);
    const rawSolves = await solvesRes.json();
    
    // Parse Solves
    ALL_SOLVES = [];
    rawSolves.forEach(item => {
      const doc = item.document;
      if (!doc) return;
      const f = doc.fields || {};
      
      // Extract userId from path projects/X/databases/(default)/documents/users/UID/solves/PROBLEM
      const pathParts = doc.name.split('/');
      const usersIndex = pathParts.indexOf('users');
      const uidFromPath = usersIndex !== -1 ? pathParts[usersIndex + 1] : 'unknown';

      ALL_SOLVES.push({
        name: f.name?.stringValue || '',
        problemId: f.problemId?.stringValue || '',
        platform: f.platform?.stringValue || '',
        difficulty: f.difficulty?.stringValue || '',
        url: f.url?.stringValue || '',
        openedAt: f.openedAt?.stringValue || '',
        timestamp: f.timestamp?.stringValue || '',
        userId: f.userId?.stringValue || uidFromPath,
        userEmail: f.userEmail?.stringValue || ''
      });
    });

    // 2. Fetch Errors (Collection Group Query)
    const errorsRes = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ID_TOKEN}`
      },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: 'errors', allDescendants: true }]
        }
      })
    });
    
    if (!errorsRes.ok) throw new Error(`Errors fetch failed: HTTP ${errorsRes.status}`);
    const rawErrors = await errorsRes.json();
    
    // Parse Errors
    ALL_ERRORS = [];
    rawErrors.forEach(item => {
      const doc = item.document;
      if (!doc) return;
      const f = doc.fields || {};
      
      const pathParts = doc.name.split('/');
      const usersIndex = pathParts.indexOf('users');
      const uidFromPath = usersIndex !== -1 ? pathParts[usersIndex + 1] : 'unknown';

      ALL_ERRORS.push({
        id: f.id?.stringValue || pathParts[pathParts.length - 1],
        source: f.source?.stringValue || 'unknown',
        message: f.message?.stringValue || '',
        data: f.data?.stringValue || '{}',
        timestamp: f.timestamp?.stringValue || '',
        url: f.url?.stringValue || '',
        userAgent: f.userAgent?.stringValue || '',
        userId: uidFromPath,
        docName: doc.name
      });
    });

    // Sort solves and errors descending
    ALL_SOLVES.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    ALL_ERRORS.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    console.log(`[DCT-Admin] Loaded ${ALL_SOLVES.length} solves, ${ALL_ERRORS.length} errors.`);

    // Render Views
    renderUsersDashboard();
    populateErrorFilters();
    renderErrorLogs();
    
  } catch (err) {
    console.error('[DCT-Admin] Data load failed:', err);
    showCustomAlert('LOAD FAILED', `Failed to load Firestore data: ${err.message}\n\nCheck security rules or console logs.`, false);
    if (usersCountEl) usersCountEl.textContent = 'LOAD FAILED';
  }
}

// ── USERS DASHBOARD RENDERING ────────────────────────────────────────────────

function renderUsersDashboard() {
  const tbody = document.getElementById('users-tbody');
  const countEl = document.getElementById('users-count');
  tbody.innerHTML = '';
  
  if (!ALL_SOLVES.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; color: var(--text-dim); padding: 40px 0; font-family:'Share Tech Mono', monospace;">
          NO SOLVE DATA RECORDED IN FIRESTORE YET
        </td>
      </tr>
    `;
    if (countEl) countEl.textContent = '0 USERS DETECTED';
    return;
  }

  // Group solves by user
  const userMap = {};
  ALL_SOLVES.forEach(s => {
    if (!userMap[s.userId]) {
      userMap[s.userId] = [];
    }
    userMap[s.userId].push(s);
  });

  const uids = Object.keys(userMap);
  if (countEl) countEl.textContent = `${uids.length} UNIQUE USER${uids.length !== 1 ? 'S' : ''} DETECTED`;

  let rowsHtml = '';
  uids.forEach((uid, index) => {
    const userSolves = userMap[uid];
    const totalSolved = userSolves.length;
    
    // Find email from userSolves
    const emailSolve = userSolves.find(s => s.userEmail);
    const userDisplayName = emailSolve ? emailSolve.userEmail : uid;

    // Calculate unique active days
    const activeDays = new Set(userSolves.map(s => {
      const d = new Date(parseTS(s.timestamp));
      return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-CA');
    }).filter(Boolean));
    
    // Last Active
    const lastActive = userSolves[0] ? new Date(parseTS(userSolves[0].timestamp)).toLocaleString() : 'N/A';
    
    const isExpanded = EXPANDED_USERS.has(uid);
    const rowClass = isExpanded ? 'expandable-row active-expanded' : 'expandable-row';
    
    rowsHtml += `
      <tr class="${rowClass}" onclick="toggleUserExpand('${uid}')">
        <td style="font-family:'Share Tech Mono', monospace; color: var(--text-mute);">${index + 1}</td>
        <td style="font-family:'Share Tech Mono', monospace; font-weight:600; color:var(--neon);">${escapeHTML(userDisplayName)}</td>
        <td style="font-family:'Share Tech Mono', monospace;">${totalSolved} solved</td>
        <td style="font-family:'Share Tech Mono', monospace;">${activeDays.size} days</td>
        <td style="font-family:'Share Tech Mono', monospace; font-size:11px; color:var(--text-dim);">${lastActive}</td>
      </tr>
    `;
    
    if (isExpanded) {
      // Calculate Stats Combination (Dashboard + History)
      const dailyAvg = calcAvg(userSolves);
      const streak = calcStreak(userSolves);
      
      const platCounts = { leetcode: 0, codeforces: 0, codechef: 0, hackerrank: 0 };
      userSolves.forEach(s => {
        if (platCounts[s.platform] !== undefined) platCounts[s.platform]++;
      });
      
      const diffCounts = { Easy: 0, Medium: 0, Hard: 0, Expert: 0, 'N/A': 0 };
      userSolves.forEach(s => {
        const d = s.difficulty || 'N/A';
        if (diffCounts[d] !== undefined) diffCounts[d]++;
      });

      rowsHtml += `
        <tr class="expanded-row-details">
          <td colspan="5">
            <div class="expanded-container" style="background:var(--bg); border:1px solid var(--border); padding:20px; border-radius:8px; text-align:left; margin: 10px 0;">
              <!-- Profile Header -->
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; border-bottom:1px solid var(--border); padding-bottom:10px;">
                <h4 style="font-family:'Orbitron', sans-serif; font-size:13px; color:var(--neon); margin:0;">USER METRICS: ${escapeHTML(userDisplayName)}</h4>
                <span style="font-family:'Share Tech Mono', monospace; font-size:10px; color:var(--text-mute);">UID: ${uid}</span>
              </div>

              <!-- Stats Cards Row (Mini-Dashboard) -->
              <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:12px; margin-bottom:20px;">
                <div style="background:var(--bg2); border:1px solid var(--border); padding:12px; border-radius:6px; text-align:center; box-shadow: 0 2px 8px rgba(0,0,0,0.2);">
                  <div style="font-family:'Share Tech Mono', monospace; font-size:10px; color:var(--text-dim);">TOTAL SOLVED</div>
                  <div style="font-family:'Orbitron', sans-serif; font-size:18px; color:var(--neon); text-shadow:var(--glow); margin-top:4px;">${totalSolved}</div>
                </div>
                <div style="background:var(--bg2); border:1px solid var(--border); padding:12px; border-radius:6px; text-align:center; box-shadow: 0 2px 8px rgba(0,0,0,0.2);">
                  <div style="font-family:'Share Tech Mono', monospace; font-size:10px; color:var(--text-dim);">DAILY AVERAGE</div>
                  <div style="font-family:'Orbitron', sans-serif; font-size:18px; color:var(--green); margin-top:4px;">${dailyAvg}</div>
                </div>
                <div style="background:var(--bg2); border:1px solid var(--border); padding:12px; border-radius:6px; text-align:center; box-shadow: 0 2px 8px rgba(0,0,0,0.2);">
                  <div style="font-family:'Share Tech Mono', monospace; font-size:10px; color:var(--text-dim);">ACTIVE STREAK</div>
                  <div style="font-family:'Orbitron', sans-serif; font-size:18px; color:var(--orange); margin-top:4px;">${streak} 🔥</div>
                </div>
                <div style="background:var(--bg2); border:1px solid var(--border); padding:12px; border-radius:6px; text-align:center; box-shadow: 0 2px 8px rgba(0,0,0,0.2);">
                  <div style="font-family:'Share Tech Mono', monospace; font-size:10px; color:var(--text-dim);">ACTIVE DAYS</div>
                  <div style="font-family:'Orbitron', sans-serif; font-size:18px; color:var(--easy); margin-top:4px;">${activeDays.size}</div>
                </div>
              </div>

              <!-- Platforms & Difficulty Distribution Bars -->
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-bottom:20px;">
                <!-- Platform Breakdown -->
                <div style="background:var(--bg2); border:1px solid var(--border); padding:14px; border-radius:6px;">
                  <div style="font-family:'Share Tech Mono', monospace; font-size:11px; color:var(--text-dim); margin-bottom:10px; border-bottom:1px solid var(--border); padding-bottom:6px;">PLATFORM BREAKDOWN</div>
                  <div style="display:flex; flex-direction:column; gap:8px;">
                    ${Object.keys(platCounts).map(plat => {
                      const count = platCounts[plat];
                      const pct = totalSolved ? Math.round((count / totalSolved) * 100) : 0;
                      return `
                        <div>
                          <div style="display:flex; justify-content:space-between; font-size:11px; margin-bottom:4px; font-family:'Share Tech Mono', monospace;">
                            <span>${PLAT_ICON[plat] || '❓'} ${plat.toUpperCase()}</span>
                            <span style="color:var(--text);">${count} (${pct}%)</span>
                          </div>
                          <div style="height:4px; background:var(--bg3); border-radius:2px; overflow:hidden;">
                            <div style="height:100%; width:${pct}%; background:${PLAT_COLOR[plat] || '#888'};"></div>
                          </div>
                        </div>
                      `;
                    }).filter(Boolean).join('')}
                  </div>
                </div>

                <!-- Difficulty Breakdown -->
                <div style="background:var(--bg2); border:1px solid var(--border); padding:14px; border-radius:6px;">
                  <div style="font-family:'Share Tech Mono', monospace; font-size:11px; color:var(--text-dim); margin-bottom:10px; border-bottom:1px solid var(--border); padding-bottom:6px;">DIFFICULTY BREAKDOWN</div>
                  <div style="display:flex; flex-direction:column; gap:8px;">
                    ${Object.keys(diffCounts).map(diff => {
                      const count = diffCounts[diff];
                      const pct = totalSolved ? Math.round((count / totalSolved) * 100) : 0;
                      if (!count && diff === 'N/A') return ''; // Skip empty N/A
                      return `
                        <div>
                          <div style="display:flex; justify-content:space-between; font-size:11px; margin-bottom:4px; font-family:'Share Tech Mono', monospace;">
                            <span class="badge ${getDiffClass(diff)}" style="margin-right:0; padding: 1px 6px;">${diff}</span>
                            <span style="color:var(--text);">${count} (${pct}%)</span>
                          </div>
                          <div style="height:4px; background:var(--bg3); border-radius:2px; overflow:hidden;">
                            <div style="height:100%; width:${pct}%; background:${getDiffColor(diff)};"></div>
                          </div>
                        </div>
                      `;
                    }).filter(Boolean).join('')}
                  </div>
                </div>
              </div>

              <!-- History Accordion -->
              <div style="font-family:'Share Tech Mono', monospace; font-size:11px; color:var(--text-dim); margin-bottom:10px; border-bottom:1px solid var(--border); padding-bottom:6px;">SOLVE HISTORY LIST</div>
              ${renderUserSolvesAccordion(userSolves)}
            </div>
          </td>
        </tr>
      `;
    }
  });

  tbody.innerHTML = rowsHtml;
}

function toggleUserExpand(uid) {
  if (EXPANDED_USERS.has(uid)) {
    EXPANDED_USERS.delete(uid);
  } else {
    EXPANDED_USERS.add(uid);
  }
  renderUsersDashboard();
}

function renderUserSolvesAccordion(solves) {
  // Group by day
  const byDay = {};
  solves.forEach(s => {
    const d = new Date(s.timestamp);
    const k = isNaN(d.getTime()) ? 'Invalid Date' : d.toLocaleDateString('en-CA');
    if (!byDay[k]) byDay[k] = [];
    byDay[k].push(s);
  });

  const days = Object.keys(byDay).sort().reverse();
  
  return days.map(day => {
    const dayProbs = byDay[day];
    const isOpen = OPENED_DAYS.has(day);
    
    const dayFmt = day === 'Invalid Date' ? day : new Date(day + 'T00:00:00').toLocaleDateString('en', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
    
    // Mini badges difficulty breakdown
    const counts = { Easy: 0, Medium: 0, Hard: 0, Expert: 0 };
    dayProbs.forEach(s => { if (counts[s.difficulty] !== undefined) counts[s.difficulty]++; });
    const diffPills = [
      counts.Easy ? `<span class="badge badge-easy" style="margin-right:4px;">${counts.Easy} E</span>` : '',
      counts.Medium ? `<span class="badge badge-medium" style="margin-right:4px;">${counts.Medium} M</span>` : '',
      counts.Hard ? `<span class="badge badge-hard" style="margin-right:4px;">${counts.Hard} H</span>` : '',
      counts.Expert ? `<span class="badge badge-expert" style="margin-right:4px;">${counts.Expert} X</span>` : '',
    ].filter(Boolean).join('');

    const rows = dayProbs.map((p, i) => `
      <tr>
        <td style="color:var(--text-mute); font-family:'Share Tech Mono', monospace; width:30px;">${i + 1}</td>
        <td><a href="${escapeHTML(p.url)}" target="_blank" style="color:var(--green); text-decoration:none;">${escapeHTML(p.name || p.problemId)}</a></td>
        <td><span class="badge ${getDiffClass(p.difficulty)}">${p.difficulty || 'N/A'}</span></td>
        <td>
          <span style="font-family:'Share Tech Mono', monospace; font-size:10px;">
            ${PLAT_ICON[p.platform] || '❓'} ${p.platform.toUpperCase()}
          </span>
        </td>
        <td style="font-family:'Share Tech Mono', monospace; color:var(--text-dim); font-size:11px;">
          ${new Date(p.timestamp).toLocaleTimeString('en', { hour:'2-digit', minute:'2-digit', hour12:false })}
        </td>
      </tr>
    `).join('');

    return `
      <div class="day-block">
        <div class="day-header" onclick="event.stopPropagation(); toggleDayExpand('${day}')">
          <div style="font-weight:600; color:var(--text);">${dayFmt}</div>
          <div style="display:flex; align-items:center; gap:12px;">
            <div>${diffPills}</div>
            <span class="badge" style="background:#101c2e; border:1px solid var(--border); color:var(--text);">${dayProbs.length} SOLVED</span>
            <span style="color:var(--text-dim); transform: ${isOpen ? 'rotate(180deg)' : 'none'}; transition: transform 0.15s;">▼</span>
          </div>
        </div>
        <div class="day-body ${isOpen ? '' : 'hidden'}">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Problem</th>
                <th>Difficulty</th>
                <th>Platform</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>
    `;
  }).join('');
}

function toggleDayExpand(day) {
  if (OPENED_DAYS.has(day)) {
    OPENED_DAYS.delete(day);
  } else {
    OPENED_DAYS.add(day);
  }
  renderUsersDashboard();
}

function getDiffClass(d) {
  if (!d) return 'badge-na';
  if (/easy/i.test(d)) return 'badge-easy';
  if (/medium/i.test(d)) return 'badge-medium';
  if (/hard/i.test(d)) return 'badge-hard';
  if (/expert/i.test(d)) return 'badge-expert';
  return 'badge-na';
}

// ── ERROR LOGS RENDERING ─────────────────────────────────────────────────────

function populateErrorFilters() {
  const userSelect = document.getElementById('filter-err-user');
  userSelect.innerHTML = '<option value="">All Users</option>';
  
  // Extract unique user UIDs from ALL_ERRORS
  const userUids = [...new Set(ALL_ERRORS.map(e => e.userId))];
  userUids.forEach(uid => {
    userSelect.innerHTML += `<option value="${uid}">${uid.substring(0, 12)}...</option>`;
  });
}

function renderErrorLogs() {
  const tbody = document.getElementById('errors-tbody');
  tbody.innerHTML = '';
  
  const filterUser = document.getElementById('filter-err-user').value;
  const filterSource = document.getElementById('filter-err-source').value;
  const filterSearch = document.getElementById('filter-err-search').value.toLowerCase();
  
  const filtered = ALL_ERRORS.filter(e => {
    if (filterUser && e.userId !== filterUser) return false;
    if (filterSource && !e.source.includes(filterSource)) return false;
    if (filterSearch && !e.message.toLowerCase().includes(filterSearch) && 
        !e.url.toLowerCase().includes(filterSearch) && 
        !e.userId.toLowerCase().includes(filterSearch)) return false;
    return true;
  });

  if (!filtered.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; color: var(--text-dim); padding: 40px 0; font-family:'Share Tech Mono', monospace;">
          NO MATCHING ERROR SIGNALS CAPTURED
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(e => {
    let srcClass = 'src-content';
    if (e.source.includes('firebase')) srcClass = 'src-firebase';
    else if (e.source.includes('background')) srcClass = 'src-background';
    
    return `
      <tr>
        <td style="font-family:'Share Tech Mono', monospace; font-size:11px; white-space:nowrap;">
          ${new Date(e.timestamp).toLocaleString()}
        </td>
        <td>
          <span class="err-source ${srcClass}">${escapeHTML(e.source)}</span>
        </td>
        <td style="color:var(--red); font-weight:500;">${escapeHTML(e.message)}</td>
        <td style="max-width:300px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:11px; color:var(--text-dim);">
          <a href="${escapeHTML(e.url)}" target="_blank" style="color:var(--text-dim); text-decoration:none;">${escapeHTML(e.url)}</a>
        </td>
        <td style="font-family:'Share Tech Mono', monospace; font-size:11px; color:var(--text-mute);">
          ${e.userId.substring(0, 12)}...
        </td>
      </tr>
    `;
  }).join('');
}

// ── DELETE OPERATIONS ────────────────────────────────────────────────────────

async function handleClearAllErrors() {
  if (!ALL_ERRORS.length) {
    return showCustomAlert('NO ERRORS', 'No error logs to clear.', false);
  }
  
  showCustomConfirm(
    '🗑️ CLEAR ERROR LOGS',
    `Are you sure you want to permanently delete all ${ALL_ERRORS.length} error logs from Firestore?`,
    true,
    async () => {
      const btn = document.getElementById('btn-clear-errors');
      btn.textContent = '🗑️ DELETING LOGS...';
      btn.disabled = true;

      try {
        let count = 0;
        for (const err of ALL_ERRORS) {
          const res = await fetch(`https://firestore.googleapis.com/v1/${err.docName}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${ID_TOKEN}` }
          });
          if (res.ok) count++;
        }

        showCustomAlert('DELETED', `Successfully deleted ${count} error records.`, true);
        loadDashboardData();
      } catch (err) {
        console.error('[DCT-Admin] Clear errors failed:', err);
        showCustomAlert('DELETE FAILED', `Failed to delete errors: ${err.message}`, false);
      } finally {
        btn.textContent = '🗑️ CLEAR ALL ERROR LOGS';
        btn.disabled = false;
      }
    }
  );
}
