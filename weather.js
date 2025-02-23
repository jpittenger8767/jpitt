const apiKey = "cd5315b511d02971ccc9640540ceb394";  // Replace with your actual API key
const city = "New York";  
const units = "imperial";  
const apiUrl = `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=${units}&appid=${cd5315b511d02971ccc9640540ceb394}`;

async function fetchWeather() {
    try {
        console.log("Fetching weather...");
        console.log("API URL:", apiUrl);  // Debugging
        const response = await fetch(apiUrl);
        console.log("Response Status:", response.status);

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        console.log("Weather API Response:", data);

        if (data.cod !== 200) {
            document.getElementById("location").textContent = "Error: " + data.message;
            return;
        }

        document.getElementById("location").textContent = `📍 ${data.name}, ${data.sys.country}`;
        document.getElementById("temperature").textContent = `🌡️ ${Math.round(data.main.temp)}°F`;
        document.getElementById("description").textContent = `☁️ ${data.weather[0].description}`;
    } catch (error) {
        console.error("Fetch error:", error);
        document.getElementById("location").textContent = "Failed to load weather";
    }
}

// Call the function to fetch weather data
fetchWeather();
