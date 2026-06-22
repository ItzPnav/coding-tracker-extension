# 📊 DCT — Project Progress Tracking

> **Daily Coding Tracker Pro** | Manifest V3 Chrome Extension  
> Current Version: `v2.1` | Last Updated: May 2026

---

## ✅ Completed Features

### 🏗️ Core Architecture
| Feature | Status | Notes |
|---|---|---|
| Manifest V3 Setup | ✅ Done | Storage permission + host_permissions for APIs |
| Content Script Injection | ✅ Done | Per-platform URL matching in `manifest.json` |
| HackerRank Contest Pages | ✅ Done | Contest-specific URLs (`/contests/*/challenges/*`) in `manifest.json` |
| `chrome.storage.local` System | ✅ Done | JSON-based log persisted across sessions |
| 24h Auto-Clear Log | ✅ Done | Automatically wipes `problemLog` every 24 hours |
| Deduplication Guard | ✅ Done | Prevents double-logging on same URL per session |
| **Problem Deduplication** | ✅ Done | Uses unique Problem IDs (slugs/codes) instead of URLs |

---

### 🔍 Platform Detection & Difficulty Extraction

| Platform | Success Detection | Difficulty Method | Status |
|---|---|---|---|
| **LeetCode** | `Accepted` banner (DOM text) | `[class*="text-difficulty-*"]` element query | ✅ Done |
| **HackerRank** | `You solved this challenge` / `Congratulations` | Live DOM + slug-based pre-click cache | ✅ Done |
| **CodeChef** | `Accepted` / `Correct Answer` | `/api/contests/{CONTEST}/problems/{CODE}` API | ✅ Done |
| **Codeforces** | `Accepted` verdict | `codeforces.com/api/problemset.problems` (cached) | ✅ Done |

---

### 🧠 Difficulty Intelligence

- [x] **LeetCode** — Direct DOM element query on `text-difficulty-easy/medium/hard` class
- [x] **HackerRank Pre-Click Scan** — Scans challenge list pages for slugs, caches `{slug → difficulty}` in `hrDiffCache`
- [x] **CodeChef API Integration** — Fetches `difficulty_rating` from hidden API; maps numeric rating to Easy / Medium / Hard using the following thresholds:
  ```
  rating < 1400       → Easy
  1400 ≤ rating < 1800 → Medium
  rating ≥ 1800        → Hard
  ```
- [x] **Codeforces API Integration** — Fetches full `problemset.problems` response once, caches entire map in `cfProblemMap`; handles all URL variants (`/problemset/`, `/contest/`, `/gym/`):
  ```
  rating < 1200       → Easy
  1200 ≤ rating < 1600 → Medium
  1600 ≤ rating < 2000 → Hard
  rating ≥ 2000        → Expert
  ```

---

### ⏱️ Metadata Captured Per Problem

- [x] **Problem Name** — Platform-specific selectors with `document.title` fallback
- [x] **Difficulty Level** — Via API / DOM (per platform, see above)
- [x] **Platform Tag** — `leetcode` / `hackerrank` / `codechef` / `codeforces`
- [x] **URL** — Full problem URL
- [x] **`openedAt`** — ISO timestamp captured at page load (when tab opened)
- [x] **`timestamp`** — ISO timestamp captured at moment of solve
- [x] **Time Taken** — Derived from `openedAt` → `timestamp` delta (computed in `popup.js`)
- [x] **`problemId`** — Platform-specific unique ID for bulletproof deduplication

---

### 🖥️ User Interface (`popup.html` / `popup.js`)

- [x] **Futuristic UI Design** — Retro-terminal aesthetic; Orbitron + Share Tech Mono fonts; animated scan-line; neon glow effects
- [x] **Stats Row** — Today's count / Daily average / Streak counter with 🔥
- [x] **Streak Logic** — Increments by 1 for each consecutive calendar day with ≥ 1 solve; resets to 0 if today has no solves
- [x] **Problem List** — Reverse-chronological; shows platform icon 🟡🟢🟤🔵, problem name (green), difficulty badge (colour-coded), date, time, and time taken
- [x] **Difficulty Badges** — Colour-coded: 🟢 Easy / 🟡 Medium / 🔴 Hard / 🟣 Expert
- [x] **URL `.txt` Download** — Exports numbered URL-only list
- [x] **Detailed Log `.txt` Download** — Structured `├──` tree format with all metadata per problem
- [x] **Discord DM Button** — Copies today's solved URLs to clipboard, then opens Discord `@me`
- [x] **About Section** — Collapsible panel with 4 feature highlight chips
- [x] **Legacy Timestamp Compatibility** — `parseTS()` handles both old `toLocaleString()` and new ISO strings
- [x] **Streak Visualization** — Animated SVG "Flame" icon with Cold/Warm/Hot intensity states
- [x] **Data Insights** — CSS-based platform distribution bar showing % breakdown of activity

---

### 🔧 Technical Milestones

- [x] Non-redundant logging system (deduplication by problemId)
- [x] `MutationObserver` pattern for SPA compatibility (no polling)
- [x] `observer.disconnect()` + `alreadyLogged` flag to prevent double-firing on same tab
- [x] Async difficulty resolution — API calls awaited before saving to log
- [x] CF problem map cached in `chrome.storage.local` — API hit only once per browser session
- [x] HackerRank difficulty pre-seeded before problem page opens
- [x] Serial numbering in exported logs
- [x] Blob-based `.txt` file generation with `URL.createObjectURL()`

---

## 🚧 In Progress / Pending

- [ ] **CodeChef Contest Problems** — API contest code auto-detection needs testing across non-PRACTICE contests

---

## 🗺️ Upcoming Roadmap

### Phase 3 — Cloud & Sync
- [x] Firebase integration — cross-browser sync
- [x] User authentication — persistent history

### Phase 4 — Social & Notifications
- [ ] Discord Webhook — auto-post "Solved!" to a channel
- [ ] Native browser toast notifications on successful log
- [ ] Custom tags (`#DP`, `#Graph`, etc.) on solved problems

---

## 📁 File Map

```
coding-tracker-extension/
│
├── 📁 MD files/
│   ├── 📝 PROGRESS.md              ← this file — feature tracker & milestones
│   └── 📝 FUTURE_FEATURES.md       ← full roadmap (Phase 3 → Phase 4)
│
├── 📁 docs/
│   ├── 📝 Codeforces_Diff_Extraction.md     ← CF API + rating classification research
│   ├── 📝 codechef_diff_extract.md          ← CodeChef API + difficulty mapping research
│   └── 📄 dct - codechef difficulty extractio.txt  ← raw notes / scratch
│
├── 📝 README.md            ← setup guide, feature overview, installation steps
├── 📄 background.js        ← v2.1 — background service worker for OAuth and tab management
├── 📄 content.js           ← v2.1 — per-platform detection, difficulty APIs, unique IDs
├── 📄 firebase-sync.js     ← v2.1 — lightweight Firebase REST client and login handler
├── ⚙️ manifest.json        ← v2.1 — host permissions, OAuth2 scope, and content script matches
├── 📄 db-viewer.js         ← v2.1 — standalone logic for database viewer
├── 🌐 db-viewer.html       ← v2.1 — futuristic DB viewer (CSP compliant)
├── 🌐 popup.html           ← v2.1 — futuristic UI, distribution bar, streak flame
└── 📄 popup.js             ← v2.1 — stats, render, downloads, distribution logic
```