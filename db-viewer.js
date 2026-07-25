// ─────────────────────────────────────────────────────────────────────────────
//  DCT — db-viewer.js
// ─────────────────────────────────────────────────────────────────────────────

// ── CONSTANTS ────────────────────────────────────────────────────────────────
const PLAT_COLOR = {
  leetcode:   '#f5a623',
  codeforces: '#4a90d9',
  codechef:   '#9b6b3a',
  hackerrank: '#00b388',
};

const PLAT_LABEL = {
  leetcode:   'LeetCode',
  codeforces: 'Codeforces',
  codechef:   'CodeChef',
  hackerrank: 'HackerRank',
};

// ── HELPERS ──────────────────────────────────────────────────────────────────
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

function parseTS(ts) {
  if (!ts) return Date.now();
  const d = new Date(ts);
  return isNaN(d.getTime()) ? Date.now() : d.getTime();
}

function dayKey(ts) {
  return new Date(parseTS(ts)).toLocaleDateString('en-CA');
}

function todayKey() {
  return new Date().toLocaleDateString('en-CA');
}

function fmtDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
}

function fmtTime(ts) {
  return new Date(parseTS(ts)).toLocaleTimeString('en', { hour:'2-digit', minute:'2-digit', hour12:false });
}

function fmtTimeTaken(openedAt, solvedAt) {
  if (!openedAt || !solvedAt) return '—';
  const diff = Math.abs(parseTS(solvedAt) - parseTS(openedAt));
  const mins = Math.floor(diff / 60000);
  const secs = Math.floor((diff % 60000) / 1000);
  if (mins === 0) return `${secs}s`;
  if (mins < 60)  return `${mins}m ${secs}s`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

function diffClass(d) {
  if (!d)             return 'diff-na';
  if (/easy/i.test(d))   return 'diff-easy';
  if (/medium/i.test(d)) return 'diff-medium';
  if (/hard/i.test(d))   return 'diff-hard';
  if (/expert/i.test(d)) return 'diff-expert';
  return 'diff-na';
}

function miniClass(d) {
  return diffClass(d).replace('diff-', 'mini-');
}

function calcStreak(log) {
  if (!log.length) return 0;
  const days = [...new Set(log.map(p => dayKey(p.timestamp)))].sort().reverse();
  const today = todayKey();
  
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const yesterday = d.toLocaleDateString('en-CA');

  if (days[0] !== today && days[0] !== yesterday) return 0;
  
  let streak = 1;
  for (let i = 1; i < days.length; i++) {
    const diff = Math.round((new Date(days[i-1]) - new Date(days[i])) / 86400000);
    if (diff === 1) streak++;
    else break;
  }
  return streak;
}

function calcAvg(log) {
  if (!log.length) return '0.0';
  const days = new Set(log.map(p => dayKey(p.timestamp)));
  return (log.length / days.size).toFixed(1);
}

// Count by difficulty in a list
function diffCounts(problems) {
  const counts = { Easy:0, Medium:0, Hard:0, Expert:0 };
  problems.forEach(p => { if (counts[p.difficulty] !== undefined) counts[p.difficulty]++; });
  return counts;
}

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

// ── OPEN/CLOSED STATE ────────────────────────────────────────────────────────
const openDays = new Set();

function toggleDay(day) {
  const body = document.getElementById('body-' + day);
  const chev = document.getElementById('chev-' + day);
  if (openDays.has(day)) {
    openDays.delete(day);
    body.classList.add('hidden');
    chev.classList.remove('open');
  } else {
    openDays.add(day);
    body.classList.remove('hidden');
    chev.classList.add('open');
  }
}

// ── RENDER ───────────────────────────────────────────────────────────────────
let ALL_PROBLEMS = [];
window.ALL_PROBLEMS = ALL_PROBLEMS;
let IS_ADMIN_MODE = false;

function render() {
  const pf  = document.getElementById('filter-platform').value;
  const df  = document.getElementById('filter-diff').value;
  const sq  = document.getElementById('filter-search').value.toLowerCase();
  const srt = document.getElementById('filter-sort').value;

  const filtered = ALL_PROBLEMS.filter(p => {
    if (pf && p.platform !== pf)         return false;
    if (df && p.difficulty !== df)        return false;
    if (sq && !p.name.toLowerCase().includes(sq) &&
              !p.url.toLowerCase().includes(sq))  return false;
    return true;
  });

  // Stats
  document.getElementById('s-total').textContent  = filtered.length;
  const activeDays = new Set(filtered.map(p => dayKey(p.timestamp)));
  const sDaysEl = document.getElementById('s-days');
  if (sDaysEl) sDaysEl.textContent = activeDays.size;
  document.getElementById('s-streak').textContent = calcStreak(ALL_PROBLEMS);
  document.getElementById('s-avg').textContent    = activeDays.size
    ? (filtered.length / activeDays.size).toFixed(1) : '0.0';
  document.getElementById('filter-count').textContent =
    filtered.length < ALL_PROBLEMS.length
      ? `${filtered.length} of ${ALL_PROBLEMS.length} problems`
      : `${ALL_PROBLEMS.length} problems total`;

  // Group by day
  const byDay = {};
  filtered.forEach(p => {
    const k = dayKey(p.timestamp);
    if (!byDay[k]) byDay[k] = [];
    byDay[k].push(p);
  });

  let days = Object.keys(byDay).sort();
  if (srt === 'newest') days = days.reverse();

  const container = document.getElementById('db-container');

  if (!days.length) {
    container.innerHTML = `
      <div class="empty">
        <span class="empty-icon">📡</span>
        NO PROBLEMS FOUND.<br/>ADJUST YOUR FILTERS OR SOLVE MORE PROBLEMS.
      </div>`;
    return;
  }

  container.innerHTML = days.map(day => {
    // Sort problems within a day newest first
    const probs = byDay[day].slice().sort((a, b) =>
      parseTS(b.timestamp) - parseTS(a.timestamp));
    const dc = diffCounts(probs);
    const isOpen = openDays.has(day) || (day === todayKey());

    const diffPills = [
      dc.Easy   ? `<span class="mini-pill mini-easy">${dc.Easy} E</span>`   : '',
      dc.Medium ? `<span class="mini-pill mini-medium">${dc.Medium} M</span>` : '',
      dc.Hard   ? `<span class="mini-pill mini-hard">${dc.Hard} H</span>`   : '',
      dc.Expert ? `<span class="mini-pill mini-expert">${dc.Expert} X</span>` : '',
    ].filter(Boolean).join('');

    const rows = probs.map((p, i) => `
      <tr>
        <td class="num-cell">${i + 1}</td>
        <td>
          <a class="prob-link" href="${escapeHTML(p.url)}" target="_blank">${escapeHTML(p.name)}</a>
        </td>
        <td>
          <span class="diff-badge ${diffClass(p.difficulty)}">${p.difficulty || 'N/A'}</span>
        </td>
        <td>
          <div class="platform-cell">
            <span class="plat-dot" style="background:${PLAT_COLOR[p.platform] || '#888'}"></span>
            ${(p.platform || '?').toUpperCase()}
          </div>
        </td>
        <td class="time-cell">${fmtTime(p.timestamp)}</td>
        <td class="taken-cell">⏱ ${fmtTimeTaken(p.openedAt, p.timestamp)}</td>
        ${IS_ADMIN_MODE ? '' : `
        <td class="action-cell">
          <div class="action-menu-container">
            <button class="btn-action-trigger" data-id="${p.problemId}">⋮</button>
            <div class="action-dropdown hidden" id="dropdown-${p.problemId}">
              <button class="btn-delete-solve" data-id="${p.problemId}">🗑️ Delete</button>
            </div>
          </div>
        </td>
        `}
      </tr>`).join('');

    return `
      <div class="day-block">
        <div class="day-header" data-day="${day}">
          <div class="day-date">${fmtDate(day)}</div>
          <div class="day-meta">
            <div class="diff-pills">${diffPills}</div>
            <span class="count-pill">${probs.length} SOLVED</span>
            <span class="chevron ${isOpen ? 'open' : ''}" id="chev-${day}">▾</span>
          </div>
        </div>
        <div class="day-body ${isOpen ? '' : 'hidden'}" id="body-${day}">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Problem</th>
                <th>Difficulty</th>
                <th>Platform</th>
                <th>Solved At</th>
                <th>Time Taken</th>
                ${IS_ADMIN_MODE ? '' : '<th style="width: 50px; text-align: center;">Actions</th>'}
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>`;
  }).join('');
}

// ── LOAD ─────────────────────────────────────────────────────────────────────
async function init(forcePull = false) {
  document.getElementById('footer-ts').textContent =
    'LOADED: ' + new Date().toLocaleTimeString('en', { hour:'2-digit', minute:'2-digit', hour12:false });

  const titleEl = document.querySelector('.header-sub');

  // Check adminMode query parameter
  const params = new URLSearchParams(window.location.search);
  IS_ADMIN_MODE = params.get('adminMode') === 'true';
  const adminUid = params.get('uid');

  if (IS_ADMIN_MODE && adminUid) {
    if (titleEl) {
      titleEl.textContent = 'ADMIN MODE · VIEWING USER RECORDS';
    }
    
    // Retrieve user's solves from parent window
    if (window.parent && typeof window.parent.getUserSolves === 'function') {
      ALL_PROBLEMS = window.parent.getUserSolves(adminUid);
    } else if (window.parent && window.parent.ALL_SOLVES) {
      ALL_PROBLEMS = window.parent.ALL_SOLVES.filter(s => s.userId === adminUid);
    } else {
      ALL_PROBLEMS = [];
    }

    // Auto-open today
    const today = todayKey();
    if (ALL_PROBLEMS.some(p => dayKey(p.timestamp) === today)) {
      openDays.add(today);
    }

    window.ALL_PROBLEMS = ALL_PROBLEMS;
    render();
    if (typeof renderAnalytics === 'function') renderAnalytics(ALL_PROBLEMS);

    // Hide cloud & settings tabs in adminMode
    const cloudNav = document.querySelector('.nav-item[data-tab="cloud"]');
    if (cloudNav) cloudNav.style.display = 'none';
    const settingsNav = document.querySelector('.nav-item[data-tab="settings"]');
    if (settingsNav) settingsNav.style.display = 'none';

    // Hide synced badge in header
    const syncedBadge = document.getElementById('synced-badge');
    if (syncedBadge) syncedBadge.style.display = 'none';

    return true; // resolves the promise
  }

  return new Promise((resolve) => {
    chrome.storage.local.get(['problemLog', 'user', 'isCloudEnabled', 'firebase_expires_at', 'hasPulledFromCloud'], async (result) => {
      // 1. Deduplicate local log to handle any legacy race conditions
      const rawLocal = result.problemLog || [];
      const localLog = [];
      const localIds = new Set();
      
      rawLocal.forEach(p => {
        if (!p.problemId) return; // ignore invalid entries
        if (!localIds.has(p.problemId)) {
          localLog.push(p);
          localIds.add(p.problemId);
        }
      });

      ALL_PROBLEMS = localLog;

      if (result.isCloudEnabled && result.user?.id) {
        // Check token expiry — Firebase tokens last 1 hour
        const expiresAt = result.firebase_expires_at || 0;
        if (Date.now() > (expiresAt - 5 * 60 * 1000)) {
          console.warn('[DCT] Firebase token expiring soon or expired, triggering refresh');
          if (typeof FirebaseSync !== 'undefined' && FirebaseSync.refreshToken) {
            await FirebaseSync.refreshToken();
          }
        }
      }

      let syncSuccess = true;
      if (result.isCloudEnabled && result.user?.id) {
        const shouldPull = !result.hasPulledFromCloud || forcePull;
        if (shouldPull) {
          if (titleEl) titleEl.textContent = 'SYNCING CLOUD DATABASE...';
          
          const cloudLog = await FirebaseSync.pullHistory(result.user.id).catch(err => {
            console.error('[DCT] Firestore pull failed:', err);
            if (titleEl) titleEl.textContent = 'CLOUD SYNC FAILED — CHECK CONSOLE';
            syncSuccess = false;
            return null;
          });
          
          if (cloudLog) {
            if (cloudLog.length > 0) {
              // 2. Merge cloud into local, ensuring absolute uniqueness
              const merged = [...localLog];
              const mergedIds = new Set(localIds);

              cloudLog.forEach(cloudItem => {
                if (!cloudItem.problemId) return;
                if (!mergedIds.has(cloudItem.problemId)) {
                  merged.push(cloudItem);
                  mergedIds.add(cloudItem.problemId);
                }
              });
              
              // Sort newest first globally
              merged.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
              ALL_PROBLEMS = merged;
            }
            
            if (titleEl && titleEl.textContent !== 'CLOUD SYNC FAILED — CHECK CONSOLE') {
              titleEl.textContent = 'CLOUD DATABASE SYNCED · ALL PLATFORMS';
            }
            chrome.storage.local.set({ problemLog: ALL_PROBLEMS, hasPulledFromCloud: true });
          } else {
            syncSuccess = false;
          }
        } else {
          if (titleEl) titleEl.textContent = 'CLOUD DATABASE SYNCED (CACHED) · ALL PLATFORMS';
        }
      }

      // Auto-open today
      const today = todayKey();
      if (ALL_PROBLEMS.some(p => dayKey(p.timestamp) === today)) {
        openDays.add(today);
      }

      window.ALL_PROBLEMS = ALL_PROBLEMS;
      render();
      if (typeof renderAnalytics === 'function') renderAnalytics(ALL_PROBLEMS);
      resolve(syncSuccess);
    });
  });
}

async function deleteSolveEntry(problemId) {
  // Find in ALL_PROBLEMS and remove
  const index = ALL_PROBLEMS.findIndex(p => p.problemId === problemId);
  if (index === -1) return;

  const [removed] = ALL_PROBLEMS.splice(index, 1);

  // Update local storage
  chrome.storage.local.set({ problemLog: ALL_PROBLEMS }, async () => {
    console.log('[DCT] Deleted solve:', problemId);
    
    // Re-render immediately
    render();

    // Trigger Firebase sync delete if cloud sync enabled
    chrome.storage.local.get(['isCloudEnabled', 'user'], async (result) => {
      if (result.isCloudEnabled && result.user?.id) {
        const titleEl = document.querySelector('.header-sub');
        if (titleEl) titleEl.textContent = 'DELETING CLOUD RECORD...';
        await FirebaseSync.deleteSolve(problemId, result.user.id);
        if (titleEl) titleEl.textContent = 'CLOUD RECORD DELETED';
      }
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  // ── Load and Apply Theme ──────────────────────────────────────────────────
  chrome.storage.local.get(['theme'], (result) => {
    if (result.theme === 'light') {
      document.documentElement.classList.add('light-theme');
      const settingsThemeBtn = document.getElementById('settings-btn-theme');
      if (settingsThemeBtn) settingsThemeBtn.textContent = 'Toggle Theme 🌙';
    }
  });

  document.getElementById('filter-platform').addEventListener('change', render);
  document.getElementById('filter-diff').addEventListener('change', render);
  document.getElementById('filter-sort').addEventListener('change', render);
  document.getElementById('filter-search').addEventListener('input', render);

  // Theme button (header)
  const btnTheme = document.getElementById('btn-theme');
  if (btnTheme) {
    btnTheme.addEventListener('click', () => {
      const isLight = document.documentElement.classList.toggle('light-theme');
      chrome.storage.local.set({ theme: isLight ? 'light' : 'dark' });
      const settingsThemeBtn = document.getElementById('settings-btn-theme');
      if (settingsThemeBtn) settingsThemeBtn.textContent = isLight ? 'Toggle Theme 🌙' : 'Toggle Theme ☀';
    });
  }

  // Close button
  const closeBtn = document.getElementById('btn-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      const params = new URLSearchParams(window.location.search);
      const isAdminMode = params.get('adminMode') === 'true';
      if (isAdminMode) {
        if (window.parent && typeof window.parent.closeDbViewerSidePanel === 'function') {
          window.parent.closeDbViewerSidePanel();
        } else {
          window.parent.postMessage({ action: 'closeDbViewer' }, '*');
        }
      } else {
        window.close();
      }
    });
  }

  // Event delegation for day toggles and actions menu
  document.getElementById('db-container').addEventListener('click', (e) => {
    // 1. Day toggles
    const header = e.target.closest('.day-header');
    if (header) {
      const day = header.getAttribute('data-day');
      if (day) toggleDay(day);
      return;
    }

    // 2. Action trigger toggles (3-dots)
    const trigger = e.target.closest('.btn-action-trigger');
    if (trigger) {
      e.stopPropagation();
      const problemId = trigger.getAttribute('data-id');
      const dropdown = document.getElementById('dropdown-' + problemId);
      
      // Close all other dropdowns
      document.querySelectorAll('.action-dropdown').forEach(d => {
        if (d !== dropdown) d.classList.add('hidden');
      });

      if (dropdown) {
        dropdown.classList.toggle('hidden');
      }
      return;
    }

    // 3. Delete solve button
    const deleteBtn = e.target.closest('.btn-delete-solve');
    if (deleteBtn) {
      e.stopPropagation();
      const problemId = deleteBtn.getAttribute('data-id');
      showCustomConfirm('DELETE SOLVE', 'Are you sure you want to delete this solve?', true, () => {
        deleteSolveEntry(problemId);
      });
    }
  });

  // Close dropdowns when clicking outside
  document.addEventListener('click', () => {
    document.querySelectorAll('.action-dropdown').forEach(d => d.classList.add('hidden'));
  });

  // ── Navigation Tabs ────────────────────────────────────────────────────────
  const activeTab = sessionStorage.getItem('activeTab') || 'dashboard';
  switchTab(activeTab);

  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      switchTab(item.getAttribute('data-tab'));
    });
  });

  // ── Cloud Tab Init ─────────────────────────────────────────────────────────
  chrome.storage.local.get(['user', 'isCloudEnabled'], (r) => {
    updateCloudTabUI(r.user);
  });

  // Sync Now button
  const cloudBtnSync = document.getElementById('cloud-btn-sync');
  if (cloudBtnSync) {
    cloudBtnSync.addEventListener('click', async () => {
      chrome.storage.local.get(['lastManualSyncTime', 'isCloudEnabled', 'user'], async (r) => {
        if (!r.isCloudEnabled || !r.user?.id) {
          showCustomAlert('SYNC INFO', 'Please connect to Firebase Cloud Sync first.', false);
          return;
        }

        const now = Date.now();
        const lastSync = r.lastManualSyncTime || 0;
        const cooldown = 3 * 60 * 60 * 1000; // 3 hours
        const elapsed = now - lastSync;

        if (elapsed < cooldown) {
          const remainingMs = cooldown - elapsed;
          const remainingHours = Math.floor(remainingMs / (3600 * 1000));
          const remainingMins = Math.ceil((remainingMs % (3600 * 1000)) / (60 * 1000));
          
          let timeStr = '';
          if (remainingHours > 0) {
            timeStr = `${remainingHours}h ${remainingMins}m`;
          } else {
            timeStr = `${remainingMins}m`;
          }

          showCustomAlert(
            'RATE LIMIT EXCEEDED',
            `Manual sync is limited to once every 3 hours. Please wait ${timeStr} before syncing manually again. (Automatic sync on solve is still active).`,
            false
          );
          return;
        }

        // Show the info dialog box
        showCustomAlert(
          'SYNCING...',
          'Firestore pull initiated! Note: The extension automatically saves solves to the cloud in real-time when you solve a problem.',
          true
        );

        cloudBtnSync.textContent = '🔄 SYNCING...';
        cloudBtnSync.disabled = true;

        const success = await init(true);

        if (success) {
          chrome.storage.local.set({ lastManualSyncTime: now });
        }

        cloudBtnSync.textContent = '🔄 SYNC NOW';
        cloudBtnSync.disabled = false;
      });
    });
  }

  // Google Login button
  const cloudBtnLogin = document.getElementById('cloud-btn-login');
  if (cloudBtnLogin) {
    cloudBtnLogin.addEventListener('click', () => {
      if (FIREBASE_CONFIG.googleClientId === 'YOUR_GOOGLE_CLIENT_ID' || FIREBASE_CONFIG.projectId === 'YOUR_FIREBASE_PROJECT_ID') {
        showCustomAlert('CONFIGURATION ERROR', 'Please configure your Firebase credentials in firebase-sync.js first!', false);
        return;
      }

      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth` +
        `?client_id=${encodeURIComponent(FIREBASE_CONFIG.googleClientId)}` +
        `&redirect_uri=${encodeURIComponent(FIREBASE_CONFIG.redirectUrl)}` +
        `&response_type=id_token` +
        `&scope=openid%20email%20profile` +
        `&nonce=${Math.random().toString(36).substring(2)}`;

      chrome.tabs.create({ url: authUrl });
    });
  }

  // Cloud Logout button
  const cloudBtnLogout = document.getElementById('cloud-btn-logout');
  if (cloudBtnLogout) {
    cloudBtnLogout.addEventListener('click', () => {
      showCustomConfirm(
        'DISCONNECT CLOUD', 
        'Disconnect from Firebase cloud sync? To prevent user mix-ups, your local storage history will be cleared (cloud history remains safe).', 
        false, 
        () => {
          chrome.storage.local.remove(['user', 'isCloudEnabled', 'firebase_token', 'firebase_refresh_token', 'firebase_expires_at', 'hasPulledFromCloud', 'lastManualSyncTime'], () => {
            chrome.storage.local.set({ problemLog: [] }, () => {
              updateCloudTabUI(null);
              ALL_PROBLEMS = [];
              render();
              if (typeof renderAnalytics === 'function') renderAnalytics([]);
              console.log('[DCT] Signed out (local session cleared, local log wiped).');
              location.reload();
            });
          });
        }
      );
    });
  }

  // ── Settings Tab Init ──────────────────────────────────────────────────────
  const settingsBtnTheme = document.getElementById('settings-btn-theme');
  if (settingsBtnTheme) {
    settingsBtnTheme.addEventListener('click', () => {
      const isLight = document.documentElement.classList.toggle('light-theme');
      chrome.storage.local.set({ theme: isLight ? 'light' : 'dark' });
      settingsBtnTheme.textContent = isLight ? 'Toggle Theme 🌙' : 'Toggle Theme ☀';
    });
  }

  const settingsBtnExport = document.getElementById('settings-btn-export');
  if (settingsBtnExport) {
    settingsBtnExport.addEventListener('click', () => {
      if (!ALL_PROBLEMS || !ALL_PROBLEMS.length) {
        showCustomAlert('INFO', 'No problems logged yet!', false);
        return;
      }
      downloadTxt(buildDetailedTxt(ALL_PROBLEMS), 'dct_detailed_log.txt');
    });
  }

  const settingsBtnClear = document.getElementById('settings-btn-clear');
  if (settingsBtnClear) {
    settingsBtnClear.addEventListener('click', () => {
      showCustomConfirm(
        '⚠️ DANGER ZONE',
        'This will permanently delete ALL your solved history both locally and on the cloud. Are you absolutely sure?',
        true,
        () => {
          chrome.storage.local.set({ problemLog: [] }, async () => {
            ALL_PROBLEMS = [];
            render();
            if (typeof renderAnalytics === 'function') renderAnalytics([]);
            
            chrome.storage.local.get(['isCloudEnabled', 'user'], async (result) => {
              if (result.isCloudEnabled && result.user?.id) {
                const titleEl = document.querySelector('.header-sub');
                if (titleEl) titleEl.textContent = 'CLEARING CLOUD RECORDS...';
                
                const cloudLog = await FirebaseSync.pullHistory(result.user.id).catch(() => []);
                for (const p of cloudLog) {
                  if (p.problemId) {
                    await FirebaseSync.deleteSolve(p.problemId, result.user.id).catch(() => {});
                  }
                }
                if (titleEl) titleEl.textContent = 'CLOUD DATABASE CLEARED';
              }
              showCustomAlert('SUCCESS', 'All data cleared successfully.', true);
            });
          });
        }
      );
    });
  }

  // ── Demo Data Generator ───────────────────────────────────────────────────
  const settingsBtnDemo = document.getElementById('settings-btn-demo');
  if (settingsBtnDemo) {
    settingsBtnDemo.addEventListener('click', () => {
      chrome.storage.local.get(['user', 'isCloudEnabled'], async (res) => {
        const user = res.user;
        const isCloudEnabled = res.isCloudEnabled;
        const userId = user?.id || 'gyVjCcPntNd9ijrslECh0x1aUjx2';
        const userEmail = user?.email || 'katakam.sripranav@gmail.com';
        
        if (!isCloudEnabled || !user || !user.id) {
          showCustomConfirm(
            'DEMO DATA',
            'You are not connected to Firebase Cloud Sync. Generating demo data will only save it locally. Do you want to proceed?',
            false,
            () => startDemoGeneration(false, userId, userEmail)
          );
        } else {
          startDemoGeneration(true, userId, userEmail);
        }
      });
    });
  }

  async function startDemoGeneration(syncToCloud, userId, userEmail) {
    // Show progress overlay
    const progressOverlay = document.getElementById('demo-progress-overlay');
    const progressBar = document.getElementById('demo-progress-bar');
    const progressText = document.getElementById('demo-progress-text');
    
    if (progressOverlay) progressOverlay.style.display = 'flex';
    if (progressBar) progressBar.style.width = '0%';
    if (progressText) progressText.textContent = '0 / 500 SOLVES SYNCED';

    // 1. Generate 500 solves (3-5 per day)
    const solves = [];
    const topics = [
      "Two Sum", "Reverse Linked List", "Binary Search", "LRU Cache", "Merge Sort", 
      "Dynamic Programming", "Dijkstra Algorithm", "Kruskal MST", "N-Queens", 
      "Median of Two Sorted Arrays", "Longest Palindromic Substring", "Container With Most Water", 
      "3Sum", "Letter Combinations", "Valid Parentheses", "Merge k Sorted Lists", 
      "Search in Rotated Array", "Trapping Rain Water", "Group Anagrams", "Maximum Subarray", 
      "Spiral Matrix", "Jump Game", "Merge Intervals", "Insert Interval", "Unique Paths", 
      "Minimum Path Sum", "Climbing Stairs", "Edit Distance", "Simplify Path", "Word Search", 
      "Largest Rectangle", "Maximal Rectangle", "Partition List", "Decode Ways", 
      "Unique BST", "Validate BST", "Symmetric Tree", "Level Order Traversal", 
      "Path Sum", "Flatten Binary Tree", "Distinct Subsequences", "Best Time Stock", 
      "Word Ladder", "Single Number", "Word Break", "Linked List Cycle", 
      "Intersection of Lists", "Course Schedule", "Trie Implementation", "Word Search II", 
      "House Robber II", "Kth Largest Element", "Combination Sum III", "Maximal Square", 
      "Invert Binary Tree", "Happy Number", "Product of Array", "Sliding Window Maximum", 
      "Valid Anagram", "Binary Tree Paths", "Ugly Number II", "Missing Number", 
      "Perfect Squares", "Find Duplicate Number", "Bulls and Cows", "Longest Increasing Subsequence"
    ];
    
    const platforms = ['leetcode', 'codeforces', 'hackerrank', 'codechef'];
    const difficulties = {
      leetcode: ['Easy', 'Medium', 'Hard'],
      hackerrank: ['Easy', 'Medium', 'Hard'],
      codechef: ['Easy', 'Medium', 'Hard'],
      codeforces: ['Easy', 'Medium', 'Hard', 'Expert']
    };

    let count = 0;
    let dayOffset = 0;
    const today = new Date();

    while (count < 500) {
      const dailyCount = Math.min(1 + Math.floor(Math.random() * 2), 500 - count);
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() - dayOffset);
      
      for (let i = 0; i < dailyCount; i++) {
        const platform = platforms[Math.floor(Math.random() * platforms.length)];
        const diffs = difficulties[platform];
        const difficulty = diffs[Math.floor(Math.random() * diffs.length)];
        const topic = topics[Math.floor(Math.random() * topics.length)];
        
        let problemId = '';
        let name = '';
        let url = '';
        
        if (platform === 'leetcode') {
          const slug = topic.toLowerCase().replace(/[^a-z0-9]+/g, '-');
          problemId = `${slug}-${count + 1}`;
          name = `${topic} #${count + 1}`;
          url = `https://leetcode.com/problems/${slug}-${count + 1}`;
        } else if (platform === 'codeforces') {
          const contestId = Math.floor(Math.random() * 500) + 1500;
          const index = ['A', 'B', 'C', 'D', 'E', 'F'][Math.floor(Math.random() * 6)];
          problemId = `${contestId}-${index}-${count + 1}`;
          name = `CF Round ${contestId} Problem ${index}: ${topic} #${count + 1}`;
          url = `https://codeforces.com/contest/${contestId}/problem/${index}`;
        } else if (platform === 'hackerrank') {
          const slug = topic.toLowerCase().replace(/[^a-z0-9]+/g, '-');
          problemId = `${slug}-${count + 1}`;
          name = `HackerRank: ${topic} #${count + 1}`;
          url = `https://www.hackerrank.com/challenges/${slug}-${count + 1}`;
        } else if (platform === 'codechef') {
          const code = topic.toUpperCase().replace(/[^A-Z0-9]+/g, '_');
          problemId = `${code}_${count + 1}`;
          name = `CodeChef: ${topic} #${count + 1}`;
          url = `https://www.codechef.com/problems/${code}_${count + 1}`;
        }

        const solveHour = 9 + Math.floor(Math.random() * 14);
        const solveMin = Math.floor(Math.random() * 60);
        const solveSec = Math.floor(Math.random() * 60);
        
        const solveDate = new Date(targetDate);
        solveDate.setHours(solveHour, solveMin, solveSec);
        
        const openDate = new Date(solveDate);
        openDate.setMinutes(solveMin - (10 + Math.floor(Math.random() * 30)));
        
        solves.push({
          problemId,
          url,
          name,
          difficulty,
          platform,
          openedAt: openDate.toISOString(),
          timestamp: solveDate.toISOString()
        });
        
        count++;
      }
      dayOffset++;
    }

    // 2. Upload solves to Firebase Firestore in batches if cloud sync enabled
    if (syncToCloud) {
      console.log('[DCT] Pushing 500 demo solves to Firestore...');
      const batchSize = 15;
      for (let i = 0; i < solves.length; i += batchSize) {
        const batch = solves.slice(i, i + batchSize);
        try {
          await Promise.all(batch.map(async (solve) => {
            await FirebaseSync.pushSolve(solve, userId, userEmail);
          }));
        } catch (err) {
          console.error('[DCT] Firestore batch push failed:', err);
        }
        
        const progressPercent = Math.round(((i + batch.length) / solves.length) * 100);
        if (progressBar) progressBar.style.width = `${progressPercent}%`;
        if (progressText) progressText.textContent = `${i + batch.length} / ${solves.length} SOLVES SYNCED`;
        
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }

    // 3. Merge into local chrome.storage.local
    chrome.storage.local.get(['problemLog'], (resultLog) => {
      const existingLog = resultLog.problemLog || [];
      
      const mergedLocal = [...existingLog];
      const mergedAll = [...existingLog];
      
      const localIds = new Set(existingLog.map(p => p.problemId));
      const allIds = new Set(existingLog.map(p => p.problemId));
      
      const todayStr = today.toLocaleDateString('en-CA');
      
      solves.forEach(solve => {
        const solveDay = new Date(solve.timestamp).toLocaleDateString('en-CA');
        const isToday = (solveDay === todayStr);
        
        // Local storage list (keeps popup clean if sync to cloud is active)
        if (!syncToCloud || isToday) {
          if (!localIds.has(solve.problemId)) {
            mergedLocal.push(solve);
            localIds.add(solve.problemId);
          }
        }
        
        // Full list for the dashboard viewer
        if (!allIds.has(solve.problemId)) {
          mergedAll.push(solve);
          allIds.add(solve.problemId);
        }
      });
      
      mergedLocal.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      mergedAll.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      chrome.storage.local.set({ problemLog: mergedLocal }, () => {
        ALL_PROBLEMS = mergedAll;
        render();
        if (typeof renderAnalytics === 'function') renderAnalytics(ALL_PROBLEMS);
        
        if (progressOverlay) progressOverlay.style.display = 'none';
        showCustomAlert('SUCCESS', 'Demo data generated successfully! 500 solved problems synced.', true);
      });
    });
  }

  // ── devMode Visibility & Sync Logic ────────────────────────────────────────
  function updateDevVisibility() {
    chrome.storage.local.get(['devMode'], (result) => {
      const devSection = document.getElementById('settings-dev-section');
      const dangerSection = document.getElementById('settings-danger-section');
      if (result.devMode) {
        if (devSection) devSection.style.display = 'block';
        if (dangerSection) dangerSection.style.display = 'block';
      } else {
        if (devSection) devSection.style.display = 'none';
        if (dangerSection) dangerSection.style.display = 'none';
      }
    });
  }

  updateDevVisibility();

  // Listen for storage changes in real-time
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && changes.devMode) {
      updateDevVisibility();
    }
  });

  // ── 30D / 90D Trend Buttons Not Working Fix ───────────────────────────────
  // Move tab listener attachment outside renderAnalytics so it only fires once
  document.querySelectorAll('.trend-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.trend-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      if (typeof ALL_PROBLEMS !== 'undefined')
        renderTrend(ALL_PROBLEMS, parseInt(btn.dataset.days));
    });
  });

  init();
});

