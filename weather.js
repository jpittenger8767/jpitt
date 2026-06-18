const LAT = 43.3370;
const LON = -83.3525;
const LOCATION_NAME = "Mayville, MI";
let radarMapInstance = null;

const SLIDE_LABELS = [
  "Current conditions — Mayville, MI",
  "SPC Day 1 Convective Outlook",
  "Current Watches & Warnings"
];
const SLIDE_INTERVAL = 10000;

let currentSlide = 0;
let slideshowTimer = null;
let paused = false;

// ---- Weather fetch ----
async function fetchWeather() {
  const tempEl = document.getElementById("temperature");
  const descEl = document.getElementById("description");
  const windEl = document.getElementById("wind-speed");

  const opts = { headers: { 'User-Agent': '(pittweather-dashboard, jpittenger8767)' } };

  try {
    const gridRes = await fetch(`https://api.weather.gov/points/${LAT},${LON}`, opts);
    if (!gridRes.ok) throw new Error("Grid lookup failed");
    const gridData = await gridRes.json();

    const [forecastRes, stationRes] = await Promise.all([
      fetch(gridData.properties.forecast, opts),
      fetch(gridData.properties.observationStations, opts)
    ]);

    const forecastData = await forecastRes.json();
    const stationData = await stationRes.json();
    const currentForecast = forecastData.properties.periods?.[0] ?? null;

    if (!stationData.features?.length) throw new Error("No stations returned");

    const stationId = stationData.features[0].properties.stationIdentifier;
    const obsRes = await fetch(`https://api.weather.gov/stations/${stationId}/observations/latest`, opts);

    let tempF = "--", shortForecast = currentForecast?.shortForecast ?? "--", windString = "N/A";

    if (obsRes.ok) {
      const props = (await obsRes.json()).properties;

      if (props.temperature?.value != null) {
        tempF = (props.temperature.value * 9/5 + 32).toFixed(1) + "°F";
      } else if (currentForecast?.temperature != null) {
        tempF = `${currentForecast.temperature}°F`;
      }

      if (props.windSpeed?.value != null) {
        const mph = (props.windSpeed.value * 2.237).toFixed(0);
        const dirs = ["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"];
        const dir = props.windDirection?.value != null ? dirs[Math.round(props.windDirection.value / 22.5) % 16] : "";
        windString = `${mph} mph ${dir}`.trim();
      } else if (currentForecast?.windSpeed) {
        windString = `${currentForecast.windSpeed} ${currentForecast.windDirection ?? ""}`.trim();
      }
    } else if (currentForecast) {
      tempF = `${currentForecast.temperature}°F`;
      windString = `${currentForecast.windSpeed} ${currentForecast.windDirection ?? ""}`.trim();
    }

    if (tempEl) tempEl.textContent = tempF;
    if (descEl) descEl.textContent = shortForecast;
    if (windEl) windEl.textContent = windString;

  } catch (err) {
    console.error("Weather fetch error:", err);
    if (tempEl) tempEl.textContent = "Unavailable";
    if (descEl) descEl.textContent = "Error loading";
    if (windEl) windEl.textContent = "N/A";
  }
}

// ---- Radar map ----
function initRadarMap() {
  const mapEl = document.getElementById("radar-map");
  if (!mapEl) return;

  // Ensure slide 0 is visible before Leaflet measures the container
  const slide0 = document.getElementById("wx-slide-0");
  if (slide0) slide0.classList.add("active");

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

// ---- Slideshow ----
function goToSlide(index) {
  const slides = document.querySelectorAll(".wx-slide");
  const dots = document.querySelectorAll(".wx-dot");
  const label = document.getElementById("wx-slide-label");
  if (!slides.length) return;

  currentSlide = ((index % slides.length) + slides.length) % slides.length;

  slides.forEach((s, i) => {
    s.classList.toggle("active", i === currentSlide);
  });
  dots.forEach((d, i) => {
    d.classList.toggle("active", i === currentSlide);
  });

  if (label) label.textContent = SLIDE_LABELS[currentSlide];

  // Leaflet needs a nudge when its container becomes visible
  if (currentSlide === 0 && radarMapInstance) {
    setTimeout(() => radarMapInstance.invalidateSize(), 50);
  }
}

function startTimer() {
  clearInterval(slideshowTimer);
  slideshowTimer = setInterval(() => {
    if (!paused) goToSlide(currentSlide + 1);
  }, SLIDE_INTERVAL);
}

function initSlideshow() {
  const dots = document.querySelectorAll(".wx-dot");
  const pauseBtn = document.getElementById("wx-pause");

  dots.forEach(dot => {
    dot.addEventListener("click", () => {
      goToSlide(parseInt(dot.dataset.slide));
      startTimer(); // reset interval on manual nav
    });
  });

  if (pauseBtn) {
    pauseBtn.addEventListener("click", () => {
      paused = !paused;
      pauseBtn.innerHTML = paused ? "&#9654;" : "&#10074;&#10074;";
      pauseBtn.setAttribute("aria-label", paused ? "Resume slideshow" : "Pause slideshow");
    });
  }

  goToSlide(0);
  startTimer();
}

// ---- Init ----
document.addEventListener("DOMContentLoaded", () => {
  fetchWeather();
  initSlideshow();

  // Refresh weather data every 5 minutes
  setInterval(fetchWeather, 300000);
});

// Init radar AFTER full page load so Leaflet has real dimensions
window.addEventListener("load", () => {
  initRadarMap();
  // Give Leaflet a beat to settle, then correct any size issues
  setTimeout(() => {
    if (radarMapInstance) radarMapInstance.invalidateSize();
  }, 200);
});