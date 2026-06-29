// ─────────────────────────────────────────────────────────────────────────────
//  DCT — popup.js  (v2.1)
// ─────────────────────────────────────────────────────────────────────────────

// ── UTILITIES ─────────────────────────────────────────────────────────────────

function parseTS(ts) {
  if (!ts) return Date.now();
  const d = new Date(ts);
  return isNaN(d.getTime()) ? Date.now() : d.getTime();
}

function formatDate(ts) {
  const d   = new Date(parseTS(ts));
  const day = d.getDate();
  const sfx = ['th','st','nd','rd'];
  const v   = day % 100;
  const ord = sfx[(v - 20) % 10] || sfx[v] || sfx[0];
  return `${day}${ord} ${d.toLocaleString('en',{month:'long'})}, ${d.getFullYear()}`;
}

function formatTime(ts) {
  return new Date(parseTS(ts))
    .toLocaleTimeString('en', { hour:'2-digit', minute:'2-digit', hour12: false });
}

function formatTimeTaken(openedAt, solvedAt) {
  if (!openedAt || !solvedAt) return null;
  const diff = Math.abs(parseTS(solvedAt) - parseTS(openedAt));
  const mins = Math.floor(diff / 60000);
  const secs = Math.floor((diff % 60000) / 1000);
  if (mins === 0) return `${secs}s`;
  if (mins < 60)  return `${mins}m ${secs}s`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m`;
}

function todayKey() {
  return new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD in local time
}

function getItemDay(item) {
  return new Date(parseTS(item.timestamp)).toLocaleDateString('en-CA');
}

function diffClass(d) {
  if (!d) return 'badge-na';
  if (/easy/i.test(d))   return 'badge-easy';
  if (/medium/i.test(d)) return 'badge-medium';
  if (/hard/i.test(d))   return 'badge-hard';
  if (/expert/i.test(d)) return 'badge-expert';
  return 'badge-na';
}

function platformIcon(p) {
  const icons = {
    leetcode:   '🟡',
    hackerrank: '🟢',
    codechef:   '🟤',
    codeforces: '🔵',
  };
  return icons[p] || '⚪';
}

// ── STATS CALCULATIONS ────────────────────────────────────────────────────────

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

// ── DOWNLOAD HELPERS ──────────────────────────────────────────────────────────

function downloadTxt(content, filename) {
  const blob = new Blob([content], { type: 'text/plain' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function buildUrlTxt(log) {
  const now = new Date();
  let txt   = `DCT — URL LIST\n`;
  txt += `Generated : ${now.toLocaleString()}\n`;
  txt += `${'═'.repeat(70)}\n\n`;
  log.forEach((p, i) => {
    txt += `${i + 1}. ${p.url}\n`;
  });
  return txt;
}

function buildDetailedTxt(log) {
  const now  = new Date();
  const day  = now.toLocaleString('en', { weekday: 'long' });
  const W    = 70;
  const line = '═'.repeat(W);

  let txt  = `╔${line}╗\n`;
  txt += `║  DCT — DETAILED LOG${' '.repeat(W - 40)}║\n`;
  txt += `║  Day  : ${day.padEnd(W - 27)}║\n`;
  txt += `║  Date : ${formatDate(now).padEnd(W - 27)}║\n`;
  txt += `║  Time : ${formatTime(now).padEnd(W - 27)}║\n`;
  txt += `║  Total: ${String(log.length).padEnd(W - 27)}║\n`;
  txt += `╚${line}╝\n\n`;

  log.forEach((p, i) => {
    const timeTaken = formatTimeTaken(p.openedAt, p.timestamp) || 'N/A';
    txt += `${i + 1}.) 🟢 ${p.name}\n`;
    txt += `           ├── 🎯 Difficulty : ${p.difficulty || 'N/A'}\n`;
    txt += `           ├── 🕐 Time       : ${formatTime(p.timestamp)}\n`;
    txt += `           ├── ⏱  Time Taken : ${timeTaken}\n`;
    txt += `           ├── 📅 Date       : ${formatDate(p.timestamp)}\n`;
    txt += `           ├── 🌐 Platform   : ${(p.platform || 'unknown').toUpperCase()}\n`;
    txt += `           └── 🔗 URL        : ${p.url}\n\n`;
  });

  return txt;
}

// ── RENDER PROBLEM LIST ───────────────────────────────────────────────────────

function renderList(log) {
  const list = document.getElementById('problem-list');
  list.innerHTML = '';

  const todayItems = log.filter(p => getItemDay(p) === todayKey());

  if (!todayItems.length) {
    list.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">📡</span>
        NO SIGNALS DETECTED YET.<br/>SOLVE A PROBLEM TO BEGIN TRACKING.
      </div>`;
    return;
  }

  // Sort today's items to show the newest at the top
  const sortedToday = [...todayItems].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  sortedToday.forEach((item) => {
    const timeTaken = formatTimeTaken(item.openedAt, item.timestamp);
    const div = document.createElement('div');
    div.className = 'problem-item';
    const escapedName = escapeHTML(item.name);
    div.innerHTML = `
      <div class="problem-name" title="${escapedName}">
        ${platformIcon(item.platform)} ${escapedName}
      </div>
      <div class="problem-meta">
        <span class="badge ${diffClass(item.difficulty)}">${item.difficulty || 'N/A'}</span>
        <span class="meta-dot">·</span>
        <span class="meta-text">${formatDate(item.timestamp)}</span>
        <span class="meta-dot">·</span>
        <span class="meta-text">${formatTime(item.timestamp)}</span>
        ${timeTaken ? `<span class="meta-time-taken">⏱ ${timeTaken}</span>` : ''}
      </div>`;
    list.appendChild(div);
  });
}

