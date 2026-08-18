// 1. Ініціалізація карти (центр - Україна)
const map = L.map('map', {
    zoomControl: false
}).setView([48.3794, 31.1656], 6);

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

// Режим додавання цілі кліком
let targetCreationMode = false;

map.on('click', function(e) {
    if (rulerActive) {
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
    } else if (targetCreationMode) {
        // Додаємо нову реалістичну ціль у місці кліку
        addNewThreat(e.latlng.lat, e.latlng.lng);
        targetCreationMode = false;
        map.getContainer().style.cursor = '';
    }
});


// --- ЗОНИ КОНТРОЛЮ ТА РАДІУСИ ДІЇ ---
let zonesVisible = true;
const zonesLayer = L.layerGroup().addTo(map);
const radarCenter = [48.3794, 31.1656];

function renderRadarZones() {
    zonesLayer.clearLayers();
    if (!zonesVisible) return;

    const radii = [100000, 200000, 300000]; // 100, 200, 300 км
    radii.forEach((radius, index) => {
        L.circle(radarCenter, {
            radius: radius,
            color: '#007bff',
            weight: 1,
            dashArray: '3, 6',
            fillColor: '#007bff',
            fillOpacity: 0.02
        }).addTo(zonesLayer);
    });
}
renderRadarZones();


// --- БАЗА ДАНИХ ТА СИМУЛЯЦІЯ ЗАГРОЗ (РОСІЙСЬКІ РАКЕТИ ТА БПЛА) ---

// Шаблони реалістичних загроз із їхніми типовими швидкостями (км/год)
const threatTypes = {
    'shahed': { name: 'БПЛА "Герань-2" (Шахед)', speed: 150, color: '#ffaa00', icon: '🛸' },
    'cruise': { name: 'Крилата ракета Х-101 / Калібр', speed: 750, color: '#ff4444', icon: '🚀' },
    'ballistic': { name: 'Балістична ракета (Іскандер-М)', speed: 3500, color: '#cc0000', icon: '⚡' }
};

let activeThreats = [];
const threatsLayer = L.layerGroup().addTo(map);

// Функція створення нової загрози
function addNewThreat(lat, lng) {
    // Вибираємо тип загрози через випадаюче вікно або за замовчуванням (наприклад, Крилата ракета)
    const typeKey = prompt("Виберіть тип загрози:\n1 - БПЛА Шахед (150 км/год)\n2 - Крилата ракета (750 км/год)\n3 - Балістика (3500 км/год)", "2");
    
    let selectedType = threatTypes['cruise'];
    if (typeKey === '1') selectedType = threatTypes['shahed'];
    if (typeKey === '3') selectedType = threatTypes['ballistic'];

    const heading = parseFloat(prompt("Введіть курс (азимут у градусах від 0 до 360):", "45")) || 0;

    const threat = {
        id: Date.now(),
        name: selectedType.name,
        icon: selectedType.icon,
        lat: lat,
        lng: lng,
        speedKmH: selectedType.speed,
        heading: heading,
        color: selectedType.color,
        marker: null
    };

    const customIcon = L.divIcon({
        className: 'custom-threat-marker',
        html: `<div style="background: ${threat.color}; color: white; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: bold; border: 1px solid #fff; white-space: nowrap;">${threat.icon} ${threat.name}</div>`,
        iconSize: [120, 20],
        iconAnchor: [60, 10]
    });

    threat.marker = L.marker([threat.lat, threat.lng], { icon: customIcon }).addTo(threatsLayer);
    activeThreats.push(threat);
}

// Додамо кнопку на верхню панель для запуску створення цілі
const topPanel = document.getElementById('top-panel');
const btnAddThreat = document.createElement('button');
btnAddThreat.innerHTML = "➕ Додати ціль на карту";
btnAddThreat.style.background = "#8b0000";
topPanel.insertBefore(btnAddThreat, topPanel.firstChild);

btnAddThreat.addEventListener('click', () => {
    targetCreationMode = true;
    rulerActive = false; // Вимикаємо лінійку
    map.getContainer().style.cursor = 'crosshair';
    alert("Клікніть на будь-яке місце на карті, щоб розмістити ворожу ціль.");
});


// --- ГОЛОВНИЙ ЦИКЛ СИМУЛЯЦІЇ РУХУ ---
let simulationActive = true;

setInterval(() => {
    if (!simulationActive) return;

    activeThreats.forEach(threat => {
        // Розрахунок переміщення за 1 секунду відповідно до реалістичної швидкості
        const distancePerSec = (threat.speedKmH / 3600) / 111; // градуси за секунду
        const rad = (threat.heading * Math.PI) / 180;
        
        threat.lat += distancePerSec * Math.cos(rad);
        threat.lng += (distancePerSec * Math.sin(rad)) / Math.cos(threat.lat * Math.PI / 180);

        // Оновлюємо координати на карті
        threat.marker.setLatLng([threat.lat, threat.lng]);
        threat.marker.bindPopup(
            `<b>${threat.name}</b><br>` +
            `Швидкість: ${threat.speedKmH} км/год<br>` +
            `Курс: ${threat.heading}°<br>` +
            `Координати: ${threat.lat.toFixed(2)}, ${threat.lng.toFixed(2)}`
        );
    });
}, 1000);
