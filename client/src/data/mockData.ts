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
  lat: number;
  lng: number;
  phone?: string;
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
  voiceNoteUrl?: string;
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
  voiceNoteUrl?: string;
  photos?: string[];
  video?: boolean | string;
  customerRating?: number;
  distanceKm?: number;
  lat?: number;
  lng?: number;
  quote?: number;
  customerPhone?: string;
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
  { name: "Rajesh Kumar", rating: 4.9, reviews: 238, pricePerHr: 299, distanceKm: 1.2, etaMin: 30, experienceYrs: 8, avatar: "RK", verified: true, topRated: true, bio: "Certified expert with 8+ years of hands-on experience. Quick, clean and reliable.", tags: ["Verified", "Fast"], available: true, videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4", lat: 12.9716, lng: 77.5946, phone: "9999999991" },
  { name: "Suresh Menon", rating: 4.7, reviews: 156, pricePerHr: 249, distanceKm: 2.5, etaMin: 45, experienceYrs: 5, avatar: "SM", verified: true, topRated: false, bio: "Friendly professional focused on quality work and customer satisfaction.", tags: ["Experienced"], available: true, videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4", lat: 12.9783, lng: 77.6408, phone: "9999999992" },
  { name: "Deepak Jain", rating: 4.8, reviews: 312, pricePerHr: 349, distanceKm: 0.8, etaMin: 20, experienceYrs: 10, avatar: "DJ", verified: true, topRated: true, bio: "Top-rated specialist serving the city for over a decade.", tags: ["Verified", "Top Rated"], available: true, videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4", lat: 12.9698, lng: 77.7499, phone: "9999999993" },
  { name: "Vikram Singh", rating: 4.6, reviews: 89, pricePerHr: 199, distanceKm: 3.1, etaMin: 50, experienceYrs: 3, avatar: "VS", verified: false, topRated: false, bio: "Affordable and dependable service for all your needs.", tags: ["Budget"], available: true, videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4", lat: 12.9279, lng: 77.6271, phone: "9999999994" },
  { name: "Arun Patel", rating: 4.9, reviews: 421, pricePerHr: 399, distanceKm: 1.8, etaMin: 35, experienceYrs: 12, avatar: "AP", verified: true, topRated: true, bio: "Premium professional with years of expertise and outstanding reviews.", tags: ["Verified", "Premium"], available: true, videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4", lat: 13.0358, lng: 77.5970, phone: "9999999995" },
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
    customerPhone: "9876543210",
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
    customerPhone: "9876543211",
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

// ─── Smart Suggestions ───────────────────────────────────────────────────────
export type SuggestionSeason = "summer" | "monsoon" | "winter" | "festival" | "all";

export interface SmartSuggestion {
  id: string;
  title: string;
  subtitle: string;
  serviceId: string;   // MUST be a valid id from the services[] array above
  emoji: string;
  accentColor: string; // Tailwind bg color class for the icon circle
  textColor: string;   // Tailwind text color for the title
  season: SuggestionSeason;
  category: string;
  priority: number;    // higher = shown more often (1–10)
}

export const smartSuggestions: SmartSuggestion[] = [
  // ── Electrical ────────────────────────────────────────────────
  {
    id: "sug-elec-1",
    title: "Ceiling fan making noise?",
    subtitle: "Get it serviced before summer peaks.",
    serviceId: "electrician",
    emoji: "🌀",
    accentColor: "bg-yellow-100",
    textColor: "text-yellow-800",
    season: "summer",
    category: "Electrical",
    priority: 9,
  },
  {
    id: "sug-elec-2",
    title: "Switchboard maintenance due",
    subtitle: "Loose connections are a fire risk.",
    serviceId: "electrician",
    emoji: "🔌",
    accentColor: "bg-orange-100",
    textColor: "text-orange-800",
    season: "all",
    category: "Electrical",
    priority: 7,
  },
  {
    id: "sug-elec-3",
    title: "AC filter cleaning recommended",
    subtitle: "Dirty filters raise your electricity bill.",
    serviceId: "electrician",
    emoji: "❄️",
    accentColor: "bg-blue-100",
    textColor: "text-blue-800",
    season: "summer",
    category: "Electrical",
    priority: 10,
  },
  {
    id: "sug-elec-4",
    title: "Home wiring inspection",
    subtitle: "Annual check keeps your home safe.",
    serviceId: "electrician",
    emoji: "⚡",
    accentColor: "bg-amber-100",
    textColor: "text-amber-800",
    season: "all",
    category: "Electrical",
    priority: 6,
  },
  {
    id: "sug-elec-5",
    title: "Smart lighting installation",
    subtitle: "Upgrade to energy-efficient LED lights.",
    serviceId: "electrician",
    emoji: "💡",
    accentColor: "bg-yellow-50",
    textColor: "text-yellow-900",
    season: "festival",
    category: "Electrical",
    priority: 7,
  },
  // ── Plumbing ──────────────────────────────────────────────────
  {
    id: "sug-plumb-1",
    title: "Water leakage check recommended",
    subtitle: "Small leaks waste 1000s of litres monthly.",
    serviceId: "plumber",
    emoji: "💧",
    accentColor: "bg-cyan-100",
    textColor: "text-cyan-800",
    season: "monsoon",
    category: "Plumbing",
    priority: 9,
  },
  {
    id: "sug-plumb-2",
    title: "Kitchen drain cleaning due",
    subtitle: "Prevent blockages before they overflow.",
    serviceId: "plumber",
    emoji: "🚿",
    accentColor: "bg-teal-100",
    textColor: "text-teal-800",
    season: "all",
    category: "Plumbing",
    priority: 8,
  },
  {
    id: "sug-plumb-3",
    title: "Bathroom tap repair",
    subtitle: "A dripping tap? Book a fix now.",
    serviceId: "plumber",
    emoji: "🔧",
    accentColor: "bg-sky-100",
    textColor: "text-sky-800",
    season: "all",
    category: "Plumbing",
    priority: 7,
  },
  {
    id: "sug-plumb-4",
    title: "Monsoon drainage check",
    subtitle: "Clogged drains worsen in the rains.",
    serviceId: "plumber",
    emoji: "🌧️",
    accentColor: "bg-blue-50",
    textColor: "text-blue-900",
    season: "monsoon",
    category: "Plumbing",
    priority: 10,
  },
  // ── Housekeeping ──────────────────────────────────────────────
  {
    id: "sug-hk-1",
    title: "Bathroom deep cleaning",
    subtitle: "Recommended every 3 months.",
    serviceId: "housekeeping",
    emoji: "🛁",
    accentColor: "bg-purple-100",
    textColor: "text-purple-800",
    season: "all",
    category: "Cleaning",
    priority: 8,
  },
  {
    id: "sug-hk-2",
    title: "Full home sanitization",
    subtitle: "Festival season — start fresh!",
    serviceId: "housekeeping",
    emoji: "🏠",
    accentColor: "bg-violet-100",
    textColor: "text-violet-800",
    season: "festival",
    category: "Cleaning",
    priority: 10,
  },
  {
    id: "sug-hk-3",
    title: "Kitchen deep cleaning",
    subtitle: "Grease buildup affects food hygiene.",
    serviceId: "housekeeping",
    emoji: "🍳",
    accentColor: "bg-pink-100",
    textColor: "text-pink-800",
    season: "all",
    category: "Cleaning",
    priority: 7,
  },
  {
    id: "sug-hk-4",
    title: "Sofa & carpet cleaning",
    subtitle: "Remove dust mites and allergens.",
    serviceId: "housekeeping",
    emoji: "🛋️",
    accentColor: "bg-rose-100",
    textColor: "text-rose-800",
    season: "winter",
    category: "Cleaning",
    priority: 6,
  },
  {
    id: "sug-hk-5",
    title: "Post-monsoon home cleanup",
    subtitle: "Damp walls and mould need attention.",
    serviceId: "housekeeping",
    emoji: "🌿",
    accentColor: "bg-green-100",
    textColor: "text-green-800",
    season: "monsoon",
    category: "Cleaning",
    priority: 9,
  },
  // ── Car Wash ──────────────────────────────────────────────────
  {
    id: "sug-car-1",
    title: "Doorstep car wash",
    subtitle: "Your car looks like it needs some love.",
    serviceId: "carwash",
    emoji: "🚗",
    accentColor: "bg-indigo-100",
    textColor: "text-indigo-800",
    season: "all",
    category: "Car Wash",
    priority: 7,
  },
  {
    id: "sug-car-2",
    title: "Interior detailing special",
    subtitle: "Deep clean upholstery & dashboard.",
    serviceId: "carwash",
    emoji: "✨",
    accentColor: "bg-slate-100",
    textColor: "text-slate-800",
    season: "all",
    category: "Car Wash",
    priority: 6,
  },
  {
    id: "sug-car-3",
    title: "Pre-monsoon car care",
    subtitle: "Protect paint before the rains hit.",
    serviceId: "carwash",
    emoji: "🌦️",
    accentColor: "bg-blue-100",
    textColor: "text-blue-900",
    season: "monsoon",
    category: "Car Wash",
    priority: 8,
  },
  // ── Drivers ───────────────────────────────────────────────────
  {
    id: "sug-drv-1",
    title: "Need a driver today?",
    subtitle: "Verified, trusted chauffeurs on call.",
    serviceId: "drivers",
    emoji: "🧑‍✈️",
    accentColor: "bg-emerald-100",
    textColor: "text-emerald-800",
    season: "all",
    category: "Drivers",
    priority: 5,
  },
  // ── Premium/Expert ────────────────────────────────────────────
  {
    id: "sug-exp-1",
    title: "General home maintenance",
    subtitle: "One call, all repairs handled.",
    serviceId: "srv-d7orcli8qa3s738r9qe0",
    emoji: "🔨",
    accentColor: "bg-gray-100",
    textColor: "text-gray-800",
    season: "all",
    category: "Expert Services",
    priority: 5,
  },
  {
    id: "sug-exp-2",
    title: "Festival home prep",
    subtitle: "Get your home ready for celebrations.",
    serviceId: "srv-d7orcli8qa3s738r9qe0",
    emoji: "🪔",
    accentColor: "bg-orange-50",
    textColor: "text-orange-900",
    season: "festival",
    category: "Expert Services",
    priority: 9,
  },
];
