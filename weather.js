const LAT = 43.3370;
const LON = -83.3525;
const LOCATION_NAME = "Mayville, MI";

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

function initRadarMap() {
  const mapEl = document.getElementById("radar-map");
  if (!mapEl) return;

  const map = L.map("radar-map", { zoomControl: false, attributionControl: false })
    .setView([LAT, LON], 7);

  L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
    maxZoom: 10
  }).addTo(map);

  L.tileLayer.wms("https://opengeo.ncep.noaa.gov/geoserver/conus/conus_bref_qcd/ows?", {
    layers: "conus_bref_qcd",
    format: "image/png",
    transparent: true,
    opacity: 0.7
  }).addTo(map);
}

document.addEventListener("DOMContentLoaded", () => {
  fetchWeather();
  initRadarMap();
});
