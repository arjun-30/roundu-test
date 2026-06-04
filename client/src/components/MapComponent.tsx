import React from "react";
import dummyMap from "../assets/dummy_map.png";

interface MapComponentProps {
  bookingId: string;
  customerLocation: [number, number];
  providerLocation: [number, number];
}

/**
 * Dummy map placeholder – displays a static image.
 * This component deliberately omits any Leaflet usage.
 */
const MapComponent: React.FC<MapComponentProps> = ({
  bookingId,
  customerLocation,
  providerLocation,
}) => {
  return (
    <div className="w-full h-64 flex items-center justify-center bg-gray-100 rounded-b-2xl overflow-hidden">
      <img src={dummyMap} alt="Dummy map placeholder" className="object-cover w-full h-full" />
    </div>
  );
};

export default MapComponent;
