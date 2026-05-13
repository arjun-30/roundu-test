import { useState, useEffect, useCallback } from 'react';

export interface LocationCoords {
  lat: number;
  lng: number;
}

export interface LocationState {
  coords: LocationCoords | null;
  address: string;
  error: string | null;
  loading: boolean;
}

/**
 * useCurrentLocation
 * One-time GPS fetch. Automatically fires on mount.
 * @param onUpdate  Optional callback called with (lat, lng) each time location is obtained.
 */
export const useCurrentLocation = (onUpdate?: (lat: number, lng: number) => void) => {
  const [state, setState] = useState<LocationState>({
    coords: null,
    address: '',
    error: null,
    loading: false,
  });

  const fetch = useCallback(() => {
    if (!navigator.geolocation) {
      setState(s => ({ ...s, error: 'Geolocation is not supported by your browser.' }));
      return;
    }

    setState(s => ({ ...s, loading: true, error: null }));
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords: LocationCoords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        setState(s => ({ ...s, coords, loading: false }));
        onUpdate?.(coords.lat, coords.lng);
      },
      (err) => {
        let message = 'Failed to get location.';
        if (err.code === err.PERMISSION_DENIED) message = 'Location permission denied.';
        else if (err.code === err.TIMEOUT) message = 'Location request timed out.';
        setState(s => ({ ...s, error: message, loading: false }));
        console.warn('[useCurrentLocation]', err.message);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  }, [onUpdate]);

  useEffect(() => {
    fetch();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { ...state, refetch: fetch };
};

/**
 * useWatchLocation
 * Continuous GPS watch — updates whenever device moves.
 * Returns cleanup automatically when component unmounts.
 * @param onUpdate  Called with (lat, lng) on every new position.
 * @param enabled   Set to false to pause tracking (e.g., when provider goes offline).
 */
export const useWatchLocation = (
  onUpdate: (lat: number, lng: number) => void,
  enabled = true
) => {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setError(null);
        onUpdate(pos.coords.latitude, pos.coords.longitude);
      },
      (err) => {
        let message = 'GPS tracking error.';
        if (err.code === err.PERMISSION_DENIED) message = 'Location permission denied.';
        else if (err.code === err.TIMEOUT) message = 'GPS timed out.';
        setError(message);
        console.warn('[useWatchLocation]', err.message);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [enabled, onUpdate]);

  return { error };
};
