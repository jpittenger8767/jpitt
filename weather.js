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
// --- Updated Slideshow Controller Logic with Manual Reset ---
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

  slides.forEach((slide, idx) => {
    // 1. Completely remove active classes to reset animations completely
    slide.classList.remove("active-slide");
    
    // 2. Clear any inline styles that might interfere
    slide.style.animation = 'none'; 
    
    if (dots[idx]) dots[idx].classList.remove("active-dot");
  });

  const currentSlide = slides[currentSlideIndex];

  // 3. FORCE REFLOW: This tells the browser engine to clear the animation cache
  void currentSlide.offsetWidth; 

  // 4. Re-apply the active slide layout and trigger the CSS keyframes
  currentSlide.classList.add("active-slide");
  currentSlide.style.animation = ''; // Restores your CSS slideInLeft rules cleanly
  
  if (dots[currentSlideIndex]) dots[currentSlideIndex].classList.add("active-dot");
  
  // Dynamic header text based on current active view
  if (sectionLabel && currentSlide.dataset.label) {
    sectionLabel.textContent = currentSlide.dataset.label;
  }

  // Leaflet map canvas realignment fix
  if (currentSlideIndex === 0 && radarMapInstance) {
    setTimeout(() => {
      radarMapInstance.invalidateSize();
    }, 50);
  }
}

// Function to handle automatic rotation loop
function startSlideshow() {
  slideshowTimer = setInterval(() => {
    showSlide(currentSlideIndex + 1);
  }, 10000);
}

// Manual Override Function
function manualSelectSlide(index) {
  // Clear the timer right away so it doesn't flip slides prematurely
  clearInterval(slideshowTimer);

  // Jump to slide (which now forces the CSS animation reset)
  showSlide(index);

  // Restart the automatic loop cycle
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