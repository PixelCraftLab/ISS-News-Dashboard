/* ========== ISS Tracker Module ========== */
const ISSTracker = (() => {
    let map, marker, polyline, trajectoryPoints = [];
    let previousPosition = null, previousTime = null;
    let pollTimer = null;

    // Haversine formula for distance between two lat/lng points
    function haversineDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Earth radius in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    function initMap() {
        map = L.map('iss-map', {
            center: [20, 0], zoom: 2,
            zoomControl: true, attributionControl: false
        });
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            maxZoom: 18
        }).addTo(map);

        const issIcon = L.divIcon({
            html: '<div style="font-size:28px;filter:drop-shadow(0 0 8px rgba(99,102,241,0.7));">🛰️</div>',
            iconSize: [32, 32], iconAnchor: [16, 16], className: ''
        });
        marker = L.marker([0, 0], { icon: issIcon }).addTo(map);
        polyline = L.polyline([], { color: '#6366f1', weight: 2, opacity: 0.7, dashArray: '6 4' }).addTo(map);
    }

    // Fetch with CORS proxy fallback
    async function fetchWithFallback(endpoint) {
        const isHttps = window.location.protocol === 'https:';
        const directUrl = CONFIG.ISS_API + endpoint;
        const proxyUrl = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(directUrl);

        // If on HTTPS, direct HTTP will definitely fail with Mixed Content error
        // so we skip the direct attempt to save time and avoid console errors
        if (!isHttps) {
            try {
                const res = await fetch(directUrl);
                if (res.ok) return await res.json();
            } catch (err) {
                console.warn('Direct fetch failed, falling back to proxy...');
            }
        }

        const res = await fetch(proxyUrl);
        if (!res.ok) throw new Error('ISS API proxy returned ' + res.status);
        return await res.json();
    }

    async function fetchPosition() {
        return fetchWithFallback('/iss-now.json');
    }

    async function fetchAstronauts() {
        return fetchWithFallback('/astros.json');
    }

    async function reverseGeocode(lat, lng) {
        try {
            const res = await fetch(
                `${CONFIG.REVERSE_GEOCODE_URL}?lat=${lat}&lon=${lng}&format=json&zoom=5`,
                { headers: { 'Accept-Language': 'en' } }
            );
            if (!res.ok) return 'Unknown location';
            const data = await res.json();
            if (data.address) {
                return data.address.city || data.address.state || data.address.country || data.display_name || 'Over Ocean';
            }
            return data.display_name || 'Over Ocean';
        } catch {
            return 'Location unavailable';
        }
    }

    function calculateSpeed(lat, lng, timestamp) {
        if (!previousPosition) {
            previousPosition = { lat, lng };
            previousTime = timestamp;
            return null;
        }
        const dist = haversineDistance(previousPosition.lat, previousPosition.lng, lat, lng);
        const timeDiffHours = (timestamp - previousTime) / 3600;
        previousPosition = { lat, lng };
        previousTime = timestamp;
        if (timeDiffHours <= 0) return null;
        return dist / timeDiffHours;
    }

    function updateUI(lat, lng, speed, locationName) {
        document.getElementById('iss-lat').textContent = parseFloat(lat).toFixed(4) + '°';
        document.getElementById('iss-lng').textContent = parseFloat(lng).toFixed(4) + '°';
        document.getElementById('iss-speed').textContent = speed !== null ? Math.round(speed).toLocaleString() + ' km/h' : '-- km/h';
        document.getElementById('iss-location').textContent = locationName;
        document.getElementById('nearest-place-label').innerHTML = '<i class="fas fa-map-pin"></i> ' + locationName;
        document.getElementById('positions-tracked').textContent = trajectoryPoints.length + ' positions';
    }

    function renderAstronauts(data) {
        const list = document.getElementById('astronaut-list');
        const count = document.getElementById('astronaut-count');
        count.textContent = data.number;
        list.innerHTML = data.people.map(p =>
            `<div class="astronaut-item">
                <span class="astronaut-name"><i class="fas fa-user" style="margin-right:6px;font-size:0.7rem;color:var(--accent)"></i>${p.name}</span>
                <span class="astronaut-craft">${p.craft}</span>
            </div>`
        ).join('');
    }

    async function update() {
        try {
            const data = await fetchPosition();
            const lat = parseFloat(data.iss_position.latitude);
            const lng = parseFloat(data.iss_position.longitude);
            const speed = calculateSpeed(lat, lng, data.timestamp);

            // Update trajectory
            trajectoryPoints.push([lat, lng]);
            if (trajectoryPoints.length > CONFIG.MAX_TRAJECTORY_POINTS) {
                trajectoryPoints.shift();
            }

            // Update map
            marker.setLatLng([lat, lng]);
            polyline.setLatLngs(trajectoryPoints);
            map.panTo([lat, lng], { animate: true, duration: 1 });

            // Reverse geocode
            const locationName = await reverseGeocode(lat, lng);

            updateUI(lat, lng, speed, locationName);

            // Store latest data globally for chatbot
            window.__issData = { lat, lng, speed, location: locationName, trajectory: trajectoryPoints.length, timestamp: data.timestamp };
        } catch (err) {
            console.error('ISS update error:', err);
            App.showToast('ISS data fetch failed: ' + err.message, 'error');
        }
    }

    async function loadAstronauts() {
        try {
            const data = await fetchAstronauts();
            renderAstronauts(data);
            window.__astronautData = data;
        } catch (err) {
            console.error('Astronaut fetch error:', err);
            document.getElementById('astronaut-list').innerHTML = '<p style="color:var(--danger);font-size:0.82rem;padding:8px;">Failed to load astronaut data</p>';
        }
    }

    function startPolling() {
        if (pollTimer) clearInterval(pollTimer);
        pollTimer = setInterval(update, CONFIG.ISS_POLL_INTERVAL);
    }

    async function init() {
        initMap();
        await Promise.all([update(), loadAstronauts()]);
        startPolling();
    }

    async function refresh() {
        const btn = document.getElementById('iss-refresh-btn');
        btn.classList.add('spinning');
        await Promise.all([update(), loadAstronauts()]);
        setTimeout(() => btn.classList.remove('spinning'), 600);
        App.showToast('ISS data refreshed', 'success');
    }

    return { init, refresh, update };
})();
