/* ========== Main App Orchestrator ========== */
const App = (() => {
    function showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        const icons = { success: 'fa-check-circle', error: 'fa-exclamation-circle', info: 'fa-info-circle' };
        toast.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i> ${message}`;
        container.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(40px)';
            setTimeout(() => toast.remove(), 300);
        }, 3500);
    }

    function updateClock() {
        const el = document.getElementById('header-time');
        if (el) {
            el.textContent = new Date().toLocaleTimeString('en-US', {
                hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
            });
        }
    }

    function hideLoader() {
        const loader = document.getElementById('app-loader');
        loader.classList.add('hidden');
        setTimeout(() => loader.remove(), 600);
    }

    function setLoaderStatus(text) {
        const el = document.getElementById('loader-status');
        if (el) el.textContent = text;
    }

    async function init() {
        try {
            // Clock
            updateClock();
            setInterval(updateClock, 1000);

            // ISS
            setLoaderStatus('Connecting to ISS...');
            await ISSTracker.init();

            // News
            setLoaderStatus('Loading news articles...');
            await NewsModule.init();

            // Chatbot
            setLoaderStatus('Initializing AI assistant...');
            Chatbot.init();

            // Theme Toggle
            const themeBtn = document.getElementById('theme-toggle');
            const currentTheme = localStorage.getItem('theme') || 'dark';
            document.documentElement.setAttribute('data-theme', currentTheme);
            themeBtn.querySelector('i').className = currentTheme === 'light' ? 'fas fa-sun' : 'fas fa-moon';

            themeBtn.addEventListener('click', () => {
                const theme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
                document.documentElement.setAttribute('data-theme', theme);
                localStorage.setItem('theme', theme);
                themeBtn.querySelector('i').className = theme === 'light' ? 'fas fa-sun' : 'fas fa-moon';
                showToast(`${theme.charAt(0).toUpperCase() + theme.slice(1)} mode enabled`, 'info');
            });

            // Settings Modal
            const settingsModal = document.getElementById('settings-modal');
            const settingsToggle = document.getElementById('settings-toggle');
            const closeSettings = document.getElementById('close-settings');
            const saveSettings = document.getElementById('save-settings');
            const openaiInput = document.getElementById('openai-key-input');
            const newsInput = document.getElementById('news-key-input');

            const openModal = () => {
                openaiInput.value = localStorage.getItem('openai_api_key') || '';
                newsInput.value = localStorage.getItem('news_api_key') || '';
                settingsModal.classList.add('active');
            };

            settingsToggle.addEventListener('click', openModal);
            closeSettings.addEventListener('click', () => settingsModal.classList.remove('active'));
            window.addEventListener('click', (e) => { if (e.target === settingsModal) settingsModal.classList.remove('active'); });

            saveSettings.addEventListener('click', () => {
                localStorage.setItem('openai_api_key', openaiInput.value.trim());
                localStorage.setItem('news_api_key', newsInput.value.trim());
                settingsModal.classList.remove('active');
                showToast('Settings saved! Refreshing...', 'success');
                setTimeout(() => window.location.reload(), 1000);
            });

            // Prompt for keys if missing
            if (!localStorage.getItem('news_api_key') || !localStorage.getItem('openai_api_key')) {
                setTimeout(openModal, 2000);
            }

            // Refresh all button
            document.getElementById('refresh-all-btn').addEventListener('click', async () => {
                const btn = document.getElementById('refresh-all-btn');
                btn.classList.add('spinning');
                await Promise.all([ISSTracker.refresh(), NewsModule.loadNews(true)]);
                setTimeout(() => btn.classList.remove('spinning'), 600);
            });

            // ISS refresh button
            document.getElementById('iss-refresh-btn').addEventListener('click', () => ISSTracker.refresh());

            // Done
            hideLoader();
            showToast('Dashboard loaded successfully', 'success');
        } catch (err) {
            console.error('App init error:', err);
            hideLoader();
            showToast('Error initializing dashboard: ' + err.message, 'error');
        }
    }

    return { init, showToast };
})();

// Start app when DOM is ready
document.addEventListener('DOMContentLoaded', App.init);