// ── RENDER STATS ──────────────────────────────────────────────────────────────

function renderStats(log) {
  const todayCount = log.filter(p => getItemDay(p) === todayKey()).length;
  const streak     = calcStreak(log);
  
  document.getElementById('stat-today').textContent  = todayCount;
  document.getElementById('stat-avg').textContent    = calcAvg(log);
  document.getElementById('stat-streak').textContent = streak;
  document.getElementById('total-count').textContent = `TOTAL: ${log.length}`;

  // ── STREAK FLAME LOGIC ──
  const flame = document.getElementById('flame-svg');
  const label = document.getElementById('streak-days-label');
  
  if (flame) {
    flame.classList.remove('flame-active', 'flame-cold', 'flame-warm', 'flame-hot');
    if (streak === 0) {
      flame.classList.add('flame-cold');
    } else {
      flame.classList.add('flame-active');
      if (streak >= 7) flame.classList.add('flame-hot');
      else flame.classList.add('flame-warm');
    }
  }
  if (label) label.textContent = streak === 1 ? 'day' : 'days';

  // ── PLATFORM DISTRIBUTION LOGIC ──
  const total = log.length;
  const platforms = {
    leetcode:   log.filter(p => p.platform === 'leetcode').length,
    codeforces: log.filter(p => p.platform === 'codeforces').length,
    codechef:   log.filter(p => p.platform === 'codechef').length,
    hackerrank: log.filter(p => p.platform === 'hackerrank').length
  };

  const updateSeg = (id, key, cls) => {
    const pct = total ? Math.round((platforms[key] / total) * 100) : 0;
    document.querySelector(`.seg-${id}`).style.width = pct + '%';
    document.getElementById(`leg-${id}`).textContent = pct + '%';
  };

  updateSeg('lc', 'leetcode');
  updateSeg('cf', 'codeforces');
  updateSeg('cc', 'codechef');
  updateSeg('hr', 'hackerrank');
}

// ── CLOUD AUTH ────────────────────────────────────────────────────────────────

function updateAuthUI(user, isSyncing = false) {
  const badge   = document.getElementById('cloud-badge');
  const status  = document.getElementById('cloud-status-text');
  const email   = document.getElementById('user-email');
  const loginBtn  = document.getElementById('btn-login');
  const logoutBtn = document.getElementById('btn-logout');

  if (user) {
    badge.classList.remove('offline');
    badge.classList.add('online');
    status.textContent = isSyncing ? 'SYNCING...' : 'SYNC ON';
    email.textContent  = user.email;
    loginBtn.classList.add('hidden');
    logoutBtn.classList.remove('hidden');
  } else {
    badge.classList.remove('online');
    badge.classList.add('offline');
    status.textContent = 'LOCAL ONLY';
    email.textContent  = 'offline';
    loginBtn.classList.remove('hidden');
    logoutBtn.classList.add('hidden');
  }
}

