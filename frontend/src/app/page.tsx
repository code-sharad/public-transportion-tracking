'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import MobileSearchBar from '@/components/MobileSearchBar';
import MobileBottomNav from '@/components/MobileBottomNav';
import BusDetailsBottomSheet from '@/components/BusDetailsBottomSheet';
import { useSocket } from '@/hooks/useSocket';
import { Vehicle, Route, Stop } from '@/types';

// Dynamically import Map component to avoid SSR issues with Leaflet
const Map = dynamic(() => import('@/components/Map'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-white flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2"
        style={{ borderColor: 'var(--color-accent-primary)' }} />
    </div>
  )
});

export default function Home() {
  const [selectedRoute] = useState<Route | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [routes] = useState<Route[]>([]);
  const [stops] = useState<Stop[]>([]);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [userAccuracy, setUserAccuracy] = useState<number | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [locationError, setLocationError] = useState<string | null>(null);
  const socket = useSocket();

  // Geolocation helpers
  const hasGeoCode = (e: unknown): e is GeolocationPositionError => {
    return typeof e === 'object' && e !== null && 'code' in (e as Record<string, unknown>);
  };
  const hasMessage = (e: unknown): e is { message: string } => {
    return typeof e === 'object' && e !== null && typeof (e as Record<string, unknown>).message === 'string';
  };

  const geolocSuccess = (position: GeolocationPosition) => {
    const { latitude, longitude, accuracy } = position.coords;
    setUserLocation([latitude, longitude]);
    if (typeof accuracy === 'number') setUserAccuracy(accuracy);
    setLocationError(null);
  };

  const geolocError = (error: GeolocationPositionError | unknown) => {
    let message = 'Unable to get your location.';
    if (hasGeoCode(error)) {
      const ge = error;
      if (ge.code === 1) message = 'Location permission denied. Enable it in browser settings.';
      else if (ge.code === 2) message = 'Location unavailable. Try moving to an open area or check connectivity.';
      else if (ge.code === 3) message = 'Location request timed out. Please try again.';
      console.error(`[Geolocation] code=${ge.code} message=${ge.message}`);
    } else if (hasMessage(error)) {
      message = error.message;
      console.error(`[Geolocation] ${message}`);
    } else {
      console.error('[Geolocation] Unknown error', error);
    }
    setLocationError(message);
    // Fallback to Delhi only if not already set
    setUserLocation(prev => prev ?? [28.6139, 77.2090]);
  };

  const requestLocation = ({ silent = false, userInitiated = false }: { silent?: boolean; userInitiated?: boolean } = {}) => {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      if (!silent) setLocationError('Geolocation is not supported by this browser.');
      setUserLocation(prev => prev ?? [28.6139, 77.2090]);
      return;
    }
    // Secure context check (required by most mobile browsers)
    const isSecure = window.isSecureContext || location.protocol === 'https:' || location.hostname === 'localhost';
    if (!isSecure) {
      if (!silent) setLocationError('Location requires a secure context (HTTPS) or localhost.');
      setUserLocation(prev => prev ?? [28.6139, 77.2090]);
      return;
    }
    try {
      type GeoPermissionName = 'geolocation';
      type PermissionState = 'granted' | 'denied' | 'prompt';
      interface PermissionStatus { state: PermissionState }
      type MaybePermissionsNavigator = Navigator & {
        permissions?: { query: (desc: { name: GeoPermissionName }) => Promise<PermissionStatus> }
      };
      const navPerms = (navigator as MaybePermissionsNavigator).permissions;
      const getPos = () =>
        navigator.geolocation.getCurrentPosition(geolocSuccess, geolocError, {
          enableHighAccuracy: true,
          maximumAge: 30000,
          timeout: 10000,
        });
      if (navPerms?.query) {
        navPerms
          .query({ name: 'geolocation' })
          .then((res: PermissionStatus) => {
            if (res.state === 'denied') {
              if (!silent) setLocationError('Location permission is blocked. Enable it in browser settings.');
              setUserLocation(prev => prev ?? [28.6139, 77.2090]);
              return;
            }
            // Avoid triggering a prompt automatically on initial load
            if (res.state === 'prompt' && !userInitiated) {
              // Skip calling getCurrentPosition silently until user taps the button
              return;
            }
            getPos();
          })
          .catch(() => getPos());
      } else {
        // Safari iOS often requires a user gesture. Skip auto-call unless user initiated.
        if (userInitiated) getPos();
      }
    } catch (e) {
      if (!silent) geolocError(e);
    }
  };

  // Initial geolocation
  useEffect(() => {
    requestLocation({ silent: true, userInitiated: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Socket.io event listeners
  useEffect(() => {
    if (!socket) return;

    socket.on('vehicle-update', (vehicleData: Vehicle) => {
      setVehicles(prev => {
        const index = prev.findIndex(v => v.id === vehicleData.id);
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = vehicleData;
          return updated;
        }
        return [...prev, vehicleData];
      });
    });

    socket.on('vehicle-arrival', (arrivalData: unknown) => {
      console.log('Vehicle arrived at stop:', arrivalData);
      // Handle vehicle arrival notifications
    });

    return () => {
      socket.off('vehicle-update');
      socket.off('vehicle-arrival');
    };
  }, [socket]);

  // Track selected route
  useEffect(() => {
    if (!socket || !selectedRoute) return;

    socket.emit('track-route', selectedRoute.id);

    return () => {
      socket.emit('stop-tracking-route', selectedRoute.id);
    };
  }, [socket, selectedRoute]);

  // Track selected vehicle
  useEffect(() => {
    if (!socket || !selectedVehicle) return;

    socket.emit('track-vehicle', selectedVehicle.id);

    return () => {
      socket.emit('stop-tracking-vehicle', selectedVehicle.id);
    };
  }, [socket, selectedVehicle]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    // Implement search logic here
  };

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Full-screen Map with Overlay */}
      <div className="flex-1 relative">
        {/* Map */}
        <Map
          vehicles={vehicles}
          routes={routes}
          stops={stops}
          selectedRoute={selectedRoute}
          selectedVehicle={selectedVehicle}
          onVehicleSelect={setSelectedVehicle}
          userLocation={userLocation}
          userAccuracy={userAccuracy}
        />

        {/* Floating Search Bar */}
        <MobileSearchBar
          onSearch={handleSearch}
          placeholder="Search routes, stops..."
          value={searchQuery}
        />

        {/* Location error banner */}
        {locationError && (
          <div className="absolute top-20 left-4 right-4 z-30 bg-white border border-red-200 text-red-700 rounded-xl px-3 py-2 shadow">
            {locationError}
          </div>
        )}

        {/* Selected Vehicle Info - Mobile Bottom Sheet */}
        {selectedVehicle && (
          <BusDetailsBottomSheet
            vehicle={selectedVehicle}
            onClose={() => setSelectedVehicle(null)}
            onSetAlert={() => console.log('Set alert for', selectedVehicle.vehicleNumber)}
          />
        )}

        {/* Floating Locate Me Button */}
        <button
          aria-label="Locate me"
          title="Locate me"
          onClick={() => {
            setLocationError(null);
            requestLocation({ silent: false, userInitiated: true });
          }}
          className="absolute bottom-24 right-4 z-30 rounded-full shadow-lg p-3 active:scale-95"
          style={{ backgroundColor: 'var(--color-accent-primary)' }}
        >
          {/* Simple crosshair icon */}
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="3" fill="#FFFFFF" />
            <path d="M12 2V5M12 19V22M2 12H5M19 12H22" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
            <circle cx="12" cy="12" r="8" stroke="#FFFFFF" strokeWidth="2" opacity="0.4" />
          </svg>
        </button>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
    </div>
  );
}
