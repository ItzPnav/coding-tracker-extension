# GEMINI.md — Daily Coding Tracker Pro (DCT)
# Project memory for Gemini CLI. Read this before touching ANY file.

---

## 1. PROJECT IDENTITY

- **Name:** Daily Coding Tracker Pro (DCT)
- **Type:** Chrome Extension — Manifest V3
- **Author handle:** pnav
- **Current version:** 2.1
- **Purpose:** Auto-detect and log competitive programming solves across LeetCode, Codeforces, CodeChef, HackerRank. Zero manual input. Fully local — no servers, no accounts.

---

## 2. FILE OWNERSHIP — WHO TOUCHES WHAT

```
content.js          ← Core logic. Edit only for platform detection, difficulty, solve detection.
popup.html          ← UI structure. Edit layout only. NEVER change CSS variables or font imports.
popup.js            ← UI logic. Edit only for stats, rendering, export functions.
manifest.json       ← Extension config. Edit with extreme caution — see Section 5.
db-viewer.html      ← Standalone DB viewer tab. Same CSS rules as popup.html apply.
README.md           ← Always regenerate using THE_README_BUILDER rules in Section 7.
FUTURE_FEATURES.md  ← Append-only roadmap. Never delete existing items.
PROGRESS.md         ← Append-only checklist. Check off items, never remove them.
docs/               ← Research notes. Read-only reference. Never modify.
```

**Never create:** background.js, service workers, or extra content scripts unless explicitly instructed.

---

## 3. UI DESIGN SYSTEM — NEVER DEVIATE FROM THIS

All frontend work (popup.html, db-viewer.html, any future HTML pages) must use ONLY the tokens and fonts below. Do not invent new colors. Do not use Tailwind, Bootstrap, or any CSS framework.

### 3.1 CSS Variables (copy exactly)

```css
:root {
  --bg:        #060a10;
  --bg2:       #0c1420;
  --bg3:       #101c2e;
  --border:    #1a3050;
  --border2:   #0e4a7a;
  --neon:      #00d4ff;
  --neon2:     #0af;
  --green:     #00ff88;
  --orange:    #ff8c00;
  --red:       #ff4060;
  --mid:       #ffd060;
  --easy:      #00e5a0;
  --hard:      #ff4060;
  --text:      #c8dff0;
  --text-dim:  #4a6880;
  --text-mute: #2a4860;
  --glow:      0 0 12px rgba(0,212,255,0.35);
  --glow2:     0 0 20px rgba(0,212,255,0.15);
}
```

### 3.2 Fonts (always load from Google Fonts, never local)

```html
<link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;700;900&family=Share+Tech+Mono&family=Inter:wght@300;400;500&display=swap" rel="stylesheet"/>
```

| Font | Usage |
|------|-------|
| `Orbitron` | Titles, large stat numbers, header |
| `Share Tech Mono` | Labels, badges, meta text, timestamps, monospace UI |
| `Inter` | Body text, descriptions, general prose |

### 3.3 Visual Identity Rules

- Background: always dark grid (`--bg`), with subtle `rgba(0,212,255,0.03)` grid lines via `background-image` linear-gradient
- Animated scan line: a 2px horizontal line sweeping top→bottom via CSS `@keyframes scan`, using `body::after`
- Borders: always use `--border` or `--border2`. Never use solid black borders.
- Glow effects: `text-shadow` with `var(--neon)` on Orbitron numbers. `box-shadow` with `var(--glow)` on hover states.
- Hover transitions: always `transition: all 0.2s` with `transform: translateY(-1px)` on buttons.
- No rounded corners larger than `border-radius: 8px` anywhere.
- No white backgrounds. No light themes. This is always dark.

### 3.4 Difficulty Badge Classes (exact — do not rename)

```css
.badge-easy   /* bg: rgba(0,229,160,0.12)  | color: var(--easy)     */
.badge-medium /* bg: rgba(255,208,96,0.12) | color: var(--mid)      */
.badge-hard   /* bg: rgba(255,64,96,0.12)  | color: var(--hard)     */
.badge-expert /* (Codeforces only)         | color: #ff6bff         */
.badge-na     /* bg: rgba(74,104,128,0.15) | color: var(--text-dim) */
```

### 3.5 Platform Icon Map (use in all list/table renderers)

```js
const platformIcon = { leetcode: '🟡', hackerrank: '🟢', codechef: '🟤', codeforces: '🔵' };
```

