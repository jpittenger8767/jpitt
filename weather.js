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

        const tempCelsius = data.data.values.temperature;
        const tempFahrenheit = (tempCelsius * 9/5) + 32;
        
        document.getElementById("weather-location").textContent = `📍 Location: ${lat}, ${lon}`;
        document.getElementById("temperature").textContent = `🌡 Temperature: ${tempFahrenheit.toFixed(1)}°F`;
        document.getElementById("description").textContent = `🌤 Condition: ${description}`;
    } catch (error) {
        console.error("Error fetching weather:", error);
        document.getElementById("weather-location").textContent = "⚠️ Error loading weather!";
    }
}

fetchWeather();

function getWeatherDescription(code) {
    const weatherDescriptions = {
        1000: "Clear Sky",
        1100: "Partly Cloudy",
        1101: "Mostly Clear",
        1102: "Mostly Cloudy",
        2000: "Foggy",
        2100: "Light Fog",
        4000: "Drizzle",
        4001: "Rain",
        4200: "Light Rain",
        4201: "Heavy Rain",
        5000: "Snow",
        5001: "Flurries",
        5100: "Light Snow",
        5101: "Heavy Snow",
        6000: "Freezing Drizzle",
        6001: "Freezing Rain",
        6200: "Light Freezing Rain",
        6201: "Heavy Freezing Rain",
        7000: "Ice Pellets",
        7101: "Heavy Ice Pellets",
        7102: "Light Ice Pellets",
        8000: "Thunderstorm"
    };

    return weatherDescriptions[code] || "Unknown Weather";
}


function initRadarMap() {
    const map = L.map('radar-map').setView([43.3208, 83.3264], 8); // Mayville, 

    // OpenStreetMap base layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    // Tomorrow.io Precipitation Radar Layer (Fix: Added proper API key syntax & correct layer)
    L.tileLayer(`https://api.tomorrow.io/v4/map/tile/{z}/{x}/{y}/precipitationIntensity?apikey=${API_KEY}`, {
        attribution: '&copy; Tomorrow.io',
        opacity: 0.6
    }).addTo(map);
}

fetchWeather();
initRadarMap();
