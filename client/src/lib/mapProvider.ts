/**
 * mapProvider.ts
 * ──────────────────────────────────────────────────────────────
 * Mapbox-only map utility for RoundU.
 *
 * Usage:
 *   import { loadMap, geocode, getDirections } from "@/lib/mapProvider";
 *
 *   // Mount a map into a div
 *   const map = await loadMap(containerRef.current, { lat: 13.08, lng: 80.27 });
 *
 *   // Geocode an address
 *   const { lat, lng } = await geocode("Chennai, Tamil Nadu");
 *
 *   // Get a route (returns GeoJSON LineString)
 *   const route = await getDirections(origin, destination);
 */

// ──────────────────────────────────────────────────────────────
// 1. Config — populate via environment variables
// ──────────────────────────────────────────────────────────────

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN ?? "pk.eyJ1IjoiYXJqdW5ycjIwMDQiLCJhIjoiY21vajRwNm9rMDh3cTJvczZzdjVrODZ4YyJ9.JjxOS6rhRcDOArX70f0RQg";

// ──────────────────────────────────────────────────────────────
// 2. Types
// ──────────────────────────────────────────────────────────────

export type Provider = "mapbox";

export interface LatLng {
  lat: number;
  lng: number;
}

export interface MapInstance {
  native: any;
  provider: Provider;
  setCenter(center: LatLng, zoom?: number): void;
  addMarker(options: MarkerOptions): () => void;
  drawRoute(coordinates: LatLng[], color?: string): () => void;
  destroy(): void;
}

export interface MarkerOptions {
  position: LatLng;
  label?: string;
  type?: "customer" | "provider" | "pin";
  popup?: string;
}

export interface RouteResult {
  coordinates: LatLng[];
  distanceMetres: number;
  durationSeconds: number;
}

// ──────────────────────────────────────────────────────────────
// 3. SDK Loader
// ──────────────────────────────────────────────────────────────

let mapboxLoadPromise: Promise<void> | null = null;

function loadMapboxSDK(): Promise<void> {
  if (mapboxLoadPromise) return mapboxLoadPromise;

  mapboxLoadPromise = new Promise((resolve, reject) => {
    if (!MAPBOX_TOKEN) {
      reject(new Error("Mapbox token is not configured (VITE_MAPBOX_TOKEN)"));
      return;
    }

    if ((window as any).mapboxgl) {
      resolve();
      return;
    }

    // Load CSS
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://api.mapbox.com/mapbox-gl-js/v3.4.0/mapbox-gl.css";
    document.head.appendChild(link);

    // Load JS
    const script = document.createElement("script");
    script.src = "https://api.mapbox.com/mapbox-gl-js/v3.4.0/mapbox-gl.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Mapbox GL JS"));
    document.head.appendChild(script);

    setTimeout(() => reject(new Error("Mapbox SDK load timeout")), 8000);
  });

  return mapboxLoadPromise;
}

// ──────────────────────────────────────────────────────────────
// 4. Mapbox Adapter
// ──────────────────────────────────────────────────────────────

function createMapboxMapInstance(map: any, markersRef: any[]): MapInstance {
  const mapboxgl = (window as any).mapboxgl;

  return {
    native: map,
    provider: "mapbox",

    setCenter({ lat, lng }, zoom = 15) {
      map.flyTo({ center: [lng, lat], zoom });
    },

    addMarker({ position, label, type = "pin", popup }) {
      const colors: Record<string, string> = {
        customer: "#0EA5E9",
        provider: "#10B981",
        pin: "#6366F1",
      };

      const marker = new mapboxgl.Marker({ color: colors[type] })
        .setLngLat([position.lng, position.lat])
        .addTo(map);

      if (popup) {
        const p = new mapboxgl.Popup({ offset: 25 }).setText(popup);
        marker.setPopup(p);
      }

      markersRef.push(marker);
      return () => {
        marker.remove();
        const idx = markersRef.indexOf(marker);
        if (idx !== -1) markersRef.splice(idx, 1);
      };
    },

    drawRoute(coordinates, color = "#6366F1") {
      const id = `route-${Date.now()}`;
      map.addSource(id, {
        type: "geojson",
        data: {
          type: "Feature",
          geometry: {
            type: "LineString",
            coordinates: coordinates.map((c) => [c.lng, c.lat]),
          },
        },
      });
      map.addLayer({
        id,
        type: "line",
        source: id,
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": color, "line-width": 4, "line-opacity": 0.9 },
      });
      return () => {
        if (map.getLayer(id)) map.removeLayer(id);
        if (map.getSource(id)) map.removeSource(id);
      };
    },

    destroy() {
      markersRef.forEach((m) => m.remove());
      markersRef.length = 0;
      map.remove();
    },
  };
}

// ──────────────────────────────────────────────────────────────
// 5. Public API
// ──────────────────────────────────────────────────────────────

