const LAT = 43.3370;
const LON = -83.3525;
let radarMapInstance = null;

const SLIDE_LABELS = [
  "Current conditions — Mayville, MI",
  "SPC Day 1 Convective Outlook",
  "Active Alerts — Michigan"
];
const SLIDE_INTERVAL = 10000;
let currentSlide = 0;
let slideshowTimer = null;
let paused = false;

// ---- Weather fetch (no custom User-Agent — breaks CORS) ----
async function fetchWeather() {
  const tempEl = document.getElementById("temperature");
  const descEl = document.getElementById("description");
  const windEl = document.getElementById("wind-speed");

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
    const currentForecast = forecastData.properties.periods?.[0] ?? null;

    if (!stationData.features?.length) throw new Error("No stations returned");

    const stationId = stationData.features[0].properties.stationIdentifier;
    const obsRes = await fetch(`https://api.weather.gov/stations/${stationId}/observations/latest`);

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
    if (descEl) descEl.textContent = "Check weather.gov";
    if (windEl) windEl.textContent = "N/A";
  }
}

// ---- SPC Day 1 outlook text ----
async function fetchSPCOutlook() {
  const imgEl = document.getElementById("spc-outlook-img");
  const textEl = document.getElementById("spc-outlook-content");
  if (!textEl) return;

  try {
    const res = await fetch("https://www.spc.noaa.gov/products/outlook/day1otlk.html");
    if (!res.ok) throw new Error("SPC page fetch failed: " + res.status);
    const html = await res.text();

    // The page sets its image dynamically via show_tab('otlk_HHMM'), where
    // HHMM is the current issuance time (changes every new outlook — 0100,
    // 0600, 1200, 1630, etc.). There's no static filename to hardcode, so
    // pull the real current suffix straight out of the page's onload call.
    if (imgEl) {
      const suffixMatch = html.match(/show_tab\('otlk_(\d{4})'\)/);
      if (suffixMatch) {
        const suffix = suffixMatch[1];
        imgEl.src = `https://www.spc.noaa.gov/products/outlook/day1otlk_${suffix}.png?_=${Date.now()}`;
        imgEl.alt = "SPC Day 1 Convective Outlook";
      } else {
        console.error("Could not find current SPC outlook image suffix");
      }
    }

    // The forecast discussion sits in a plain <pre> tag — grab it directly
    // instead of walking the whole page's text.
    const doc = new DOMParser().parseFromString(html, "text/html");
    const pre = doc.querySelector("pre");
    if (!pre) throw new Error("Could not find outlook <pre> block");

    let raw = pre.textContent || "";

    // Start at the risk-level line (e.g. "...THERE IS A SLIGHT RISK...")
    // to skip past the header/date stamp, which isn't useful content.
    const startIdx = raw.indexOf("...THERE IS");
    if (startIdx !== -1) raw = raw.slice(startIdx);

    // Cut off the "CLICK TO GET..." / "NOTE: THE NEXT..." trailer text.
    const trailerIdx = raw.indexOf("CLICK TO GET");
    if (trailerIdx !== -1) raw = raw.slice(0, trailerIdx);

    const clean = raw
      .split(/\n\s*\n/)
      .map(p => p.replace(/\s+/g, " ").trim())
      .filter(p => p.length > 40)
      .slice(0, 3)
      .join("\n\n")
      .trim();

    if (!clean) throw new Error("No outlook text after parsing");

    textEl.innerHTML = `<p class="wx-outlook-text">${clean.replace(/\n\n/g, "</p><p class='wx-outlook-text'>")}</p>`;
  } catch (err) {
    console.error("SPC outlook error:", err);
    textEl.innerHTML = `<p class="wx-loading">Outlook unavailable — <a href="https://www.spc.noaa.gov/products/outlook/day1otlk.html" target="_blank" rel="noopener">view on SPC</a></p>`;
  }
}

// ---- Active alerts for Michigan ----
async function fetchAlerts() {
  const el = document.getElementById("alerts-content");
  if (!el) return;
  try {
    const res = await fetch("https://api.weather.gov/alerts/active?area=MI");
    if (!res.ok) throw new Error("Alerts fetch failed");
    const data = await res.json();
    const alerts = data.features ?? [];

    if (alerts.length === 0) {
      el.innerHTML = `<p class="wx-no-alerts">✓ No active watches, warnings, or advisories for Michigan.</p>`;
      return;
    }

    const severityClass = s => {
      if (s === "Extreme")  return "alert-extreme";
      if (s === "Severe")   return "alert-severe";
      return "alert-moderate";
    };

    el.innerHTML = alerts.slice(0, 4).map(a => {
      const p = a.properties;
      return `<div class="wx-alert-item ${severityClass(p.severity)}">
        <span class="wx-alert-event">${p.event}</span>
        <p class="wx-alert-headline">${p.headline ?? p.description?.substring(0, 120) + "…" ?? ""}</p>
      </div>`;
    }).join("");

  } catch (err) {
    console.error("Alerts error:", err);
    el.innerHTML = `<p class="wx-loading">Unable to load alerts.</p>`;
  }
}

// ---- Radar map ----
function initRadarMap() {
  const mapEl = document.getElementById("radar-map");
  if (!mapEl) return;

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
  slides.forEach((s, i) => s.classList.toggle("active", i === currentSlide));
  dots.forEach((d, i) => d.classList.toggle("active", i === currentSlide));
  if (label) label.textContent = SLIDE_LABELS[currentSlide];

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
  document.querySelectorAll(".wx-dot").forEach(dot => {
    dot.addEventListener("click", () => {
      goToSlide(parseInt(dot.dataset.slide));
      startTimer();
    });
  });

  const pauseBtn = document.getElementById("wx-pause");
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
  fetchSPCOutlook();
  fetchAlerts();
  initSlideshow();
  setInterval(fetchWeather, 300000);
  setInterval(() => { fetchSPCOutlook(); fetchAlerts(); }, 600000);
});

window.addEventListener("load", () => {
  initRadarMap();
  setTimeout(() => { if (radarMapInstance) radarMapInstance.invalidateSize(); }, 200);
});