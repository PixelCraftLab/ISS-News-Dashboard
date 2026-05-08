/* ========== Chatbot Module ========== */
const Chatbot = (() => {
    const STORAGE_KEY = 'iss_dashboard_chat';
    let messages = [];

    function loadMessages() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) messages = JSON.parse(saved);
        } catch { messages = []; }
    }

    function saveMessages() {
        if (messages.length > CONFIG.MAX_CHAT_MESSAGES) {
            messages = messages.slice(-CONFIG.MAX_CHAT_MESSAGES);
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    }

    function buildDashboardContext() {
        let context = 'DASHBOARD DATA (answer ONLY from this data, never guess or use outside knowledge):\n\n';

        // ISS Data
        const iss = window.__issData;
        if (iss) {
            context += `ISS POSITION:\n- Latitude: ${iss.lat}\n- Longitude: ${iss.lng}\n`;
            context += `- Speed: ${iss.speed ? Math.round(iss.speed) + ' km/h' : 'Calculating...'}\n`;
            context += `- Location: ${iss.location}\n- Positions tracked: ${iss.trajectory}\n\n`;
        } else {
            context += 'ISS POSITION: Data not yet loaded.\n\n';
        }

        // Astronauts
        const astro = window.__astronautData;
        if (astro) {
            context += `PEOPLE IN SPACE: ${astro.number} total\n`;
            astro.people.forEach(p => { context += `- ${p.name} (${p.craft})\n`; });
            context += '\n';
        }

        // News
        const news = window.__newsData;
        if (news && news.length > 0) {
            context += `NEWS ARTICLES (${news.length} articles):\n`;
            news.forEach((a, i) => {
                context += `${i + 1}. Title: ${a.title || 'N/A'}\n`;
                context += `   Source: ${a.source?.name || 'N/A'} | Author: ${a.author || 'N/A'}\n`;
                context += `   Date: ${a.publishedAt || 'N/A'}\n`;
                if (a.description) context += `   Summary: ${a.description}\n`;
                context += '\n';
            });
        } else {
            context += 'NEWS: No articles loaded yet.\n';
        }

        return context;
    }

    function addMessage(role, text) {
        messages.push({ role, text, time: Date.now() });
        saveMessages();
    }

    function renderMessages() {
        const container = document.getElementById('chat-messages');
        if (messages.length === 0) {
            container.innerHTML = `
                <div class="chat-welcome">
                    <div class="welcome-icon"><i class="fas fa-satellite-dish"></i></div>
                    <p>Hi! I can answer questions about the <strong>ISS position</strong> and <strong>current news</strong> shown on this dashboard. Ask me anything about the data displayed!</p>
                </div>`;
            return;
        }
        container.innerHTML = messages.map(m =>
            `<div class="chat-msg ${m.role}">${escapeHTML(m.text)}</div>`
        ).join('');
        container.scrollTop = container.scrollHeight;
    }

    function escapeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function setTyping(show) {
        document.getElementById('chat-typing').style.display = show ? 'flex' : 'none';
        if (show) {
            const container = document.getElementById('chat-messages');
            container.scrollTop = container.scrollHeight;
        }
    }

    async function sendToOpenAI(userMessage) {
        const dashboardContext = buildDashboardContext();
        
        if (!CONFIG.OPENAI_API_KEY) {
            throw new Error('OpenAI API Key missing. Please set it in Settings (top right).');
        }

        const systemPrompt = `You are a helpful assistant for an ISS & News dashboard. You MUST answer ONLY using the dashboard data provided.
        ISS Data: ${JSON.stringify(window.__issData || {})}
        Astronauts: ${JSON.stringify(window.__astronautData || {})}
        News Data: ${JSON.stringify(window.__newsData || [])}

        If the user asks something not in the data, say "I can only answer based on the current dashboard data."`;

        const url = 'https://api.openai.com/v1/chat/completions';
        const proxiedUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
        
        const res = await fetch(proxiedUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${CONFIG.OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: CONFIG.OPENAI_MODEL,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userMessage }
                ],
                max_tokens: 300,
                temperature: 0.3
            })
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error?.message || `OpenAI API error: ${res.status}`);
        }

        const data = await res.json();
        return data.choices[0].message.content.trim();
    }

    async function handleSend() {
        const input = document.getElementById('chat-input');
        const text = input.value.trim();
        if (!text) return;

        input.value = '';
        addMessage('user', text);
        renderMessages();
        setTyping(true);

        try {
            const reply = await sendToOpenAI(text);
            addMessage('bot', reply);
        } catch (err) {
            console.error('Chatbot error:', err);
            addMessage('bot', 'Sorry, I encountered an error: ' + err.message);
        } finally {
            setTyping(false);
            renderMessages();
        }
    }

    function clearChat() {
        messages = [];
        localStorage.removeItem(STORAGE_KEY);
        renderMessages();
        App.showToast('Chat cleared', 'info');
    }

    function toggleWindow() {
        const win = document.getElementById('chatbot-window');
        const fab = document.getElementById('chatbot-fab');
        const isOpen = win.style.display !== 'none';
        win.style.display = isOpen ? 'none' : 'flex';
        fab.innerHTML = isOpen
            ? '<i class="fas fa-robot"></i><span class="fab-pulse"></span>'
            : '<i class="fas fa-times"></i>';
    }

    function bindEvents() {
        document.getElementById('chatbot-fab').addEventListener('click', toggleWindow);
        document.getElementById('close-chat-btn').addEventListener('click', toggleWindow);
        document.getElementById('clear-chat-btn').addEventListener('click', clearChat);
        document.getElementById('chat-send-btn').addEventListener('click', handleSend);
        document.getElementById('chat-input').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') handleSend();
        });
    }

    function init() {
        loadMessages();
        renderMessages();
        bindEvents();
    }

    return { init };
})();
