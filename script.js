// 1. Ініціалізація карти (центр - Україна, зум - 7)
const map = L.map('map', {
    zoomControl: false // Перенесемо або залишимо за потреби
}).setView([48.3794, 31.1656], 7);

// Додаємо зум-контрол у зручне місце (наприклад, праворуч)
L.control.zoom({ position: 'bottomright' }).addTo(map);

// 2. Додаємо темну або стандартну підкладку карти (OpenStreetMap)
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// 3. Виведення координат курсора (WGS 84) у реальному часі
const coordDisplay = document.getElementById('coord-display');

map.on('mousemove', function(e) {
    const lat = e.latlng.lat.toFixed(4);
    const lng = e.latlng.lng.toFixed(4);
    coordDisplay.innerText = `Шир: ${lat}, Довг: ${lng}`;
});

// 4. Заготовка під сітку координат / азимутальну сітку
let gridLayerActive = false;
document.getElementById('btn-grid').addEventListener('click', () => {
    gridLayerActive = !gridLayerActive;
    if (gridLayerActive) {
        alert("Режим сітки активовано (тут можна підключити плагін координатних сіток, наприклад, Leaflet.Graticule)");
        // Тут надалі можна додати генерацію ліній сітки або кіл радіусів
    } else {
        alert("Сітку вимкнено");
    }
});
