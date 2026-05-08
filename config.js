/**
 * Configuration file for ISS & News Dashboard
 * For deployment safety, API keys should be set via environment variables
 * or a backend proxy in production.
 */
const CONFIG = Object.freeze({
    ISS_API: 'http://api.open-notify.org',
    ISS_API_PROXY: 'https://api.allorigins.win/raw?url=' + encodeURIComponent('http://api.open-notify.org'),
    get NEWS_API_KEY() { return localStorage.getItem('news_api_key') || ''; },
    NEWS_API_BASE: 'https://newsapi.org/v2',
    get OPENAI_API_KEY() { return localStorage.getItem('openai_api_key') || ''; },
    OPENAI_MODEL: 'gpt-4o-mini',
    ISS_POLL_INTERVAL: 15000,       // 15 seconds
    NEWS_CACHE_DURATION: 15 * 60 * 1000, // 15 minutes
    MAX_TRAJECTORY_POINTS: 15,
    ARTICLES_PER_PAGE: 5,
    TOTAL_ARTICLES: 10,
    MAX_CHAT_MESSAGES: 30,
    REVERSE_GEOCODE_URL: 'https://nominatim.openstreetmap.org/reverse'
});