### 3.6 Popup Dimensions

- Width: exactly `400px`
- Min-height: `560px`
- Never exceed `400px` width — this is a browser popup, not a tab page.
- `db-viewer.html` is a full tab page — no width restriction there.

---

## 4. DATA SCHEMA — NEVER RESHAPE THIS

All problem data lives in `chrome.storage.local` under the key `problemLog`.

```js
// problemLog: Array of ProblemEntry
{
  problemId:  String,  // Unique ID (e.g., 'two-sum', '2069-A', 'FLOW001')
  url:        String,  // window.location.href at time of solve
  name:       String,  // extracted problem title
  difficulty: String,  // 'Easy' | 'Medium' | 'Hard' | 'Expert' | 'N/A'
  platform:   String,  // 'leetcode' | 'hackerrank' | 'codechef' | 'codeforces'
  openedAt:   String,  // ISO 8601 — when the tab was first loaded
  timestamp:  String,  // ISO 8601 — when solve was detected
}
```

**Other storage keys (do not delete or rename):**
- `cfProblemMap`   — Codeforces rating cache `{ "contestId-index": rating }`
- `hrDiffCache`    — HackerRank pre-scan cache `{ slug: "Easy"|"Medium"|"Hard" }`
- `lastClearTime`  — ISO timestamp of last 24h automatic log clear

**Deduplication:** by `problemId`. If `problemLog.some(p => p.problemId === data.problemId)` is true, do not push.

---

## 5. MANIFEST V3 HARD RULES

1. **No inline scripts** in any HTML file. All JS must be in external `.js` files. MV3 CSP blocks inline `<script>` blocks in extension pages — this will silently break the extension.
2. **Permissions** — only `"storage"` and `"tabs"`. Do not add new permissions without a very good reason.
3. **host_permissions** — only these two. Do not broaden to `<all_urls>`:
   ```
   "*://*.codechef.com/api/*"
   "*://codeforces.com/api/*"
   ```
4. **web_accessible_resources** — only `db-viewer.html` is listed. Add new resources here if new tab pages are created.
5. **content_scripts matches** — the current list covers all required URL patterns. Do not remove patterns. When adding a new platform, add its match patterns here.

---

## 6. PLATFORM LOGIC CONTRACTS

These are the rules for each platform's solve detection and difficulty extraction. Do not change detection logic without understanding these.

### LeetCode
- **Solve detection:** `bodyText` contains `\bAccepted\b` AND no `Wrong Answer|TLE|Runtime Error|MLE|Compile Error` AND not on initial hint state (`You must run your code first`)
- **Difficulty DOM:** `[class*="text-difficulty-easy"]` / `text-difficulty-medium` / `text-difficulty-hard`
- **Name DOM:** `[data-cy="question-title"]`, fallback: `document.title.split(' - ')[0]`
- **URL match needed:** both `/problems/*` AND `/problems/*/submissions/*`

### HackerRank
- **Solve detection:** `You solved this challenge` or `Congratulations` in bodyText
- **Difficulty:** Live → `span.difficulty` or `.difficulty.easy/.medium/.hard` class. Fallback → `hrDiffCache` (pre-scanned from list pages)
- **Pre-scan:** `scanHackerRankList()` runs on domain/dashboard pages to populate `hrDiffCache` before user opens a problem
- **Name DOM:** `.challenge-name, h1.ui-page-title`, fallback: `document.title.split('|')[0]`

### CodeChef
- **Solve detection:** `\bAccepted\b` or `Correct Answer` in bodyText
- **Difficulty API:** `https://www.codechef.com/api/contests/{CONTEST}/problems/{CODE}` with `credentials: 'include'`
  - Extract from URL: `/problems/CODE` → contest = `PRACTICE`, or `/CONTEST/problems/CODE`
  - `data.problem.difficulty_rating` → `< 1400` Easy, `< 1800` Medium, else Hard
- **Name DOM:** `h1.problem-name, .problem-statement h1`, fallback: `document.title.split('|')[0]`

### Codeforces
- **Solve detection:** `\bAccepted\b` in bodyText
- **Difficulty API:** `https://codeforces.com/api/problemset.problems` — fetch once, cache entire map in `cfProblemMap`
  - URL patterns: `/problemset/problem/{id}/{idx}`, `/contest/{id}/problem/{idx}`, `/gym/{id}/problem/{idx}`
  - Rating thresholds: `< 1200` Easy, `< 1700` Medium, `< 2300` Hard, else Expert
