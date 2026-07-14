# <img src="https://unpkg.com/lucide-static/icons/terminal.svg" width="28" height="28" align="center"/> **Daily Coding Tracker Pro (DCT)**

### *Automatic solve detection, difficulty tracking, and cloud sync console for competitive programming platforms.*

<div align="center">
<img src="https://img.shields.io/badge/Manifest-V3-00d4ff?style=for-the-badge">
<img src="https://img.shields.io/badge/Logic-JavaScript-f7df1e?style=for-the-badge">
<img src="https://img.shields.io/badge/UI-Anthropic_Sans-0af?style=for-the-badge">
<img src="https://img.shields.io/badge/Database-Firebase_Firestore-FFCA28?style=for-the-badge">
<img src="https://img.shields.io/badge/Storage-Local-ff8c00?style=for-the-badge">
</div>

---

# <img src="https://unpkg.com/lucide-static/icons/info.svg" width="22" height="22" align="center"/> **Overview**

**Daily Coding Tracker Pro (DCT)** is a local-first Chrome Extension designed for competitive programmers to log every successful solve automatically. It detects solves in real-time across LeetCode, HackerRank, CodeChef, and Codeforces, computing active streaks and displaying detailed history metrics.

It uses:

* **MutationObserver API** — Scans the DOM in real-time to detect solved statuses across LeetCode, HackerRank, CodeChef, and Codeforces.
* **Chrome Local Storage** — Caches and logs problem entries securely and efficiently within the browser.
* **Firebase Firestore REST API** — Syncs solve data to the cloud securely without background service worker execution.
* **Custom UI Framework** — Renders rich stats, activity heatmaps, and local settings with a dark neon aesthetic.

---

# <img src="https://unpkg.com/lucide-static/icons/git-fork.svg" width="22" height="22" align="center"/> **Architecture**

```
[ User Solves Problem on Platform (LeetCode/CF/CC/HR) ]
                      ↓
[ MutationObserver Scans DOM for 'Accepted' Status ]
                      ↓
┌────────────────────────────────────────────────────────┐
│             DCT CONTENT SCRIPT (content.js)            │
│  - Detects solve, extracts Problem ID & platform       │
│  - Fetches rating / difficulty tier via Platform APIs  │
│  - Logs errors locally & triggers background updates   │
└────────────────────────────────────────────────────────┘
                      ↓
  ┌────────────────────────────────────────────────────┐
  │         PERSISTENT STORAGE (chrome.storage)        │
  │  - local problemLog array & cfProblemMap cache     │
  │  - rolling local errorLog (200 entries cap)        │
  └────────────────────────────────────────────────────┘
          ↙                                    ↘
┌──────────────────────────────────┐  ┌──────────────────────────────────┐
│      POPUP UI (popup.js/html)    │  │   DB VIEWER (db-viewer.js/html)  │
│  - Instant stats & active streak │  │  - Bottom tab-based navigation   │
│  - 7D recent solves overview     │  │  - Heatmap & 24h TOD charts      │
│  - Direct link to DB Viewer page │  │  - Settings & Cloud manual sync  │
└──────────────────────────────────┘  └──────────────────────────────────┘
                      ↘                        ↙
┌────────────────────────────────────────────────────────┐
│          CLOUD SYNC ENGINE (firebase-sync.js)          │
│  - Secure token refresh, syncs solves and system logs  │
│  - Vercel OAuth capture, uploads to Firestore REST     │
└────────────────────────────────────────────────────────┘
                      ↓
┌────────────────────────────────────────────────────────┐
│         ADMIN CONSOLE (admin/admin.html & js)          │
│  - Independent secure Email/Password REST login        │
│  - Profile aggregation & user solves accordion history  │
│  - Obsolescence filters and error database pruning     │
└────────────────────────────────────────────────────────┘
```

---

# <img src="https://unpkg.com/lucide-static/icons/sparkles.svg" width="22" height="22" align="center"/> **Features**