async function syncCloudData(userId) {
  if (!userId) return;
  
  // Get current user for UI update
  chrome.storage.local.get(['user'], async (r) => {
    updateAuthUI(r.user, true); 
    const cloudLog = await FirebaseSync.pullHistory(userId);
    
    chrome.storage.local.get(['problemLog', 'user'], (result) => {
      // 1. Deduplicate local log first
      const rawLocal = result.problemLog || [];
      const localLog = [];
      const localIds = new Set();
      rawLocal.forEach(p => {
        if (p.problemId && !localIds.has(p.problemId)) {
          localLog.push(p);
          localIds.add(p.problemId);
        }
      });

      let merged = [...localLog];
      let mergedIds = new Set(localIds);
      let addedCount = 0;

      cloudLog.forEach(cloudItem => {
        if (!cloudItem.problemId) return;
        if (!mergedIds.has(cloudItem.problemId)) {
          // Only merge cloud items from today — don't resurface cleared history into popup
          if (getItemDay(cloudItem) !== todayKey()) return;
          merged.push(cloudItem);
          mergedIds.add(cloudItem.problemId);
          addedCount++;
        }
      });

      if (addedCount > 0 || localLog.length !== rawLocal.length) {
        merged.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        chrome.storage.local.set({ problemLog: merged }, () => {
          renderStats(merged);
          renderList(merged);
          updateAuthUI(result.user, false);
        });
      } else {
        updateAuthUI(result.user, false);
      }
    });
  });
}

async function fetchUserInfo(token) {
  try {
    const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${token}` }
    });
    return await res.json();
  } catch (e) {
    logError('popup.js', 'Failed to fetch user info', { error: e.message });
    return null;
  }
}

async function handleLogin() {
  try {
    if (FIREBASE_CONFIG.googleClientId === 'YOUR_GOOGLE_CLIENT_ID' || FIREBASE_CONFIG.projectId === 'YOUR_FIREBASE_PROJECT_ID') {
      showPopupAlert('CONFIGURATION ERROR', 'Please configure your Firebase credentials in firebase-sync.js first!', false);
      return;
    }

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth` +
      `?client_id=${encodeURIComponent(FIREBASE_CONFIG.googleClientId)}` +
      `&redirect_uri=${encodeURIComponent(FIREBASE_CONFIG.redirectUrl)}` +
      `&response_type=id_token` +
      `&scope=openid%20email%20profile` +
      `&nonce=${Math.random().toString(36).substring(2)}`;

    console.log('[DCT] Opening Google Auth via Firebase Hosting Redirect...');
    // Send to background.js so it can track the tab ID for auto-close
    chrome.runtime.sendMessage({ action: 'start_auth', url: authUrl });

  } catch (e) {
    logError('popup.js', 'Login failed', { error: e.message });
    showPopupAlert('LOGIN FAILED', 'Login failed: ' + (e.message || 'Check your configuration'), false);
  }
}

function handleLogout() {
  // Clear local session and Firebase tokens
  chrome.storage.local.remove(['user', 'isCloudEnabled', 'firebase_token', 'firebase_refresh_token', 'firebase_expires_at'], () => {
    chrome.storage.local.set({ problemLog: [] }, () => {
      updateAuthUI(null);
      renderStats([]);
      renderList([]);
      console.log('[DCT] Signed out (local session cleared, local log wiped).');
    });
  });
}

// ── MAIN ──────────────────────────────────────────────────────────────────────

