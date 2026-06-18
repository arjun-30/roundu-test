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
  if (!city) {
    city = feature.context?.find((c: any) => c.id.startsWith("district"))?.text;
  }
  
  let area = feature.text || "";
  
  // Clean district/city
  const cleanDistrict = (name: string): string => {
    if (!name) return "";
    return name
      .replace(/\bDistrict\b/gi, "")
      .replace(/\bState\b/gi, "")
      .trim();
  };

  const finalDistrict = cleanDistrict(city || "");
  const EXCLUDED_NAMES = new Set([
    "india", "tamil nadu", "tamilnadu", "karnataka", "andhra pradesh", 
    "kerala", "maharashtra", "delhi", "state", "country"
  ]);

  const isExcluded = (name: string): boolean => {
    if (!name) return true;
    const lower = name.toLowerCase().trim();
    return EXCLUDED_NAMES.has(lower);
  };

  const finalArea = isExcluded(area) ? "" : area.trim();
  const filteredDistrict = isExcluded(finalDistrict) ? "" : finalDistrict;

  if (finalArea && filteredDistrict && finalArea.toLowerCase() !== filteredDistrict.toLowerCase()) {
    return `${finalArea}, ${filteredDistrict}`;
  }
  return finalArea || filteredDistrict || "Set Location";
}

export async function reverseGeocode(lat: number, lng: number): Promise<{ address: string; area: string; city: string; pincode: string }> {
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}&limit=1`;
  const isDev = import.meta.env.DEV;

  if (isDev) {
    console.log("[LOCATION DEBUG] Latitude:", lat);
    console.log("[LOCATION DEBUG] Longitude:", lng);
    console.log("[LOCATION DEBUG] Geocoding request URL:", url);
  }

  let res;
  try {
    res = await fetch(url);
  } catch (fetchErr: any) {
    const errorMsg = `Network request failure: Unable to reach geocoding service. Please check your internet connection.`;
    if (isDev) {
      console.error("[LOCATION DEBUG] Fetch Error:", fetchErr);
    }
    throw new Error(errorMsg);
  }

  if (!res.ok) {
    let errText = "";
    try {
      errText = await res.text();
    } catch (_) {}
    let errorMsg = `Reverse geocoding API failure: HTTP ${res.status}`;
    if (res.status === 401 || res.status === 403) {
      errorMsg = "Reverse geocoding API failure: Invalid API key or unauthorized request.";
    } else if (errText) {
      errorMsg = `Reverse geocoding API failure: ${errText}`;
    }
    if (isDev) {
      console.error("[LOCATION DEBUG] Response Error:", errorMsg);
    }
    throw new Error(errorMsg);
  }

  let data;
  try {
    data = await res.json();
  } catch (jsonErr: any) {
    const errorMsg = `Address parsing failure: Failed to parse geocoding service response.`;
    if (isDev) {
      console.error("[LOCATION DEBUG] JSON Parse Error:", jsonErr);
    }
    throw new Error(errorMsg);
  }

  if (isDev) {
    console.log("[LOCATION DEBUG] Full Mapbox response", data);
  }

  const features = data.features || [];
  if (features.length === 0) {
    throw new Error("Address parsing failure: No address found for the current coordinates.");
  }
  
  const mainFeature = features[0];
  let parsedArea = "";
  let parsedCity = "";

  if (mainFeature) {
    const context = mainFeature.context || [];
    const getContextField = (prefix: string) => context.find((c: any) => c.id.startsWith(prefix))?.text;

    const ctxLocality = getContextField("locality");
    const ctxNeighborhood = getContextField("neighborhood");
    const ctxPlace = getContextField("place");
    const ctxDistrict = getContextField("district");
    const ctxRegion = getContextField("region");
    const fText = mainFeature.text;

    parsedArea = ctxLocality || ctxNeighborhood || ctxPlace || fText || "";
    parsedCity = ctxPlace || ctxDistrict || ctxRegion || "";
  }

  // Fallback to original logic if new logic fails to find an area
  let useFallback = false;
  if (!parsedArea && !parsedCity) {
    useFallback = true;
  }

  let locality = "";
  let sublocality = "";
  let neighborhood = "";
  let suburb = "";
  let city = "";
  let district = "";
  let pincode = "";

  const checkAndSet = (id: string, text: string) => {
    if (!text) return;
    const cleanText = text.trim();
    if (id.startsWith("locality") && !locality) locality = cleanText;
    if (id.startsWith("sublocality") && !sublocality) sublocality = cleanText;
    if (id.startsWith("neighborhood") && !neighborhood) neighborhood = cleanText;
    if (id.startsWith("suburb") && !suburb) suburb = cleanText;
    if (id.startsWith("place") && !city) city = cleanText;
    if (id.startsWith("district") && !district) district = cleanText;
    if (id.startsWith("postcode") && !pincode) pincode = cleanText;
  };

  for (const f of features) {
    if (f.id) checkAndSet(f.id, f.text);
    if (f.context) {
      for (const ctx of f.context) {
        if (ctx.id) checkAndSet(ctx.id, ctx.text);
      }
    }
  }

  for (const f of features) {
    if (!pincode && f.place_name) {
      const match = f.place_name.match(/\b\d{6}\b/);
      if (match) {
        pincode = match[0];
      }
    }
  }

  let finalArea = parsedArea;
  let finalCity = parsedCity;

  if (useFallback) {
    const cleanDistrictName = (name: string): string => {
      if (!name) return "";
      return name
        .replace(/\bDistrict\b/gi, "")
        .replace(/\bState\b/gi, "")
        .trim();
    };

    const finalDistrict = cleanDistrictName(district || city);

    const EXCLUDED_NAMES = new Set([
      "india", "tamil nadu", "tamilnadu", "karnataka", "andhra pradesh", 
      "kerala", "maharashtra", "delhi", "state", "country"
    ]);

    const isExcluded = (name: string): boolean => {
      if (!name) return true;
      const lower = name.toLowerCase().trim();
      return EXCLUDED_NAMES.has(lower);
    };

    if (locality && !isExcluded(locality)) finalArea = locality;
    else if (sublocality && !isExcluded(sublocality)) finalArea = sublocality;
    else if (neighborhood && !isExcluded(neighborhood)) finalArea = neighborhood;
    else if (suburb && !isExcluded(suburb)) finalArea = suburb;

    const filteredDistrict = isExcluded(finalDistrict) ? "" : finalDistrict;
    
    finalCity = filteredDistrict;

    if (finalArea.toLowerCase() === filteredDistrict.toLowerCase()) {
      if (finalArea === locality) {
        const backupArea = sublocality || neighborhood || suburb || "";
        if (backupArea && !isExcluded(backupArea)) {
          finalArea = backupArea;
        } else {
          finalArea = "";
        }
      } else {
        finalArea = "";
      }
    }
  }

  // Prevent duplicate names
  if (finalArea && finalCity && finalArea.toLowerCase() === finalCity.toLowerCase()) {
    finalArea = finalCity;
    finalCity = "";
  }

  if (isDev) {
    console.log("[LOCATION DEBUG] Parsed area", finalArea);
    console.log("[LOCATION DEBUG] Parsed city", finalCity);
  }

  let formattedAddress = "";
  if (finalArea && finalCity) {
    formattedAddress = `${finalArea}, ${finalCity}`;
  } else {
    formattedAddress = finalArea || finalCity || "Set Location";
  }

  if (isDev) {
    console.log("[LOCATION DEBUG] Final display location", formattedAddress);
  }

  return { 
    address: formattedAddress,
    area: finalArea,
    city: finalCity,
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
