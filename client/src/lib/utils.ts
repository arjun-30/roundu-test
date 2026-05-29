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
 * Formats a full address string to "City, Country" format.
 * Examples: "Vellore, India", "Chennai, India"
 */
export const getShortAddress = (address: string): string => {
  if (!address) return "";

  // Handle coordinate fallback
  if (/^\d+\.\d+,\s*\d+\.\d+$/.test(address)) {
    return address;
  }

  // Split by comma or middle dot
  const separators = /,|·/;
  const parts = address.split(separators).map(p => p.trim());

  // Countries to include
  const countries = ["india", "usa", "uk", "australia", "canada", "singapore"];
  
  // States to filter out
  const statesToFilter = [
    "karnataka", "tamil nadu", "tamilnadu", "maharashtra", 
    "delhi", "telangana", "andhra pradesh", "kerala", "punjab"
  ];

  // Filter parts: remove door numbers, pincodes, and states
  const cleanParts = parts.filter(p => {
    if (!p) return false;
    if (/^\d{6}$/.test(p)) return false; // Pincode (6 digits)
    if (/^\d+[a-zA-Z]?$/.test(p)) return false; // Door number
    if (statesToFilter.includes(p.toLowerCase())) return false; // State
    return true;
  });

  if (cleanParts.length === 0) return address;

  // Find country and city parts
  let country = "";
  let cityParts: string[] = [];

  for (const part of cleanParts) {
    if (countries.includes(part.toLowerCase())) {
      country = part;
    } else {
      cityParts.push(part);
    }
  }

  // Return format: "City, Country" or fallback
  if (country && cityParts.length > 0) {
    return `${cityParts[cityParts.length - 1]}, ${country}`;
  } else if (cityParts.length >= 2) {
    return cityParts.slice(-2).join(", ");
  }

  return cleanParts[cleanParts.length - 1] || address;
};
