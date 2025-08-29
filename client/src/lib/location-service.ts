export interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
}

export interface LocationError {
  code: number;
  message: string;
  type: 'permission_denied' | 'position_unavailable' | 'timeout' | 'not_supported';
}

export class LocationService {
  private static instance: LocationService;
  private currentLocation: UserLocation | null = null;
  private locationPromise: Promise<UserLocation> | null = null;

  static getInstance(): LocationService {
    if (!LocationService.instance) {
      LocationService.instance = new LocationService();
    }
    return LocationService.instance;
  }

  isGeolocationSupported(): boolean {
    return 'geolocation' in navigator;
  }

  async getCurrentLocation(enableHighAccuracy = true): Promise<UserLocation> {
    if (this.locationPromise) {
      return this.locationPromise;
    }

    if (!this.isGeolocationSupported()) {
      throw new Error('Geolocation is not supported by this browser');
    }

    this.locationPromise = new Promise<UserLocation>((resolve, reject) => {
      const options: PositionOptions = {
        enableHighAccuracy,
        timeout: 15000, // 15 seconds
        maximumAge: 300000 // 5 minutes
      };

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const location: UserLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          };

          try {
            // Try to get address information using reverse geocoding
            const addressInfo = await this.reverseGeocode(location.latitude, location.longitude);
            Object.assign(location, addressInfo);
          } catch (error) {
            console.warn('Could not fetch address information:', error);
          }

          this.currentLocation = location;
          this.locationPromise = null;
          resolve(location);
        },
        (error) => {
          this.locationPromise = null;
          const locationError: LocationError = {
            code: error.code,
            message: error.message,
            type: this.getErrorType(error.code)
          };
          reject(locationError);
        },
        options
      );
    });

    return this.locationPromise;
  }

  private getErrorType(code: number): LocationError['type'] {
    switch (code) {
      case 1:
        return 'permission_denied';
      case 2:
        return 'position_unavailable';
      case 3:
        return 'timeout';
      default:
        return 'not_supported';
    }
  }

  private async reverseGeocode(latitude: number, longitude: number): Promise<Partial<UserLocation>> {
    try {
      // Using a simple reverse geocoding service - in production, you'd use a proper service
      const response = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
      );
      
      if (!response.ok) {
        throw new Error('Reverse geocoding failed');
      }

      const data = await response.json();
      
      return {
        address: data.locality || data.city || '',
        city: data.city || data.locality || '',
        state: data.principalSubdivision || '',
        country: data.countryName || ''
      };
    } catch (error) {
      console.warn('Reverse geocoding failed:', error);
      return {};
    }
  }

  getCachedLocation(): UserLocation | null {
    return this.currentLocation;
  }

  clearCachedLocation(): void {
    this.currentLocation = null;
  }

  async requestLocationPermission(): Promise<boolean> {
    if (!this.isGeolocationSupported()) {
      return false;
    }

    try {
      // Check if permission is already granted
      if ('permissions' in navigator) {
        const permission = await navigator.permissions.query({ name: 'geolocation' });
        if (permission.state === 'granted') {
          return true;
        }
      }

      // Try to get location to trigger permission request
      await this.getCurrentLocation();
      return true;
    } catch (error) {
      return false;
    }
  }
}

// Export a singleton instance
export const locationService = LocationService.getInstance();