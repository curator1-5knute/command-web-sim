// 1. Ініціалізація карти (центр - Україна)
const map = L.map('map', {
    zoomControl: false
}).setView([48.3794, 31.1656], 6);

L.control.zoom({ position: 'bottomright' }).addTo(map);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// 2. Координати курсора
const coordDisplay = document.getElementById('coord-display');
if (coordDisplay) {
    map.on('mousemove', function(e) {
        const lat = e.latlng.lat.toFixed(4);
        const lng = e.latlng.lng.toFixed(4);
        coordDisplay.innerText = `Шир: ${lat}, Довг: ${lng}`;
    });
}

// 3. Інструмент «Лінійка»
let rulerActive = false;
let points = [];
let markersLayer = L.layerGroup().addTo(map);
let polylineLayer = L.polyline([], { color: '#0056b3', weight: 3, dashArray: '5, 5' }).addTo(map);

const btnRuler = document.getElementById('btn-ruler');
const btnClear = document.getElementById('btn-clear');

if (btnRuler) {
    btnRuler.addEventListener('click', () => {
        rulerActive = !rulerActive;
        targetCreationMode = false;
        btnRuler.classList.toggle('active', rulerActive);
        map.getContainer().style.cursor = rulerActive ? 'crosshair' : '';
    });
}

if (btnClear) {
    btnClear.addEventListener('click', () => {
        points = [];
        markersLayer.clearLayers();
        polylineLayer.setLatLngs([]);
    });
}

// 4. Додавання загроз
let targetCreationMode = false;
const btnAddThreat = document.getElementById('btn-add-threat');

if (btnAddThreat) {
    btnAddThreat.addEventListener('click', () => {
        targetCreationMode = !targetCreationMode;
        rulerActive = false;
        btnAddThreat.classList.toggle('active', targetCreationMode);
        map.getContainer().style.cursor = targetCreationMode ? 'crosshair' : '';
    });
}

// Кліки по карті
map.on('click', function(e) {
    if (rulerActive) {
        points.push(e.latlng);
        const marker = L.circleMarker(e.latlng, {
            radius: 6, color: '#fff', fillColor: '#0056b3', fillOpacity: 1
        }).addTo(markersLayer);

        polylineLayer.setLatLngs(points);

        if (points.length > 1) {
            let totalDistance = 0;
            for (let i = 1; i < points.length; i++) {
                totalDistance += points[i - 1].distanceTo(points[i]);
            }
            marker.bindPopup(`<b>Дистанція:</b> ${(totalDistance / 1000).toFixed(2)} км`).openPopup();
        } else {
            marker.bindPopup(`<b>Старт лінійки</b>`).openPopup();
        }
    } 
    else if (targetCreationMode) {
        targetCreationMode = false;
        if (btnAddThreat) btnAddThreat.classList.remove('active');
        map.getContainer().style.cursor = '';

        const typeKey = prompt("Виберіть тип загрози:\n1 - БПЛА Шахед (150 км/год)\n2 - Крилата ракета Х-101 (750 км/год)\n3 - Балістика (3500 км/год)", "2");
        if (!typeKey) return;

        let name = "Крилата ракета", speed = 750, color = "#ff4444", icon = "🚀";
        if (typeKey === '1') { name = 'БПЛА "Шахед"'; speed = 150; color = "#ffaa00"; icon = "🛸"; }
        if (typeKey === '3') { name = 'Балістична ракета'; speed = 3500; color = "#cc0000"; icon = "⚡"; }

        const heading = parseFloat(prompt("Введіть курс (азимут у градусах від 0 до 360):", "45")) || 0;

        const threat = {
            lat: e.latlng.lat,
            lng: e.latlng.lng,
            speedKmH: speed,
            heading: heading,
            marker: null
        };

        const customIcon = L.divIcon({
            className: 'custom-threat-marker',
            html: `<div style="background: ${color}; color: white; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: bold; border: 1px solid #fff; white-space: nowrap;">${icon} ${name}</div>`,
            iconSize: [120, 20],
            iconAnchor: [60, 10]
        });

        threat.marker = L.marker([threat.lat, threat.lng], { icon: customIcon }).addTo(map);
        activeThreats.push(threat);
    }
});

// 5. Симуляція
let simulationActive = true;
const btnSim = document.getElementById('btn-sim');
let activeThreats = [];

if (btnSim) {
    btnSim.addEventListener('click', () => {
        simulationActive = !simulationActive;
        btnSim.classList.toggle('active', simulationActive);
        btnSim.innerText = simulationActive ? "▶ Симуляція" : "⏸ Пауза";
    });
}

// Тестова ціль
const initialThreat = {
    lat: 47.8388,
    lng: 35.1395,
    speedKmH: 750,
    heading: 310,
    marker: L.marker([47.8388, 35.1395], {
        icon: L.divIcon({
            className: 'custom-threat-marker',
            html: `<div style="background: #ff4444; color: white; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: bold; border: 1px solid #fff; white-space: nowrap;">🚀 Х-101 (Ціль)</div>`,
            iconSize: [120, 20],
            iconAnchor: [60, 10]
        })
    }).addTo(map)
};
activeThreats.push(initialThreat);

// Оновлення кожної секунди
setInterval(() => {
    if (!simulationActive) return;

    activeThreats.forEach(threat => {
        const distancePerSec = (threat.speedKmH / 3600) / 111;
        const rad = (threat.heading * Math.PI) / 180;
        
        threat.lat += distancePerSec * Math.cos(rad);
        threat.lng += (distancePerSec * Math.sin(rad)) / Math.cos(threat.lat * Math.PI / 180);

        threat.marker.setLatLng([threat.lat, threat.lng]);
    });
}, 1000);
