

# 📄 Codeforces Difficulty Extraction Roadmap

---

# 🔥 Goal

Accurately determine the **difficulty level of a Codeforces problem** using rating data.

---

# 🧠 Core Idea

Unlike CodeChef:

👉 Codeforces is **server-rendered (not SPA)**
👉 Ratings are sometimes available in DOM, sometimes not

---

# ✅ Step 1: Understand Page Types

## 🟢 Problem List Page

Example:

```
https://codeforces.com/problemset
```

✔ Rating is visible in DOM
✔ Easy to scrape

---

## 🔴 Problem Page

Example:

```
https://codeforces.com/problemset/problem/263/A
```

❌ Rating NOT present in DOM
👉 Must use API or cached data

---

# 🔍 Step 2: Extract Rating (Problem List)

### DOM Structure (simplified)

```html
<td>800</td>
```

---

## 💻 JS Extraction

```javascript
function getProblemRatings() {
    const rows = document.querySelectorAll('.problemset-problems tr');

    rows.forEach(row => {
        const ratingCell = row.children[5];
        if (!ratingCell) return;

        const rating = parseInt(ratingCell.innerText);
        console.log(rating);
    });
}
```

---

# 🚀 Step 3: Extract Rating (Problem Page)

## 🔧 Extract Problem Info from URL

Example URL:

```
https://codeforces.com/problemset/problem/263/A
```

Extract:

```
contestId = 263
index = A
```

---

## 💻 JS Code

```javascript
function getProblemInfo() {
    const parts = window.location.pathname.split('/');
    
    return {
        contestId: parts[3],
        index: parts[4]
    };
}
```

---

# 🌐 Step 4: Use Codeforces API

## 📡 Endpoint

```
https://codeforces.com/api/problemset.problems
```

---

## ⚠️ Note

* Returns ALL problems (~large response)
* Should NOT be called repeatedly

---

## 💻 Fetch + Store

```javascript
let problemMap = {};

async function loadProblems() {
    const res = await fetch("https://codeforces.com/api/problemset.problems");
    const data = await res.json();

    data.result.problems.forEach(p => {
        const key = `${p.contestId}-${p.index}`;
        problemMap[key] = p.rating;
    });
}
```

---

## 🔍 Get Current Problem Rating

```javascript
function getCurrentProblemRating() {
    const { contestId, index } = getProblemInfo();
    return problemMap[`${contestId}-${index}`];
}
```

---

# ⚡ Step 5: Cache for Performance

## ✅ Use localStorage

```javascript
localStorage.setItem("cfProblems", JSON.stringify(problemMap));

const map = JSON.parse(localStorage.getItem("cfProblems"));
```

---

# 🎯 Step 6: Difficulty Classification

## 📊 Mapping

```
800–1200   → Easy  
1300–1600  → Medium  
1700–2200  → Hard  
2300+      → Expert  
```

---

## 💻 JS Implementation

```javascript
function classifyCF(rating) {
    if (rating < 1200) return "Easy";
    if (rating < 1700) return "Medium";
    if (rating < 2300) return "Hard";
    return "Expert";
}
```

---

# 🎨 Step 7: UI Display

## Example

```
Easy • 800
Medium • 1500
Hard • 1900
```

---

## 🎨 Color Coding

```javascript
function getColor(level) {
    if (level === "Easy") return "#28a745";     // green
    if (level === "Medium") return "#ffc107";   // yellow
    if (level === "Hard") return "#dc3545";     // red
    return "#6f42c1";                           // purple (expert)
}
```

---

# 🏗️ Recommended Architecture

## 🔥 Hybrid Approach

```
Problem List Page
    ↓
Scrape ratings (fast)
    ↓
Store in localStorage
    ↓
Problem Page
    ↓
Extract contestId + index
    ↓
Lookup rating from cache
    ↓
Fallback → API if missing
```

---

# ⚠️ Gotchas

## 1. Missing Ratings

Some problems may not have ratings

👉 Handle:

```javascript
if (!rating) return "Unknown";
```

---

## 2. API Size

* problemset.problems is large
  👉 Cache it once

---

## 3. URL Variants

Handle:

```
/problemset/problem/
/contest/
/gym/
```

---

# 🔥 Why This Works

✅ No unreliable scraping
✅ Accurate ratings
✅ Works on all pages
✅ Scalable

---

# 🧠 Final Pipeline

```
URL → extract contestId/index
      ↓
Get rating (cache/API)
      ↓
Classify difficulty
      ↓
Render in UI
```

---

# 🚀 TL;DR

```
Problem List → scrape
Problem Page → API or cache
Use rating → classify → display
```

