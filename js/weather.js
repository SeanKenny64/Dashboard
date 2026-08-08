    /* ---------- WEATHER ---------- */
    async function fetchWeather() {
      try {
        // wttr.in format: ?format=j1 returns JSON
        // Using Bristol as location
        const response = await fetch('/api/weather');
        if (!response.ok) throw new Error(`HTTP error ${response.status}`);
        
        const data = await response.json();
        const current = data.current_condition[0];
        
        // Temperature in Celsius
        const temp = current.temp_C;
        
        // Weather icon mapping (wttr.in weather codes to emoji)
        const weatherCode = current.weatherCode;
        const iconMap = {
          '113': '☀️',  // Sunny
          '116': '⛅',  // Partly cloudy
          '119': '☁️',  // Cloudy
          '122': '☁️',  // Overcast
          '143': '🌫️', // Mist
          '176': '🌦️', // Patchy rain possible
          '179': '🌨️', // Patchy snow possible
          '182': '🌧️', // Patchy sleet possible
          '185': '🌧️', // Patchy freezing drizzle possible
          '200': '⛈️',  // Thundery outbreaks possible
          '227': '🌨️', // Blowing snow
          '230': '❄️',  // Blizzard
          '248': '🌫️', // Fog
          '260': '🌫️', // Freezing fog
          '263': '🌦️', // Patchy light drizzle
          '266': '🌧️', // Light drizzle
          '281': '🌧️', // Freezing drizzle
          '284': '🌧️', // Heavy freezing drizzle
          '293': '🌦️', // Patchy light rain
          '296': '🌧️', // Light rain
          '299': '🌧️', // Moderate rain at times
          '302': '🌧️', // Moderate rain
          '305': '🌧️', // Heavy rain at times
          '308': '🌧️', // Heavy rain
          '311': '🌧️', // Light freezing rain
          '314': '🌧️', // Moderate or heavy freezing rain
          '317': '🌨️', // Light sleet
          '320': '🌨️', // Moderate or heavy sleet
          '323': '🌨️', // Patchy light snow
          '326': '❄️',  // Light snow
          '329': '🌨️', // Patchy moderate snow
          '332': '❄️',  // Moderate snow
          '335': '🌨️', // Patchy heavy snow
          '338': '❄️',  // Heavy snow
          '350': '🌧️', // Ice pellets
          '353': '🌦️', // Light rain shower
          '356': '🌧️', // Moderate or heavy rain shower
          '359': '🌧️', // Torrential rain shower
          '362': '🌨️', // Light sleet showers
          '365': '🌨️', // Moderate or heavy sleet showers
          '368': '🌨️', // Light snow showers
          '371': '❄️',  // Moderate or heavy snow showers
          '374': '🌧️', // Light showers of ice pellets
          '377': '🌧️', // Moderate or heavy showers of ice pellets
          '386': '⛈️',  // Patchy light rain with thunder
          '389': '⛈️',  // Moderate or heavy rain with thunder
          '392': '⛈️',  // Patchy light snow with thunder
          '395': '⛈️'   // Moderate or heavy snow with thunder
        };
        
        const icon = iconMap[weatherCode] || '🌡️';
        
        document.getElementById('weather-icon').textContent = icon;
        document.getElementById('weather-temp').textContent = `${temp}°C`;
        
      } catch (error) {
        console.error('Weather fetch error:', error);
        document.getElementById('weather-icon').textContent = '🌡️';
        document.getElementById('weather-temp').textContent = '--°C';
      }
    }
    
    // Fetch weather on page load only (user will refresh page to update)
    fetchWeather();

