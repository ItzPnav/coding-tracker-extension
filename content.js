// ─────────────────────────────────────────────────────────────────────────────
//  DCT — content.js  (v2.1)
//  Per-platform difficulty extraction + automatic log clearing + SPA support
// ─────────────────────────────────────────────────────────────────────────────

let PAGE_OPEN_TIME = new Date().toISOString(); // record when tab was opened
let lastUrl = window.location.href;
let alreadyLogged = false;
let lastHRResultState = ''; // tracks HackerRank result text to reset alreadyLogged on new submissions

// ─── DETECT PLATFORM ─────────────────────────────────────────────────────────
function getPlatform() {
  const host = window.location.hostname;
  if (host.includes('leetcode.com'))    return 'leetcode';
  if (host.includes('hackerrank.com'))  return 'hackerrank';
  if (host.includes('codechef.com'))    return 'codechef';
  if (host.includes('codeforces.com'))  return 'codeforces';
  return 'unknown';
}

const PLATFORM = getPlatform();

// Helper to safely access chrome.storage.local
function getStorage(keys) {
  return new Promise((resolve) => {
    if (typeof chrome === 'undefined' || !chrome.storage?.local) {
      resolve({});
      return;
    }
    chrome.storage.local.get(keys, (result) => {
      if (chrome.runtime.lastError) resolve({});
      else resolve(result || {});
    });
  });
}

// Helper to safely set chrome.storage.local
function setStorage(data) {
  return new Promise((resolve) => {
    if (typeof chrome === 'undefined' || !chrome.storage?.local) {
      resolve();
      return;
    }
    chrome.storage.local.set(data, () => {
      resolve();
    });
  });
}

