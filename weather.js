const apiKey = "HRZ5a3Q9lUUavq65gfAqmsobzvtXFmLW";  // Replace with your Tomorrow.io API key
const location = "Lapeer";  // Change to your preferred city

const weatherApiUrl = `https://api.tomorrow.io/v4/weather/realtime?location=${location}&apikey=${HRZ5a3Q9lUUavq65gfAqmsobzvtXFmLW}`;

async function fetchWeather() {
    try {
        const response = await fetch(weatherApiUrl);
        const data = await response.json();

        if (!data || !data.data || !data.data.values) {
            throw new Error("Invalid weather data received.");
        }

        const weather = data.data.values;
        document.getElementById("location").textContent = `📍 ${location}`;
        document.getElementById("temperature").textContent = `🌡️ ${Math.round(weather.temperature)}°F`;
        document.getElementById("description").textContent = `☁️ Condition: ${weather.weatherCode}`;
    } catch (error) {
        console.error("Weather fetch error:", error);
        document.getElementById("location").textContent = "Failed to load weather";
    }
}

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
