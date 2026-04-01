# 🖥️ **Daily Coding Tracker Pro**

### *Chrome extension that auto-tracks competitive programming solves with difficulty intelligence*

<div align="center">
<img src="https://img.shields.io/badge/Platform-Chrome%20Extension-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white">
<img src="https://img.shields.io/badge/Manifest-V3-FF6F00?style=for-the-badge">
<img src="https://img.shields.io/badge/Storage-chrome.storage.local-34A853?style=for-the-badge">
<img src="https://img.shields.io/badge/Version-2.0-00d4ff?style=for-the-badge">
</div>

---

# 📌 **Overview**

**Daily Coding Tracker Pro (DCT)** is a Manifest V3 Chrome extension built for competitive programmers who want zero-friction, automatic logging of every problem they solve — across four major coding platforms — without ever lifting a finger.

It uses:

* **MutationObserver** — watches the DOM for solve events in real-time; no polling, no CPU drain
* **Platform-specific difficulty APIs** — pulls actual difficulty data from Codeforces and CodeChef APIs; reads DOM classes on LeetCode and HackerRank
* **`chrome.storage.local`** — persists the full problem log, API caches, and streak data locally across sessions
* **Futuristic Popup UI** — Orbitron + Share Tech Mono fonts, neon glow aesthetic, animated scanlines, and colour-coded difficulty badges

> Built for grinders who want their coding history tracked automatically — not manually.

---

# 🧠 **Architecture**

```
[User solves a problem in the browser tab]
            ↓
[content.js — injected by manifest.json per-platform URL match]
            ↓
┌─────────────────────────────────────────────────┐
│  SOLVE DETECTION (MutationObserver)             │
│  1. isSolvedNow() → scans bodyText for verdict  │
│  2. observer.disconnect() + alreadyLogged guard  │
│  3. getProblemName() → platform-specific selectors│
└─────────────────────────────────────────────────┘
            ↓
┌─────────────────────────────────────────────────┐
│  DIFFICULTY RESOLUTION (async, per platform)    │
│  LeetCode   → DOM class text-difficulty-*       │
│  HackerRank → span.difficulty + hrDiffCache     │
│  CodeChef   → /api/contests/{CODE}/problems/{}  │
│  Codeforces → /api/problemset.problems (cached) │
└─────────────────────────────────────────────────┘
            ↓
[saveProblemToLog() → deduplicates by URL → chrome.storage.local]
            ↓
[popup.html / popup.js — renders stats, problem list, export tools]
```

---

# 🚀 **Features**

### ⚡ Zero-Polling Detection
Uses a `MutationObserver` on `document.body` to detect solve verdicts the instant they appear in the DOM. No `setInterval`, no page reloads — the observer fires once, disconnects itself, and sets an `alreadyLogged` flag to guarantee no double-firing.

### 🎯 Per-Platform Difficulty Intelligence
Each platform has its own extractor. LeetCode reads a CSS class directly. HackerRank pre-scans challenge list pages and caches `{url → difficulty}` before the user even opens a problem. CodeChef and Codeforces hit their respective APIs and map numeric ratings to Easy / Medium / Hard / Expert using calibrated thresholds.

### 🔥 Streak Engine & Stats
The popup computes a live daily streak (consecutive calendar days with ≥ 1 solve), daily average, and today's count — all derived from timestamps in the local log. No backend needed.

### 📤 Export & Discord DM
Two `.txt` export formats: a clean URL list and a richly formatted tree-style detailed log. The Discord button copies today's solved URLs to clipboard and opens Discord DMs in one click.

### 🔒 100% Local — No Accounts, No Servers
All data lives in `chrome.storage.local`. Nothing is ever transmitted externally. The Codeforces problem map is cached locally after the first API hit so the CF API is never hammered more than once per browser session.

### ⏱️ Time-Taken Tracking
Every problem entry stores both `openedAt` (tab load time) and `timestamp` (solve time). The popup computes and displays the exact time spent per problem — down to seconds.

---

# ⚙️ **Tech Stack**

| Layer | Technology |
|-------|------------|
| Extension Platform | Chrome Extension — Manifest V3 |
| Solve Detection | DOM `MutationObserver` API |
| Difficulty Data | Codeforces API, CodeChef API, DOM selectors |
| Persistence | `chrome.storage.local` (JSON log) |
| UI Fonts | Orbitron, Share Tech Mono, Inter (Google Fonts) |
| Export | Blob API + `URL.createObjectURL()` |

