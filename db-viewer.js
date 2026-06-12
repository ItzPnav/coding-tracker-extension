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

// ── HELPERS ──────────────────────────────────────────────────────────────────
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
  document.getElementById('s-days').textContent   = activeDays.size;
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
          <a class="prob-link" href="${p.url}" target="_blank">${p.name}</a>
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
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>`;
  }).join('');
}

// ── LOAD ─────────────────────────────────────────────────────────────────────
async function init() {
  document.getElementById('footer-ts').textContent =
    'LOADED: ' + new Date().toLocaleTimeString('en', { hour:'2-digit', minute:'2-digit', hour12:false });

  const titleEl = document.querySelector('.header-sub');

  chrome.storage.local.get(['problemLog', 'user', 'isCloudEnabled'], async (result) => {
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
      if (titleEl) titleEl.textContent = 'SYNCING CLOUD DATABASE...';
      
      const cloudLog = await SupabaseSync.pullHistory(result.user.id);
      
      if (cloudLog && cloudLog.length > 0) {
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
      
      if (titleEl) titleEl.textContent = 'CLOUD DATABASE SYNCED · ALL PLATFORMS';
    }

    // Auto-open today
    const today = todayKey();
    if (ALL_PROBLEMS.some(p => dayKey(p.timestamp) === today)) {
      openDays.add(today);
    }
    
    render();
  });
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('filter-platform').addEventListener('change', render);
  document.getElementById('filter-diff').addEventListener('change', render);
  document.getElementById('filter-sort').addEventListener('change', render);
  document.getElementById('filter-search').addEventListener('input', render);

  // Close button
  const closeBtn = document.getElementById('btn-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => window.close());
  }

  // Event delegation for day toggles
  document.getElementById('db-container').addEventListener('click', (e) => {
    const header = e.target.closest('.day-header');
    if (header) {
      const day = header.getAttribute('data-day');
      if (day) toggleDay(day);
    }
  });

  init();
});
