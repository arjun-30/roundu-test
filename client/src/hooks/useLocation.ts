import { useState, useEffect, useCallback } from 'react';
import { Geolocation } from '@capacitor/geolocation';

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
  const [state, setState] = useState<LocationState>(() => {
    // Load cached location instantly on init to prevent layout shifts/flickering
    try {
      const cached = localStorage.getItem('roundu_last_location');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && typeof parsed.lat === 'number' && typeof parsed.lng === 'number') {
          return {
            coords: { lat: parsed.lat, lng: parsed.lng },
            address: parsed.address || '',
            error: null,
            loading: false,
          };
        }
      }
    } catch (e) {
      console.warn('Failed to parse cached location', e);
    }
    return {
      coords: null,
      address: '',
      error: null,
      loading: false,
    };
  });

  const MAX_CACHE_AGE_MS = 6 * 60 * 60 * 1000; // 6 hours

  const fetch = useCallback(async (forcePrompt = false) => {
    if (localStorage.getItem("roundu_is_manual_location") === "true" && !forcePrompt) {
      setState(s => ({ ...s, loading: false }));
      return;
    }

    setState(s => ({ ...s, loading: true, error: null }));
    try {
      try {
        // Attempt to request permissions explicitly (useful for native Capacitor)
        await Geolocation.requestPermissions();
      } catch (e) {
        // On web, requestPermissions might not be supported. We ignore the error 
        // and rely on getCurrentPosition to naturally trigger the browser prompt.
        console.warn("requestPermissions not supported, relying on getCurrentPosition prompt");
      }

      const pos = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000
      });

      const coords: LocationCoords = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
      };

      setState(s => ({ ...s, coords, error: null, loading: false }));
      if (onUpdate) {
        onUpdate(coords.lat, coords.lng);
      }
    } catch (err: any) {
      console.warn('[useCurrentLocation] Error:', err);
      let message = 'Failed to get location.';
      if (err.message?.includes('denied') || err.code === 1) {
        message = 'Location permission denied.';
      } else if (err.message?.includes('timeout') || err.code === 3) {
        message = 'Location request timed out.';
      }

      // Fallback to cached location if GPS fails and cache is recent
      try {
        const cached = localStorage.getItem('roundu_last_location');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && typeof parsed.lat === 'number' && typeof parsed.lng === 'number') {
            const age = parsed.ts ? (Date.now() - parsed.ts) : Infinity;
            if (age <= MAX_CACHE_AGE_MS) {
              setState(s => ({
                ...s,
                coords: { lat: parsed.lat, lng: parsed.lng },
                address: parsed.address || '',
                error: null,
                loading: false,
              }));
              if (onUpdate) {
                onUpdate(parsed.lat, parsed.lng);
              }
              return;
            } else {
              console.warn('[useCurrentLocation] cached location too old — ignoring');
            }
          }
        }
      } catch (cacheErr) {
        console.warn('Cache recovery failed:', cacheErr);
      }

      setState(s => ({ ...s, error: message, loading: false }));
    }
  }, [onUpdate]);

  useEffect(() => {
    // If we have cached coords, trigger callback immediately
    if (state.coords && onUpdate) {
      onUpdate(state.coords.lat, state.coords.lng);
    }
    fetch();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { ...state, refetch: () => fetch(true) };
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

    let watchId: string | null = null;
    let active = true;

    const startWatch = async () => {
      try {
        try {
          await Geolocation.requestPermissions();
        } catch (e) {
          console.warn("requestPermissions not supported, relying on watchPosition prompt");
        }
        
        if (!active) return;

        watchId = await Geolocation.watchPosition(
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
          (pos, err) => {
            if (err) {
              console.warn('[useWatchLocation] callback error:', err);
              setError(err.message || 'GPS tracking error.');
              return;
            }
            if (pos) {
              setError(null);
              onUpdate(pos.coords.latitude, pos.coords.longitude);
            }
          }
        );
      } catch (err: any) {
        console.warn('[useWatchLocation] setup error:', err);
        setError(err.message || 'GPS tracking error.');
      }
    };

    startWatch();

    return () => {
      active = false;
      if (watchId) {
        Geolocation.clearWatch({ id: watchId }).catch(err => {
          console.warn('Error clearing watch:', err);
        });
      }
    };
  }, [enabled, onUpdate]);

  return { error };
};
