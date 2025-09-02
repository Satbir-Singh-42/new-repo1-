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
          
          // Cache location in localStorage
          try {
            localStorage.setItem('user_location', JSON.stringify(location));
            localStorage.setItem('location_permission_granted', 'true');
          } catch (error) {
            console.warn('Failed to cache location:', error);
          }
          
          this.locationPromise = null;
          resolve(location);
        },
        (error) => {
          this.locationPromise = null;
          
          // Cache permission denial to avoid repeated prompts
          if (error.code === 1) { // Permission denied
            try {
              localStorage.setItem('location_permission_denied', 'true');
            } catch (err) {
              console.warn('Failed to cache permission denial:', err);
            }
          }
          
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
    // First check memory cache
    if (this.currentLocation) {
      return this.currentLocation;
    }
    
    // Then check localStorage
    try {
      const cached = localStorage.getItem('user_location');
      if (cached) {
        this.currentLocation = JSON.parse(cached);
        return this.currentLocation;
      }
    } catch (error) {
      console.warn('Failed to parse cached location:', error);
    }
    
    return null;
  }

  clearCachedLocation(): void {
    this.currentLocation = null;
    try {
      localStorage.removeItem('user_location');
      localStorage.removeItem('location_permission_granted');
      localStorage.removeItem('location_permission_denied');
      console.log('🧹 Location cache cleared - user can be prompted again');
    } catch (error) {
      console.warn('Failed to clear cached location:', error);
    }
  }

  resetLocationPermission(): void {
    this.clearCachedLocation();
    console.log('🔄 Location permission reset - dialog will show on next check');
  }

  async getBrowserPermissionState(): Promise<'granted' | 'denied' | 'prompt' | 'unknown'> {
    if (!this.isGeolocationSupported()) {
      return 'unknown';
    }

    try {
      if ('permissions' in navigator) {
        const permission = await navigator.permissions.query({ name: 'geolocation' });
        return permission.state as 'granted' | 'denied' | 'prompt';
      }
    } catch (error) {
      console.warn('Failed to check browser permission state:', error);
    }

    return 'unknown';
  }

  async shouldShowLocationDialog(): Promise<boolean> {
    if (!this.isGeolocationSupported()) {
      return false;
    }

    // Check if we already have location and permission is granted
    const cachedLocation = this.getCachedLocation();
    const permissionGranted = this.isPermissionGranted();
    
    if (cachedLocation && permissionGranted) {
      return false;
    }

    // Check if user explicitly denied permission before
    if (this.isPermissionDenied()) {
      return false;
    }

    // Check browser permission state
    const browserPermission = await this.getBrowserPermissionState();
    
    // Only show dialog if permission is in 'prompt' state (not yet decided)
    // or if we have no cached response and browser state is unknown
    if (browserPermission === 'granted') {
      // Permission granted but we might not have location yet
      return !cachedLocation;
    } else if (browserPermission === 'denied') {
      // Browser-level permission denied, cache this and don't show dialog
      try {
        localStorage.setItem('location_permission_denied', 'true');
      } catch (error) {
        console.warn('Failed to cache permission denial:', error);
      }
      return false;
    }
    
    // Show dialog only if browser state is 'prompt' or 'unknown' and we haven't asked before
    return browserPermission === 'prompt' || (browserPermission === 'unknown' && !cachedLocation);
  }

  async requestLocationPermission(): Promise<boolean> {
    if (!this.isGeolocationSupported()) {
      return false;
    }

    try {
      // Check if permission is already granted
      const browserPermission = await this.getBrowserPermissionState();
      if (browserPermission === 'granted') {
        return true;
      } else if (browserPermission === 'denied') {
        return false;
      }

      // Try to get location to trigger permission request
      await this.getCurrentLocation();
      return true;
    } catch (error) {
      return false;
    }
  }

  isPermissionDenied(): boolean {
    try {
      return localStorage.getItem('location_permission_denied') === 'true';
    } catch (error) {
      return false;
    }
  }

  isPermissionGranted(): boolean {
    try {
      return localStorage.getItem('location_permission_granted') === 'true';
    } catch (error) {
      return false;
    }
  }
}

// Export a singleton instance
export const locationService = LocationService.getInstance();