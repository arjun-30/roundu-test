import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, MapPin, Navigation as NavIcon, Loader2, ArrowUpLeft, ArrowUpRight, ArrowUp } from "lucide-react";
import { useApp } from "@/context/AppContext";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import api from "@/lib/api";
import { socket } from "@/lib/socket";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

const Navigation = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { providerRequests, user, dispatch } = useApp();
  const [booking, setBooking] = useState<any>(null);
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const providerMarker = useRef<mapboxgl.Marker | null>(null);
  const [currentLocation, setCurrentLocation] = useState<[number, number] | null>(null);
  const [locating, setLocating] = useState(true);
  const [steps, setSteps] = useState<any[]>([]);
  const [error, setError] = useState("");
  const hasMapboxToken = !!import.meta.env.VITE_MAPBOX_TOKEN;

  useEffect(() => {
    const found = providerRequests.find((r) => r.id === id);
    if (found) {
      setBooking(found);
    } else if (user.id) {
      const fetchBookings = async () => {
        try {
          const res = await api.get(`/bookings/provider/${user.id}`);
          if (res.data.success) {
            const b = res.data.data.find((x: any) => x.id === id);
            setBooking(b);
          }
        } catch (err) {
          console.error("Failed to fetch booking:", err);
        }
      };
      fetchBookings();
    }
  }, [id, providerRequests, user.id]);

  useEffect(() => {
    if (!id) return;

    // Join job-scoped socket room so location updates are scoped to this job
    socket.emit('join_job_room', { jobId: id });

    // Watch GPS position continuously
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const coords: [number, number] = [position.coords.longitude, position.coords.latitude];
        setCurrentLocation(coords);
        setLocating(false);

        // Update global AppContext so distance filter always stays current
        dispatch({ type: "SET_CURRENT_LOCATION", lat: position.coords.latitude, lng: position.coords.longitude });

        // Move the provider marker on the map
        if (providerMarker.current) {
          providerMarker.current.setLngLat(coords);
        }

        // Broadcast location to customer via server room relay
        socket.emit('provider_location_update', {
          jobId: id,
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (err) => {
        console.error("Error getting location:", err);
        setError("Failed to get GPS location. Using default location.");
        setTimeout(() => setError(""), 3000);
        // Fallback to Chennai coordinates
        const fallback: [number, number] = [80.27, 13.08];
        setCurrentLocation(fallback);
        setLocating(false);
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [id, dispatch]);

  useEffect(() => {
    if (!mapContainer.current || !currentLocation || !booking) return;
    if (map.current) return; // initialize map only once
    if (!hasMapboxToken) return; // skip map init if no Mapbox token

    const destination: [number, number] = [(booking as any).lng || 80.27, (booking as any).lat || 13.08]; // Fallback to Chennai if not present

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: currentLocation,
      zoom: 13,
    });

    map.current.on('load', async () => {
      if (!map.current) return;

      // Add markers — store the provider (blue) marker in a ref so watchPosition can move it
      providerMarker.current = new mapboxgl.Marker({ color: 'blue' })
        .setLngLat(currentLocation)
        .addTo(map.current);

      new mapboxgl.Marker({ color: 'red' })
        .setLngLat(destination)
        .addTo(map.current);

      try {
        // Fetch route
        const query = await fetch(
          `https://api.mapbox.com/directions/v5/mapbox/driving/${currentLocation[0]},${currentLocation[1]};${destination[0]},${destination[1]}?steps=true&geometries=geojson&access_token=${mapboxgl.accessToken}`
        );
        const json = await query.json();
        
        if (json.routes && json.routes.length > 0) {
          const data = json.routes[0];
          const route = data.geometry.coordinates;
          setSteps(data.legs[0].steps);

          // Add route to map
          map.current.addLayer({
            id: 'route',
            type: 'line',
            source: {
              type: 'geojson',
              data: {
                type: 'Feature',
                properties: {},
                geometry: {
                  type: 'LineString',
                  coordinates: route
                }
              }
            },
            layout: {
              'line-join': 'round',
              'line-cap': 'round'
            },
            paint: {
              'line-color': '#3887be',
              'line-width': 5,
              'line-opacity': 0.75
            }
          });

          // Fit bounds
          const bounds = new mapboxgl.LngLatBounds(currentLocation, currentLocation);
          bounds.extend(destination);
          map.current.fitBounds(bounds, { padding: 50 });
        }
      } catch (err) {
        console.error("Failed to fetch route:", err);
      }
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [currentLocation, booking]);

  if (!booking) {
    return (
      <div className="min-h-full flex flex-col items-center justify-center bg-background p-6">
        <p className="text-muted-foreground">Booking not found</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-primary font-bold">Go Back</button>
      </div>
    );
  }

  if (locating) {
    return (
      <div className="min-h-full flex flex-col items-center justify-center bg-background p-6">
        <Loader2 size={32} className="animate-spin text-primary" />
        <p className="text-muted-foreground mt-2">Acquiring GPS location...</p>
      </div>
    );
  }

  // Graceful fallback when Mapbox token is not configured
  if (!hasMapboxToken) {
    const destLat = (booking as any)?.lat;
    const destLng = (booking as any)?.lng;
    const mapsUrl = destLat && destLng
      ? `https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}&travelmode=driving`
      : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(booking?.address || '')}&travelmode=driving`;

    return (
      <div className="min-h-full flex flex-col bg-background">
        <div className="px-5 pt-6 pb-4 flex items-center gap-3 bg-card border-b border-border">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-xl bg-input border border-border flex items-center justify-center active:scale-95">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-lg font-bold text-foreground">Navigation</h1>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-6 gap-6">
          <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
            <NavIcon size={36} className="text-primary" />
          </div>
          <div className="text-center">
            <h2 className="text-lg font-bold text-foreground">Navigate to Customer</h2>
            <p className="text-sm text-muted-foreground mt-1">{booking?.address}</p>
            {destLat && destLng && (
              <p className="text-xs text-muted-foreground mt-1">📍 {destLat.toFixed(5)}, {destLng.toFixed(5)}</p>
            )}
          </div>
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-4 rounded-2xl bg-primary text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-primary/30"
          >
            <NavIcon size={18} /> Open in Google Maps
          </a>
          <p className="text-[10px] text-muted-foreground text-center">
            For turn-by-turn navigation inside the app, configure VITE_MAPBOX_TOKEN.
          </p>
        </div>
      </div>
    );
  }

  const getManeuverIcon = (modifier: string) => {
    switch (modifier) {
      case 'left':
      case 'slight left':
      case 'sharp left':
        return <ArrowUpLeft size={20} />;
      case 'right':
      case 'slight right':
      case 'sharp right':
        return <ArrowUpRight size={20} />;
      case 'straight':
        return <ArrowUp size={20} />;
      default:
        return <ArrowUp size={20} />;
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background relative">
      <div className="px-5 pt-6 pb-4 flex items-center gap-3 animate-fade-in bg-card border-b border-border z-10">
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-xl bg-input border border-border flex items-center justify-center active:scale-95">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-bold text-foreground">Navigation</h1>
      </div>

      {error && (
        <div className="absolute top-20 left-5 right-5 z-20 bg-red-50 text-red-500 p-3 rounded-xl text-sm font-semibold shadow-sm text-center">
          {error}
        </div>
      )}

      {/* Floating Instruction Card at Top */}
      {steps.length > 0 && (
        <div className="absolute top-24 left-5 right-5 z-20 bg-background/90 backdrop-blur-md rounded-2xl p-4 border border-border shadow-lg flex items-center gap-4 animate-slide-in">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            {getManeuverIcon(steps[0].maneuver.modifier)}
          </div>
          <div className="flex-1">
            <p className="text-xs text-muted-foreground font-medium">In {Math.round(steps[0].distance)}m</p>
            <p className="text-sm font-bold text-foreground">{steps[0].maneuver.instruction}</p>
          </div>
        </div>
      )}

      <div ref={mapContainer} className="flex-1 w-full" />

      {/* Bottom section: Steps List */}
      <div className="p-5 bg-card border-t border-border max-h-[40vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-foreground">Turn-by-Turn Directions</h2>
          <span className="text-xs text-muted-foreground">{steps.length} steps</span>
        </div>
        
        <div className="space-y-4">
          {steps.map((step, index) => (
            <div key={index} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
              <div className="w-8 h-8 rounded-lg bg-input flex items-center justify-center text-foreground">
                {getManeuverIcon(step.maneuver.modifier)}
              </div>
              <div className="flex-1">
                <p className="text-sm text-foreground">{step.maneuver.instruction}</p>
                <p className="text-xs text-muted-foreground">{Math.round(step.distance)}m</p>
              </div>
            </div>
          ))}
          
          {steps.length === 0 && (
            <div className="text-center py-4 text-muted-foreground text-sm">
              Loading directions...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Navigation;
