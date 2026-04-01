// ─────────────────────────────────────────────────────────────────────────────
//  DCT — popup.js  (v2.0)
// ─────────────────────────────────────────────────────────────────────────────

// ── UTILITIES ─────────────────────────────────────────────────────────────────

function parseTS(ts) {
  // Handles both ISO strings (new) and legacy toLocaleString() values (old)
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
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function getItemDay(item) {
  return new Date(parseTS(item.timestamp)).toISOString().slice(0, 10);
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
  if (days[0] !== todayKey()) return 0;
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
  txt += `║  DCT — DETAILED LOG${' '.repeat(W - 20)}║\n`;
  txt += `║  Day  : ${day.padEnd(W - 9)}║\n`;
  txt += `║  Date : ${formatDate(now).padEnd(W - 9)}║\n`;
  txt += `║  Time : ${formatTime(now).padEnd(W - 9)}║\n`;
  txt += `║  Total: ${String(log.length).padEnd(W - 9)}║\n`;
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

  if (!log.length) {
    list.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">📡</span>
        NO SIGNALS DETECTED YET.<br/>SOLVE A PROBLEM TO BEGIN TRACKING.
      </div>`;
    return;
  }

  [...log].reverse().forEach((item) => {
    const timeTaken = formatTimeTaken(item.openedAt, item.timestamp);
    const div = document.createElement('div');
    div.className = 'problem-item';
    div.innerHTML = `
      <div class="problem-name" title="${item.name}">
        ${platformIcon(item.platform)} ${item.name}
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
  const today = log.filter(p => getItemDay(p) === todayKey()).length;
  document.getElementById('stat-today').textContent  = today;
  document.getElementById('stat-avg').textContent    = calcAvg(log);
  document.getElementById('stat-streak').textContent = calcStreak(log);
  document.getElementById('total-count').textContent = `TOTAL: ${log.length}`;
}

// ── MAIN ──────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.local.get(['problemLog'], (result) => {
    const log = result.problemLog || [];
    renderStats(log);
    renderList(log);
  });

  // ── URL .txt ───────────────────────────────────────────────────────────────
  document.getElementById('btn-url').addEventListener('click', () => {
    chrome.storage.local.get(['problemLog'], (result) => {
      const log = result.problemLog || [];
      if (!log.length) return alert('No problems logged yet!');
      downloadTxt(buildUrlTxt(log), 'dct_urls.txt');
    });
  });

  // ── Detailed .txt ──────────────────────────────────────────────────────────
  document.getElementById('btn-log').addEventListener('click', () => {
    chrome.storage.local.get(['problemLog'], (result) => {
      const log = result.problemLog || [];
      if (!log.length) return alert('No problems logged yet!');
      downloadTxt(buildDetailedTxt(log), 'dct_detailed_log.txt');
    });
  });

  // ── Discord DM ─────────────────────────────────────────────────────────────
  document.getElementById('btn-discord').addEventListener('click', () => {
    chrome.storage.local.get(['problemLog'], (result) => {
      const log    = result.problemLog || [];
      const today  = log.filter(p => getItemDay(p) === todayKey());
      if (!today.length) return alert('No problems solved today!');

      const now = new Date();
      let msg = `**DCT — Solved Today (${formatDate(now)})**\n`;
      msg += `Total: ${today.length} problem${today.length > 1 ? 's' : ''}\n\n`;
      today.forEach((p, i) => {
        msg += `${i + 1}. ${p.url}\n`;
      });

      navigator.clipboard.writeText(msg)
        .then(() => {
          alert('✅ Message copied to clipboard!\n\nPaste it in your Discord DM.\n(Opening Discord...)');
        })
        .catch(() => {
          alert('Opening Discord — paste your URLs there:\n\n' + msg);
        })
        .finally(() => {
          window.open('https://discord.com/channels/@me', '_blank');
        });
    });
  });

  // ── About toggle ───────────────────────────────────────────────────────────
  document.getElementById('about-toggle').addEventListener('click', () => {
    document.getElementById('about-body').classList.toggle('open');
    document.getElementById('about-arrow').classList.toggle('open');
  });

  // ── Clear log (triggered from popup if a clear button is added) ────────────
  const clearBtn = document.getElementById('clear-btn');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (confirm('Delete ALL logged problems? This cannot be undone.')) {
        chrome.storage.local.set({ problemLog: [] }, () => location.reload());
      }
    });
  }
});