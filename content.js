// ─────────────────────────────────────────────────────────────────────────────
//  DCT — content.js  (v2.0)
//  Per-platform difficulty extraction + openedAt timestamp tracking
// ─────────────────────────────────────────────────────────────────────────────

const PAGE_OPEN_TIME = new Date().toISOString(); // record when tab was opened

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

// ─────────────────────────────────────────────────────────────────────────────
//  DIFFICULTY EXTRACTORS (one per platform)
// ─────────────────────────────────────────────────────────────────────────────

// ── LeetCode ─────────────────────────────────────────────────────────────────
// <div class="... text-difficulty-easy ...">Easy</div>
// class variants: text-difficulty-easy | text-difficulty-medium | text-difficulty-hard
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
// Difficulty is on the CHALLENGE LIST page (before the link is opened).
// <span class="difficulty medium detail-item">Medium</span>
// On the problem page itself the span still exists in sidebar.
function getHackerRankDifficulty() {
  // Try sidebar on problem page first
  const el = document.querySelector('span.difficulty');
  if (el) {
    const txt = el.textContent.trim();
    if (/easy/i.test(txt))   return 'Easy';
    if (/medium/i.test(txt)) return 'Medium';
    if (/hard/i.test(txt))   return 'Hard';
  }

  // Fallback: class-based (class="difficulty medium detail-item")
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
// Uses the hidden API: /api/contests/PRACTICE/problems/{PROBLEM_CODE}
// difficulty_rating number → mapped to Easy / Medium / Hard
// Returns a Promise that resolves to a difficulty string.
async function getCodeChefDifficulty() {
  try {
    // Extract problem code from URL
    // Patterns: /problems/CODENAME  OR  /CONTEST/problems/CODENAME
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

    return classifyCodeChef(rating);
  } catch (e) {
    console.warn('[DCT] CodeChef API error:', e);
    return 'N/A';
  }
}

function classifyCodeChef(rating) {
  if (rating < 1400) return `Easy`;
  if (rating < 1800) return `Medium`;
  return `Hard`;
}

// ── Codeforces ────────────────────────────────────────────────────────────────
// Uses: https://codeforces.com/api/problemset.problems
// Cached in chrome.storage.local under 'cfProblemMap' to avoid hammering API.
// URL patterns handled:
//   /problemset/problem/{contestId}/{index}
//   /contest/{contestId}/problem/{index}
//   /gym/{gymId}/problem/{index}
async function getCodeforcesDifficulty() {
  try {
    const { contestId, index } = extractCFIds();
    if (!contestId || !index) return 'N/A';

    const cacheKey = `${contestId}-${index}`;

    // 1. Check local cache first
    const cached = await getCFCache();
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

    // Store in chrome.storage.local (survives sessions)
    chrome.storage.local.set({ cfProblemMap: map });

    const rating = map[cacheKey];
    if (rating === undefined || rating === null) return 'N/A';
    return classifyCF(rating);

  } catch (e) {
    console.warn('[DCT] Codeforces API error:', e);
    return 'N/A';
  }
}

function extractCFIds() {
  const parts = window.location.pathname.split('/').filter(Boolean);
  // /problemset/problem/263/A  →  parts = ['problemset','problem','263','A']
  // /contest/1234/problem/B    →  parts = ['contest','1234','problem','B']
  // /gym/1234/problem/C        →  parts = ['gym','1234','problem','C']
  const probIdx = parts.indexOf('problem');
  if (probIdx !== -1) {
    return { contestId: parts[probIdx - 1], index: parts[probIdx + 1] };
  }
  return { contestId: null, index: null };
}

function classifyCF(rating) {
  if (!rating) return 'N/A';
  if (rating < 1200) return 'Easy';
  if (rating < 1700) return 'Medium';
  if (rating < 2300) return 'Hard';
  return 'Expert';
}

function getCFCache() {
  return new Promise(resolve => {
    chrome.storage.local.get(['cfProblemMap'], r => resolve(r.cfProblemMap || null));
  });
}

// ─────────────────────────────────────────────────────────────────────────────
//  SUCCESS DETECTION (per platform)
// ─────────────────────────────────────────────────────────────────────────────
function isSolvedNow() {
  const bodyText = document.body.innerText;

  switch (PLATFORM) {
    case 'leetcode': {
      // Be stricter for LeetCode: the word "Accepted" can appear in stats
      // even before the user submits code. We want to trigger only when
      // there's an actual accepted verdict.
      const hasAccepted = /\bAccepted\b/i.test(bodyText);
      if (!hasAccepted) return false;

      const onSubmissionsPage = /\/submissions\//.test(window.location.pathname);
      const hasInitialHint = /You must run your code first/i.test(bodyText);
      const hasFailureVerdict = /(Wrong Answer|Time Limit Exceeded|Runtime Error|Memory Limit Exceeded|Compile Error)/i.test(bodyText);

      // If we're still on the initial "run your code first" state, or there
      // is an explicit failure verdict, do NOT treat as solved.
      if (!onSubmissionsPage && hasInitialHint) return false;
      if (hasFailureVerdict) return false;

      return true;
    }

    case 'hackerrank':
      return /You solved this challenge/i.test(bodyText) ||
             /Congratulations/i.test(bodyText);

    case 'codechef':
      return /\bAccepted\b/i.test(bodyText) ||
             /Correct Answer/i.test(bodyText);

    case 'codeforces':
      // CF verdict cell: "Accepted" text inside status table
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
      // <div data-cy="question-title"> or page title "Two Sum - LeetCode"
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
//  SAVE TO LOG
// ─────────────────────────────────────────────────────────────────────────────
function saveProblemToLog(data) {
  chrome.storage.local.get(['problemLog'], (result) => {
    let log = result.problemLog || [];

    // Deduplicate by URL — prevent double-logging on same tab
    const exists = log.some(p => p.url === data.url);
    if (!exists) {
      log.push(data);
      chrome.storage.local.set({ problemLog: log });
      console.log('[DCT] Logged:', data.name, '|', data.difficulty);
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
//  HACKERRANK PRE-CLICK SCAN
//  Scans the challenge list page and caches {url → difficulty} so that when
//  the user opens a challenge page, difficulty is already known.
// ─────────────────────────────────────────────────────────────────────────────
function scanHackerRankList() {
  // Only run on list/browse pages, not on a specific challenge page
  if (window.location.pathname.includes('/challenges/') &&
      window.location.pathname.includes('/problem')) return;

  const rows = document.querySelectorAll('.challenge-list-item, .challenge-card, li[data-challenge-slug]');
  if (!rows.length) return;

  const map = {};
  rows.forEach(row => {
    const anchor = row.querySelector('a[href*="/challenges/"]');
    const diffEl = row.querySelector('span.difficulty');
    if (!anchor || !diffEl) return;

    const href = anchor.href;
    const txt  = diffEl.textContent.trim();
    let level  = 'N/A';
    if (/easy/i.test(txt))   level = 'Easy';
    if (/medium/i.test(txt)) level = 'Medium';
    if (/hard/i.test(txt))   level = 'Hard';

    // Store by the challenge slug (works across full URLs too)
    map[href] = level;
  });

  if (Object.keys(map).length) {
    chrome.storage.local.get(['hrDiffCache'], r => {
      const existing = r.hrDiffCache || {};
      chrome.storage.local.set({ hrDiffCache: { ...existing, ...map } });
    });
  }
}

// Retrieve cached HackerRank difficulty for current URL
function getHackerRankCachedDifficulty() {
  return new Promise(resolve => {
    chrome.storage.local.get(['hrDiffCache'], r => {
      const cache = r.hrDiffCache || {};
      // Try exact URL, or URL without query params
      const url       = window.location.href;
      const urlClean  = url.split('?')[0];
      const hit = cache[url] || cache[urlClean] || null;
      resolve(hit);
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
//  MAIN LOGIC
// ─────────────────────────────────────────────────────────────────────────────

// Run HackerRank list scanner right away (safe no-op on other platforms)
if (PLATFORM === 'hackerrank') {
  scanHackerRankList();

  // Re-scan after SPA navigation settles
  setTimeout(scanHackerRankList, 2000);
}

// Track whether we already logged this tab
let alreadyLogged = false;

const observer = new MutationObserver(async () => {
  if (alreadyLogged) return;
  if (!isSolvedNow()) return;

  // Stop observer immediately to avoid double-firing
  observer.disconnect();
  alreadyLogged = true;

  // ── Resolve difficulty ──────────────────────────────────────────────────
  let difficulty = 'N/A';

  try {
    switch (PLATFORM) {
      case 'leetcode':
        difficulty = getLeetCodeDifficulty();
        break;

      case 'hackerrank': {
        // Try live DOM first, then pre-click cache
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
    url:        window.location.href,
    name:       getProblemName(),
    difficulty: difficulty,
    platform:   PLATFORM,
    openedAt:   PAGE_OPEN_TIME,              // when tab was loaded
    timestamp:  new Date().toISOString(),    // when solved
  };

  saveProblemToLog(problemData);
});

// Start observing
observer.observe(document.body, { childList: true, subtree: true });