- **Name DOM:** `.problem-statement .title`, fallback: `document.title.split('-')[0]`

---

## 7. README BUILDER RULES

Every time README.md is regenerated, follow these rules exactly.

**Section order (fixed, no exceptions):**
Header → Overview → Architecture → Features → Tech Stack → Setup → Production Tips → Roadmap → Security Notes → Folder Structure → Contributing → License → Credits → Footer

**Formatting rules:**
1. Badges: `style=for-the-badge`. Each badge a distinct color. Wrap block in `<div align="center">` (only allowed HTML tag).
2. Architecture: ASCII diagram inside a plain ` ``` ` block. No mermaid. No images.
3. Features: `### emoji Title` subheadings. 1–3 lines each. No bullet walls inside feature sections.
4. Tech Stack: markdown table with columns `Layer | Technology`.
5. Setup: numbered steps. Each shell command in its own ` ```bash ``` ` block.
6. No other HTML tags anywhere (`<div>`, `<p>`, `<details>`, etc. are all banned except the one badge wrapper).
7. Footer always ends with:
   ```
   # 🚀 Made with passion by **pnav**
   > *Tracks every solve, every streak, every grind — automatically.*
   ```

**What to pull from where:**
- Roadmap items → from `FUTURE_FEATURES.md`
- Folder structure → from actual file tree (keep in sync with `PROJECT_STRUCTURE.md`)
- Feature descriptions → from actual implemented behavior in `content.js` and `popup.js`

---

## 8. WHAT NOT TO DO — HARD GUARDRAILS

- **Never use `localStorage` or `sessionStorage`** — always `chrome.storage.local`
- **Never use `setInterval` or constant polling** — always `MutationObserver`
- **Never add a background service worker** unless explicitly asked
- **Never use `<all_urls>` in host_permissions** — scope tightly
- **Never put `<script>` tags inline in HTML files** — MV3 CSP will break it silently
- **Never change CSS variable names** — `popup.js` and `db-viewer.html` both reference them
- **Never change the `problemLog` array structure** — it would corrupt existing stored data
- **Never change storage key names** (`problemLog`, `cfProblemMap`, `hrDiffCache`) — existing installs would lose data
- **Never use Tailwind, Bootstrap, or any CSS framework** — hand-written CSS only
- **Never use mermaid or image-based diagrams in README** — ASCII only per builder rules
- **Never rename difficulty strings** — must stay exactly `'Easy'`, `'Medium'`, `'Hard'`, `'Expert'`, `'N/A'`

---

## 9. CODING STYLE

- Comments: use the `// ─────` section divider style already present in `content.js` and `popup.js`
- Async: always `async/await` with `try/catch` for API calls — never raw `.then()` chains
- Console logs: prefix with `[DCT]` — e.g. `console.log('[DCT] Logged:', ...)` or `console.warn('[DCT] ...')`
- No external npm dependencies — this is a plain Chrome extension with zero build steps
- No TypeScript — plain ES2020 JavaScript only

---

## 10. QUICK REFERENCE — CURRENT STATE SNAPSHOT

| Thing | Value |
|-------|-------|
| Extension version | 2.1 |
| Platforms supported | LeetCode, HackerRank, CodeChef, Codeforces |
| Storage backend | chrome.storage.local |
| Popup width | 400px |
| Fonts | Orbitron, Share Tech Mono, Inter |
| Primary neon color | #00d4ff |
| Primary green color | #00ff88 |
| Dedup method | by URL |
| Streak logic | calendar days with ≥1 solve; resets on missed day |
| Daily avg | total solves ÷ total unique days |
| Export formats | URL list .txt, Detailed log .txt |
| DB viewer | db-viewer.html (opens as new tab via chrome.tabs.create) |

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).

## 11. GRAPHIFY REFERENCE — READ THE GRAPH, NOT THE FILE

A `graph.json` lives at `graphify-out/graph.json` (project root sibling).
**Before reading any source file in full, query the graph first.**
The graph covers all 5 DCT source files and costs a fraction of the tokens a full file read does.

### 11.1 Schema (know this cold)

