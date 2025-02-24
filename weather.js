const lat = 43.3370; // Mayville latitude
const lon = -83.3525; // Mayville longitude

async function fetchWeather() {
    try {
        // Fetch the grid points for the given lat/lon
        const gridResponse = await fetch(`https://api.weather.gov/points/${lat},${lon}`);
        if (!gridResponse.ok) throw new Error(`Grid API error! Status: ${gridResponse.status}`);
        const gridData = await gridResponse.json();

        const forecastUrl = gridData.properties.forecast;
        const stationUrl = gridData.properties.observationStations;

        // Fetch weather forecast
        const forecastResponse = await fetch(forecastUrl);
        if (!forecastResponse.ok) throw new Error(`Forecast API error! Status: ${forecastResponse.status}`);
        const forecastData = await forecastResponse.json();
        
        const currentForecast = forecastData.properties.periods[0]; // Current period

        // Fetch latest weather observations
        const stationResponse = await fetch(stationUrl);
        if (!stationResponse.ok) throw new Error(`Station API error! Status: ${stationResponse.status}`);
        const stationData = await stationResponse.json();

        const latestStation = stationData.features[0].properties.stationIdentifier;
        const observationsUrl = `https://api.weather.gov/stations/${latestStation}/observations/latest`;

        const observationsResponse = await fetch(observationsUrl);
        if (!observationsResponse.ok) throw new Error(`Observations API error! Status: ${observationsResponse.status}`);
        const observationsData = await observationsResponse.json();
        
        const tempFahrenheit = observationsData.properties.temperature.value * 9/5 + 32;
        const windSpeed = observationsData.properties.windSpeed.value;

        // Update weather widget
        document.getElementById("weather-location").textContent = `📍 Mayville, MI`;
        document.getElementById("temperature").textContent = `🌡 Temperature: ${tempFahrenheit.toFixed(1)}°F`;
        document.getElementById("description").textContent = `🌤 Condition: ${currentForecast.shortForecast}`;
        document.getElementById("forecast").textContent = `📅 Forecast: ${currentForecast.detailedForecast}`;
        document.getElementById("wind-speed").textContent = `💨 Wind Speed: ${windSpeed ? windSpeed + " mph" : "N/A"}`;
    } catch (error) {
        console.error("Error fetching weather:", error);
        document.getElementById("weather-location").textContent = "⚠️ Error loading weather!";
    }
}

function initRadarMap() {
    const map = L.map('radar-map').setView([lat, lon], 6); // Starts in Michigan, allows zooming out

    // OpenStreetMap base layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    // IEM NEXRAD Radar Layer (Live NWS Data)
    L.tileLayer('https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/ridge::N0Q/{z}/{x}/{y}.png', {
        attribution: "NOAA/NWS via Iowa Environmental Mesonet",
        transparent: true,
        opacity: 0.7
    }).addTo(map);
}

fetchWeather();
initRadarMap();
