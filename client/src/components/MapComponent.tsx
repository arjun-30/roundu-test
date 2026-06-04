import React, { useEffect, useRef } from "react";
import { loadMap, getDirections, MapInstance } from "@/lib/mapProvider";

interface MapComponentProps {
  bookingId: string;
  customerLocation: [number, number];
  providerLocation: [number, number];
}

const MapComponent: React.FC<MapComponentProps> = ({
  bookingId,
  customerLocation,
  providerLocation,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapInstance | null>(null);

  // Markers and route cleanup functions
  const customerMarkerCleanup = useRef<(() => void) | null>(null);
  const providerMarkerCleanup = useRef<(() => void) | null>(null);
  const routeCleanup = useRef<(() => void) | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!containerRef.current) return;

    let isMounted = true;
    const custLatLng = { lat: customerLocation[0], lng: customerLocation[1] };
    const provLatLng = { lat: providerLocation[0], lng: providerLocation[1] };

    // Center at the midpoint between customer and provider
    const center = {
      lat: (custLatLng.lat + provLatLng.lat) / 2,
      lng: (custLatLng.lng + provLatLng.lng) / 2,
    };

    loadMap(containerRef.current, center, 13)
      .then((mapInstance) => {
        if (!isMounted) {
          mapInstance.destroy();
          return;
        }
        mapRef.current = mapInstance;

        // Draw initial markers
        customerMarkerCleanup.current = mapInstance.addMarker({
          position: custLatLng,
          type: "customer",
          popup: "Your Location",
        });

        providerMarkerCleanup.current = mapInstance.addMarker({
          position: provLatLng,
          type: "provider",
          popup: "Provider",
        });

        // Draw initial route
        getDirections(provLatLng, custLatLng)
          .then((routeResult) => {
            if (!isMounted || !mapRef.current) return;
            routeCleanup.current = mapRef.current.drawRoute(routeResult.coordinates, "#f97316");
          })
          .catch((err) => console.warn("Failed to load initial directions:", err));
      })
      .catch((err) => console.error("Failed to load Mapbox map:", err));

    return () => {
      isMounted = false;
      if (customerMarkerCleanup.current) customerMarkerCleanup.current();
      if (providerMarkerCleanup.current) providerMarkerCleanup.current();
      if (routeCleanup.current) routeCleanup.current();
      if (mapRef.current) {
        mapRef.current.destroy();
        mapRef.current = null;
      }
    };
  }, []);

  // Update provider location and route dynamically when providerLocation changes
  useEffect(() => {
    const mapInstance = mapRef.current;
    if (!mapInstance) return;

    const custLatLng = { lat: customerLocation[0], lng: customerLocation[1] };
    const provLatLng = { lat: providerLocation[0], lng: providerLocation[1] };

    // 1. Remove old provider marker and add new one
    if (providerMarkerCleanup.current) {
      providerMarkerCleanup.current();
    }
    providerMarkerCleanup.current = mapInstance.addMarker({
      position: provLatLng,
      type: "provider",
      popup: "Provider",
    });

    // 2. Fetch and draw the updated route
    getDirections(provLatLng, custLatLng)
      .then((routeResult) => {
        if (routeCleanup.current) {
          routeCleanup.current();
        }
        if (mapRef.current) {
          routeCleanup.current = mapRef.current.drawRoute(routeResult.coordinates, "#f97316");
        }
      })
      .catch((err) => console.warn("Failed to update directions:", err));

  }, [providerLocation[0], providerLocation[1], customerLocation[0], customerLocation[1]]);

  return (
    <div className="w-full h-full relative">
      <div ref={containerRef} className="w-full h-full bg-gray-100" />
    </div>
  );
};

export default MapComponent;