async function checkAndClearLog() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['lastClearTime', 'problemLog'], (result) => {
      const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD local
      
      if (!result.lastClearTime) {
        // First time: Initialize with today's date
        chrome.storage.local.set({ lastClearTime: today }, () => resolve());
        return;
      }

      if (result.lastClearTime !== today) {
        // Clear log and update time
        chrome.storage.local.set({ 
          problemLog: [],
          lastClearTime: today 
        }, () => {
          console.log('[DCT] New day detected (' + today + '). Log cleared automatically.');
          resolve();
        });
      } else {
        resolve();
      }
    });
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  // ── Load and Apply Theme ──────────────────────────────────────────────────
  chrome.storage.local.get(['theme'], (result) => {
    if (result.theme === 'light') {
      document.documentElement.classList.add('light-theme');
    }
  });

  await checkAndClearLog();

  chrome.storage.local.get(['problemLog', 'user', 'isCloudEnabled'], (result) => {
    const log = result.problemLog || [];
    renderStats(log);
    renderList(log);
    updateAuthUI(result.user);

    if (result.isCloudEnabled && result.user?.id) {
      syncCloudData(result.user.id);
    }
  });

  // ── Theme Switcher ─────────────────────────────────────────────────────────
  const btnTheme = document.getElementById('btn-theme');
  if (btnTheme) {
    btnTheme.addEventListener('click', () => {
      const isLight = document.documentElement.classList.toggle('light-theme');
      chrome.storage.local.set({ theme: isLight ? 'light' : 'dark' });
    });
  }

  // ── Cloud Listeners ────────────────────────────────────────────────────────
  document.getElementById('btn-login').addEventListener('click', handleLogin);
  document.getElementById('btn-logout').addEventListener('click', handleLogout);

  // ── Detailed .txt ──────────────────────────────────────────────────────────
  document.getElementById('btn-log').addEventListener('click', () => {
    chrome.storage.local.get(['problemLog'], (result) => {
      const log = result.problemLog || [];
      if (!log.length) return showPopupAlert('NO DATA', 'No problems logged yet!', false);
      downloadTxt(buildDetailedTxt(log), 'dct_detailed_log.txt');
    });
  });

  // ── View Full Database ─────────────────────────────────────────────────────
  document.getElementById('btn-db').addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('db-viewer.html') });
  });

  // ── Discord DM ─────────────────────────────────────────────────────────────
  document.getElementById('btn-discord').addEventListener('click', () => {
    chrome.storage.local.get(['problemLog'], (result) => {
      const log    = result.problemLog || [];
      const today  = log.filter(p => getItemDay(p) === todayKey());
      if (!today.length) return showPopupAlert('NO SOLVES', 'No problems solved today!', false);

      const now = new Date();
      let msg = `**DCT — Solved Today (${formatDate(now)})**\n`;
      msg += `Total: ${today.length} problem${today.length > 1 ? 's' : ''}\n\n`;
      today.forEach((p, i) => {
        msg += `${i + 1}. ${p.url}\n`;
      });

      navigator.clipboard.writeText(msg)
        .then(() => {
          showPopupAlert(
            'COPIED TO CLIPBOARD', 
            '✅ Solved URLs copied successfully!\n\nPaste them directly in your Discord DM.\n(Opening Discord...)', 
            true, 
            () => {
              window.open('https://discord.com/channels/@me', '_blank');
            }
          );
        })
        .catch(() => {
          showPopupAlert(
            'OPENING DISCORD', 
            'Paste your solved URLs in Discord:\n\n' + msg, 
            false, 
            () => {
              window.open('https://discord.com/channels/@me', '_blank');
            }
          );
        });
    });
  });

  // ── About toggle ───────────────────────────────────────────────────────────
  document.getElementById('about-toggle').addEventListener('click', () => {
    document.getElementById('about-body').classList.toggle('open');
    document.getElementById('about-arrow').classList.toggle('open');
  });
});

function showPopupAlert(title, message, isSuccess, onOk) {
  const modal = document.getElementById('custom-alert');
  const iconEl = document.getElementById('custom-alert-icon');
  const titleEl = document.getElementById('custom-alert-title');
  const messageEl = document.getElementById('custom-alert-message');
  const okBtn = document.getElementById('custom-alert-btn');
  
  if (!modal) return;
  
  iconEl.textContent = isSuccess ? '🏆' : '⚠️';
  titleEl.textContent = title;
  titleEl.style.color = isSuccess ? 'var(--green)' : 'var(--red)';
  titleEl.style.textShadow = isSuccess ? '0 0 10px rgba(0,255,136,0.3)' : '0 0 10px rgba(255,64,96,0.3)';
  messageEl.textContent = message;
  
  // Clone button to remove previous listeners
  const newOkBtn = okBtn.cloneNode(true);
  okBtn.parentNode.replaceChild(newOkBtn, okBtn);
  
  newOkBtn.addEventListener('click', () => {
    modal.style.display = 'none';
    if (onOk) onOk();
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