### <img src="https://unpkg.com/lucide-static/icons/zap.svg" width="18" height="18" align="center"/> Automatic Detection
Instantly detects solves on LeetCode, HackerRank, CodeChef, and Codeforces without requiring manual logging.

### <img src="https://unpkg.com/lucide-static/icons/database.svg" width="18" height="18" align="center"/> Persistent Tabbed Dashboard
A top-navigation dashboard in the DB Viewer separating the interface into Dashboard, History, Analytics, Cloud, and Settings.

### <img src="https://unpkg.com/lucide-static/icons/line-chart.svg" width="18" height="18" align="center"/> Extended Analytics
Visualizes progress with a 12-week GitHub-style activity heatmap, a vertically responsive 24-hour time-of-day distribution chart, and recent difficulty history.

### <img src="https://unpkg.com/lucide-static/icons/chrome.svg" width="18" height="18" align="center"/> Themed Custom Dialogs
Completely replaces native browser prompts with modern, responsive, center-aligned custom confirmation and alert modals.

### <img src="https://unpkg.com/lucide-static/icons/user-check.svg" width="18" height="18" align="center"/> User-Wise Storage Isolation
Wipes local storage problem logs automatically on logout or disconnection to prevent data bleed between user accounts.

### <img src="https://unpkg.com/lucide-static/icons/shield.svg" width="18" height="18" align="center"/> Standalone Admin Console
Allows administrators to verify credentials against a database whitelist, log in securely, view active user profiles, expand solve histories, and audit system error logs.

### <img src="https://unpkg.com/lucide-static/icons/file-text.svg" width="18" height="18" align="center"/> Centralized Error Logger
A debugging utility that records errors in a rolling 200-entry local buffer and automatically syncs them to Firestore.

### <img src="https://unpkg.com/lucide-static/icons/refresh-cw.svg" width="18" height="18" align="center"/> Zero-Pause Cloud Sync
Synchronizes history and error events to Firebase Firestore REST API using lightweight Google OAuth tokens.

---

# <img src="https://unpkg.com/lucide-static/icons/layers.svg" width="22" height="22" align="center"/> **Tech Stack**

| Layer | Technology |
|-------|------------|
| Manifest | Version 3 |
| Logic | ES2020 JavaScript |
| Fonts | Anthropic Sans (Local Display/Text OTF Mappings) |
| Styling | Vanilla CSS (Dark Neon Theme) |
| Database | Firebase Firestore (REST API) |
| Auth | Firebase Auth (Google Provider & Email/Password REST) |
| Storage | chrome.storage.local (solves, caches, errorLog) |
| Observability | MutationObserver API & Central Logger |

---

# <img src="https://unpkg.com/lucide-static/icons/terminal.svg" width="22" height="22" align="center"/> **Setup**

1. **Clone the repository:**

```bash
git clone https://github.com/pnav/coding-tracker-extension.git
cd coding-tracker-extension
```

2. **Configure Extension Credentials:**

Open `firebase-sync.js` and input your Firebase `apiKey`, `projectId`, and `googleClientId`. Verify that `redirectUrl` is set to your OAuth handler page.

3. **Configure Redirect URIs in Google Cloud:**

In the Google Cloud Console, add your OAuth redirect URL (e.g., `https://success-page-for-dct.vercel.app/`) as an **Authorized redirect URI**.

4. **Whitelist Client ID in Firebase:**

In your Firebase Console under Authentication, add your Google Client ID to the safelist of external projects.

5. **Create Admin User:**

In your Firebase Console, enable the Email/Password Auth Provider and create an admin user credential.

6. **Load Extension in Chrome:**

Go to `chrome://extensions/`, enable "Developer mode", click "Load unpacked", and select the `coding-tracker-extension` directory.

---

# <img src="https://unpkg.com/lucide-static/icons/lightbulb.svg" width="22" height="22" align="center"/> **Production Tips**

