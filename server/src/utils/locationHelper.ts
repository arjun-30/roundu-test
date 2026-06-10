import { env } from '../config/env';

export interface LatLng {
  lat: number;
  lng: number;
}

/**
 * Calculates the distance between two points on the Earth's surface using the Haversine formula.
 * @returns Distance in kilometers
 */
export function getDistanceKm(l1: LatLng, l2: LatLng): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((l2.lat - l1.lat) * Math.PI) / 180;
  const dLng = ((l2.lng - l1.lng) * Math.PI) / 180;
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((l1.lat * Math.PI) / 180) *
      Math.cos((l2.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
      
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  if (env.isDevelopment) {
    console.log(`[DEBUG LOCATION] Calculated distance between (${l1.lat}, ${l1.lng}) and (${l2.lat}, ${l2.lng}) is: ${distance.toFixed(3)} km`);
  }

  return distance;
}
