// 1. Ініціалізація карти
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


// --- ЗОНИ КОНТРОЛЮ ТА РАДІУСИ ДІЇ (РЛС / ППО) ---
let zonesVisible = true;
const btnZones = document.getElementById('btn-zones');
const zonesLayer = L.layerGroup().addTo(map);

// Центр розгортання системи (наші сили)
const radarCenter = [48.3794, 31.1656];

function renderRadarZones() {
    zonesLayer.clearLayers();
    if (!zonesVisible) return;

    // Концентричні кола радіусів дії (наприклад, 50 км, 100 км, 150 км)
    const radii = [50000, 100000, 150000]; // в метрах
    radii.forEach((radius, index) => {
        L.circle(radarCenter, {
            radius: radius,
            color: '#007bff',
            weight: 1,
            dashArray: '3, 6',
            fillColor: '#007bff',
            fillOpacity: 0.03
        }).addTo(zonesLayer).bindPopup(`<b>Зона дії РЛС #${index + 1}</b><br>Радіус: ${radius / 1000} км`);
    });

    // Маркер центру керування
    L.circleMarker(radarCenter, {
        radius: 8,
        color: '#fff',
        fillColor: '#28a745',
        fillOpacity: 1
    }).addTo(zonesLayer).bindPopup(`<b>Центр управління / РЛС</b>`);
}

renderRadarZones();

btnZones.addEventListener('click', () => {
    zonesVisible = !zonesVisible;
    btnZones.classList.toggle('active', zonesVisible);
    renderRadarZones();
});


// --- СИМУЛЯЦІЯ РУХУ ТА ПЕРЕХОПЛЕННЯ ---
let simulationActive = true;
const btnSim = document.getElementById('btn-sim');

btnSim.addEventListener('click', () => {
    simulationActive = !simulationActive;
    btnSim.classList.toggle('active', simulationActive);
    btnSim.innerText = simulationActive ? "▶ Симуляція руху (Увімк)" : "⏸ Симуляція (Зупинено)";
});

const units = [
    {
        id: 'drone-1',
        name: 'БПЛА #1',
        lat: 49.8397,
        lng: 35.1396,
        speedKmH: 150,
        heading: 45,
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

units.forEach(unit => {
    const customIcon = L.divIcon({
        className: 'custom-unit-marker',
        html: `<div style="background: #ff4444; color: white; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: bold; border: 1px solid #fff; white-space: nowrap;">✈ ${unit.name}</div>`,
        iconSize: [60, 20],
        iconAnchor: [30, 10]
    });

    unit.marker = L.marker([unit.lat, unit.lng], { icon: customIcon }).addTo(map);
});

let selectedTarget = units.find(u => u.id === 'drone-2');
let interceptor = {
    lat: radarCenter[0],
    lng: radarCenter[1],
    speedKmH: 250
};

const interceptLine = L.polyline([], { color: '#ff4444', weight: 2, dashArray: '4, 4' }).addTo(map);

function calculateIntercept(target, interceptor) {
    const targetLatLng = L.latLng(target.lat, target.lng);
    const interceptorLatLng = L.latLng(interceptor.lat, interceptor.lng);
    
    const distanceMeters = interceptorLatLng.distanceTo(targetLatLng);
    const distanceKm = distanceMeters / 1000;

    const closingSpeed = interceptor.speedKmH - (target.speedKmH * 0.5);
    const timeHours = closingSpeed > 0 ? distanceKm / closingSpeed : 0;
    const timeMinutes = Math.round(timeHours * 60);

    return {
        distanceKm: distanceKm.toFixed(1),
        timeMinutes: timeMinutes > 0 ? timeMinutes : 0,
        targetPos: [target.lat, target.lng],
        interceptorPos: [interceptor.lat, interceptor.lng]
    };
}

setInterval(() => {
    if (!simulationActive) return;

    units.forEach(unit => {
        const distancePerSec = (unit.speedKmH / 3600) / 111;
        const rad = (unit.heading * Math.PI) / 180;
        unit.lat += distancePerSec * Math.cos(rad);
        unit.lng += (distancePerSec * Math.sin(rad)) / Math.cos(unit.lat * Math.PI / 180);

        unit.marker.setLatLng([unit.lat, unit.lng]);
    });

    if (selectedTarget) {
        const data = calculateIntercept(selectedTarget, interceptor);
        interceptLine.setLatLngs([data.interceptorPos, data.targetPos]);

        selectedTarget.marker.bindPopup(
            `<b>Ціль: ${selectedTarget.name}</b><br>` +
            `Швидкість: ${selectedTarget.speedKmH} км/год<br>` +
            `<b>Дистанція до перехоплення:</b> ${data.distanceKm} км<br>` +
            `<b>Час до зближення:</b> ~${data.timeMinutes} хв`
        );
    }
}, 1000);
