import React, { useEffect, useRef, useState } from 'react';
import { Search, MapPin, Navigation } from 'lucide-react';
import { loadMap, geocode, reverseGeocode, MapInstance, LatLng } from '@/lib/mapProvider';
import { Geolocation } from '@capacitor/geolocation';

interface HybridMapProps {
  onLocationSelect?: (location: { lat: number; lng: number; address: string }) => void;
  initialCenter?: LatLng;
}

const HybridMap: React.FC<HybridMapProps> = ({ 
  onLocationSelect, 
  initialCenter = { lat: 12.9716, lng: 77.5946 } // Bangalore
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<MapInstance | null>(null);
  const [address, setAddress] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);
  const [provider, setProvider] = useState<string>('');

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const init = async () => {
      try {
        const instance = await loadMap(mapContainerRef.current!, initialCenter);
        mapInstanceRef.current = instance;
        setProvider(instance.provider);
        setIsLoaded(true);
      } catch (err) {
        console.error("Failed to load map:", err);
      }
    };

    init();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.destroy();
      }
    };
  }, []);

  // Handle Search (Geocoding)
  const handleSearch = async (val: string) => {
    setAddress(val);
    if (val.length < 3) return;

    // We can use the autocomplete logic here if we want to keep using the Google Places script load
    // But for simplicity with the new utility, we'll use geocode on Enter or debounced
  };

  const executeSearch = async () => {
    if (!address) return;
    try {
      const coords = await geocode(address);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.setCenter(coords, 16);
        mapInstanceRef.current.addMarker({ position: coords, type: 'pin', popup: address });
        
        if (onLocationSelect) {
          onLocationSelect({ ...coords, address });
        }
      }
    } catch (err) {
      console.error("Geocoding failed:", err);
    }
  };

  const fetchCurrentLocation = async () => {
    try {
      let permResult;
      try {
        permResult = await Geolocation.checkPermissions();
      } catch (e) {
        permResult = { location: "prompt" };
      }

      if (permResult.location !== "granted") {
        try {
          permResult = await Geolocation.requestPermissions();
        } catch (e) {
          permResult = { location: "denied" };
        }
      }

      if (permResult.location !== "granted") {
        console.warn("Location permission not granted");
        return;
      }

      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000
      });

      const coords = { lat: position.coords.latitude, lng: position.coords.longitude };
      if (mapInstanceRef.current) {
        mapInstanceRef.current.setCenter(coords, 16);
        mapInstanceRef.current.addMarker({ position: coords, type: 'pin' });
        
        try {
          const result = await reverseGeocode(coords.lat, coords.lng);
          const displayAddress = result.address;
          setAddress(displayAddress);
          
          if (onLocationSelect) {
            onLocationSelect({ ...coords, address: displayAddress });
          }
        } catch (err) {
          console.error("Reverse geocoding failed:", err);
        }
      }
    } catch (error) {
      console.error("Error getting location:", error);
    }
  };

  return (
    <div className="relative w-full h-full flex flex-col">
      {/* Search Bar */}
      <div className="absolute top-4 left-4 right-4 z-10 animate-fade-in">
        <div className="relative group">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
            <Search size={18} />
          </div>
          <input
            type="text"
            placeholder="Search your area, building or street..."
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && executeSearch()}
            className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white/95 backdrop-blur-md border border-white/20 shadow-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm font-medium transition-all"
          />
        </div>
      </div>

      {/* GPS Button */}
      <div className="absolute top-24 left-4 z-10">
        <button
          onClick={fetchCurrentLocation}
          className="w-12 h-12 rounded-2xl bg-white/95 backdrop-blur-md border border-white/20 shadow-2xl flex items-center justify-center text-primary active:scale-95 transition-all"
          title="Use Current Location"
        >
          <Navigation size={20} />
        </button>
      </div>

      {/* Map Container */}
      <div ref={mapContainerRef} className="flex-1 rounded-3xl overflow-hidden shadow-inner bg-gray-100" />

      {/* Provider Badge */}
      {isLoaded && (
        <div className="absolute top-20 right-4 bg-white/80 backdrop-blur-md px-2 py-1 rounded-md text-[8px] font-bold text-muted-foreground uppercase tracking-widest border border-white/20">
          Powered by {provider}
        </div>
      )}

      {/* Overlay info */}
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-0">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Initializing Map Provider</p>
          </div>
        </div>
      )}
      
      {/* Quick Action Overlay */}
      <div className="absolute bottom-6 left-4 right-4 animate-fade-in" style={{ animationDelay: '0.5s' }}>
        <div className="bg-white/90 backdrop-blur-md p-4 rounded-2xl border border-white/20 shadow-2xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
            <Navigation size={24} />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-bold text-foreground">Confirm Location</h4>
            <p className="text-[10px] text-muted-foreground truncate max-w-[200px]">
              {address || 'Search or pan to pinpoint location'}
            </p>
          </div>
          <button 
            disabled={!address}
            className="px-6 py-3 bg-primary text-white text-xs font-bold rounded-xl hover:bg-secondary transition-all active:scale-95 disabled:opacity-50"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

export default HybridMap;
