// 1. Ініціалізація карти (центр - Україна)
const map = L.map('map', {
    zoomControl: false
}).setView([48.3794, 31.1656], 7);

L.control.zoom({ position: 'bottomright' }).addTo(map);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

const coordDisplay = document.getElementById('coord-display');

map.on('mousemove', function(e) {
    const lat = e.latlng.lat.toFixed(4);
    const lng = e.latlng.lng.toFixed(4);
    coordDisplay.innerText = `Шир: ${lat}, Довг: ${lng}`;
});

// --- ІНСТРУМЕНТ «ЛІНІЙКА» ---
let rulerActive = false;
let points = [];
let markersLayer = L.layerGroup().addTo(map);
let polylineLayer = L.polyline([], { color: '#0056b3', weight: 3, dashArray: '5, 5' }).addTo(map);

const btnRuler = document.getElementById('btn-ruler');
const btnClear = document.getElementById('btn-clear');

btnRuler.addEventListener('click', () => {
    rulerActive = !rulerActive;
    btnRuler.classList.toggle('active', rulerActive);
});

btnClear.addEventListener('click', () => {
    points = [];
    markersLayer.clearLayers();
    polylineLayer.setLatLngs([]);
});

map.on('click', function(e) {
    if (!rulerActive) return;

    const clickedLatLng = e.latlng;
    points.push(clickedLatLng);

    const marker = L.circleMarker(clickedLatLng, {
        radius: 6,
        color: '#fff',
        fillColor: '#0056b3',
        fillOpacity: 1
    }).addTo(markersLayer);

    polylineLayer.setLatLngs(points);

    if (points.length > 1) {
        let totalDistance = 0;
        for (let i = 1; i < points.length; i++) {
            totalDistance += points[i - 1].distanceTo(points[i]);
        }
        const distanceKm = (totalDistance / 1000).toFixed(2);
        marker.bindPopup(`<b>Дистанція:</b> ${distanceKm} км`).openPopup();
    } else {
        marker.bindPopup(`<b>Старт</b>`).openPopup();
    }
});


// --- СИМУЛЯЦІЯ РУХОМИХ ОБ'ЄКТІВ (ЮНІТІВ) ---
let simulationActive = true;
const btnSim = document.getElementById('btn-sim');

btnSim.addEventListener('click', () => {
    simulationActive = !simulationActive;
    btnSim.classList.toggle('active', simulationActive);
    btnSim.innerText = simulationActive ? "▶ Симуляція руху (Увімк)" : "⏸ Симуляція (Зупинено)";
});

// Створюємо масив умовних рухомих об'єктів (наприклад, БПЛА)
const units = [
    {
        id: 'drone-1',
        name: 'БПЛА #1',
        lat: 49.8397, // Початкові координати (наприклад, район Запоріжжя/Дніпра)
        lng: 35.1396,
        speedKmH: 150, // Швидкість км/год
        heading: 45,   // Кут руху в градусах
        marker: null
    },
    {
        id: 'drone-2',
        name: 'Ціль #2',
        lat: 47.8388,
        lng: 35.1395,
        speedKmH: 120,
        heading: 310,
        marker: null
    }
];

// Ініціалізація маркерів юнітів на карті
units.forEach(unit => {
    const customIcon = L.divIcon({
        className: 'custom-unit-marker',
        html: `<div style="background: #ff4444; color: white; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: bold; border: 1px solid #fff; white-space: nowrap;">✈ ${unit.name}</div>`,
        iconSize: [60, 20],
        iconAnchor: [30, 10]
    });

    unit.marker = L.marker([unit.lat, unit.lng], { icon: customIcon }).addTo(map);
});

// Функція оновлення положення об'єктів (тік симуляції кожну секунду)
function updateSimulation() {
    if (!simulationActive) return;

    units.forEach(unit => {
        // Проста математика переміщення на основі швидкості та азимуту
        // 1 градус широти ~= 111 км
        const distancePerSec = (unit.speedKmH / 3600) / 111; // градуси за секунду
        
        const rad = (unit.heading * Math.PI) / 180;
        unit.lat += distancePerSec * Math.cos(rad);
        unit.lng += (distancePerSec * Math.sin(rad)) / Math.cos(unit.lat * Math.PI / 180);

        // Оновлюємо позицію маркера на карті
        unit.marker.setLatLng([unit.lat, unit.lng]);
        unit.marker.bindPopup(`<b>${unit.name}</b><br>Швидкість: ${unit.speedKmH} км/год<br>Курс: ${unit.heading}°`);
    });
}

// Запускаємо цикл симуляції (1 раз на секунду)
setInterval(updateSimulation, 1000);
