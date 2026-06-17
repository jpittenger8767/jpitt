const LAT = 43.3370;
const LON = -83.3525;
const LOCATION_NAME = "Mayville, MI";
let radarMapInstance = null;

async function fetchWeather() {
  try {
    const gridRes = await fetch(`https://api.weather.gov/points/${LAT},${LON}`);
    if (!gridRes.ok) throw new Error("Grid lookup failed");
    const gridData = await gridRes.json();

    const [forecastRes, stationRes] = await Promise.all([
      fetch(gridData.properties.forecast),
      fetch(gridData.properties.observationStations)
    ]);

    const forecastData = await forecastRes.json();
    const stationData = await stationRes.json();
    const current = forecastData.properties.periods[0];

    const stationId = stationData.features[0].properties.stationIdentifier;
    const obsRes = await fetch(`https://api.weather.gov/stations/${stationId}/observations/latest`);
    const obsData = await obsRes.json();

    const tempC = obsData.properties.temperature.value;
    const tempF = tempC !== null ? (tempC * 9/5 + 32).toFixed(1) : "--";
    const windMps = obsData.properties.windSpeed.value;
    const windMph = windMps !== null ? (windMps * 2.237).toFixed(0) : null;
    const windDir = obsData.properties.windDirection.value;

    const dirs = ["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"];
    const dirLabel = windDir !== null ? dirs[Math.round(windDir / 22.5) % 16] : "";

    const tempEl = document.getElementById("temperature");
    const descEl = document.getElementById("description");
    const windEl = document.getElementById("wind-speed");

    if (tempEl) tempEl.textContent = tempF !== "--" ? `${tempF}°F` : "--";
    if (descEl) descEl.textContent = current.shortForecast || "--";
    if (windEl) windEl.textContent = windMph ? `${windMph} mph ${dirLabel}`.trim() : "N/A";

  } catch (err) {
    console.error("Weather fetch error:", err);
    const tempEl = document.getElementById("temperature");
    if (tempEl) tempEl.textContent = "Unavailable";
  }
}

async function fetchActiveAlerts() {
  const alertsContainer = document.getElementById("alerts-container");
  if (!alertsContainer) return;

  try {
    // Fetches active alerts specifically filtering for Michigan
    const res = await fetch("https://api.weather.gov/alerts/active?area=MI");
    if (!res.ok) throw new Error("Alerts fetch failed");
    const data = await res.json();

    // Filter out alerts to find ones covering your zone/county if you want to make it purely local, 
    // or display the most severe statewide convective/synoptic impacts.
    const activeAlerts = data.features || [];

    if (activeAlerts.length === 0) {
      alertsContainer.innerHTML = `<div class="no-alerts">No active watches, warnings, or advisories for Michigan.</div>`;
      return;
    }

    // Grab up to 4 prominent alerts to avoid page overflowing
    let alertsHtml = `<div class="alerts-list">`;
    activeAlerts.slice(0, 4).forEach(alert => {
      const props = alert.properties;
      alertsHtml += `
        <div class="alert-item ${props.severity.toLowerCase()}">
          <span class="alert-event">${props.event}</span>
          <p class="alert-headline">${props.headline || props.description.substring(0, 100) + '...'}</p>
        </div>
      `;
    });
    alertsHtml += `</div>`;
    alertsContainer.innerHTML = alertsHtml;

  } catch (err) {
    console.error("Alerts fetch error:", err);
    alertsContainer.innerHTML = `<div class="no-alerts">Unable to load active alerts.</div>`;
  }
}

function initRadarMap() {
  const mapEl = document.getElementById("radar-map");
  if (!mapEl) return;

  // Leaflet doesn't always play well when initialized inside hidden display blocks.
  // We'll reset sizes or re-initialize safely if needed.
  radarMapInstance = L.map("radar-map", { zoomControl: false, attributionControl: false })
    .setView([LAT, LON], 7);

  L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
    maxZoom: 10
  }).addTo(radarMapInstance);

  L.tileLayer.wms("https://opengeo.ncep.noaa.gov/geoserver/conus/conus_bref_qcd/ows?", {
    layers: "conus_bref_qcd",
    format: "image/png",
    transparent: true,
    opacity: 0.7
  }).addTo(radarMapInstance);
}

// Slideshow Controller Logic
// --- Updated Slideshow Controller Logic with Manual Override ---
let currentSlideIndex = 0;
let slideshowTimer = null;

function showSlide(index) {
  const slides = document.querySelectorAll(".weather-slide");
  const dots = document.querySelectorAll(".dot");
  const sectionLabel = document.getElementById("slideshow-label");

  if (slides.length === 0) return;

  // Bound check to keep index in range
  if (index >= slides.length) currentSlideIndex = 0;
  else if (index < 0) currentSlideIndex = slides.length - 1;
  else currentSlideIndex = index;

  // Remove active styling classes from everything
  slides.forEach(slide => slide.classList.remove("active-slide"));
  dots.forEach(dot => dot.classList.remove("active-dot"));

  // Reveal the targeted slide and activate its corresponding dot
  const currentSlide = slides[currentSlideIndex];
  currentSlide.classList.add("active-slide");
  if (dots[currentSlideIndex]) dots[currentSlideIndex].classList.add("active-dot");
  
  // Update the card's section header text dynamically
  if (sectionLabel && currentSlide.dataset.label) {
    sectionLabel.textContent = currentSlide.dataset.label;
  }

  // Leaflet map layout fix for Slide 1
  if (currentSlideIndex === 0 && radarMapInstance) {
    setTimeout(() => {
      radarMapInstance.invalidateSize();
    }, 50);
  }
}

// Function to handle automatic rotation
function startSlideshow() {
  slideshowTimer = setInterval(() => {
    showSlide(currentSlideIndex + 1);
  }, 10000); // 10 seconds
}

// Manual Override Function: triggered when a user clicks a dot
function manualSelectSlide(index) {
  // 1. Stop the automatic timer immediately
  clearInterval(slideshowTimer);

  // 2. Jump directly to the selected slide
  showSlide(index);

  // 3. Optional: Restart the auto-rotation loop after 20 seconds of user inactivity
  startSlideshow();
}

// 1. Initial execution to grab the data immediately on load
fetchWeather();
fetchActiveAlerts();
initRadarMap();

// 2. Initialize the first slide view immediately
showSlide(0);

// 3. Map the manual click event override to each navigation dot
const dots = document.querySelectorAll(".dot");
dots.forEach((dot, index) => {
  dot.addEventListener("click", () => {
    manualSelectSlide(index);
  });
});

// 4. Start the automatic slide rotation engine (every 10 seconds)
startSlideshow();

// 5. Background Data Polling Loop (Refreshes the raw API data every 5 minutes)
setInterval(() => {
  fetchWeather();
  fetchActiveAlerts();
}, 300000);