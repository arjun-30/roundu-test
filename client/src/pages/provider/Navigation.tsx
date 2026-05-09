import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, MapPin, Navigation as NavIcon, Loader2, ArrowUpLeft, ArrowUpRight, ArrowUp } from "lucide-react";
import { useApp } from "@/context/AppContext";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { toast } from "sonner";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

const Navigation = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { providerRequests } = useApp();
  const booking = providerRequests.find((r) => r.id === id);

  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [currentLocation, setCurrentLocation] = useState<[number, number] | null>(null);
  const [locating, setLocating] = useState(true);
  const [steps, setSteps] = useState<any[]>([]);

  useEffect(() => {
    // Get current location
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCurrentLocation([position.coords.longitude, position.coords.latitude]);
        setLocating(false);
      },
      (error) => {
        console.error("Error getting location:", error);
        toast.error("Failed to get GPS location. Using default location.");
        // Fallback to Chennai coordinates
        setCurrentLocation([80.27, 13.08]);
        setLocating(false);
      }
    );
  }, []);

  useEffect(() => {
    if (!mapContainer.current || !currentLocation || !booking) return;
    if (map.current) return; // initialize map only once

    const destination: [number, number] = [(booking as any).lng || 80.27, (booking as any).lat || 13.08]; // Fallback to Chennai if not present

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: currentLocation,
      zoom: 13,
    });

    map.current.on('load', async () => {
      if (!map.current) return;

      // Add markers
      new mapboxgl.Marker({ color: 'blue' })
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