* Pin the extension popover to track your solve streak status in real-time.
* Open the DB Viewer using the settings menu to access advanced charts and export tools.
* Check the Admin Console regularly to audit system error logs and monitor solver volumes.
* Pre-cache HackerRank difficulties by browsing platform dashboards before starting a challenge.

---

# <img src="https://unpkg.com/lucide-static/icons/map.svg" width="22" height="22" align="center"/> **Roadmap**

* [x] **Streak Tracking** — Visual flame indicator in the popover and dashboard interfaces.
* [x] **Charts & Graphs** — 12-week heatmap, 24-hour time-of-day, and platform distribution charts.
* [x] **Firebase Integration** — Serverless cloud syncing to prevent inactivity pauses.
* [x] **User Authentication** — Google Auth for solvers and Email/Password REST Auth for admins.
* [ ] **Discord Bot Integration** — Automated solves broadcast to specified Discord channels via Webhooks.
* [ ] **Native Notifications** — Browser toast alerts triggering upon successful solve logs.
* [ ] **Custom Tags** — Ability to assign tags (e.g., #DP, #Graph) to solves in the history database.

---

# <img src="https://unpkg.com/lucide-static/icons/lock.svg" width="22" height="22" align="center"/> **Security Notes**

* Solves and system logs are stored locally and synced securely to your private Firestore.
* Admin panel queries Firestore collections securely using credentialed REST auth payloads.
* Extension host permissions are strictly scoped to supported platform domains and Firebase.

---

# <img src="https://unpkg.com/lucide-static/icons/folder.svg" width="22" height="22" align="center"/> **Folder Structure**

```
coding-tracker-extension/
├── admin/
│   ├── admin.html       # Standalone admin dashboard interface
│   └── admin.js         # Admin dashboard operations and REST query logic
├── docs/
│   ├── Anthropic Sans-fontiko/ # Local Anthropic Sans font assets
│   ├── anthropicSerif/        # Local Anthropic Serif font assets
│   ├── Codeforces_Diff_Extraction.md
│   ├── codechef_diff_extract.md
│   └── dct - codechef difficulty extractio.txt
├── MD-files/
│   ├── FUTURE_FEATURES.md      # Roadmap backlog phases
│   └── THE_README_BUILDER.md   # README syntax structure rules
├── utils/
│   └── logger.js        # Centralized local & firestore error logging utility
├── background.js        # Service worker for OAuth and tab management
├── content.js           # Core solve detection and scraping logic
├── db-viewer.html       # Persistent tab-based dashboard & DB manager
├── db-viewer.js         # DB viewer tab routing and dynamic rendering logic
├── firebase-sync.js     # Vercel OAuth client & Firestore REST query module
├── manifest.json        # Extension configuration & MV3 permission rules
├── popup.html           # Mini status dashboard popover
├── popup.js             # Popover stats calculation and display logic
├── GEMINI.md            # Daily Coding Tracker rules and memory file
├── Issues_in_dct.md     # Tracking lists of reported issues
└── README.md            # Project documentation
```

---

# <img src="https://unpkg.com/lucide-static/icons/git-branch.svg" width="22" height="22" align="center"/> **Contributing**

PRs and issues are welcome. Feel free to fork the repository and contribute to the roadmap or add support for new platforms.

---

# <img src="https://unpkg.com/lucide-static/icons/scale.svg" width="22" height="22" align="center"/> **License**

MIT License — feel free to use and modify for personal or public projects.

---

# <img src="https://unpkg.com/lucide-static/icons/heart.svg" width="22" height="22" align="center"/> **Credits**

* **Anthropic Sans** — Typography font files bundled in the docs folder.
* **Codeforces API** — Official API for problem rating extraction.
* **CodeChef API** — Official API for difficulty categorization.
* **Firebase Firestore** — High-performance cloud database.

---

# <img src="https://unpkg.com/lucide-static/icons/heart.svg" width="22" height="22" align="center"/> Made with passion by **pnav**

> *Tracks every solve, every streak, every grind — automatically.*
