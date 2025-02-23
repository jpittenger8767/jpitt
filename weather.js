const API_KEY = "HRZ5a3Q9lUUavq65gfAqmsobzvtXFmLW"; // Replace with your actual API key
const lat = 43.3370; // Mayville latitude
const lon = 83.3525; // Mayville longitude

async function fetchWeather() {
    const url = `https://api.tomorrow.io/v4/weather/realtime?location=${lat},${lon}&apikey=${API_KEY}`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const data = await response.json();
        
        document.getElementById("weather-location").textContent = `📍 Location: ${lat}, ${lon}`;
        document.getElementById("temperature").textContent = `🌡 Temperature: ${data.data.values.temperature}°C`;
        document.getElementById("description").textContent = `🌤 Condition: ${data.data.values.weatherCode}`;
    } catch (error) {
        console.error("Error fetching weather:", error);
        document.getElementById("weather-location").textContent = "⚠️ Error loading weather!";
    }
}

fetchWeather();


function initRadarMap() {
    const map = L.map('radar-map').setView([40.7128, -74.0060], 8); // Default: NYC

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    L.tileLayer(`https://api.tomorrow.io/v4/map/tile/{z}/{x}/{y}/temperature?apikey=${HRZ5a3Q9lUUavq65gfAqmsobzvtXFmLW}`, {
        attribution: '&copy; Tomorrow.io',
        opacity: 0.5
    }).addTo(map);
}

fetchWeather();
initRadarMap();
