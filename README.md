# ISS & News Live Dashboard

A real-time dashboard application that tracks the International Space Station (ISS), displays latest news articles, and includes an AI chatbot powered by HuggingFace — all in one beautiful, dark-themed interface.

## Features

### 🛰️ ISS Live Tracker
- **Real-time position** updated every 15 seconds via Open Notify API
- **Interactive map** using Leaflet.js with dark CartoDB tiles
- **Speed calculation** using the Haversine formula
- **Trajectory path** showing last 15 positions
- **Reverse geocoding** to show nearest city/ocean name
- **People in Space** — live astronaut count and names
- Manual refresh button

### 📰 News Feed
- Fetches 10 articles from NewsAPI (space/ISS/NASA topics)
- Displays 5 articles per page with pagination
- Each article shows: **title, source, author, date, image**
- **"Read More"** button linking to the full article
- **Search bar** for filtering articles
- **Sort by date** (newest/oldest first)
- **Refresh button** to fetch fresh articles
- **LocalStorage caching** — articles cached for 15 minutes
- Loading spinner while fetching
- Proper API error handling with retry option

### 🤖 AI Chatbot
- Powered by HuggingFace Inference API (Mistral-7B)
- **Restricted to dashboard data only** — answers from ISS + News data
- No internet knowledge, no guessing
- Floating action button to open/close
- Typing indicator while AI responds
- **Last 30 messages** stored in localStorage
- Clear chat option

## Tech Stack
- **HTML5** + **CSS3** (vanilla, no frameworks)
- **JavaScript** (vanilla ES6+ modules)
- **Leaflet.js** — interactive mapping
- **Font Awesome** — icons
- **Google Fonts** (Inter, JetBrains Mono)

## APIs Used
| API | Purpose | Endpoint |
|-----|---------|----------|
| Open Notify | ISS position & astronauts | `http://api.open-notify.org/` |
| NewsAPI | News articles | `https://newsapi.org/v2/` |
| Nominatim (OSM) | Reverse geocoding | `https://nominatim.openstreetmap.org/reverse` |
| HuggingFace | AI chatbot | `https://api-inference.huggingface.co/` |

## Project Structure
```
foaiendsem/
├── index.html    # Main HTML structure
├── style.css     # All styles (dark theme, responsive)
├── config.js     # API keys & configuration
├── iss.js        # ISS tracker module
├── news.js       # News feed module
├── chatbot.js    # AI chatbot module
├── app.js        # Main app orchestrator
└── README.md     # This file
```

## Setup & Running

1. **Open `index.html`** in any modern browser.
2. **Configure APIs**: Click the **Gear icon (⚙️)** in the top right corner.
3. **Enter Keys**: Provide your OpenAI and NewsAPI keys. These are saved securely in your browser's `localStorage`.
4. **Enjoy**: The ISS tracker works immediately; AI and News will activate once keys are saved.

## Deployment

This app is optimized for **Vercel** and **GitHub Pages**.
1. Push to GitHub (Done).
2. Connect to Vercel and import the repo.
3. No environment variables are needed, as users enter their own keys in the UI.

## Speed Calculation
Uses the **Haversine formula** to calculate great-circle distance between two consecutive ISS positions, divided by the time interval:

```
a = sin²(Δlat/2) + cos(lat1) × cos(lat2) × sin²(Δlng/2)
distance = 2R × atan2(√a, √(1-a))
speed = distance / time
```

## License
MIT
