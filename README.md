# 🏆 **Daily Coding Tracker Pro (DCT)**

### *Automatic solve detection and difficulty tracking for major competitive programming platforms worldwide.*

<div align="center">
<img src="https://img.shields.io/badge/Manifest-V3-00d4ff?style=for-the-badge">
<img src="https://img.shields.io/badge/Logic-JavaScript-f7df1e?style=for-the-badge">
<img src="https://img.shields.io/badge/UI-Neon_CSS-00ff88?style=for-the-badge">
<img src="https://img.shields.io/badge/Storage-Local-ff8c00?style=for-the-badge">
</div>

---

# 📌 **Overview**

**Daily Coding Tracker Pro (DCT)** is a modern Chrome Extension designed for competitive programmers to log every successful solve without manual input.

It uses:

* **Manifest V3** — Modern extension standard ensuring high performance and security.
* **MutationObserver** — High-performance DOM monitoring for zero-latency solve detection.
* **Chrome Storage Local** — Fully private, locally-encrypted data persistence.
* **Platform APIs** — Integration with Codeforces and CodeChef for accurate Elo ratings.

> Fully local-first architecture — your solve history never leaves your machine.

---

# 🧠 **Architecture**

```
[ User Solves Problem on Platform (LeetCode/CF/CC/HR) ]
              ↓
[ MutationObserver Scans DOM for 'Accepted' Status ]
              ↓
┌──────────────────────────────────────────────┐
│        DCT CONTENT SCRIPT (content.js)       │
│  1. Identify Platform & Extract Problem ID   │
│  2. Fetch Difficulty (DOM or Platform API)   │
│  3. Deduplicate & Save to chrome.storage     │
└──────────────────────────────────────────────┘
              ↓
[ Persistent Storage (problemLog array) ]
              ↓
┌──────────────────────────────────────────────┐
│        DASHBOARD UI (popup.js / HTML)        │
│  1. Compute Streaks & Daily Averages         │
│  2. Render Neon UI & Difficulty Badges       │
│  3. Provide Export & DB Viewer Access        │
└──────────────────────────────────────────────┘
```

---

# 🚀 **Features**

### 🏆 Automatic Detection
Instantly detects successful solves on LeetCode, HackerRank, CodeChef, and Codeforces without requiring any manual logging or user interaction.

### 📊 Live Statistics
Calculates real-time metrics including daily solve streaks, overall averages, and difficulty distribution directly within the neon-themed popup dashboard.

### 🔍 Deep Difficulty Mapping
Seamlessly integrates with official platform APIs to fetch precise Elo ratings and difficulty tiers, ensuring your solve history is accurately categorized.

### 📂 Local-First Database
Keeps your entire solve history private on your machine using local storage, featuring detailed export options to TXT for backup or analysis.

---

# ⚙️ **Tech Stack**

| Layer | Technology |
|-------|------------|
| Manifest | Version 3 |
| Logic | ES2020 JavaScript |
| Styling | Vanilla CSS (Neon Design) |
| Storage | chrome.storage.local |
| Observability | MutationObserver API |

---

# 📦 **Setup**

1. **Clone the repository:**

```bash
git clone https://github.com/pnav/coding-tracker-extension.git
cd coding-tracker-extension
```

2. **Open Chrome Extensions:**
Navigate to `chrome://extensions/` in your browser.

3. **Enable Developer Mode:**
Toggle the "Developer mode" switch in the top-right corner of the page.

4. **Load the Extension:**
Click "Load unpacked" and select the `coding-tracker-extension` root folder.

5. **Pin for Easy Access:**
Click the puzzle icon in the Chrome toolbar and pin DCT for quick status checks.

---

# 🛡️ **Production Tips**

* Use the "Export Detailed Log" feature weekly to maintain a permanent record of your progress.
* Keep the extension pinned to monitor your current daily streak at a glance.
* For HackerRank, browse problem lists first to pre-cache difficulty data for faster logging.

---

# 💡 **Roadmap**

* [ ] **Supabase Integration**: Transition to cloud storage for seamless cross-browser history syncing.
* [ ] **User Authentication**: Secure login system to preserve solve history across device changes.
* [ ] **Discord Integration**: Automated "Solved!" notifications to personal Discord channels via Webhooks.
* [ ] **Native Notifications**: Browser-level toast notifications upon successful problem logging.
* [ ] **Custom Tagging**: Ability to manually tag problems (e.g., #DP, #Graph) directly in the UI.

---

# 🔒 **Security Notes**

* All solve data is strictly stored in your browser's local storage; no data is sent to external servers.
* Host permissions are narrowly scoped to Codeforces and CodeChef APIs only for difficulty fetching.
* Zero account requirement ensures your competitive programming profiles remain private.

---

# 📁 **Folder Structure**

```
coding-tracker-extension/
│
├── MD files/          # Project guidelines, roadmap, and build rules
├── docs/              # Research notes and platform-specific API docs
├── content.js         # Core solve detection and scraping logic
├── popup.js           # Dashboard logic, stats calculation, and rendering
├── popup.html         # Main extension popup interface
├── db-viewer.js       # Standalone database viewer logic
├── db-viewer.html     # Full-page database management interface
├── manifest.json      # Extension configuration and permissions
└── README.md          # Project documentation (regenerated)
```

---

# 🤝 **Contributing**

PRs and issues are welcome. Feel free to fork the repository and contribute to the roadmap or add support for new platforms.

---

# 📜 **License**

MIT License — feel free to use and modify for personal or public projects.

---

# ❤️ **Credits**

* **Orbitron & Share Tech Mono** — Typography from Google Fonts.
* **Codeforces API** — Official API for problem rating extraction.
* **CodeChef API** — Official API for difficulty categorization.

---

# 🚀 Made with passion by **pnav**

> *Tracks every solve, every streak, every grind — automatically.*
