# BigQuery Release Notes Dashboard

A modern, high-fidelity web application built with Python Flask and plain vanilla HTML, JavaScript, and CSS that fetches Google Cloud BigQuery release notes, parses individual updates, and lets you share specific announcements directly on X (formerly Twitter).

---

## 🛠️ Tech Stack & Architecture

- **Backend**: Python Flask ([app.py](file:///C:/Users/Grat/Documents/agy-cli-projects/Gratco-event-talks-app/app.py))
  - Uses standard library `urllib` and `xml.etree.ElementTree` to parse the Atom XML feed.
  - Implements regular-expression splitting of entry HTML details to extract and categorize multiple releases in a single day.
  - Includes a memory-based caching mechanism (5-minute TTL) with a manual bypass query parameter (`?refresh=true`) to avoid rate-limiting or slowing down requests.
- **Frontend**:
  - **HTML Structure**: ([index.html](file:///C:/Users/Grat/Documents/agy-cli-projects/Gratco-event-talks-app/templates/index.html)) structured with semantic tags and custom inline SVG graphics.
  - **CSS Styling**: ([style.css](file:///C:/Users/Grat/Documents/agy-cli-projects/Gratco-event-talks-app/static/style.css)) loaded with HSL variables, dark and light modes, skeleton loading screens, glassmorphic accents, and smooth animations.
  - **JS Logic**: ([app.js](file:///C:/Users/Grat/Documents/agy-cli-projects/Gratco-event-talks-app/static/app.js)) handles real-time keyword searching, category badge counts, toast popups, local theme storage, and the draft tweet composer.

---

## ✨ Features Included

1. **Granular Separation**: Instead of showing a whole day's release notes in one monolithic block, the app parses headings (`<h3>` tags) to separate and cardify each individual update (e.g. *Feature*, *Issue*, *Announcement*, *Deprecation*).
2. **Draft Tweet Composer Modal**:
   - Pre-fills a beautifully formatted tweet draft, calculating the safe character count automatically and appending a text ellipsis (`...`) if needed to stay within X's 280-character limit.
   - Features a live circular progress ring that turns from blue to amber and red as you approach and exceed the limit.
   - Offers "Post on X" (directing to X's Web Intent composer) and "Copy Text" (with copy status animations).
3. **Card Utility Copying**: A quick "Copy" button on every release card copies the plain text content directly to your clipboard with immediate status feedback.
4. **CSV Exporting**: An "Export CSV" button in the header parses the current filtered releases (reflecting your active search keywords and category chips) and generates a downloadable CSV file.
5. **Real-time Searching & Filtering**: Filters the list dynamically as you type or select category chips with real-time update count badges.
6. **Dark & Light Mode**: Seamless theme toggle preserving user choices in browser `localStorage`.
7. **Robust Error Handling**: Caches last-synced feed elements. If the active sync fails due to internet issues, it displays the cached version with a warn banner.

---

## 📂 Project Directory Structure

- [app.py](file:///C:/Users/Grat/Documents/agy-cli-projects/Gratco-event-talks-app/app.py) — Core Flask server and XML/HTML parsing backend.
- [requirements.txt](file:///C:/Users/Grat/Documents/agy-cli-projects/Gratco-event-talks-app/requirements.txt) — Dependency list (`flask`).
- **templates/**
  - [index.html](file:///C:/Users/Grat/Documents/agy-cli-projects/Gratco-event-talks-app/templates/index.html) — Core dashboard template and composer modal markup.
- **static/**
  - [style.css](file:///C:/Users/Grat/Documents/agy-cli-projects/Gratco-event-talks-app/static/style.css) — Custom dashboard styling, gradients, and layouts.
  - [app.js](file:///C:/Users/Grat/Documents/agy-cli-projects/Gratco-event-talks-app/static/app.js) — Interactive filtering, modal states, X integrations, and rendering engine.

---

## 🚀 Running the App Locally

To start the application:

1. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```
2. Run the Flask server:
   ```bash
   python app.py
   ```
3. Open your browser and navigate to:
   ```
   http://127.0.0.1:5000
   ```
