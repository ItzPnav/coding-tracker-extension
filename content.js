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

function findLeetCodeSubmissionHistoryEntry() {
  const elements = Array.from(document.querySelectorAll('span, div'));
  for (const el of elements) {
    const text = el.textContent || '';
    if (text.includes('submitted at')) {
      let ancestor = el;
      // Search up to 4 parent levels for the username profile link
      for (let i = 0; i < 4; i++) {
        if (!ancestor || ancestor === document.body) break;
        const profileLink = ancestor.querySelector('a[href^="/u/"], a[href*="/u/"]');
        if (profileLink) {
          const href = profileLink.getAttribute('href');
          const match = href.match(/\/u\/([^/]+)/);
          if (match && match[1]) {
            const username = match[1].trim();
            const fullText = ancestor.textContent.replace(/\s+/g, ' ').trim();
            const patternStr = `${username} submitted at`;
            if (fullText.includes(patternStr)) {
              const index = fullText.indexOf('submitted at');
              const timestampPart = fullText.substring(index + 'submitted at'.length).trim();
              // Match timestamp (e.g. "Jun 22, 2026 19:01")
              const timeMatch = timestampPart.match(/^[A-Za-z]{3}\s+\d{1,2},\s+\d{4}\s+\d{2}:\d{2}/);
              if (timeMatch) {
                return {
                  username: username,
                  timestampStr: timeMatch[0]
                };
              }
            }
          }
        }
        ancestor = ancestor.parentElement;
      }
    }
  }
  return null;
}

function isSuccessfulLeetCodeSubmission() {
  const entry = findLeetCodeSubmissionHistoryEntry();
  if (!entry) {
    console.log('[LC]\n\nSubmission history entry not detected.');
    return false;
  }

  console.log(
    '[LC]\n\nSubmission history entry detected.\n\nUser:\n' +
    entry.username +
    '\n\nTimestamp:\n' +
    entry.timestampStr +
    '\n\nRecording solve.'
  );
  return true;
}

