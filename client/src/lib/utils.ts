 import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getDistance = (l1: { lat: number; lng: number }, l2: { lat: number; lng: number }) => {
  const R = 6371;
  const dLat = ((l2.lat - l1.lat) * Math.PI) / 180;
  const dLng = ((l2.lng - l1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((l1.lat * Math.PI) / 180) *
      Math.cos((l2.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Parses any scheduled_at string (UTC or with offset) and formats it into the user's browser-local date and time consistently.
 */
export function formatLocalBookingDateTime(scheduledAt: any): { date: string; time: string } {
  if (!scheduledAt) {
    return { date: "Today", time: "Now" };
  }
  try {
    const dateObj = new Date(scheduledAt);
    if (isNaN(dateObj.getTime())) {
      // Fallback: replace space with T if database returned space separator without T
      const normalizedStr = typeof scheduledAt === 'string' ? scheduledAt.replace(' ', 'T') : scheduledAt;
      const parsedFallback = new Date(normalizedStr);
      if (!isNaN(parsedFallback.getTime())) {
        return formatDateTime(parsedFallback);
      }
      return { date: "Today", time: "Now" };
    }
    return formatDateTime(dateObj);
  } catch (err) {
    return { date: "Today", time: "Now" };
  }
}

function formatDateTime(dateObj: Date): { date: string; time: string } {
  const dateStr = dateObj.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
  
  const timeStr = dateObj.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
  
  return { date: dateStr, time: timeStr };
}

/**
 * Standardizes a selected local date and selected local time to a fully qualified UTC ISO 8601 string.
 */
export function getAbsoluteIsoTimestamp(dateStr: string, timeStr: string): string {
  // dateStr format: YYYY-MM-DD
  // timeStr format: hh:mm AM/PM
  try {
    const [time, modifier] = timeStr.split(" ");
    let [hoursStr, minutesStr] = time.split(":");
    let hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10);

    if (modifier === "PM" && hours < 12) {
      hours += 12;
    } else if (modifier === "AM" && hours === 12) {
      hours = 0;
    }

    const [year, month, day] = dateStr.split("-").map(num => parseInt(num, 10));
    const localDateObj = new Date(year, month - 1, day, hours, minutes, 0, 0);
    
    if (isNaN(localDateObj.getTime())) {
      return new Date().toISOString();
    }
    return localDateObj.toISOString();
  } catch (err) {
    console.error("Error formatting absolute timestamp:", err);
    return new Date().toISOString();
  }
}

/**
 * Formats a full address string to a privacy-safe "City, Country" label.
 */
export const getShortAddress = (address: string): string => {
  if (!address) return "";

  const trimmed = address.trim();
  if (/^-?\d+(\.\d+)?,\s*-?\d+(\.\d+)?$/.test(trimmed)) {
    return "";
  }

  // Split by comma or middle dot
  const separators = /,|·/;
  const parts = trimmed
    .split(separators)
    .map((p) => p.replace(/\b\d{5,6}\b/g, "").trim())
    .filter(Boolean);

  const statesCountries = [
    "india",
    "andaman and nicobar islands", "andhra pradesh", "arunachal pradesh", "assam",
    "bihar", "chandigarh", "chhattisgarh", "dadra and nagar haveli", "daman and diu",
    "delhi", "goa", "gujarat", "haryana", "himachal pradesh", "jammu and kashmir",
    "jharkhand", "karnataka", "kerala", "ladakh", "lakshadweep", "madhya pradesh",
    "maharashtra", "manipur", "meghalaya", "mizoram", "nagaland", "odisha",
    "orissa", "puducherry", "punjab", "rajasthan", "sikkim", "tamil nadu",
    "tamilnadu", "telangana", "tripura", "uttar pradesh", "uttarakhand",
    "west bengal"
  ];

  const cleanParts = parts.map(p => {
    return p.replace(/\bDistrict\b/gi, "").trim();
  }).filter(p => {
    if (!p) return false;
    if (/^\d+[a-zA-Z]?$/.test(p)) return false; // Door number e.g. "12", "12a", "3"
    if (statesCountries.includes(p.toLowerCase())) return false; // State/Country
    return true;
  });

  if (cleanParts.length === 0) return "";
  if (cleanParts.length === 1) return cleanParts[0];

  // Return Area, District (last two cleaned parts)
  const lastTwo = cleanParts.slice(-2);
  return lastTwo.join(", ");
};

export function formatDistance(distanceKm: number): string {
  if (distanceKm == null || isNaN(distanceKm)) return "2.5 km away";
  
  const DEBUG_LOCATION = true; // Temporary debug flag
  if (DEBUG_LOCATION) {
    console.log(`[DEBUG LOCATION] formatDistance called with: ${distanceKm} km`);
  }

  if (distanceKm < 1) {
    const metres = Math.round(distanceKm * 1000);
    return `${metres} m away`;
  }
  return `${distanceKm.toFixed(1)} km away`;
}