export async function loadMap(
  container: HTMLElement,
  center: LatLng,
  zoom = 14
): Promise<MapInstance> {
  await loadMapboxSDK();
  const mapboxgl = (window as any).mapboxgl;
  mapboxgl.accessToken = MAPBOX_TOKEN;

  return new Promise((resolve, reject) => {
    try {
      const markers: any[] = [];
      const map = new mapboxgl.Map({
        container,
        style: "mapbox://styles/mapbox/streets-v12",
        center: [center.lng, center.lat],
        zoom,
        attributionControl: false,
      });

      map.on("load", () => resolve(createMapboxMapInstance(map, markers)));
      map.on("error", (e: any) => reject(new Error(`Mapbox error: ${e.error?.message ?? e}`)));
    } catch (e) {
      reject(e);
    }
  });
}

export async function geocode(address: string): Promise<LatLng> {
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${MAPBOX_TOKEN}&limit=1`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Mapbox geocoding HTTP ${res.status}`);
  const data = await res.json();
  const [lng, lat] = data.features?.[0]?.center ?? [];
  if (lat == null) throw new Error("Mapbox geocoding: no results");
  return { lat, lng };
}

export function formatCityCountry(feature: any): string {
  if (!feature) return "";
  
  // Try to find place (city)
  let city = feature.context?.find((c: any) => c.id.startsWith("place"))?.text;
  
  // Fallbacks for city
  if (!city) {
    city = feature.context?.find((c: any) => c.id.startsWith("district"))?.text;
  }
  if (!city) {
    city = feature.context?.find((c: any) => c.id.startsWith("region"))?.text;
  }
  if (!city) {
    if (feature.id?.startsWith("place") || feature.id?.startsWith("district")) {
      city = feature.text;
    }
  }
  
  // Try to find country
  let country = feature.context?.find((c: any) => c.id.startsWith("country"))?.text;
  if (!country && feature.id?.startsWith("country")) {
    country = feature.text;
  }
  if (!country && feature.place_name) {
    const parts = feature.place_name.split(",");
    country = parts[parts.length - 1]?.trim();
  }
  if (!country) {
    country = "India";
  }
  
  if (city) {
    return `${city.trim()}, ${country.trim()}`;
  }
  
  if (feature.place_name) {
    const parts = feature.place_name.split(",");
    if (parts.length >= 2) {
      return `${parts[parts.length - 2].trim()}, ${parts[parts.length - 1].trim()}`;
    }
    return feature.place_name;
  }
  
  return "Set Location";
}

export async function reverseGeocode(lat: number, lng: number): Promise<{ address: string; area: string; city: string; pincode: string }> {
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}&limit=1`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Mapbox reverse geocoding HTTP ${res.status}`);
  const data = await res.json();
  const feature = data.features?.[0];
  if (!feature) throw new Error("Mapbox reverse geocoding: no results");
  
  let city = feature.context?.find((c: any) => c.id.startsWith("place"))?.text || "";
  if (!city && feature.context) {
    city = feature.context.find((c: any) => c.id.startsWith("district"))?.text || 
           feature.context.find((c: any) => c.id.startsWith("region"))?.text || "";
  }
  const area = feature.text || "";
  let pincode = feature.context?.find((c: any) => c.id.startsWith("postcode"))?.text || "";
  if (!pincode && feature.place_name) {
    const match = feature.place_name.match(/\b\d{6}\b/);
    if (match) {
      pincode = match[0];
    }
  }
  
  const formattedAddress = formatCityCountry(feature);
  
  return { 
    address: formattedAddress,
    area: area,
    city: city,
    pincode: pincode
  };
}

export async function getDirections(
  origin: LatLng,
  destination: LatLng
): Promise<RouteResult> {
  const url =
    `https://api.mapbox.com/directions/v5/mapbox/driving/` +
    `${origin.lng},${origin.lat};${destination.lng},${destination.lat}` +
    `?access_token=${MAPBOX_TOKEN}&geometries=geojson&overview=full`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Mapbox Directions HTTP ${res.status}`);
  const data = await res.json();
  const route = data.routes?.[0];
  if (!route) throw new Error("Mapbox Directions: no routes returned");

  const coordinates: LatLng[] = route.geometry.coordinates.map(
    ([lng, lat]: [number, number]) => ({ lat, lng })
  );

  return {
    coordinates,
    distanceMetres: route.distance,
    durationSeconds: route.duration,
  };
}

export async function getSuggestions(query: string): Promise<{ address: string; lat: number; lng: number }[]> {
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}&limit=5`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Mapbox suggestions HTTP ${res.status}`);
  const data = await res.json();
  return (data.features || []).map((f: any) => ({
    address: f.place_name,
    lng: f.center[0],
    lat: f.center[1]
  }));
}
