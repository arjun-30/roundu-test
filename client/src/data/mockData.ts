import {
  Zap, Droplets, Sparkles, Car, User, LucideIcon, SprayCan
} from "lucide-react";

export interface Service {
  id: string;
  label: string;
  icon: LucideIcon;
  desc: string;
  commonProblems?: string[];
  relatedServiceIds?: string[];
}

export interface Provider {
  id: string;
  name: string;
  serviceId: string;
  rating: number;
  reviews: number;
  pricePerHr: number;
  distanceKm: number;
  etaMin: number;
  experienceYrs: number;
  avatar: string;
  verified: boolean;
  topRated: boolean;
  bio: string;
  tags: string[];
  available: boolean;
  videoUrl?: string;
}

export interface Booking {
  id: string;
  providerId: string;
  serviceId: string;
  date: string; // ISO date
  time: string;
  notes: string;
  status: "pending" | "assigned" | "on_the_way" | "arrived" | "in_progress" | "completed" | "cancelled";
  createdAt: number;
  price: number;
  rating?: number;
  review?: string;
  paid?: boolean;
  voiceNote?: boolean;
}

export interface ProviderRequest {
  id: string;
  customerName: string;
  serviceId: string;
  address: string;
  date: string;
  time: string;
  price: number;
  status: "pending" | "accepted" | "rejected" | "assigned" | "on_the_way" | "arrived" | "in_progress" | "completed" | "cancelled";
  notes?: string;
  voiceNote?: boolean;
  lat?: number;
  lng?: number;
  quote?: number;
}

export const services: Service[] = [
  { 
    id: "plumber", 
    label: "Plumber", 
    icon: Droplets, 
    desc: "Pipes & drainage",
    commonProblems: ["Leaking pipes", "Tap repair", "Washbasin clog", "Water tanker", "Bathroom fittings"],
    relatedServiceIds: ["housekeeping", "electrician"]
  },
  { 
    id: "electrician", 
    label: "Electrician", 
    icon: Zap, 
    desc: "Wiring & fixtures",
    commonProblems: ["Fan repair", "Short circuit", "Switchboard issues", "New wiring", "MCB tripping"],
    relatedServiceIds: ["housekeeping", "plumber"]
  },
  { 
    id: "carwash", 
    label: "Car Wash", 
    icon: Car, 
    desc: "At your doorstep", 
    commonProblems: ["Exterior wash", "Interior detailing", "Full car spa"],
    relatedServiceIds: ["drivers", "housekeeping"]
  },
  { 
    id: "drivers", 
    label: "Acting Drivers", 
    icon: User, 
    desc: "Expert chauffeurs", 
    commonProblems: ["City driving", "Outstation trip", "Pick & drop", "Monthly driver"],
    relatedServiceIds: ["carwash"]
  },
  { 
    id: "housekeeping", 
    label: "House Keeping", 
    icon: SprayCan,
    desc: "Deep & regular",
    commonProblems: ["Kitchen cleaning", "Bathroom deep clean", "Full home clean", "Sofa cleaning"],
    relatedServiceIds: ["plumber", "electrician", "carwash"]
  },
  { 
    id: "srv-d7orcli8qa3s738r9qe0", 
    label: "Expert Services", 
    icon: Sparkles,
    desc: "Premium customized services",
    commonProblems: ["Custom requirement", "Technical fix", "General maintenance"],
    relatedServiceIds: ["plumber", "electrician"]
  },
];

export const getServiceById = (id: string) => services.find((s) => s.id === id);

export interface QuickFix {
  id: string;
  label: string;
  icon: LucideIcon;
}

export const quickFixes: QuickFix[] = [
  { id: "pipe", label: "Pipe leakage", icon: Droplets },
  { id: "switch", label: "Switch repair", icon: Zap },
  { id: "carwash", label: "Car detailing", icon: Car },
  { id: "cleaning", label: "Deep cleaning", icon: SprayCan },
  { id: "driver", label: "Request drive", icon: User },
];

export interface PopularTask {
  id: string;
  serviceId: string;
  category: string;
  title: string;
  description: string;
  priceLabel: string;
  image: string;
}