```
graph.json
  .nodes[]          — 257 nodes
    .id             — stable snake_case key  e.g. "content_saveproblemtolog"
    .label          — human name             e.g. "saveProblemToLog()"
    .source_file    — origin file            e.g. "content.js"
    .source_location — e.g. "L42"
    .community      — integer cluster id (0–17)
    .file_type      — "code" | "doc"

  .links[]          — 283 edges
    .source         — node id
    .target         — node id
    .relation       — "contains" | "calls"
    .source_file    — file the edge was extracted from
    .confidence     — "EXTRACTED" (all 283 edges are 100% extracted, 0 inferred)
    .confidence_score — 1.0 for all edges
```

**There are only two relation types: `contains` and `calls`.**
- `contains` = a file owns a function/variable, or a function owns a sub-call setup
- `calls` = function A invokes function B

### 11.2 Key Communities (use these to scope reads)

| Community | What lives there | Cohesion |
|-----------|-----------------|----------|
| 3 | All `content.js` functions — `handleMutation`, `saveProblemToLog`, `checkAndClearLog`, `isSolvedNow`, difficulty extractors, `getProblemId`, etc. | 0.18 |
| 5 | `popup.js` utility belt — `parseTS`, `calcStreak`, `calcAvg`, `formatDate`, `formatTime`, `buildDetailedTxt` | 0.13 |
| 6 | `db-viewer.js` render layer — `render()`, `ALL_PROBLEMS`, `dayKey`, `diffClass`, `calcStreak` | 0.15 |
| 8 | `manifest.json` fields — `content_scripts`, `host_permissions`, `oauth2`, `permissions` | 0.14 |
| 12/13 | `FUTURE_FEATURES.md` roadmap phases | 0.40–0.50 |
| 4 | `GEMINI.md` sections (this file) | 0.08 |

### 11.3 Full Call Graph — `content.js` (Community 3)

`handleMutation()` is the god node (12 edges). Everything flows through it:

```
handleMutation()
  ├── isSolvedNow()
  ├── getProblemName()
  ├── getProblemId()          → extractCFIds(), getHackerRankSlug()
  ├── getLeetCodeDifficulty()
  ├── getHackerRankDifficulty()
  ├── getHackerRankCachedDifficulty() → getHackerRankSlug(), getStorage()
  ├── getCodeChefDifficulty()
  ├── getCodeforcesDifficulty() → extractCFIds(), classifyCF(), getStorage(), setStorage()
  ├── saveProblemToLog()      → checkAndClearLog() → getStorage(), setStorage()
  │                            → getStorage(), setStorage()
  ├── checkPreviousSolve()    → getStorage(), injectAlreadySolvedAlert()
  └── scanHackerRankList()    → getStorage(), setStorage()
```

### 11.4 Full Call Graph — `popup.js` (Community 5)

```
renderStats()
  ├── calcStreak()  → todayKey()
  └── calcAvg()

buildDetailedTxt()
  ├── formatDate()  → parseTS()
  └── formatTime()  → parseTS()

formatTimeTaken()   → parseTS()
getItemDay()        → parseTS()
```

### 11.5 Full Call Graph — `db-viewer.js` (Community 6)

```
render()
  └── calcStreak()  → todayKey()

miniClass()         → diffClass()
dayKey()            → parseTS()
fmtTime()           → parseTS()
fmtTimeTaken()      → parseTS()
```

### 11.6 Token Decision Rules

| You need to... | Do this — NOT a full file read |
|----------------|-------------------------------|
| Find what calls `saveProblemToLog` | Graph: filter `links` where `target == "content_saveproblemtolog"` → answer: `handleMutation()` only |
| Find all functions in `content.js` | Graph: filter `nodes` where `source_file == "content.js"` → 20 nodes |
| Understand difficulty flow | Graph: Community 3 + the call graph in §11.3 above |
| Find all callers of `getStorage` | Graph: filter `links` where `target == "content_getstorage"` → 6 callers |
| Edit a specific function | Read only the relevant function via `view` with `view_range`, not the full file |
| Understand popup rendering | Graph: Community 5 + §11.4 — no need to read all 300 lines of popup.js |
| Check manifest permissions | Graph: Community 8 — or read manifest.json (it's only 40 lines, always fine) |

### 11.7 Staleness Check

The graph was built from commit `d63ecb0a`. Before trusting it, run:
```bash
git rev-parse HEAD
```
If the hash differs, run `graphify update .` (zero API cost) to rebuild.
The graph lives at `graphify-out/graph.json` relative to the project root.