// ── TAB SWITCHING ───────────────────────────────────────────────────────────
function switchTab(tabName) {
  // Hide all sections
  document.querySelectorAll('.tab-section').forEach(sec => sec.classList.add('hidden'));
  // Show target section
  const targetSec = document.getElementById('tab-' + tabName);
  if (targetSec) targetSec.classList.remove('hidden');

  // Update active state in nav items
  document.querySelectorAll('.nav-item').forEach(item => {
    if (item.getAttribute('data-tab') === tabName) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  // Store in sessionStorage
  sessionStorage.setItem('activeTab', tabName);
}

// ── CLOUD UI UPDATE ─────────────────────────────────────────────────────────
function updateCloudTabUI(user) {
  const badgeConnected = document.getElementById('cloud-tab-badge');
  const badgeOffline = document.getElementById('cloud-tab-offline-badge');
  const emailVal = document.getElementById('cloud-tab-email');
  const lastSyncVal = document.getElementById('cloud-tab-last-sync');
  const btnLogin = document.getElementById('cloud-btn-login');
  const btnLogout = document.getElementById('cloud-btn-logout');

  const cloudOnSvg = document.querySelector('.nav-icon-cloud-on');
  const cloudOffSvg = document.querySelector('.nav-icon-cloud-off');

  if (user) {
    if (badgeConnected) badgeConnected.style.display = 'flex';
    if (badgeOffline) badgeOffline.style.display = 'none';
    if (emailVal) emailVal.textContent = user.email || 'online';
    if (lastSyncVal) lastSyncVal.textContent = new Date().toLocaleString();
    if (btnLogin) btnLogin.classList.add('hidden');
    if (btnLogout) btnLogout.classList.remove('hidden');

    if (cloudOnSvg) cloudOnSvg.style.display = 'block';
    if (cloudOffSvg) cloudOffSvg.style.display = 'none';
  } else {
    if (badgeConnected) badgeConnected.style.display = 'none';
    if (badgeOffline) badgeOffline.style.display = 'flex';
    if (emailVal) emailVal.textContent = 'offline';
    if (lastSyncVal) lastSyncVal.textContent = 'N/A';
    if (btnLogin) btnLogin.classList.remove('hidden');
    if (btnLogout) btnLogout.classList.add('hidden');

    if (cloudOnSvg) cloudOnSvg.style.display = 'none';
    if (cloudOffSvg) cloudOffSvg.style.display = 'block';
  }
}

// ── EXPORT DETAILED LOG UTILS ───────────────────────────────────────────────
function downloadTxt(content, filename) {
  const blob = new Blob([content], { type: 'text/plain' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function buildDetailedTxt(log) {
  const now  = new Date();
  const day  = now.toLocaleString('en', { weekday: 'long' });
  const W    = 70;
  const line = '═'.repeat(W);

  let txt  = `╔${line}╗\n`;
  txt += `║  DCT — DETAILED LOG${' '.repeat(W - 20)}║\n`;
  txt += `║  Day  : ${day.padEnd(W - 9)}║\n`;
  txt += `║  Date : ${new Date().toLocaleDateString().padEnd(W - 9)}║\n`;
  txt += `║  Total: ${String(log.length).padEnd(W - 9)}║\n`;
  txt += `╚${line}╝\n\n`;

  log.forEach((p, i) => {
    const timeTaken = fmtTimeTaken(p.openedAt, p.timestamp) || 'N/A';
    txt += `${i + 1}.) 🟢 ${p.name}\n`;
    txt += `           ├── 🎯 Difficulty : ${p.difficulty || 'N/A'}\n`;
    txt += `           ├── 🕐 Time       : ${fmtTime(p.timestamp)}\n`;
    txt += `           ├── ⏱️ Time Taken : ${timeTaken}\n`;
    txt += `           └── 🔗 URL        : ${p.url}\n\n`;
  });
  return txt;
}

// ── ANALYTICS RENDERING ──────────────────────────────────────────────────────
const DIFF_COLOR = { Easy:'#00e676', Medium:'#ffb300', Hard:'#ff4060', Expert:'#cc88ff' };

function renderAnalytics(problems) {
  const safeProbs = problems || [];
  const today = new Date().toLocaleDateString('en-CA');

  // Today count
  const todayCount = safeProbs.filter(p => {
    return new Date(p.timestamp).toLocaleDateString('en-CA') === today;
  }).length;
  const el = document.getElementById('s-today');
  if (el) el.textContent = todayCount;

  // Synced badge
  const badge = document.getElementById('synced-badge');
  if (badge) badge.style.display = safeProbs.length > 0 ? 'flex' : 'none';

  // Stats
  const elStreak = document.getElementById('s-streak');
  if (elStreak) elStreak.textContent = calcStreak(safeProbs);

  const elAvg = document.getElementById('s-avg');
  if (elAvg) elAvg.textContent = calcAvg(safeProbs);

  const elTotal = document.getElementById('s-total');
  if (elTotal) elTotal.textContent = safeProbs.length;

  // ── DONUT ──
  const diffKeys = ['Easy','Medium','Hard','Expert'];
  const counts = { Easy:0, Medium:0, Hard:0, Expert:0 };
  safeProbs.forEach(p => { if (counts[p.difficulty] !== undefined) counts[p.difficulty]++; });
  const total = safeProbs.length;

  const donutSvg = document.getElementById('donut-svg');
  const donutTotal = document.getElementById('donut-total');
  const donutLegend = document.getElementById('donut-legend');
  if (donutSvg) {
    if (donutTotal) donutTotal.textContent = total;
    if (total === 0) {
      donutSvg.innerHTML = `<circle cx="55" cy="55" r="42" fill="none" stroke="rgba(255,255,255,0.04)" stroke-width="14"/>`;
      if (donutLegend) donutLegend.innerHTML = '<div style="color:var(--dim); font-size:11px; text-align:center; padding:10px 0;">No data</div>';
    } else {
      const cx=55, cy=55, r=42, sw=14;
      let offset = -Math.PI/2; // start top
      let paths = '';
      const gaps = 4;

      diffKeys.forEach(k => {
        const count = counts[k];
        if (!count) return;
        const frac = count/total;
        const angle = frac * 2 * Math.PI;
        const gapAngle = gaps/r;
        const drawAngle = Math.max(0, angle - gapAngle);

        const x1 = cx + r*Math.cos(offset);
        const y1 = cy + r*Math.sin(offset);
        const x2 = cx + r*Math.cos(offset + drawAngle);
        const y2 = cy + r*Math.sin(offset + drawAngle);
        const large = drawAngle > Math.PI ? 1 : 0;

        paths += `<path d="M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}"
          fill="none" stroke="${DIFF_COLOR[k]}" stroke-width="${sw}"
          stroke-linecap="round" opacity="0.9"/>`;
        offset += angle;
      });

      // bg ring
      donutSvg.innerHTML = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="rgba(255,255,255,0.04)" stroke-width="${sw}"/>` + paths;

      if (donutLegend) {
        donutLegend.innerHTML = diffKeys.map(k => {
          const count = counts[k];
          const pct = total ? Math.round(count/total*100) : 0;
          return `<div class="leg-row">
            <span class="leg-sq" style="background:${DIFF_COLOR[k]}"></span>
            <span class="leg-name">${k}</span>
            <span class="leg-val">${count}</span>
            <span class="leg-pct">(${pct}%)</span>
          </div>`;
        }).join('');
      }
    }
  }

  // ── TREND CHART ──
  renderTrend(safeProbs, 7);

  // ── PLATFORM BREAKDOWN ──
  const platCounts = {};
  safeProbs.forEach(p => { platCounts[p.platform] = (platCounts[p.platform]||0)+1; });
  const platKeys = Object.keys(platCounts).sort((a,b)=>platCounts[b]-platCounts[a]);
  const maxPlat = platKeys.length ? platCounts[platKeys[0]] : 1;

  const platRows = document.getElementById('plat-rows');
  if (platRows) {
    if (total === 0) {
      platRows.innerHTML = `<div class="empty" style="padding:20px 0;font-size:11px;">No solves logged.</div>`;
    } else if (platKeys.length) {
      platRows.innerHTML = platKeys.map(k => {
        const cnt = platCounts[k];
        const pct = Math.round(cnt/total*100);
        const w = Math.round(cnt/maxPlat*100);
        return `<div class="plat-row">
          <span class="plat-name">${PLAT_LABEL[k]||k}</span>
          <div class="plat-bar-wrap"><div class="plat-bar" style="width:${w}%;background:${PLAT_COLOR[k]||'#888'}"></div></div>
          <span class="plat-count">${cnt}</span>
          <span class="plat-pct">${pct}%</span>
        </div>`;
      }).join('');
    }
  }

  // ── RECENT SOLVES ──
  const recentList = document.getElementById('recent-list');
  if (recentList) {
    if (total === 0) {
      recentList.innerHTML = `<div class="empty" style="padding:20px 0;font-size:11px;">No solves logged.</div>`;
    } else {
      const recent = [...safeProbs].sort((a,b)=>new Date(b.timestamp)-new Date(a.timestamp)).slice(0,5);
      recentList.innerHTML = recent.map(p => {
        const elapsed = Date.now() - new Date(p.timestamp).getTime();
        const mins = Math.floor(elapsed/60000);
        const hrs  = Math.floor(mins/60);
        const days = Math.floor(hrs/24);
        const timeStr = days>0 ? `${days}d` : hrs>0 ? `${hrs}h` : `${mins}m`;

        const platColor = PLAT_COLOR[p.platform]||'#888';
        const diffColor = DIFF_COLOR[p.difficulty]||'#6a8faa';
        const diffBg    = diffColor+'18';
        const diffBorder= diffColor+'30';

        return `<div class="recent-row">
          <div class="recent-plat-icon" style="background:${platColor}18;border:1px solid ${platColor}28;">
            <span style="color:${platColor}">${(p.platform||'?')[0].toUpperCase()}</span>
          </div>
          <span class="recent-name">${escapeHTML(p.name||p.problemId||'?')}</span>
          ${p.difficulty ? `<span class="recent-diff" style="background:${diffBg};color:${diffColor};border:1px solid ${diffBorder}">${p.difficulty}</span>` : ''}
          <span class="recent-plat-lbl">${PLAT_LABEL[p.platform]||p.platform||'?'}</span>
          <span class="recent-time">${timeStr} ago</span>
          <span class="recent-check">✓</span>
        </div>`;
      }).join('');
    }
  }

  // ── EXTENDED CHARTS RENDERING ──
  renderHeatmap(safeProbs);
  renderTimeOfDay(safeProbs);
  renderDifficultyHistory(safeProbs);
}

function renderTrend(problems, days) {
  const svg = document.getElementById('trend-svg');
  if (!svg) return;

  const safeProbs = problems || [];

  // Build date buckets
  const buckets = {};
  for (let i=days-1; i>=0; i--) {
    const d = new Date();
    d.setDate(d.getDate()-i);
    buckets[d.toLocaleDateString('en-CA')] = 0;
  }
  safeProbs.forEach(p => {
    const k = new Date(p.timestamp).toLocaleDateString('en-CA');
    if (buckets[k] !== undefined) buckets[k]++;
  });

  const vals = Object.values(buckets);
  const labels = Object.keys(buckets);
  const maxVal = Math.max(...vals, 1);
  
  // Calculate dynamic width W from parent container
  const W = svg.parentElement.clientWidth || 500;
  const H = 100, pad = 8;
  const denom = vals.length > 1 ? vals.length - 1 : 1;
  const xs = vals.map((_,i) => pad + (i/denom)*(W-pad*2));
  const ys = vals.map(v => H - pad - (v/maxVal)*(H-pad*2));

  // area fill path
  const areaPath = `M ${xs[0]} ${ys[0]} ` +
    xs.slice(1).map((x,i)=>`L ${x} ${ys[i+1]}`).join(' ') +
    ` L ${xs[xs.length-1]} ${H} L ${xs[0]} ${H} Z`;

  // line path
  const linePath = `M ${xs[0]} ${ys[0]} ` + xs.slice(1).map((x,i)=>`L ${x} ${ys[i+1]}`).join(' ');

  // x-axis labels (show ~5)
  const step = Math.max(1, Math.floor(labels.length/5));
  const axisLabels = labels.map((lbl,i) => {
    if (i % step !== 0 && i !== labels.length-1) return '';
    const d = new Date(lbl+'T00:00:00');
    const str = d.toLocaleDateString('en',{month:'short',day:'numeric'});
    return `<text x="${xs[i]}" y="${H+14}" text-anchor="middle" fill="#344d62" font-size="8" font-family="Share Tech Mono, monospace">${str}</text>`;
  }).join('');

  svg.setAttribute('viewBox', `0 0 ${W} ${H+18}`);
  svg.innerHTML = `
    <defs>
      <linearGradient id="tg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#00d4ff" stop-opacity="0.3"/>
        <stop offset="100%" stop-color="#00d4ff" stop-opacity="0"/>
      </linearGradient>
    </defs>
    ${axisLabels}
    <path d="${areaPath}" fill="url(#tg)"/>
    <path d="${linePath}" fill="none" stroke="#00d4ff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
    ${xs.map((x,i)=>`<circle class="trend-dot" cx="${x}" cy="${ys[i]}" r="3.5" fill="#00d4ff" opacity="${vals[i]>0?1:0.2}">
      <title>${vals[i]} solved on ${new Date(labels[i] + 'T00:00:00').toLocaleDateString('en', {month:'short', day:'numeric'})}</title>
    </circle>`).join('')}
  `;
}

// ── HEATMAP CALENDAR RENDERING ───────────────────────────────────────────────
function renderHeatmap(problems) {
  const container = document.getElementById('heatmap-grid');
  if (!container) return;
  container.innerHTML = '';

  // Get date range: 12 weeks ago (aligned to Sunday)
  const today = new Date();
  const currentDayOfWeek = today.getDay(); // 0 is Sunday, 6 is Saturday
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - currentDayOfWeek - (11 * 7)); // Sunday 11 weeks ago

  // Create dates bucket
  const dateMap = {};
  const tempDate = new Date(startDate);
  while (tempDate <= today) {
    const key = tempDate.toLocaleDateString('en-CA');
    dateMap[key] = 0;
    tempDate.setDate(tempDate.getDate() + 1);
  }

  // Count solves per day
  problems.forEach(p => {
    const key = dayKey(p.timestamp);
    if (dateMap[key] !== undefined) {
      dateMap[key]++;
    }
  });

  const totalDays = 12 * 7;
  let html = '';
  const renderDate = new Date(startDate);
  for (let i = 0; i < totalDays; i++) {
    const key = renderDate.toLocaleDateString('en-CA');
    const count = dateMap[key] || 0;
    
    // Determine level: 0, 1, 2, 3, 4
    let level = 0;
    if (count > 0) {
      if (count === 1) level = 1;
      else if (count === 2) level = 2;
      else if (count === 3) level = 3;
      else level = 4;
    }
    
    const dateLabel = renderDate.toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' });
    const tooltip = `${count} solve${count !== 1 ? 's' : ''} on ${dateLabel}`;
    
    html += `<div class="heatmap-cell heatmap-level-${level}" title="${tooltip}"></div>`;
    renderDate.setDate(renderDate.getDate() + 1);
  }
  container.innerHTML = html;
  container.style.gridAutoFlow = 'column';
}

// ── TIME OF DAY DISTRIBUTION RENDERING ────────────────────────────────────────
function renderTimeOfDay(problems) {
  const container = document.getElementById('tod-chart');
  if (!container) return;
  container.innerHTML = '';

  const hourBuckets = Array(24).fill(0);
  problems.forEach(p => {
    const date = new Date(parseTS(p.timestamp));
    const hr = date.getHours();
    hourBuckets[hr]++;
  });

  const maxVal = Math.max(...hourBuckets, 1);
  let html = '';
  for (let hr = 0; hr < 24; hr++) {
    const count = hourBuckets[hr];
    const pct = (count / maxVal) * 100;
    const hourLabel = hr === 0 ? '12 AM' : hr === 12 ? '12 PM' : hr > 12 ? `${hr - 12} PM` : `${hr} AM`;
    const tooltip = `${count} solve${count !== 1 ? 's' : ''} at ${hourLabel}`;
    html += `<div class="tod-bar" style="height:${pct}%;" data-count="${count}" title="${tooltip}"></div>`;
  }
  container.innerHTML = html;
}

// ── DIFFICULTY HISTORY RENDERING ──────────────────────────────────────────────
function renderDifficultyHistory(problems) {
  const container = document.getElementById('diff-history-list');
  if (!container) return;
  container.innerHTML = '';

  const recent = [...problems].sort((a,b) => parseTS(b.timestamp) - parseTS(a.timestamp)).slice(0, 10);
  if (!recent.length) {
    container.innerHTML = '<div class="empty">NO HISTORY AVAILABLE</div>';
    return;
  }

  container.innerHTML = recent.map(p => {
    return `
      <div class="diff-history-item">
        <a class="prob-link diff-history-title" href="${escapeHTML(p.url)}" target="_blank">${escapeHTML(p.name)}</a>
        <div style="display:flex; align-items:center; gap:12px;">
          <span class="diff-badge ${diffClass(p.difficulty)}">${p.difficulty || 'N/A'}</span>
          <span style="font-family:'Share Tech Mono', monospace; font-size:11px; color:var(--dim);">${new Date(parseTS(p.timestamp)).toLocaleDateString()}</span>
        </div>
      </div>`;
  }).join('');
}