export const popularTasks: PopularTask[] = [
  {
    id: "pt-1",
    serviceId: "electrician",
    category: "ELECTRICAL",
    title: "Smart Lighting Install",
    description: "Complete setup for all rooms",
    priceLabel: "₹1500+",
    image: "https://images.unsplash.com/photo-1565814329452-e1efa11c5b89?w=400&h=300&fit=crop",
  },
  {
    id: "pt-2",
    serviceId: "plumber",
    category: "PLUMBING",
    title: "Full Bathroom Refit",
    description: "Fixtures, pipes & drainage",
    priceLabel: "₹3000+",
    image: "https://images.unsplash.com/photo-1585128903994-9788298932a4?w=400&h=300&fit=crop",
  },
  {
    id: "pt-3",
    serviceId: "housekeeping",
    category: "HOUSE KEEPING",
    title: "Deep Kitchen Cleaning",
    description: "Full sanitization & degreasing",
    priceLabel: "₹800+",
    image: "https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?w=400&h=300&fit=crop",
  },
];

const baseProviders: Omit<Provider, "id" | "serviceId">[] = [
  { name: "Rajesh Kumar", rating: 4.9, reviews: 238, pricePerHr: 299, distanceKm: 1.2, etaMin: 30, experienceYrs: 8, avatar: "RK", verified: true, topRated: true, bio: "Certified expert with 8+ years of hands-on experience. Quick, clean and reliable.", tags: ["Verified", "Fast"], available: true, videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4" },
  { name: "Suresh Menon", rating: 4.7, reviews: 156, pricePerHr: 249, distanceKm: 2.5, etaMin: 45, experienceYrs: 5, avatar: "SM", verified: true, topRated: false, bio: "Friendly professional focused on quality work and customer satisfaction.", tags: ["Experienced"], available: true, videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4" },
  { name: "Deepak Jain", rating: 4.8, reviews: 312, pricePerHr: 349, distanceKm: 0.8, etaMin: 20, experienceYrs: 10, avatar: "DJ", verified: true, topRated: true, bio: "Top-rated specialist serving the city for over a decade.", tags: ["Verified", "Top Rated"], available: true, videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4" },
  { name: "Vikram Singh", rating: 4.6, reviews: 89, pricePerHr: 199, distanceKm: 3.1, etaMin: 50, experienceYrs: 3, avatar: "VS", verified: false, topRated: false, bio: "Affordable and dependable service for all your needs.", tags: ["Budget"], available: true, videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4" },
  { name: "Arun Patel", rating: 4.9, reviews: 421, pricePerHr: 399, distanceKm: 1.8, etaMin: 35, experienceYrs: 12, avatar: "AP", verified: true, topRated: true, bio: "Premium professional with years of expertise and outstanding reviews.", tags: ["Verified", "Premium"], available: true, videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4" },
];

// Generate 5 providers per service
export const providers: Provider[] = services.flatMap((s) =>
  baseProviders.map((p, i) => ({
    ...p,
    id: `${s.id}-${i}`,
    serviceId: s.id,
  }))
);

export const getProviderById = (id: string) => providers.find((p) => p.id === id);

// Initial provider-side incoming requests
export const initialProviderRequests: ProviderRequest[] = [
  {
    id: "req-1",
    customerName: "Anita Sharma",
    serviceId: "electrician",
    address: "12, MG Road, Indiranagar",
    date: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
    time: "10:00 AM",
    price: 299,
    status: "pending",
    notes: "Fan installation needed.",
  },
  {
    id: "req-2",
    customerName: "Rohit Verma",
    serviceId: "electrician",
    address: "44, 5th Cross, Koramangala",
    date: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
    time: "2:30 PM",
    price: 349,
    status: "pending",
    notes: "Wiring inspection.",
  },
];

export const initialCompletedJobs: ProviderRequest[] = [
  {
    id: "job-c1",
    customerName: "Priya Das",
    serviceId: "electrician",
    address: "8, Park Street",
    date: new Date(Date.now() - 86400000 * 2).toISOString().slice(0, 10),
    time: "11:00 AM",
    price: 499,
    status: "completed",
  },
  {
    id: "job-c2",
    customerName: "Karan Mehta",
    serviceId: "electrician",
    address: "21, HSR Layout",
    date: new Date(Date.now() - 86400000 * 5).toISOString().slice(0, 10),
    time: "4:00 PM",
    price: 299,
    status: "completed",
  },
];

export const timeSlots = [
  "08:00 AM", "09:00 AM", "10:00 AM", "11:00 AM",
  "12:00 PM", "01:00 PM", "02:00 PM", "03:00 PM",
  "04:00 PM", "05:00 PM", "06:00 PM", "07:00 PM",
];