// Extract slug from HackerRank URL (e.g. 'solve-me-first')
function getHackerRankSlug(urlStr) {
  try {
    const url = new URL(urlStr, window.location.origin);
    const path = url.pathname;
    const match = path.match(/\/challenges\/([^/]+)/);
    return match ? match[1] : null;
  } catch (e) {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  DIFFICULTY EXTRACTORS (one per platform)
// ─────────────────────────────────────────────────────────────────────────────

// ── LeetCode ─────────────────────────────────────────────────────────────────
function getLeetCodeDifficulty() {
  const el = document.querySelector(
    '[class*="text-difficulty-easy"], [class*="text-difficulty-medium"], [class*="text-difficulty-hard"]'
  );
  if (!el) return 'N/A';
  const txt = el.textContent.trim();
  if (/easy/i.test(txt))   return 'Easy';
  if (/medium/i.test(txt)) return 'Medium';
  if (/hard/i.test(txt))   return 'Hard';
  return 'N/A';
}

// ── HackerRank ───────────────────────────────────────────────────────────────
function getHackerRankDifficulty() {
  // Try sidebar on problem page first
  const el = document.querySelector('span.difficulty');
  if (el) {
    const txt = el.textContent.trim();
    if (/easy/i.test(txt))   return 'Easy';
    if (/medium/i.test(txt)) return 'Medium';
    if (/hard/i.test(txt))   return 'Hard';
  }

  // Fallback: class-based
  const byClass = document.querySelector(
    '.difficulty.easy, .difficulty.medium, .difficulty.hard'
  );
  if (byClass) {
    if (byClass.classList.contains('easy'))   return 'Easy';
    if (byClass.classList.contains('medium')) return 'Medium';
    if (byClass.classList.contains('hard'))   return 'Hard';
  }

  return 'N/A';
}

// ── CodeChef ──────────────────────────────────────────────────────────────────
async function getCodeChefDifficulty() {
  try {
    const parts = window.location.pathname.split('/').filter(Boolean);
    const probIdx = parts.lastIndexOf('problems');
    if (probIdx === -1 || !parts[probIdx + 1]) return 'N/A';

    const problemCode = parts[probIdx + 1].toUpperCase();
    const contestCode = (probIdx > 0) ? parts[probIdx - 1].toUpperCase() : 'PRACTICE';

    const apiUrl = `https://www.codechef.com/api/contests/${contestCode}/problems/${problemCode}`;

    const res  = await fetch(apiUrl, { credentials: 'include' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const rating = data?.problem?.difficulty_rating;
    if (rating === undefined || rating === null) return 'N/A';

    if (rating < 1400) return `Easy`;
    if (rating < 1800) return `Medium`;
    return `Hard`;
  } catch (e) {
    console.warn('[DCT] CodeChef API error:', e);
    return 'N/A';
  }
}

// ── Codeforces ────────────────────────────────────────────────────────────────
async function getCodeforcesDifficulty() {
  try {
    const { contestId, index } = extractCFIds();
    if (!contestId || !index) return 'N/A';

    const cacheKey = `${contestId}-${index}`;

    // 1. Check local cache first
    const storage = await getStorage(['cfProblemMap']);
    const cached = storage.cfProblemMap || null;
    if (cached && cached[cacheKey] !== undefined) {
      return classifyCF(cached[cacheKey]);
    }

    // 2. Fetch full problem list from CF API and cache it
    const res  = await fetch('https://codeforces.com/api/problemset.problems');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    if (data.status !== 'OK') return 'N/A';

    const map = {};
    data.result.problems.forEach(p => {
      map[`${p.contestId}-${p.index}`] = p.rating || null;
    });

    // Store in chrome.storage.local
    await setStorage({ cfProblemMap: map });

    const rating = map[cacheKey];
    return classifyCF(rating);

  } catch (e) {
    console.warn('[DCT] Codeforces API error:', e);
    return 'N/A';
  }
}

function extractCFIds() {
  const path = window.location.pathname;
  // Ignore Gym problems
  if (path.includes('/gym/')) return { contestId: null, index: null };

  const parts = path.split('/').filter(Boolean);

  // Pattern: /problemset/problem/2069/A
  // parts: ["problemset", "problem", "2069", "A"]
  if (parts[0] === 'problemset' && parts[1] === 'problem') {
    return { contestId: parts[2], index: parts[3] };
  }

  // Pattern: /contest/2069/problem/A
  // parts: ["contest", "2069", "problem", "A"]
  if (parts[0] === 'contest' && parts[2] === 'problem') {
    return { contestId: parts[1], index: parts[3] };
  }

  return { contestId: null, index: null };
}

function classifyCF(rating) {
  if (!rating) return 'N/A';
  if (rating < 1200) return 'Easy';
  if (rating < 1600) return 'Medium';
  if (rating < 2000) return 'Hard';
  return 'Expert';
}

// ─────────────────────────────────────────────────────────────────────────────
//  SUCCESS DETECTION (per platform)
// ─────────────────────────────────────────────────────────────────────────────
function isSolvedNow() {
  const bodyText = document.body.innerText;

  switch (PLATFORM) {
    case 'leetcode': {
      const hasAccepted = /\bAccepted\b/i.test(bodyText);
      if (!hasAccepted) return false;

      const onSubmissionsPage = /\/submissions\//.test(window.location.pathname);
      const hasInitialHint = /You must run your code first/i.test(bodyText);
      const hasFailureVerdict = /(Wrong Answer|Time Limit Exceeded|Runtime Error|Memory Limit Exceeded|Compile Error)/i.test(bodyText);

      if (!onSubmissionsPage && hasInitialHint) return false;
      if (hasFailureVerdict) return false;

      return true;
    }
    case 'hackerrank': {
      // Scope detection to the submission result container only.
      // Searching full bodyText causes false positives from achievement
      // banners, profile sections, and leaderboard text that also contain
      // "Congratulations" — which sets alreadyLogged=true before submission.
      const resultContainer =
        document.querySelector('.result-container, .challenge-result, [class*="result-state"], .submissions-list');
      const searchText = resultContainer ? resultContainer.innerText : bodyText;
      return /You solved this challenge/i.test(searchText) ||
             /Congratulations/i.test(searchText) ||
             /\bCorrect\b/i.test(searchText);
    }
    case 'codechef':
      return /\bAccepted\b/i.test(bodyText) || /Correct Answer/i.test(bodyText);
    case 'codeforces':
      return /\bAccepted\b/i.test(bodyText);
    default:
      return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  PROBLEM NAME (per platform)
// ─────────────────────────────────────────────────────────────────────────────
function getProblemName() {
  switch (PLATFORM) {
    case 'leetcode': {
      const el = document.querySelector('[data-cy="question-title"]');
      if (el) return el.textContent.trim();
      return document.title.split(' - ')[0].trim();
    }
    case 'hackerrank': {
      const el = document.querySelector('.challenge-name, h1.ui-page-title');
      if (el) return el.textContent.trim();
      return document.title.split('|')[0].trim();
    }
    case 'codechef': {
      const el = document.querySelector('h1.problem-name, .problem-statement h1');
      if (el) return el.textContent.trim();
      return document.title.split('|')[0].trim();
    }
    case 'codeforces': {
      const el = document.querySelector('.problem-statement .title');
      if (el) return el.textContent.trim();
      return document.title.split('-')[0].trim();
    }
    default:
      return document.title.split(' - ')[0].trim();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  PROBLEM IDENTIFICATION (Unique IDs per platform)
// ─────────────────────────────────────────────────────────────────────────────

function getProblemId() {
  const path = window.location.pathname;

  switch (PLATFORM) {
    case 'leetcode': {
      // Pattern: /problems/two-sum/
      const match = path.match(/\/problems\/([^/]+)/);
      return match ? match[1] : null;
    }
    case 'hackerrank': {
      // Pattern: /challenges/solve-me-first/
      return getHackerRankSlug(window.location.href);
    }
    case 'codechef': {
      // Patterns: /problems/FLOW001 or /JAN21A/problems/FLOW001
      const parts = path.split('/').filter(Boolean);
      const probIdx = parts.lastIndexOf('problems');
      return (probIdx !== -1 && parts[probIdx + 1]) ? parts[probIdx + 1].toUpperCase() : null;
    }
    case 'codeforces': {
      const { contestId, index } = extractCFIds();
      return (contestId && index) ? `${contestId}-${index}` : null;
    }
    default:
      return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  SAVE TO LOG
// ─────────────────────────────────────────────────────────────────────────────

async function checkAndClearLog() {
  const result = await getStorage(['lastClearTime']);
  const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD in local time
  
  if (!result.lastClearTime) {
    // First time: Initialize with today's date
    await setStorage({ lastClearTime: today });
    return;
  }

  if (result.lastClearTime !== today) {
    await setStorage({ 
      problemLog: [],
      lastClearTime: today
    });
    console.log('[DCT] New day detected (' + today + '). Log cleared automatically.');
  }
}

let isSaving = false;

async function saveProblemToLog(data) {
  if (isSaving) return;
  isSaving = true;

  try {
    await checkAndClearLog();
    const result = await getStorage(['problemLog', 'user', 'isCloudEnabled']);
    let log = result.problemLog || [];

    // Deduplicate by problemId
    const exists = log.some(p => p.problemId === data.problemId);
    if (!exists) {
      log.push(data);
      await setStorage({ problemLog: log });
      console.log('[DCT] Logged:', data.name, '|', data.difficulty, '| ID:', data.problemId);

      // ── CLOUD PUSH ──
      if (result.isCloudEnabled && result.user?.id) {
        console.log('[DCT-Cloud] Pushing solve to cloud...');
        SupabaseSync.pushSolve(data, result.user.id);
      }
    }
  } finally {
    isSaving = false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  HACKERRANK PRE-CLICK SCAN
// ─────────────────────────────────────────────────────────────────────────────
async function scanHackerRankList() {
  if (PLATFORM !== 'hackerrank') return;

  if (window.location.pathname.includes('/challenges/') &&
      window.location.pathname.includes('/problem')) return;

  const rows = document.querySelectorAll('.challenge-list-item, .challenge-card, li[data-challenge-slug], .m-challenge-list-item');
  if (!rows.length) return;

  const map = {};
  rows.forEach(row => {
    const anchor = row.querySelector('a[href*="/challenges/"]');
    const diffEl = row.querySelector('span.difficulty, .difficulty');
    if (!anchor || !diffEl) return;

    const slug = row.dataset.challengeSlug || getHackerRankSlug(anchor.href);
    if (!slug) return;

    const txt  = diffEl.textContent.trim();
    let level  = 'N/A';
    if (/easy/i.test(txt))   level = 'Easy';
    if (/medium/i.test(txt)) level = 'Medium';
    if (/hard/i.test(txt))   level = 'Hard';

    map[slug] = level;
  });

  if (Object.keys(map).length) {
    const r = await getStorage(['hrDiffCache']);
    const existing = r.hrDiffCache || {};
    const updated = Object.assign({}, existing, map);
    if (JSON.stringify(existing) !== JSON.stringify(updated)) {
      await setStorage({ hrDiffCache: updated });
    }
  }
}

async function getHackerRankCachedDifficulty() {
  const r = await getStorage(['hrDiffCache']);
  const cache = r.hrDiffCache || {};
  const slug  = getHackerRankSlug(window.location.href);
  return slug ? cache[slug] : null;
}
// ─────────────────────────────────────────────────────────────────────────────
//  UI INJECTION (Already Solved Alert)
// ─────────────────────────────────────────────────────────────────────────────

function injectAlreadySolvedAlert(date) {
  if (document.getElementById('dct-already-solved')) return;

  const alertDiv = document.createElement('div');
  alertDiv.id = 'dct-already-solved';
  alertDiv.innerHTML = `
    <div style="
      position: fixed; top: 20px; right: 20px; z-index: 999999;
      background: #060a10; border: 1px solid #00d4ff; border-radius: 8px;
      padding: 12px 16px; width: 260px;
      box-shadow: 0 0 20px rgba(0,212,255,0.2);
      font-family: 'Share Tech Mono', monospace; color: #c8dff0;
      animation: slideIn 0.4s cubic-bezier(0.18, 0.89, 0.32, 1.28);
    ">
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
        <span style="color: #ff8c00; font-size: 16px;">⚠️</span>
        <span style="color: #00d4ff; font-weight: bold; letter-spacing: 1px; font-size: 12px;">SIGNAL DETECTED</span>
      </div>
      <div style="font-size: 11px; line-height: 1.4; opacity: 0.9;">
        You already solved this problem on <span style="color: #00ff88;">${date}</span>.
      </div>
      <button id="dct-close-alert" style="
        margin-top: 10px; width: 100%; padding: 6px;
        background: rgba(0,212,255,0.05); border: 1px solid rgba(0,212,255,0.2);
        color: #00d4ff; font-family: 'Share Tech Mono', monospace; font-size: 10px;
        cursor: pointer; transition: all 0.2s; border-radius: 4px;
      ">DISMISS SIGNAL</button>
      <style>
        @keyframes slideIn {
          from { transform: translateX(120%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        #dct-close-alert:hover {
          background: rgba(0,212,255,0.1);
          border-color: #00d4ff;
          box-shadow: 0 0 10px rgba(0,212,255,0.2);
        }
      </style>
    </div>
  `;

  document.body.appendChild(alertDiv);
  document.getElementById('dct-close-alert').addEventListener('click', () => {
    alertDiv.remove();
  });
}

async function checkPreviousSolve(problemId) {
  if (!problemId) return;
  const result = await getStorage(['problemLog', 'user', 'isCloudEnabled']);
  const log = result.problemLog || [];

  // 1. Check local log first
  const localEntry = log.find(p => p.problemId === problemId);
  if (localEntry) {
    const d = new Date(localEntry.timestamp).toLocaleDateString(undefined, { 
      day: 'numeric', month: 'short', year: 'numeric' 
    });
    injectAlreadySolvedAlert(d);
    return;
  }

  // 2. If logged in, we could theoretically check cloud here, 
  // but since we sync cloud history to localLog on popup open, 
  // checking localLog is usually enough for Phase 3.
}

// ─────────────────────────────────────────────────────────────────────────────
//  MAIN LOGIC (Persistent Observer for SPAs)
// ─────────────────────────────────────────────────────────────────────────────

async function handleMutation() {
  // Defensive check for extension context
  if (typeof chrome === 'undefined' || !chrome.runtime?.id || !chrome.storage?.local) {
    return;
  }

  const currentUrl = window.location.href;

  if (currentUrl !== lastUrl) {
    lastUrl = currentUrl;
    alreadyLogged = false;
    lastHRResultState = '';
    PAGE_OPEN_TIME = new Date().toISOString();

    if (PLATFORM === 'hackerrank') {
      scanHackerRankList();
    }

    // Check for previous solve on URL change
    const problemId = getProblemId();
    if (problemId) {
      checkPreviousSolve(problemId);
    }
  }

  // ── HACKERRANK: detect new submission by watching result container text ──
  // HackerRank is an SPA — the URL never changes between submissions.
  // We track the result container's text; when it changes (new submission
  // came in), reset alreadyLogged so the new result gets evaluated.
  if (PLATFORM === 'hackerrank') {
    const resultContainer =
      document.querySelector('.result-container, .challenge-result, [class*="result-state"], .submissions-list');
    const currentResultState = resultContainer ? resultContainer.innerText.trim() : '';
    if (currentResultState !== lastHRResultState) {
      lastHRResultState = currentResultState;
      alreadyLogged = false; // new submission result appeared — re-evaluate
    }
  }

  if (alreadyLogged) return;
  if (!isSolvedNow()) return;

  alreadyLogged = true;

  const problemId = getProblemId();
  if (!problemId) {
    console.warn('[DCT] Could not extract unique problemId for', currentUrl);
  }

  let difficulty = 'N/A';
  try {
    switch (PLATFORM) {
      case 'leetcode':
        difficulty = getLeetCodeDifficulty();
        break;
      case 'hackerrank': {
        const live   = getHackerRankDifficulty();
        const cached = await getHackerRankCachedDifficulty();
        difficulty   = (live !== 'N/A') ? live : (cached || 'N/A');
        break;
      }
      case 'codechef':
        difficulty = await getCodeChefDifficulty();
        break;
      case 'codeforces':
        difficulty = await getCodeforcesDifficulty();
        break;
    }
  } catch (e) {
    console.warn('[DCT] Difficulty resolution error:', e);
  }

  const problemData = {
    problemId:  problemId,
    url:        currentUrl,
    name:       getProblemName(),
    difficulty: difficulty,
    platform:   PLATFORM,
    openedAt:   PAGE_OPEN_TIME,
    timestamp:  new Date().toISOString(),
  };

  await saveProblemToLog(problemData);
}

// Initial triggers
if (PLATFORM === 'hackerrank') {
  scanHackerRankList();
}

const observer = new MutationObserver(handleMutation);
observer.observe(document.body, { childList: true, subtree: true });