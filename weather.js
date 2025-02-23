const apiKey = "cd5315b511d02971ccc9640540ceb394";  // Replace with your OpenWeatherMap API Key
const city = "Lapeer";        // Change this to your preferred city
const units = "imperial";        // Use "metric" for Celsius, "imperial" for Fahrenheit
const apiUrl = `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=${units}&appid=${cd5315b511d02971ccc9640540ceb394}`;

async function fetchWeather() {
    try {
        const response = await fetch(apiUrl);
        const data = await response.json();

        if (data.cod !== 200) {
            document.getElementById("location").textContent = "Error loading weather";
            return;
        }

        document.getElementById("location").textContent = `📍 ${data.name}, ${data.sys.country}`;
        document.getElementById("temperature").textContent = `🌡️ ${Math.round(data.main.temp)}°F`;
        document.getElementById("description").textContent = `☁️ ${data.weather[0].description}`;
    } catch (error) {
        document.getElementById("location").textContent = "Failed to load weather";
    }
}

// Fetch weather on page load
fetchWeather();
