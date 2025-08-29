import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MapPin, Shield, Zap, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { locationService, UserLocation, LocationError } from '@/lib/location-service';

interface LocationRequestProps {
  onLocationGranted: (location: UserLocation) => void;
  onLocationDenied: () => void;
  isOpen: boolean;
}

export function LocationRequest({ onLocationGranted, onLocationDenied, isOpen }: LocationRequestProps) {
  const [isRequestingLocation, setIsRequestingLocation] = useState(false);
  const [locationError, setLocationError] = useState<LocationError | null>(null);
  const [showPermissionDialog, setShowPermissionDialog] = useState(isOpen);

  useEffect(() => {
    setShowPermissionDialog(isOpen);
  }, [isOpen]);

  const handleLocationRequest = async () => {
    setIsRequestingLocation(true);
    setLocationError(null);

    try {
      const location = await locationService.getCurrentLocation(true);
      onLocationGranted(location);
      setShowPermissionDialog(false);
    } catch (error: any) {
      setLocationError(error as LocationError);
      if (error.type === 'permission_denied') {
        onLocationDenied();
      }
    } finally {
      setIsRequestingLocation(false);
    }
  };

  const handleSkip = () => {
    setShowPermissionDialog(false);
    onLocationDenied();
  };

  const getErrorMessage = (error: LocationError): string => {
    switch (error.type) {
      case 'permission_denied':
        return 'Location access was denied. Please enable location permissions in your browser settings to get localized energy data.';
      case 'position_unavailable':
        return 'Your location could not be determined. Please check your internet connection and try again.';
      case 'timeout':
        return 'Location request timed out. Please try again.';
      default:
        return 'An error occurred while getting your location. Please try again.';
    }
  };

  return (
    <Dialog open={showPermissionDialog} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" data-testid="dialog-location-permission">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2" data-testid="text-dialog-title">
            <MapPin className="h-5 w-5 text-blue-500" />
            Share Your Location
          </DialogTitle>
          <DialogDescription data-testid="text-dialog-description">
            SolarSense would like to access your precise location to provide personalized energy trading opportunities and localized renewable energy data.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3">
            <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-950/50 rounded-lg">
              <Zap className="h-4 w-4 text-blue-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                  Local Energy Network
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  Find nearby solar installations and energy trading partners
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-950/50 rounded-lg">
              <Shield className="h-4 w-4 text-green-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-green-700 dark:text-green-300">
                  Weather & Efficiency
                </p>
                <p className="text-xs text-green-600 dark:text-green-400">
                  Get accurate solar generation forecasts for your area
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-purple-50 dark:bg-purple-950/50 rounded-lg">
              <CheckCircle className="h-4 w-4 text-purple-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-purple-700 dark:text-purple-300">
                  Privacy Protected
                </p>
                <p className="text-xs text-purple-600 dark:text-purple-400">
                  Your exact location is never shared with other users
                </p>
              </div>
            </div>
          </div>

          {locationError && (
            <Alert className="border-red-200 bg-red-50 dark:bg-red-950/50" data-testid="alert-location-error">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <AlertDescription className="text-red-700 dark:text-red-300">
                {getErrorMessage(locationError)}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              onClick={handleLocationRequest}
              disabled={isRequestingLocation}
              className="flex-1"
              data-testid="button-allow-location"
            >
              {isRequestingLocation ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                  Getting Location...
                </>
              ) : (
                <>
                  <MapPin className="h-4 w-4 mr-2" />
                  Allow Location
                </>
              )}
            </Button>
            
            <Button
              variant="outline"
              onClick={handleSkip}
              disabled={isRequestingLocation}
              className="flex-1"
              data-testid="button-skip-location"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Skip for Now
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center" data-testid="text-privacy-note">
            You can change this permission later in your browser settings
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}