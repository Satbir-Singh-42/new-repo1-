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
      <DialogContent className="mx-3 max-w-sm sm:max-w-md w-full p-4 sm:p-6" data-testid="dialog-location-permission">
        <DialogHeader className="pb-3">
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg" data-testid="text-dialog-title">
            <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
            Share Your Location
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed" data-testid="text-dialog-description">
            Get personalized energy trading and localized renewable data.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 sm:space-y-4">
          <div className="grid grid-cols-1 gap-2">
            <div className="flex items-center gap-2 p-2 sm:p-3 bg-blue-50 dark:bg-blue-950/50 rounded-md">
              <Zap className="h-3 w-3 sm:h-4 sm:w-4 text-blue-500 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-blue-700 dark:text-blue-300">
                  Local Energy Network
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2 sm:p-3 bg-green-50 dark:bg-green-950/50 rounded-md">
              <Shield className="h-3 w-3 sm:h-4 sm:w-4 text-green-500 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-green-700 dark:text-green-300">
                  Weather & Efficiency
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2 sm:p-3 bg-purple-50 dark:bg-purple-950/50 rounded-md">
              <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-purple-500 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-purple-700 dark:text-purple-300">
                  Privacy Protected
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

          <div className="flex flex-col gap-2 pt-1">
            <Button
              onClick={handleLocationRequest}
              disabled={isRequestingLocation}
              className="w-full h-9 sm:h-10"
              data-testid="button-allow-location"
            >
              {isRequestingLocation ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-2 border-white border-t-transparent mr-2" />
                  <span className="text-sm">Getting Location...</span>
                </>
              ) : (
                <>
                  <MapPin className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                  <span className="text-sm font-medium">Allow Location</span>
                </>
              )}
            </Button>
            
            <Button
              variant="outline"
              onClick={handleSkip}
              disabled={isRequestingLocation}
              className="w-full h-8 sm:h-9"
              data-testid="button-skip-location"
            >
              <span className="text-xs sm:text-sm">Skip for Now</span>
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center" data-testid="text-privacy-note">
            Change in browser settings anytime
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}