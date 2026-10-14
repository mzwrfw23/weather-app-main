const searchForm = document.getElementById('searchForm');
const searchInput = document.getElementById('searchInput');
const unitsToggle = document.getElementById('unitsToggle');
const unitLabel = document.getElementById('unitLabel');

const loadingState = document.getElementById('loadingState');
const errorState = document.getElementById('errorState');
const errorMessage = document.getElementById('errorMessage');
const weatherContent = document.getElementById('weatherContent');

const cityName = document.getElementById('cityName');
const currentDate = document.getElementById('currentDate');
const currentTemp = document.getElementById('currentTemp');
const weatherCondition = document.getElementById('weatherCondition');
const todayIcon = document.getElementById('todayIcon');

const windSpeed = document.getElementById('windSpeed');
const humidity = document.getElementById('humidity');
const feelsLike = document.getElementById('feelsLike');
const precipitation = document.getElementById('precipitation');

const forecastGrid = document.getElementById('forecastGrid');
const hourlyGrid = document.getElementById('hourlyGrid');
const daySelect = document.getElementById('daySelect');

let currentUnit = 'celsius';
let lastQuery = 'Baku';
let cachedWeatherData = null;

function getWeatherMeta(code) {
  if ([0].includes(code)) return { text: 'Sunny', icon: 'icon-sunny.webp' };
  if ([1, 2].includes(code)) return { text: 'Partly Cloudy', icon: 'icon-partly-cloudy.webp' };
  if ([3].includes(code)) return { text: 'Overcast', icon: 'icon-overcast.webp' };
  if ([45, 48].includes(code)) return { text: 'Foggy', icon: 'icon-fog.webp' };
  if ([51, 53, 55].includes(code)) return { text: 'Drizzle', icon: 'icon-drizzle.webp' };
  if ([61, 63, 65, 80, 81].includes(code)) return { text: 'Rainy', icon: 'icon-rain.webp' };
  if ([71, 73, 75, 85, 86].includes(code)) return { text: 'Snowy', icon: 'icon-snow.webp' };
  if ([95, 96, 99].includes(code)) return { text: 'Thunderstorm', icon: 'icon-storm.webp' };
  return { text: 'Clear', icon: 'icon-sunny.webp' };
}

async function fetchWeather(city) {
  try {
    showLoading();

    const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en`);
    const geoData = await geoRes.json();

    if (!geoData.results || geoData.results.length === 0) {
      showError('City not found. Please try a different location.');
      return;
    }

    const { latitude, longitude, name, country } = geoData.results[0];

    const isImperial = currentUnit === 'fahrenheit';
    const tempUnitParam = isImperial ? '&temperature_unit=fahrenheit' : '';
    const windUnitParam = isImperial ? '&wind_speed_unit=mph' : '';

    const weatherRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&hourly=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto${tempUnitParam}${windUnitParam}`
    );
    const weatherData = await weatherRes.json();
    cachedWeatherData = weatherData;

    renderWeather(name, country, weatherData);
  } catch (err) {
    showError('Failed to fetch weather data. Please check your connection.');
  }
}

function renderWeather(city, country, data) {
  const current = data.current;
  const daily = data.daily;
  const meta = getWeatherMeta(current.weather_code);

  cityName.textContent = `${city}, ${country}`;
  currentDate.textContent = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
  currentTemp.textContent = Math.round(current.temperature_2m);
  weatherCondition.textContent = meta.text;
  todayIcon.src = `./assets/images/${meta.icon}`;

  const windUnit = currentUnit === 'celsius' ? 'km/h' : 'mph';
  windSpeed.textContent = `${Math.round(current.wind_speed_10m)} ${windUnit}`;
  humidity.textContent = `${current.relative_humidity_2m}%`;
  feelsLike.textContent = `${Math.round(current.apparent_temperature)}°`;
  precipitation.textContent = `${current.precipitation} mm`;

  forecastGrid.innerHTML = '';
  daySelect.innerHTML = '';

  daily.time.forEach((timeStr, index) => {
    const dayMeta = getWeatherMeta(daily.weather_code[index]);
    const date = new Date(timeStr);
    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
    const fullDayName = date.toLocaleDateString('en-US', { weekday: 'long' });

    const card = document.createElement('div');
    card.className = 'daily-card';
    card.innerHTML = `
      <span class="day-name">${dayName}</span>
      <img src="./assets/images/${dayMeta.icon}" alt="${dayMeta.text}">
      <div class="temp-range">
        <span>${Math.round(daily.temperature_2m_max[index])}°</span>
        <span class="min-temp">${Math.round(daily.temperature_2m_min[index])}°</span>
      </div>
    `;
    forecastGrid.appendChild(card);

    const option = document.createElement('option');
    option.value = index;
    option.textContent = fullDayName;
    daySelect.appendChild(option);
  });

  renderHourly(0);
  showContent();
}

function renderHourly(dayIndex) {
  if (!cachedWeatherData) return;
  hourlyGrid.innerHTML = '';
  
  const hourly = cachedWeatherData.hourly;
  const startIndex = dayIndex * 24;
  const endIndex = startIndex + 24;

  for (let i = startIndex; i < endIndex; i++) {
    if (!hourly.time[i]) break;

    const time = new Date(hourly.time[i]);
    const hourLabel = time.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
    const hourMeta = getWeatherMeta(hourly.weather_code[i]);

    const row = document.createElement('div');
    row.className = 'hourly-row';
    row.innerHTML = `
      <span class="hourly-time">${hourLabel}</span>
      <img src="./assets/images/${hourMeta.icon}" alt="${hourMeta.text}">
      <span class="hourly-temp">${Math.round(hourly.temperature_2m[i])}°</span>
    `;
    hourlyGrid.appendChild(row);
  }
}

daySelect.addEventListener('change', (e) => {
  renderHourly(Number(e.target.value));
});

function showLoading() {
  loadingState.classList.remove('hidden');
  errorState.classList.add('hidden');
  weatherContent.classList.add('hidden');
}

function showError(msg) {
  errorMessage.textContent = msg;
  errorState.classList.remove('hidden');
  loadingState.classList.add('hidden');
  weatherContent.classList.add('hidden');
}

function showContent() {
  weatherContent.classList.remove('hidden');
  loadingState.classList.add('hidden');
  errorState.classList.add('hidden');
}

searchForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const query = searchInput.value.trim();
  if (query) {
    lastQuery = query;
    fetchWeather(query);
  }
});

unitsToggle.addEventListener('click', () => {
  currentUnit = currentUnit === 'celsius' ? 'fahrenheit' : 'celsius';
  unitLabel.textContent = currentUnit === 'celsius' ? '°C' : '°F';
  fetchWeather(lastQuery);
});

fetchWeather(lastQuery);