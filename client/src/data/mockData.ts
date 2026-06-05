import {
  Zap, Droplets, Sparkles, Car, User, LucideIcon, SprayCan, Wind, WashingMachine, Droplet, Wrench
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
  status:
  | "pending"
  | "assigned"
  | "on_the_way"
  | "arrived"
  | "in_progress"
  | "completed"
  | "payment_pending"
  | "paid";
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
  status:
  | "pending"
  | "accepted"
  | "rejected"
  | "assigned"
  | "on_the_way"
  | "arrived"
  | "in_progress"
  | "completed"
  | "payment_pending"
  | "paid";
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

  {
    id: "ac-cleaning",
    label: "AC Cleaning",
    icon: Wind,
    desc: "Indoor unit cleaning, filter cleaning, dust removal, performance improvement",
    commonProblems: [
      "AC Not Cooling",
      "AC Water Leakage",
      "AC Bad Smell",
      "AC Filter Cleaning",
      "AC Deep Cleaning",
      "AC Low Airflow",
      "AC Noise Issue",
      "Other"
    ],
    relatedServiceIds: ["electrician", "housekeeping"]
  },
  {
    id: "washing-machine-cleaning",
    label: "Washing Machine Cleaning",
    icon: WashingMachine,
    desc: "Drum cleaning, filter cleaning, internal sanitization, odor removal",
    commonProblems: [
      "Drum Cleaning",
      "Filter Cleaning",
      "Bad Odor Removal",
      "Internal Sanitization",
      "Deep Cleaning",
      "Dirt & Residue Removal",
      "Performance Improvement",
      "Other"
    ],
    relatedServiceIds: ["housekeeping", "plumber"]
  },
];

export const getServiceById = (id: string) => services.find((s) => s.id === id);

export interface QuickFix {
  id: string;
  label: string;
  icon: LucideIcon;
  bgClass: string;
  textClass: string;
  borderClass: string;
}

export const quickFixes: QuickFix[] = [
  { id: "pipe", label: "Pipe Leakage", icon: Wrench, bgClass: "bg-[#152E4B]", textClass: "text-white", borderClass: "border-transparent" },
  { id: "switch", label: "Switch Repair", icon: Zap, bgClass: "bg-[#152E4B]", textClass: "text-white", borderClass: "border-transparent" },
  { id: "carwash", label: "Car Detailing", icon: Car, bgClass: "bg-[#152E4B]", textClass: "text-white", borderClass: "border-transparent" },
  { id: "cleaning", label: "Deep Cleaning", icon: SprayCan, bgClass: "bg-[#152E4B]", textClass: "text-white", borderClass: "border-transparent" },
  { id: "water", label: "Water Leakage", icon: Droplet, bgClass: "bg-[#152E4B]", textClass: "text-white", borderClass: "border-transparent" },
  { id: "drain", label: "Drain Cleaning", icon: Droplets, bgClass: "bg-[#152E4B]", textClass: "text-white", borderClass: "border-transparent" },
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
    title: "Change Switches & Plugs",
    description: "Replace old or broken switches",
    priceLabel: "₹250+",
    image: "https://images.unsplash.com/photo-1558402529-d2638a7023e9?w=400&h=300&fit=crop", // Outlet installation
  },
  {
    id: "pt-2",
    serviceId: "plumber",
    category: "PLUMBING",
    title: "Fix Leaky Faucets",
    description: "Stop drips and save water",
    priceLabel: "₹150+",
    image: "https://images.unsplash.com/photo-1585058177583-0498b5e61d85?w=400&h=300&fit=crop", // Faucet repair
  },
  {
    id: "pt-3",
    serviceId: "housekeeping",
    category: "HOUSE KEEPING",
    title: "Deep Kitchen Cleaning",
    description: "Full sanitization & degreasing",
    priceLabel: "₹1200+",
    image: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=400&h=300&fit=crop", // Clean kitchen
  },
];

const baseProviders: Omit<Provider, "id" | "serviceId">[] = [];


// Generate 5 providers per service
export const providers: Provider[] = services.flatMap((s) =>
  baseProviders.map((p, i) => ({
    ...p,
    id: `${s.id}-${i}`,
    serviceId: s.id,
  }))
);

export const getProviderById = (id: string) => providers.find((p) => p.id === id);

export const initialProviderRequests: ProviderRequest[] = [];

export const initialCompletedJobs: ProviderRequest[] = [];

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
