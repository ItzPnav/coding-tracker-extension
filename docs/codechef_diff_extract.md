# 🔥 Goal

Accurately determine the **difficulty level of a CodeChef problem** without relying on unreliable DOM text scraping.

---

# 🧠 Core Idea

CodeChef is a **Single Page Application (SPA)**.

👉 Problem data (including difficulty) is loaded via **hidden API calls**, not directly present in the DOM.

---

# ✅ Step 1: Capture the API Request

1. Open any CodeChef problem

   ```
   https://www.codechef.com/problems/{PROBLEM_CODE}
   ```

2. Open DevTools

   ```
   Right Click → Inspect → Network Tab
   ```

3. Filter:

   ```
   Fetch / XHR
   ```

4. Reload the page 🔄

5. Find request:

   ```
   /api/contests/PRACTICE/problems/{PROBLEM_CODE}
   ```

---

# 💰 Step 2: Extract Difficulty

API response contains:

```json
{
  "problem": {
    "difficulty_rating": 1234
  }
}
```

👉 This `difficulty_rating` is the **single source of truth**

---

# 🚀 Step 3: Use Direct API

### Endpoint:

```
https://www.codechef.com/api/contests/PRACTICE/problems/{PROBLEM_CODE}
```

### Example:

```
https://www.codechef.com/api/contests/PRACTICE/problems/HS08TEST
```

---

# 💻 Step 4: Fetch in Your App

```javascript
async function getDifficulty(problemCode) {
    const url = `https://www.codechef.com/api/contests/PRACTICE/problems/${problemCode}`;
    
    const res = await fetch(url);
    const data = await res.json();

    return data.problem.difficulty_rating;
}
```

---

# 🎯 Step 5: Convert Rating → Difficulty

## 📊 Final Mapping

```
0 – 500     → Beginner
500 – 1000  → Easy
1000 – 1400 → Easy (1★)
1400 – 1600 → Medium (2★)
1600 – 1800 → Medium (3★)
1800 – 2000 → Hard (4★)
2000+       → Hard (5★)
```

---

## 🧠 Simplified Classification (for UI)

```
rating < 1400      → Easy
1400 – 1799        → Medium
1800+              → Hard
```

---

# ⚙️ Step 6: Implementation

```javascript
function getDifficultyDetails(rating) {
    if (rating < 500) return { level: "Beginner", stars: "0★" };
    if (rating < 1400) return { level: "Easy", stars: "1★" };
    if (rating < 1600) return { level: "Medium", stars: "2★" };
    if (rating < 1800) return { level: "Medium", stars: "3★" };
    if (rating < 2000) return { level: "Hard", stars: "4★" };
    return { level: "Hard", stars: "5★" };
}
```

---

# 🎨 Step 7: UI Representation

### Suggested Display:

```
Medium • 3★ • 1720
```

---

## 🎨 Color Coding

```javascript
function getColor(level) {
    if (level === "Beginner") return "#6c757d"; // gray
    if (level === "Easy") return "#28a745";     // green
    if (level === "Medium") return "#ffc107";   // yellow
    return "#dc3545";                           // red
}
```

---

# ⚠️ Important Gotchas

## 1. CORS Issues

Browser may block API calls ❌

### Fix:

* Use backend (Node.js / Express)
* OR use a proxy server

---

## 2. Contest Problems

API format changes:

```
/api/contests/{CONTEST_CODE}/problems/{PROBLEM_CODE}
```

---

## 3. Rate Limiting

👉 Always cache results
👉 Avoid repeated API calls

---

# 🏗️ Recommended Architecture

### Backend:

* Fetch CodeChef API
* Cache difficulty

### Frontend:

* Call your backend
* Render difficulty

---

# 🔥 Why This Approach Wins

✅ No DOM scraping
✅ Works with SPA
✅ Always accurate
✅ Stable for long-term use

---

# 🧠 Final Pipeline

```
Problem URL
   ↓
Extract Problem Code
   ↓
Call CodeChef API
   ↓
Get difficulty_rating
   ↓
Map to level + stars
   ↓
Render in UI
```

---

# 🚀 TL;DR

```
Use API → get difficulty_rating → map → display
```

❌ Don’t scrape text
❌ Don’t guess

✅ Use real data