---

# 📦 **Setup**

1. **Clone the repo:**

```bash
git clone https://github.com/ItzPnav/coding-tracker-extension.git
cd coding-tracker-extension
```

2. **Open Chrome extensions page:**

```bash
# Navigate to this URL in Chrome
chrome://extensions/
```

3. **Enable Developer Mode:**

Toggle **Developer Mode** on (top-right corner of the extensions page).

4. **Load the extension:**

Click **Load Unpacked** and select the root `coding-tracker-extension/` folder.

5. **Start solving problems:**

```
Navigate to LeetCode, Codeforces, CodeChef, or HackerRank.
Solve any problem. Click the DCT icon in your toolbar to see it logged.
```

---

# 🛡️ **Production Tips**

* Keep `host_permissions` scoped tightly — DCT only requests API access for `codechef.com/api/*` and `codeforces.com/api/*`, not broad wildcard permissions
* The Codeforces problem map can grow large over time; consider adding a TTL-based cache invalidation for the `cfProblemMap` key in `chrome.storage.local`
* If you fork and add a backend, never store the log in both local and remote simultaneously without a sync conflict strategy
* For HackerRank contest pages (`/contests/*/challenges/*`), URL matches in `manifest.json` will need extending — this is a known pending item

---

# 💡 **Roadmap**

* [ ] **Problem ID deduplication** — use problem IDs instead of URLs to handle link variant edge cases
* [ ] **Charts in popup** — bar / pie chart showing platform distribution (LeetCode vs Codeforces vs others)
* [ ] **Filter & search** — search problems by name, platform, or difficulty in the popup list
* [ ] **Supabase integration** — cross-browser sync with cloud persistence
* [ ] **User authentication** — login to keep history forever
* [ ] **Discord Webhook** — auto-post "Solved!" to a Discord channel (not just DM copy-paste)
* [ ] **Native browser toast notifications** — on-screen notification when a problem is successfully logged
* [ ] **Custom tags** — manually add tags like `#DP`, `#Graph`, `#BFS` to solved problems
* [ ] **HackerRank contest page support** — extend manifest URL matches for `/contests/*/challenges/*`
* [ ] **Clear log button** — `#clear-btn` is wired in `popup.js` but not yet surfaced in the popup HTML

---

# 🔒 **Security Notes**

* No API keys are used — all external API calls are to public, unauthenticated endpoints (Codeforces and CodeChef public APIs)
* All solve data stays on-device in `chrome.storage.local` — nothing is transmitted to any external server
* `host_permissions` in `manifest.json` are scoped to only the specific API paths needed, not full-domain wildcards

---

# 📁 **Folder Structure**

```
coding-tracker-extension/
│
├── 📁 MD files/
│   ├── PROGRESS.md          # Feature tracker & milestone log
│   └── FUTURE_FEATURES.md   # Full Phase 2–4 roadmap
│
├── 📁 docs/
│   ├── Codeforces_Diff_Extraction.md   # CF API + rating classification research
│   ├── codechef_diff_extract.md        # CodeChef API + difficulty mapping research
│   └── dct - codechef difficulty extractio.txt  # Raw scratch notes
│
├── content.js       # Per-platform solve detection, difficulty APIs, openedAt tracking
├── manifest.json    # Manifest V3 config — permissions, URL matches, host_permissions
├── popup.html       # Futuristic popup UI — stats, problem list, buttons
├── popup.js         # Stats calc, list render, exports, Discord DM logic
└── README.md
```

---

# 🤝 **Contributing**

PRs and issues are welcome. Fork freely and build on top of this.

---

# 📜 **License**

MIT License — use freely.

---

# ❤️ **Credits**

* [Codeforces Public API](https://codeforces.com/apiHelp) — problem ratings and metadata
* [CodeChef Contest API](https://www.codechef.com/api/contests/) — difficulty ratings per problem
* [Google Fonts — Orbitron & Share Tech Mono](https://fonts.google.com/) — UI typography

---

# 🚀 Made with passion by **pnav**

> *Track every solve, never break the chain.*