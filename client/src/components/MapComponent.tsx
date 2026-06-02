import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface MapComponentProps {
  bookingId: string;
  customerLocation: [number, number];
  providerLocation: [number, number];
}

const MapComponent: React.FC<MapComponentProps> = ({ bookingId, customerLocation, providerLocation }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const providerMarkerRef = useRef<L.Marker | null>(null);

  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;
    if (mapInstanceRef.current) return; // already initialized

    // Parse and sanitize Customer Coordinates
    const custLat = customerLocation && typeof customerLocation[0] === 'number' && !isNaN(customerLocation[0]) && customerLocation[0] !== 0 ? customerLocation[0] : 12.9716;
    const custLng = customerLocation && typeof customerLocation[1] === 'number' && !isNaN(customerLocation[1]) && customerLocation[1] !== 0 ? customerLocation[1] : 77.5946;

    // Parse and sanitize Provider Coordinates (with slight offset default)
    const provLat = providerLocation && typeof providerLocation[0] === 'number' && !isNaN(providerLocation[0]) && providerLocation[0] !== 0 ? providerLocation[0] : custLat + 0.005;
    const provLng = providerLocation && typeof providerLocation[1] === 'number' && !isNaN(providerLocation[1]) && providerLocation[1] !== 0 ? providerLocation[1] : custLng + 0.005;

    const map = L.map(mapRef.current, {
      center: [custLat, custLng],
      zoom: 13,
      zoomControl: false,
      attributionControl: false,
    });
    mapInstanceRef.current = map;

    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      maxZoom: 19,
    }).addTo(map);

    // Customer marker
    L.marker([custLat, custLng], {
      icon: L.divIcon({
        html: "<div style='background:#fff;padding:4px;border-radius:50%;box-shadow:0 0 4px rgba(0,0,0,0.3)'><svg width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><path d='M21 10c0 6-9 13-9 13s-9-7-9-13a9 9 0 1 1 18 0z'></path><circle cx='12' cy='10' r='3'></circle></svg></div>",
        className: "",
        iconSize: [30, 30],
        iconAnchor: [15, 30],
      }),
    }).addTo(map);

    // Provider marker (initial)
    providerMarkerRef.current = L.marker([provLat, provLng], {
      icon: L.divIcon({
        html: "<div style='background:#fff;padding:4px;border-radius:50%;box-shadow:0 0 4px rgba(0,0,0,0.3)'><svg width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><path d='M5 3v4H3l4 8 4-8h-2V3z'></path><path d='M9 3h6'></path></svg></div>",
        className: "",
        iconSize: [30, 30],
        iconAnchor: [15, 30],
      }),
    }).addTo(map);

    // Fit bounds safely
    try {
      const group = L.featureGroup([
        L.marker([custLat, custLng]),
        L.marker([provLat, provLng])
      ]);
      map.fitBounds(group.getBounds().pad(0.2));
    } catch (e) {
      console.warn("Failed to fit bounds:", e);
    }

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []); // Run only once on mount

  // Handle socket updates in a separate effect
  useEffect(() => {
    const socket = (window as any).socket;
    if (socket) {
      socket.emit("join_job_room", bookingId);
      socket.on("provider_location_update", (data: { lat: number; lng: number }) => {
        if (providerMarkerRef.current && data && typeof data.lat === 'number' && typeof data.lng === 'number') {
          providerMarkerRef.current.setLatLng([data.lat, data.lng]);
        }
      });
    }

    return () => {
      if (socket) socket.off("provider_location_update");
    };
  }, [bookingId]);

  return <div ref={mapRef} className="w-full h-full rounded-b-2xl" />;
};

export default MapComponent;
