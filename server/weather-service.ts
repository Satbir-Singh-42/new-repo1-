interface WeatherData {
  temperature: number;
  condition: 'sunny' | 'partly-cloudy' | 'cloudy' | 'overcast' | 'rainy' | 'stormy';
  cloudCover: number; // 0-100
  windSpeed: number; // km/h
  humidity: number; // 0-100
  uvIndex: number; // 0-11
  visibility: number; // km
  isDay: boolean;
  sunrise: number; // timestamp
  sunset: number; // timestamp
}

interface LocationCoordinates {
  latitude: number;
  longitude: number;
}

class WeatherService {
  private cache = new Map<string, { data: WeatherData; timestamp: number }>();
  private readonly CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

  async getCurrentWeather(location: LocationCoordinates): Promise<WeatherData> {
    const cacheKey = `${location.latitude.toFixed(4)},${location.longitude.toFixed(4)}`;
    const cached = this.cache.get(cacheKey);
    
    // Return cached data if fresh
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      console.log(`🌤️ Using cached weather for ${cacheKey}`);
      return cached.data;
    }

    try {
      // Use Open-Meteo API (free, no key required)
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&current_weather=true&daily=sunrise,sunset&hourly=temperature_2m,relative_humidity_2m,cloud_cover,wind_speed_10m,uv_index&timezone=auto`;
      
      console.log(`🌤️ Fetching REAL weather from Open-Meteo API for coordinates: ${location.latitude}, ${location.longitude}`);
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Weather API error: ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`🌤️ Real weather API response:`, JSON.stringify(data.current_weather, null, 2));
      
      const current = data.current_weather;
      const hourly = data.hourly;
      const daily = data.daily;
      
      // Get current hour index for hourly data
      const currentTime = new Date();
      const currentHour = currentTime.getHours();
      
      // Calculate if it's day or night based on sunrise/sunset
      const todaySunrise = new Date(daily.sunrise[0]).getTime();
      const todaySunset = new Date(daily.sunset[0]).getTime();
      const currentTimestamp = currentTime.getTime();
      const isDay = current.is_day === 1;
      
      // Map weather code to our condition types
      const weatherCode = current.weather_code;
      let condition: WeatherData['condition'];
      
      // Day time conditions based on WMO weather codes
      if (weatherCode <= 1) condition = 'sunny';
      else if (weatherCode <= 3) condition = 'partly-cloudy';
      else if (weatherCode <= 48) condition = 'cloudy';
      else if (weatherCode <= 67) condition = 'overcast';
      else if (weatherCode <= 82) condition = 'rainy';
      else condition = 'stormy';
      
      // At night, adjust condition for display but keep accuracy
      if (!isDay && condition === 'sunny') {
        condition = 'partly-cloudy'; // No "sunny" at night
      }
      
      const weatherData: WeatherData = {
        temperature: Math.round(current.temperature * 10) / 10,
        condition,
        cloudCover: hourly.cloud_cover?.[currentHour] || 0,
        windSpeed: Math.round(current.windspeed * 10) / 10,
        humidity: hourly.relative_humidity_2m?.[currentHour] || 50,
        uvIndex: hourly.uv_index?.[currentHour] || 0,
        visibility: 10, // Default visibility
        isDay,
        sunrise: todaySunrise,
        sunset: todaySunset
      };
      
      // Cache the result
      this.cache.set(cacheKey, { data: weatherData, timestamp: Date.now() });
      
      return weatherData;
    } catch (error) {
      console.error('Failed to fetch weather data:', error);
      
      // Fallback to time-based weather simulation with proper day/night
      return this.generateFallbackWeather(location, Date.now());
    }
  }

  private generateFallbackWeather(location: LocationCoordinates, timestamp: number): WeatherData {
    const now = new Date(timestamp);
    const hour = now.getHours();
    const month = now.getMonth();
    
    // Calculate sunrise/sunset based on location (simplified)
    const { sunrise, sunset } = this.calculateSunTimes(location, now);
    const isDay = timestamp >= sunrise && timestamp <= sunset;
    
    // Seasonal temperature patterns by month
    const seasonalBaseTemp = [5, 8, 15, 22, 28, 32, 35, 33, 28, 20, 12, 7][month];
    
    // Daily temperature variation (warmer in afternoon)
    const hourlyVariation = isDay ? Math.sin(((hour - 6) / 12) * Math.PI) * 8 : 0;
    const temperature = seasonalBaseTemp + hourlyVariation;
    
    // Weather patterns - stable for 15-minute periods
    const weatherSeed = Math.floor(timestamp / (15 * 60 * 1000));
    const seededRandom = (seed: number): number => {
      const x = Math.sin(seed) * 10000;
      return x - Math.floor(x);
    };
    
    let condition: WeatherData['condition'];
    let cloudCover: number;
    
    if (!isDay) {
      // Night time - simpler conditions
      const nightRandom = seededRandom(weatherSeed + 200);
      condition = nightRandom > 0.7 ? 'partly-cloudy' : 'cloudy';
      cloudCover = nightRandom > 0.7 ? 30 : 70;
    } else {
      // Day time conditions
      const weatherRandom = seededRandom(weatherSeed + 300);
      if (weatherRandom > 0.7) {
        condition = 'sunny';
        cloudCover = 10;
      } else if (weatherRandom > 0.5) {
        condition = 'partly-cloudy';
        cloudCover = 40;
      } else if (weatherRandom > 0.3) {
        condition = 'cloudy';
        cloudCover = 80;
      } else {
        condition = 'overcast';
        cloudCover = 95;
      }
    }
    
    return {
      temperature: Math.round(temperature * 10) / 10,
      condition,
      cloudCover,
      windSpeed: 10 + seededRandom(weatherSeed + 500) * 15,
      humidity: 50 + seededRandom(weatherSeed + 600) * 30,
      uvIndex: isDay ? Math.max(0, 6 + seededRandom(weatherSeed + 700) * 5) : 0,
      visibility: 8 + seededRandom(weatherSeed + 800) * 4,
      isDay,
      sunrise,
      sunset
    };
  }

  private calculateSunTimes(location: LocationCoordinates, date: Date): { sunrise: number; sunset: number } {
    // Simplified sunrise/sunset calculation
    const dayOfYear = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000);
    const solarDeclination = 23.45 * Math.sin((360 * (284 + dayOfYear) / 365) * Math.PI / 180);
    const hourAngle = Math.acos(-Math.tan(location.latitude * Math.PI / 180) * Math.tan(solarDeclination * Math.PI / 180));
    
    const solarNoon = 12 - (location.longitude / 15);
    const sunriseHour = solarNoon - (hourAngle * 180 / Math.PI) / 15;
    const sunsetHour = solarNoon + (hourAngle * 180 / Math.PI) / 15;
    
    const baseDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    return {
      sunrise: baseDate.getTime() + (sunriseHour * 60 * 60 * 1000),
      sunset: baseDate.getTime() + (sunsetHour * 60 * 60 * 1000)
    };
  }

  // Calculate solar generation efficiency based on sun position and weather
  calculateSolarEfficiency(weather: WeatherData, location: LocationCoordinates): number {
    if (!weather.isDay) return 0; // No solar generation at night
    
    const now = new Date();
    const currentTime = now.getTime();
    
    // Calculate sun angle effect
    const timeInDay = (currentTime - weather.sunrise) / (weather.sunset - weather.sunrise);
    const sunAngleMultiplier = Math.sin(timeInDay * Math.PI); // Bell curve for sun position
    
    // Weather condition multipliers
    const conditionMultipliers = {
      'sunny': 1.0,
      'partly-cloudy': 0.82,
      'cloudy': 0.45,
      'overcast': 0.25,
      'rainy': 0.15,
      'stormy': 0.08
    };
    
    // Cloud cover impact
    const cloudImpact = Math.max(0.1, 1 - (weather.cloudCover / 100) * 0.7);
    
    // Temperature impact on solar panel efficiency
    const tempImpact = weather.temperature <= 25 ? 1.0 : Math.max(0.7, 1 - (weather.temperature - 25) * 0.004);
    
    return Math.max(0, conditionMultipliers[weather.condition] * sunAngleMultiplier * cloudImpact * tempImpact);
  }
}

export const weatherService = new WeatherService();
export type { WeatherData, LocationCoordinates };