async function getHackerRankDifficultyFromAPI(slug) {
  if (!slug) return 'N/A';

  // 1. Check local cache first
  const storage = await getStorage(['hrDiffCache']);
  const cache = storage.hrDiffCache || {};
  if (cache[slug]) {
    console.log('[DCT-HR] Found cached difficulty for:', slug, '->', cache[slug]);
    return cache[slug];
  }

  // 2. Fetch from HackerRank internal REST API
  const url = `https://www.hackerrank.com/rest/contests/master/challenges/${slug}`;
  console.log('[DCT-HR] Fetching challenge metadata for:', slug);

  let responseData = null;
  let attempts = 2;

  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      responseData = await res.json();
      break; // Success
    } catch (e) {
      console.warn(`[DCT-HR] Fetch attempt ${i + 1} failed:`, e);
      if (i < attempts - 1) {
        // Wait 500ms before retry
        await new Promise(r => setTimeout(r, 500));
      }
    }
  }

  if (!responseData || !responseData.model) {
    console.warn('[DCT-HR] API response empty or invalid, fallback to N/A');
    return 'N/A';
  }

  // Map difficulty name
  const diffName = responseData.model.difficulty_name;
  let difficulty = 'N/A';

  if (/easy/i.test(diffName))   difficulty = 'Easy';
  else if (/medium/i.test(diffName)) difficulty = 'Medium';
  else if (/hard/i.test(diffName))   difficulty = 'Hard';
  else if (/expert/i.test(diffName)) difficulty = 'Expert';

  // 3. Cache the resolved difficulty
  cache[slug] = difficulty;
  await setStorage({ hrDiffCache: cache });
  console.log('[DCT-HR] Fetched & cached difficulty:', slug, '->', difficulty);

  return difficulty;
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
      return isSuccessfulLeetCodeSubmission();
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
        FirebaseSync.pushSolve(data, result.user.id);
      }

      // ── CONGRATS CARD ──
      injectCongratsCard(data);
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
      background: #060a10; border: 2px solid #00d4ff; border-radius: 10px;
      padding: 20px; width: 340px;
      box-shadow: 0 0 25px rgba(0,212,255,0.3);
      font-family: 'Share Tech Mono', monospace; color: #c8dff0;
      animation: dctSlideInAlert 0.4s cubic-bezier(0.18, 0.89, 0.32, 1.28);
    ">
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
        <span style="color: #ff8c00; font-size: 20px; filter: drop-shadow(0 0 5px #ff8c00);">⚠️</span>
        <span style="
          color: #00d4ff; font-weight: bold; letter-spacing: 2px; font-size: 14px;
          font-family: 'Orbitron', sans-serif; text-shadow: 0 0 8px #00d4ff;
        ">SIGNAL DETECTED</span>
      </div>
      <div style="font-size: 13px; line-height: 1.5; opacity: 0.95; margin-bottom: 15px;">
        You already solved this problem on <span style="color: #00ff88; font-weight: bold;">${date}</span>.
      </div>
      <button id="dct-close-alert" style="
        width: 100%; padding: 8px;
        background: rgba(0,212,255,0.05); border: 1px solid rgba(0,212,255,0.25);
        color: #00d4ff; font-family: 'Share Tech Mono', monospace; font-size: 11px;
        cursor: pointer; transition: all 0.2s; border-radius: 6px;
        text-transform: uppercase; letter-spacing: 1px;
      ">DISMISS SIGNAL</button>
      <style>
        @keyframes dctSlideInAlert {
          from { transform: translateX(120%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes dctFadeOutAlert {
          from { opacity: 1; transform: translateY(0); }
          to { opacity: 0; transform: translateY(-20px); }
        }
        #dct-close-alert:hover {
          background: rgba(0,212,255,0.15);
          border-color: #00d4ff;
          box-shadow: 0 0 10px rgba(0,212,255,0.3);
        }
      </style>
    </div>
  `;

  document.body.appendChild(alertDiv);

  // Auto fade out after 8 seconds
  const autoDismissTimeout = setTimeout(() => {
    const el = alertDiv.firstElementChild;
    if (el) {
      el.style.animation = 'dctFadeOutAlert 0.5s forwards';
    }
    setTimeout(() => alertDiv.remove(), 500);
  }, 8000);

  document.getElementById('dct-close-alert').addEventListener('click', () => {
    clearTimeout(autoDismissTimeout);
    alertDiv.remove();
  });
}

function injectCongratsCard(data) {
  // Prevent duplicate cards
  if (document.getElementById('dct-congrats-card')) {
    document.getElementById('dct-congrats-card').remove();
  }

  // Get current streak from storage to display
  chrome.storage.local.get(['problemLog'], (result) => {
    const log = result.problemLog || [];
    
    // Compute stats
    const todayKey = () => new Date().toLocaleDateString('en-CA');
    const getItemDay = (item) => new Date(item.timestamp).toLocaleDateString('en-CA');
    
    // Compute streak
    const calcStreak = (logVal) => {
      if (!logVal.length) return 0;
      const daySet = new Set(logVal.map(p => getItemDay(p)));
      const days = [...daySet].sort().reverse();
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
    };

    const streak = calcStreak(log);
    const timeTakenStr = (() => {
      if (!data.openedAt || !data.timestamp) return '';
      const diff = Math.abs(new Date(data.timestamp) - new Date(data.openedAt));
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      if (mins === 0) return `${secs}s`;
      if (mins < 60)  return `${mins}m ${secs}s`;
      return `${Math.floor(mins / 60)}h ${mins % 60}m`;
    })();

    const diffColors = {
      Easy: '#00e5a0',
      Medium: '#ffd060',
      Hard: '#ff4060',
      Expert: '#ff6bff',
      'N/A': '#7da2c4'
    };
    const diffColor = diffColors[data.difficulty] || '#7da2c4';

    const cardDiv = document.createElement('div');
    cardDiv.id = 'dct-congrats-card';
    cardDiv.innerHTML = `
      <div style="
        position: fixed; top: 20px; right: 20px; z-index: 999999;
        background: #060a10; border: 2px solid #00ff88; border-radius: 12px;
        padding: 24px; width: 360px;
        box-shadow: 0 0 30px rgba(0,255,136,0.25);
        font-family: 'Share Tech Mono', monospace; color: #c8dff0;
        animation: dctSlideIn 0.5s cubic-bezier(0.18, 0.89, 0.32, 1.28);
        background-image: 
          linear-gradient(rgba(0,255,136,0.02) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,255,136,0.02) 1px, transparent 1px);
        background-size: 20px 20px;
      ">
        <div style="
          position: absolute; top: -2px; left: 15%; right: 15%; height: 2px;
          background: linear-gradient(90deg, transparent, #00ff88, transparent);
        "></div>

        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
          <span style="font-size: 24px; filter: drop-shadow(0 0 8px #00ff88);">🏆</span>
          <span style="
            font-family: 'Orbitron', sans-serif; font-weight: 900; 
            color: #ffffff; letter-spacing: 2px; font-size: 16px;
            text-shadow: 0 0 10px #00ff88;
          ">CONGRATULATIONS!</span>
        </div>

        <div style="font-size: 13px; line-height: 1.5; margin-bottom: 16px;">
          You successfully logged a solve on <span style="color: #00d4ff; font-weight: bold;">${data.platform.toUpperCase()}</span>:
          <div style="
            color: #ffffff; font-weight: bold; margin-top: 8px; font-size: 14px;
            overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
          ">${data.name}</div>
        </div>

        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 20px;">
          <span style="
            font-size: 10px; padding: 2px 8px; border-radius: 4px;
            background: rgba(0,0,0,0.3); border: 1px solid ${diffColor};
            color: ${diffColor}; text-transform: uppercase;
          ">${data.difficulty}</span>

          ${timeTakenStr ? `
            <span style="font-size: 12px; color: #7da2c4;">
              ⏱ ${timeTakenStr}
            </span>
          ` : ''}

          ${streak > 0 ? `
            <span style="font-size: 12px; color: #ff8c00; font-weight: bold; display: flex; align-items: center; gap: 2px;">
              🔥 ${streak} day${streak > 1 ? 's' : ''}
            </span>
          ` : ''}
        </div>

        <div style="display: flex; gap: 10px;">
          <button id="dct-close-congrats" style="
            flex: 1; padding: 8px;
            background: rgba(255,64,96,0.05); border: 1px solid rgba(255,64,96,0.2);
            color: #ff4060; font-family: 'Share Tech Mono', monospace; font-size: 11px;
            cursor: pointer; transition: all 0.2s; border-radius: 6px;
            text-transform: uppercase; letter-spacing: 1px;
          ">Dismiss</button>
          
          <button id="dct-view-db-congrats" style="
            flex: 1.5; padding: 8px;
            background: rgba(0,255,136,0.1); border: 1px solid #00ff88;
            color: #00ff88; font-family: 'Share Tech Mono', monospace; font-size: 11px;
            cursor: pointer; transition: all 0.2s; border-radius: 6px;
            text-transform: uppercase; letter-spacing: 1px;
            font-weight: bold;
          ">View Database</button>
        </div>

        <style>
          @keyframes dctSlideIn {
            from { transform: translateX(120%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
          }
          @keyframes dctFadeOut {
            from { opacity: 1; transform: translateY(0); }
            to { opacity: 0; transform: translateY(-20px); }
          }
          #dct-close-congrats:hover {
            background: rgba(255,64,96,0.15);
            border-color: #ff4060;
          }
          #dct-view-db-congrats:hover {
            background: #00ff88;
            color: #060a10;
            box-shadow: 0 0 15px rgba(0,255,136,0.4);
          }
        </style>
      </div>
    `;

    document.body.appendChild(cardDiv);

    // Auto dismiss after 10 seconds
    const autoDismissTimeout = setTimeout(() => {
      const el = cardDiv.firstElementChild;
      if (el) {
        el.style.animation = 'dctFadeOut 0.5s forwards';
      }
      setTimeout(() => cardDiv.remove(), 500);
    }, 10000);

    document.getElementById('dct-close-congrats').addEventListener('click', () => {
      clearTimeout(autoDismissTimeout);
      cardDiv.remove();
    });

    document.getElementById('dct-view-db-congrats').addEventListener('click', () => {
      clearTimeout(autoDismissTimeout);
      chrome.runtime.sendMessage({ action: 'open_db_viewer' });
      cardDiv.remove();
    });
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
      case 'hackerrank':
        difficulty = await getHackerRankDifficultyFromAPI(problemId);
        break;
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