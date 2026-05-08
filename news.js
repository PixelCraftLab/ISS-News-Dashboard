/* ========== News Module ========== */
const NewsModule = (() => {
    let allArticles = [], filteredArticles = [], currentPage = 1;

    const CACHE_KEY = 'iss_dashboard_news';
    const CACHE_TIME_KEY = 'iss_dashboard_news_time';

    function getCachedNews() {
        const cached = localStorage.getItem(CACHE_KEY);
        const cachedTime = localStorage.getItem(CACHE_TIME_KEY);
        if (cached && cachedTime) {
            const age = Date.now() - parseInt(cachedTime, 10);
            if (age < CONFIG.NEWS_CACHE_DURATION) {
                return JSON.parse(cached);
            }
        }
        return null;
    }

    function setCachedNews(articles) {
        localStorage.setItem(CACHE_KEY, JSON.stringify(articles));
        localStorage.setItem(CACHE_TIME_KEY, Date.now().toString());
    }

    function clearCache() {
        localStorage.removeItem(CACHE_KEY);
        localStorage.removeItem(CACHE_TIME_KEY);
    }

    function showLoader(show) {
        document.getElementById('news-loader').style.display = show ? 'flex' : 'none';
        document.getElementById('news-grid').style.display = show ? 'none' : 'grid';
        document.getElementById('news-pagination').style.display = show ? 'none' : 'flex';
    }

    function showError(msg) {
        document.getElementById('news-error').style.display = 'block';
        document.getElementById('news-error-msg').textContent = msg;
        document.getElementById('news-grid').style.display = 'none';
        document.getElementById('news-pagination').style.display = 'none';
        document.getElementById('news-loader').style.display = 'none';
    }

    function hideError() {
        document.getElementById('news-error').style.display = 'none';
    }

    async function fetchNews() {
        if (!CONFIG.NEWS_API_KEY) {
            throw new Error('NewsAPI Key missing. Please set it in Settings.');
        }
        // Try cache first
        const cached = getCachedNews();
        if (cached) {
            return cached;
        }

        const baseUrl = `${CONFIG.NEWS_API_BASE}/everything?q=space OR ISS OR NASA&pageSize=${CONFIG.TOTAL_ARTICLES}&sortBy=publishedAt&apiKey=${CONFIG.NEWS_API_KEY}`;

        // Try direct request first, then CORS proxy fallback
        let res;
        try {
            res = await fetch(baseUrl);
            if (!res.ok) throw new Error('Direct fetch status ' + res.status);
        } catch (err) {
            // CORS blocked or other error — try proxy fallback
            console.warn('Direct News fetch failed, trying proxy...', err.message);
            const proxyUrl = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(baseUrl);
            res = await fetch(proxyUrl);
        }

        if (!res.ok) {
            throw new Error(`News API returned ${res.status}`);
        }

        const data = await res.json();
        if (data.status !== 'ok') throw new Error(data.message || 'Unknown news API error');

        const articles = (data.articles || []).slice(0, CONFIG.TOTAL_ARTICLES);
        setCachedNews(articles);
        return articles;
    }

    function formatDate(dateStr) {
        if (!dateStr) return 'Unknown date';
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    function renderArticles() {
        const grid = document.getElementById('news-grid');
        const start = (currentPage - 1) * CONFIG.ARTICLES_PER_PAGE;
        const pageArticles = filteredArticles.slice(start, start + CONFIG.ARTICLES_PER_PAGE);

        if (pageArticles.length === 0) {
            grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:var(--text-muted);padding:40px;">No articles found.</p>';
            document.getElementById('news-pagination').style.display = 'none';
            return;
        }

        grid.innerHTML = pageArticles.map((a, i) => `
            <article class="news-card" style="animation-delay:${i * 0.08}s" id="news-card-${start + i}">
                ${a.urlToImage
                ? `<img class="news-card-img" src="${a.urlToImage}" alt="${(a.title || '').replace(/"/g, '&quot;')}" loading="lazy" onerror="this.outerHTML='<div class=\\'news-card-img-placeholder\\'><i class=\\'fas fa-image\\'></i></div>'">`
                : '<div class="news-card-img-placeholder"><i class="fas fa-image"></i></div>'}
                <div class="news-card-body">
                    <div class="news-card-meta">
                        <span class="news-source">${a.source?.name || 'Unknown'}</span>
                        <span><i class="far fa-calendar-alt"></i> ${formatDate(a.publishedAt)}</span>
                    </div>
                    <h3 class="news-card-title">${a.title || 'Untitled'}</h3>
                    <p class="news-card-author"><i class="far fa-user"></i> ${a.author || 'Unknown Author'}</p>
                    <div class="news-card-footer">
                        <a href="${a.url || '#'}" target="_blank" rel="noopener" class="news-readmore">
                            <i class="fas fa-book-open"></i> Read More
                        </a>
                    </div>
                </div>
            </article>
        `).join('');

        // Pagination
        const totalPages = Math.ceil(filteredArticles.length / CONFIG.ARTICLES_PER_PAGE);
        const pagination = document.getElementById('news-pagination');
        if (totalPages > 1) {
            pagination.style.display = 'flex';
            document.getElementById('page-info').textContent = `Page ${currentPage} of ${totalPages}`;
            document.getElementById('prev-page-btn').disabled = currentPage <= 1;
            document.getElementById('next-page-btn').disabled = currentPage >= totalPages;
        } else {
            pagination.style.display = 'none';
        }
    }

    function sortArticles(order) {
        filteredArticles.sort((a, b) => {
            const da = new Date(a.publishedAt || 0), db = new Date(b.publishedAt || 0);
            return order === 'newest' ? db - da : da - db;
        });
        currentPage = 1;
        renderArticles();
    }

    function filterArticles(query) {
        const q = query.toLowerCase().trim();
        if (!q) {
            filteredArticles = [...allArticles];
        } else {
            filteredArticles = allArticles.filter(a =>
                (a.title || '').toLowerCase().includes(q) ||
                (a.author || '').toLowerCase().includes(q) ||
                (a.source?.name || '').toLowerCase().includes(q) ||
                (a.description || '').toLowerCase().includes(q)
            );
        }
        const sortOrder = document.getElementById('news-sort').value;
        sortArticles(sortOrder);
    }

    async function loadNews(forceRefresh = false) {
        hideError();
        showLoader(true);
        try {
            if (forceRefresh) clearCache();
            allArticles = await fetchNews();
            filteredArticles = [...allArticles];
            window.__newsData = allArticles; // For chatbot
            showLoader(false);
            const sortOrder = document.getElementById('news-sort').value;
            sortArticles(sortOrder);
        } catch (err) {
            console.error('News load error:', err);
            showLoader(false);
            showError(err.message || 'Failed to load news');
            App.showToast('News fetch failed: ' + err.message, 'error');
        }
    }

    function bindEvents() {
        // Search
        const searchInput = document.getElementById('news-search');
        const searchClear = document.getElementById('search-clear');
        let searchTimeout;
        searchInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchClear.style.display = searchInput.value ? 'block' : 'none';
            searchTimeout = setTimeout(() => filterArticles(searchInput.value), 300);
        });
        searchClear.addEventListener('click', () => {
            searchInput.value = '';
            searchClear.style.display = 'none';
            filterArticles('');
        });

        // Sort
        document.getElementById('news-sort').addEventListener('change', (e) => {
            sortArticles(e.target.value);
        });

        // Refresh
        document.getElementById('news-refresh-btn').addEventListener('click', async () => {
            const btn = document.getElementById('news-refresh-btn');
            btn.classList.add('spinning');
            await loadNews(true);
            setTimeout(() => btn.classList.remove('spinning'), 600);
            App.showToast('News refreshed', 'success');
        });

        // Retry
        document.getElementById('news-retry-btn').addEventListener('click', () => loadNews(true));

        // Pagination
        document.getElementById('prev-page-btn').addEventListener('click', () => {
            if (currentPage > 1) { currentPage--; renderArticles(); }
        });
        document.getElementById('next-page-btn').addEventListener('click', () => {
            const totalPages = Math.ceil(filteredArticles.length / CONFIG.ARTICLES_PER_PAGE);
            if (currentPage < totalPages) { currentPage++; renderArticles(); }
        });
    }

    async function init() {
        bindEvents();
        await loadNews();
    }

    return { init, loadNews };
})();
