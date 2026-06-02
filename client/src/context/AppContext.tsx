/* eslint-disable @typescript-eslint/no-explicit-any */
import { createContext, useContext, useReducer, ReactNode, useCallback, useEffect, useRef } from "react";
import {
  Booking, Provider, ProviderRequest,
  initialProviderRequests, initialCompletedJobs,
  providers as allProviders,
} from "@/data/mockData";
import { supabase } from "@/lib/supabase";
import { socket } from "@/lib/socket";
import { fetchProviderDashboard, fetchCustomerBookings, fetchProviderBookings } from "@/lib/api";
import { getDistance, formatLocalBookingDateTime } from "@/lib/utils";
import { getStoredMembership, setStoredMembership } from "@/lib/membership";
import { MembershipSelection } from "@/types/membership";
import { toast } from "sonner";


type Role = "customer" | "provider" | null;

export interface JobBroadcast {
  broadcastId: string;
  customerId: string;
  customerName: string;
  serviceId: string;
  address: string;
  lat?: number | null;
  lng?: number | null;
  date: string;
  time: string;
  notes: string;
  status: string;
  createdAt: number;
  voiceNote?: boolean;
  voiceNoteUrl?: string;
}

export interface ProviderQuote {
  broadcastId: string;
  providerId: string;
  providerName: string;
  providerAvatar: string;
  price: number;
  rating: number;
  distanceKm: number;
  etaMin: number;
  reviews: number;
  submittedAt: number;
}

interface UserProfile {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  role?: "customer" | "provider";
  savedAddresses?: SavedAddress[];
  profilePicture?: string;
  avatar_url?: string;
}

export interface SavedAddress {
  id: string;
  label: "Home" | "Work" | "Other";
  address: string;
  lat: number;
  lng: number;
}

interface State {
  isAuthenticated: boolean;
  phone: string;
  role: Role;
  user: UserProfile;
  // Booking draft
  selectedServiceId: string | null;
  selectedProviderId: string | null;
  selectedDate: string | null;
  selectedTime: string | null;
  bookingNotes: string;
  bookingVoiceNote: boolean;
  bookingVoiceNoteUrl: string | null;
  // Records
  bookings: Booking[];
  providerRequests: ProviderRequest[];
  completedJobs: ProviderRequest[];
  notifications: { id: string; text: string; ts: number; type?: string; metadata?: any; targetRole?: "customer" | "provider" }[];
  nearbyProviders: Record<string, { id: string; lat: number; lng: number; lastSeen: number; name: string; avatar_url?: string }>;
  currentLocation: { lat: number; lng: number } | null;
  // Provider Onboarding Draft
  providerRegistrationDraft: {
    serviceIds: string[];
    bio: string;
    experienceYears: number;
    workingHours: string;
    serviceRadius: number;
    kyc: {
      aadhaarVerified: boolean;
      panVerified: boolean;
      bankVerified: boolean;
    };
  };
  // New Flow State
  isNewUser: boolean;
  walletBalance: number;
  isOnline: boolean;
  providerStats: {
    rating: number;
    responseRate: number;
  };
  liveBroadcasts: JobBroadcast[];
  receivedQuotes: ProviderQuote[];
  quotedBroadcasts: string[];
  onboardingData: {
    serviceIds: string[];
    homeType: string;
    householdSize: string;
    frequency: string;
    budget: string;
  };
  chatHistories: Record<string, { id?: string, sender: "me" | "other"; text: string; time: string; audioBase64?: string | null; isSeen?: boolean }[]>;
  onlineUsers: Record<string, boolean>;
  membership: MembershipSelection;
}

type Action =
  | { type: "ADD_PROVIDER_REQUEST"; request: ProviderRequest }
  | { type: "SET_PROVIDER_REQUESTS"; requests: ProviderRequest[] }
  | { type: "SET_PHONE"; phone: string }
  | { type: "SET_USER_ID"; id: string }
  | { type: "SET_AUTH"; value: boolean }
  | { type: "SET_ROLE"; role: Role }
  | { type: "UPDATE_USER"; user: Partial<UserProfile> }
  | { type: "SELECT_SERVICE"; id: string }
  | { type: "SELECT_PROVIDER"; id: string }
  | { type: "PAY_BOOKING"; id: string }
  | { type: "SELECT_DATE"; date: string }
  | { type: "SELECT_TIME"; time: string }
  | { type: "SET_NOTES"; notes: string; voiceNote?: boolean; voiceNoteUrl?: string }
  | { type: "RESET_BOOKING_DRAFT" }
  | { type: "ADD_BOOKING"; booking: Booking }
  | { type: "SET_BOOKINGS"; bookings: Booking[] }
  | { type: "UPDATE_BOOKING"; id: string; patch: Partial<Booking> }
  | { type: "ADD_NOTIFICATION"; text: string; notificationType?: string; metadata?: any; targetRole?: "customer" | "provider" }
  | { type: "REMOVE_NOTIFICATION"; id: string }
  | { type: "ACCEPT_REQUEST"; id: string }
  | { type: "REJECT_REQUEST"; id: string }
  | { type: "UPDATE_REQUEST"; id: string; patch: Partial<ProviderRequest> }
  | { type: "COMPLETE_REQUEST"; id: string }
  | { type: "UPDATE_REGISTRATION_DRAFT"; patch: Partial<State["providerRegistrationDraft"]> }
  | { type: "UPDATE_KYC"; patch: Partial<State["providerRegistrationDraft"]["kyc"]> }
  | { type: "UPDATE_ONBOARDING"; patch: Partial<State["onboardingData"]> }
  | { type: "SET_NEW_USER"; value: boolean }
  | { type: "UPDATE_WALLET"; amount: number }
  | { type: "SET_ONLINE"; value: boolean }
  | { type: "UPDATE_STATS"; patch: Partial<State["providerStats"]> }
  | { type: "UPDATE_NEARBY_PROVIDER"; id: string; lat: number; lng: number; name: string }
  | { type: "SET_CURRENT_LOCATION"; lat: number; lng: number }
  | { type: "ADD_LIVE_BROADCAST"; broadcast: JobBroadcast }
  | { type: "HANDLE_INCOMING_BROADCAST"; broadcast: JobBroadcast }
  | { type: "CLEAR_LIVE_BROADCASTS" }
  | { type: "REMOVE_LIVE_BROADCAST"; id: string }
  | { type: "ADD_QUOTED_BROADCAST"; id: string }
  | { type: "CLEAR_RECEIVED_QUOTES" }
  | { type: "ADD_RECEIVED_QUOTE"; quote: ProviderQuote }
  | { type: "REMOVE_RECEIVED_QUOTE"; broadcastId: string; providerId: string }
  | { type: "UPDATE_BOOKING_STATUS"; bookingId: string; status: string }
  | { type: "HANDLE_JOB_ACCEPTED"; booking: any }
  | { type: "HANDLE_JOB_STATUS_UPDATED"; data: { bookingId: string; status: string } }
  | { type: "SET_CHAT_HISTORY"; payload: { bookingId: string; messages: any[] } }
  | { type: "ADD_CHAT_MESSAGE"; payload: { id?: string; bookingId: string; text: string; senderId: string; senderRole: string; time: string; audioBase64?: string; is_seen?: boolean } }
  | { type: "MARK_MESSAGES_SEEN"; payload: { bookingId: string; seenBy: string } }
  | { type: "UPDATE_ONLINE_STATUS"; payload: { userId: string; isOnline: boolean } }
  | { type: "SET_MEMBERSHIP"; membership: MembershipSelection }
  | { type: "LOGOUT" };

const token = localStorage.getItem("roundu_token");
const savedUser = localStorage.getItem("roundu_user");
const savedRole = localStorage.getItem("roundu_role");

let parsedUser = { id: "", name: "", phone: "", email: "", address: "", profilePicture: "", avatar_url: "" };
if (savedUser) {
  try {
    parsedUser = JSON.parse(savedUser);
  } catch (e) {
    console.error("Failed to parse saved user", e);
  }
}

const initialState: State = {
  isAuthenticated: !!token && !!savedUser && !!savedRole,
  phone: parsedUser.phone || "",
  role: (savedRole as Role) || null,
  user: {
    id: parsedUser.id || "",
    name: parsedUser.name || "",
    phone: parsedUser.phone || "",
    email: parsedUser.email || "",
    address: parsedUser.address || "",
    profilePicture: parsedUser.profilePicture || parsedUser.avatar_url || "",
    avatar_url: parsedUser.avatar_url || parsedUser.profilePicture || "",
    savedAddresses: [
      { id: "sa-1", label: "Home", address: "12, MG Road, Indiranagar, Bangalore", lat: 12.9783, lng: 77.6408 },
      { id: "sa-2", label: "Work", address: "Tech Park, Whitefield, Bangalore", lat: 12.9698, lng: 77.7499 },
    ],
  },
  selectedServiceId: null,
  selectedProviderId: null,
  selectedDate: null,
  selectedTime: null,
  bookingNotes: "",
  bookingVoiceNote: false,
  bookingVoiceNoteUrl: null,
  bookings: [],
  providerRequests: [],
  completedJobs: [],
  notifications: [],
  nearbyProviders: {},
  currentLocation: null,
  providerRegistrationDraft: {
    serviceIds: [],
    bio: "",
    experienceYears: 1,
    workingHours: "All day",
    serviceRadius: 5,
    kyc: { aadhaarVerified: false, panVerified: false, bankVerified: false },
  },
  isNewUser: true,
  walletBalance: 0,
  isOnline: true,
  providerStats: {
    rating: 0,
    responseRate: 100,
  },
  liveBroadcasts: [],
  receivedQuotes: [],
  quotedBroadcasts: [],
  onboardingData: {
    serviceIds: [],
    homeType: "",
    householdSize: "",
    frequency: "",
    budget: "",
  },
  chatHistories: {},
  onlineUsers: {},
  membership: getStoredMembership(),
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "ADD_PROVIDER_REQUEST": {
      const request = action.request as any;

      if (state.role !== "provider") return state;

      if (request.providerId && request.providerId !== "searching" && request.providerId !== state.user.id) {
        return state;
      }

      if (state.onboardingData?.serviceIds?.length > 0) {
        if (!state.onboardingData.serviceIds.includes(request.serviceId)) {
          return state;
        }
      }

      if (request.lat && request.lng && state.currentLocation) {
        const R = 6371;
        const dLat = (request.lat - state.currentLocation.lat) * Math.PI / 180;
        const dLng = (request.lng - state.currentLocation.lng) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(state.currentLocation.lat * Math.PI / 180) * Math.cos(request.lat * Math.PI / 180) *
          Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;

        const maxRadius = state.providerRegistrationDraft?.serviceRadius || 10;
        if (distance > maxRadius) {
          return state;
        }
      }

      // Check if request already exists
      if (state.providerRequests.some(r => r.id === request.id)) return state;

      const isAssigned = request.status === "assigned" || request.status === "accepted";
      const notificationText = isAssigned
        ? `🎉 ${request.customerName} accepted your quote for ${request.serviceId}!`
        : `📦 New ${request.serviceId} job request from ${request.customerName}!`;
      const notificationType = isAssigned ? "quote_accepted" : "new_job_request";

      return {
        ...state,
        providerRequests: [request, ...state.providerRequests],
        notifications: [
          {
            id: `n-${Date.now()}`,
            text: notificationText,
            ts: Date.now(),
            type: notificationType,
            targetRole: "provider" as const
          },
          ...state.notifications,
        ].slice(0, 20)
      };
    }
    case "UPDATE_BOOKING_STATUS":
      return {
        ...state,
        bookings: state.bookings.map((b) =>
          b.id === action.bookingId ? { ...b, status: action.status as any } : b
        ),
      };
    case "HANDLE_JOB_ACCEPTED": {
      const { booking } = action;
      if (state.role === "provider" && state.user.id === booking.provider_user_id) {
        const { date, time } = formatLocalBookingDateTime(booking.scheduled_at);
        const mappedRequest = {
          id: booking.id,
          customerId: booking.customer_id,
          customerName: "Customer",
          serviceId: booking.service_id,
          date,
          time,
          address: booking.address,
          price: booking.price,
          status: booking.status || "assigned",
          notes: booking.notes,
          lat: booking.lat,
          lng: booking.lng,
          voiceNote: booking.voice_note || false,
          voiceNoteUrl: booking.voice_note_url || null
        };
        return {
          ...state,
          providerRequests: [mappedRequest, ...state.providerRequests],
          liveBroadcasts: state.liveBroadcasts.filter((b) => b.broadcastId !== booking.broadcastId)
        };
      }
      return state;
    }
    case "HANDLE_JOB_STATUS_UPDATED": {
      const { bookingId, status } = action.data;
      const normalizedId = bookingId.replace('req-', '');
      if (state.role === "customer") {
        const statusTexts: Record<string, string> = {
          on_the_way: "🚀 Provider is on the way!",
          arrived: "📍 Provider has arrived at your location!",
          in_progress: "🛠️ Job in progress...",
          completed: "✅ Job completed successfully!",
        };
        const text = statusTexts[status];
        const newNotifications = text ? [
          {
            id: `n-${Date.now()}`,
            text,
            ts: Date.now(),
            type: "booking",
            targetRole: "customer" as const
          },
          ...state.notifications
        ].slice(0, 20) : state.notifications;

        return {
          ...state,
          bookings: state.bookings.map((b) =>
            (b.id === normalizedId || b.id === bookingId) ? { ...b, status: status as any } : b
          ),
          notifications: newNotifications,
        };
      } else {
        const statusTexts: Record<string, string> = {
          completed: "💰 Payment received! Job completed successfully.",
        };
        const text = statusTexts[status];
        const newNotifications = text ? [
          {
            id: `n-${Date.now()}`,
            text,
            ts: Date.now(),
            type: "payment",
            targetRole: "provider" as const
          },
          ...state.notifications
        ].slice(0, 20) : state.notifications;

        return {
          ...state,
          providerRequests: state.providerRequests.map((r) =>
            (r.id === normalizedId || r.id === bookingId) ? { ...r, status: status as any } : r
          ),
          notifications: newNotifications,
        };
      }
    }
    case "SET_PROVIDER_REQUESTS":
      return { ...state, providerRequests: action.requests };
    case "SET_PHONE":
      return { ...state, phone: action.phone, user: { ...state.user, phone: action.phone } };
    case "SET_USER_ID":
      return { ...state, user: { ...state.user, id: action.id } };
    case "SET_AUTH":
      return { ...state, isAuthenticated: action.value };
    case "SET_ROLE":
      if (action.role) {
        localStorage.setItem("roundu_role", action.role);
      }
      return { ...state, role: action.role };
    case "UPDATE_USER": {
      const newUser = { ...state.user, ...action.user };
      if (action.user.profilePicture && !action.user.avatar_url) {
        newUser.avatar_url = action.user.profilePicture;
      }
      if (action.user.avatar_url && !action.user.profilePicture) {
        newUser.profilePicture = action.user.avatar_url;
      }
      // Persist user to localStorage for session restoration
      try {
        localStorage.setItem("roundu_user", JSON.stringify(newUser));
      } catch (e) {
        console.error("Failed to persist user to localStorage", e);
      }
      return { ...state, user: newUser };
    }
    case "SELECT_SERVICE":
      return { ...state, selectedServiceId: action.id };
    case "SELECT_PROVIDER":
      return { ...state, selectedProviderId: action.id };
    case "SELECT_DATE":
      return { ...state, selectedDate: action.date };
    case "SELECT_TIME":
      return { ...state, selectedTime: action.time };
    case "SET_NOTES":
      return { ...state, bookingNotes: action.notes, bookingVoiceNote: action.voiceNote || false, bookingVoiceNoteUrl: action.voiceNoteUrl || null };
    case "PAY_BOOKING":
      return {
        ...state,
        bookings: state.bookings.map((b) =>
          b.id === action.id ? { ...b, paid: true } : b
        ),
      };
    case "RESET_BOOKING_DRAFT":
      return {
        ...state,
        selectedProviderId: null,
        selectedDate: null,
        selectedTime: null,
        bookingNotes: "",
        bookingVoiceNote: false,
        bookingVoiceNoteUrl: null,
      };
    case "ADD_BOOKING": {
      const booking = action.booking as any;
      const { date, time } = formatLocalBookingDateTime(booking.scheduled_at);
      const enriched = {
        ...booking,
        providerId: booking.provider_id || booking.providerId,
        serviceId: booking.service_id || booking.serviceId,
        date: booking.date || date,
        time: booking.time || time
      };
      const providerName = booking.providerDetails?.name || "Provider";
      return {
        ...state,
        bookings: [enriched, ...state.bookings],
        notifications: [
          {
            id: `n-${Date.now()}`,
            text: `✅ Booking confirmed with ${providerName}!`,
            ts: Date.now(),
            type: "booking",
            targetRole: "customer" as const
          },
          ...state.notifications
        ].slice(0, 20)
      };
    }
    case "SET_BOOKINGS": {
      const enrichedBookings = action.bookings.map((b: any) => {
        const { date, time } = formatLocalBookingDateTime(b.scheduled_at);
        return {
          ...b,
          providerId: b.provider_id || b.providerId,
          serviceId: b.service_id || b.serviceId,
          date,
          time
        };
      });
      return { ...state, bookings: enrichedBookings };
    }
    case "UPDATE_BOOKING":
      return {
        ...state,
        bookings: state.bookings.map((b) =>
          b.id === action.id ? { ...b, ...action.patch } : b
        ),
      };
    case "ADD_NOTIFICATION":
      return {
        ...state,
        notifications: [
          {
            id: `n-${Date.now()}`,
            text: action.text,
            ts: Date.now(),
            type: action.notificationType || "default",
            metadata: action.metadata,
            targetRole: action.targetRole || state.role || "customer"
          },
          ...state.notifications,
        ].slice(0, 20),
      };
    case "REMOVE_NOTIFICATION":
      return {
        ...state,
        notifications: state.notifications.filter((n) => n.id !== action.id)
      };
    case "HANDLE_INCOMING_BROADCAST": {
      if (state.role === "customer" || state.user.id === action.broadcast.customerId) return state;
      // Deduplicate: if this exact broadcastId is already in the list, ignore
      if (state.liveBroadcasts.some((b) => b.broadcastId === action.broadcast.broadcastId)) {
        return state;
      }
      const hasQuoted = state.quotedBroadcasts?.includes(action.broadcast.broadcastId);
      const enrichedBroadcast = {
        ...action.broadcast,
        status: hasQuoted ? "waiting_for_customer" : action.broadcast.status
      };
      return {
        ...state,
        liveBroadcasts: [
          enrichedBroadcast,
          ...state.liveBroadcasts.filter((b) => b.customerId !== action.broadcast.customerId)
        ],
        notifications: [
          {
            id: `n-${Date.now()}`,
            text: `🚨 Job Alert: ${action.broadcast.serviceId} requested at ${action.broadcast.address}`,
            ts: Date.now(),
            type: "incoming_broadcast",
            targetRole: "provider" as const
          },
          ...state.notifications,
        ].slice(0, 20),
      };
    }
    case "ADD_QUOTED_BROADCAST":
      return {
        ...state,
        quotedBroadcasts: [...(state.quotedBroadcasts || []), action.id],
        liveBroadcasts: state.liveBroadcasts.map((b) =>
          b.broadcastId === action.id ? { ...b, status: "waiting_for_customer" } : b
        )
      };
    case "ACCEPT_REQUEST":
      return {
        ...state,
        providerRequests: state.providerRequests.map((r) =>
          r.id === action.id ? { ...r, status: "accepted" } : r
        ),
        bookings: state.bookings.map((b) =>
          b.id === String(action.id).replace('req-', '') ? { ...b, status: "assigned" } : b
        )
      };
    case "REJECT_REQUEST":
      return {
        ...state,
        providerRequests: state.providerRequests.filter((r) => r.id !== action.id),
      };
    case "UPDATE_REQUEST":
      return {
        ...state,
        providerRequests: state.providerRequests.map((r) =>
          r.id === action.id ? { ...r, ...action.patch } : r
        ),
        bookings: state.bookings.map((b) =>
          b.id === String(action.id).replace('req-', '') ? { ...b, ...(action.patch as any) } : b
        )
      };
    case "COMPLETE_REQUEST": {
      const req = state.providerRequests.find((r) => r.id === action.id);
      if (!req) return state;
      return {
        ...state,
        providerRequests: state.providerRequests.filter((r) => r.id !== action.id),
        completedJobs: [{ ...req, status: "completed" }, ...state.completedJobs],
        bookings: state.bookings.map((b) =>
          b.id === String(action.id).replace('req-', '') ? { ...b, status: "completed" } : b
        )
      };
    }
    case "UPDATE_REGISTRATION_DRAFT":
      return {
        ...state,
        providerRegistrationDraft: { ...state.providerRegistrationDraft, ...action.patch },
      };
    case "UPDATE_KYC":
      return {
        ...state,
        providerRegistrationDraft: {
          ...state.providerRegistrationDraft,
          kyc: { ...state.providerRegistrationDraft.kyc, ...action.patch },
        },
      };
    case "UPDATE_ONBOARDING": {
      const newData = { ...state.onboardingData, ...action.patch };
      return {
        ...state,
        onboardingData: newData,
      };
    }
    case "SET_NEW_USER":
      return { ...state, isNewUser: action.value };
    case "UPDATE_WALLET":
      return { ...state, walletBalance: state.walletBalance + action.amount };
    case "SET_ONLINE":
      return { ...state, isOnline: action.value };
    case "UPDATE_STATS":
      return { ...state, providerStats: { ...state.providerStats, ...action.patch } };
    case "UPDATE_NEARBY_PROVIDER":
      return {
        ...state,
        nearbyProviders: {
          ...state.nearbyProviders,
          [action.id]: { id: action.id, lat: action.lat, lng: action.lng, name: action.name, lastSeen: Date.now() },
        },
      };
    case "SET_CURRENT_LOCATION":
      return { ...state, currentLocation: { lat: action.lat, lng: action.lng } };
    case "ADD_LIVE_BROADCAST":
      // Deduplicate: if this exact broadcastId is already in the list, ignore
      if (state.liveBroadcasts.some(b => b.broadcastId === action.broadcast.broadcastId)) {
        return state;
      }
      return {
        ...state,
        liveBroadcasts: [
          action.broadcast,
          ...state.liveBroadcasts.filter(b => b.customerId !== action.broadcast.customerId)
        ]
      };
    case "REMOVE_LIVE_BROADCAST":
      return { ...state, liveBroadcasts: state.liveBroadcasts.filter(b => b.broadcastId !== action.id) };
    case "REMOVE_RECEIVED_QUOTE":
      return {
        ...state,
        receivedQuotes: state.receivedQuotes.filter(
          (q) => !(q.broadcastId === action.broadcastId && q.providerId === action.providerId)
        )
      };
    case "ADD_RECEIVED_QUOTE":
      return {
        ...state,
        receivedQuotes: [
          action.quote,
          ...state.receivedQuotes.filter(q => !(q.broadcastId === action.quote.broadcastId && q.providerId === action.quote.providerId))
        ].sort((a, b) => a.price - b.price)
      };
    case "CLEAR_RECEIVED_QUOTES":
      return { ...state, receivedQuotes: [] };
    case "SET_CHAT_HISTORY": {
      const { bookingId, messages } = action.payload;
      return {
        ...state,
        chatHistories: {
          ...state.chatHistories,
          [bookingId]: messages
        }
      };
    }
    case "ADD_CHAT_MESSAGE": {
      const { id, bookingId, text, senderId, time, audioBase64, is_seen } = action.payload;
      const chatRoom = state.chatHistories[bookingId] || [];
      const isMe = senderId === state.user.id;

      const isDuplicate = chatRoom.some(m => m.id === id || (m.text === text && m.time === time && m.sender === (isMe ? "me" : "other")));
      if (isDuplicate) return state;

      return {
        ...state,
        chatHistories: {
          ...state.chatHistories,
          [bookingId]: [...chatRoom, { id, sender: isMe ? "me" : "other", text, time, audioBase64: audioBase64 || null, isSeen: is_seen || false }]
        }
      };
    }
    case "MARK_MESSAGES_SEEN": {
      const { bookingId, seenBy } = action.payload;
      if (seenBy === state.user.id) return state; // Only update if the OTHER person saw our messages

      const chatRoom = state.chatHistories[bookingId] || [];
      const updatedRoom = chatRoom.map(msg =>
        msg.sender === "me" ? { ...msg, isSeen: true } : msg
      );

      return {
        ...state,
        chatHistories: {
          ...state.chatHistories,
          [bookingId]: updatedRoom
        }
      };
    }
    case "UPDATE_ONLINE_STATUS": {
      const { userId, isOnline } = action.payload;
      return {
        ...state,
        onlineUsers: {
          ...state.onlineUsers,
          [userId]: isOnline
        }
      };
    }
    case "SET_MEMBERSHIP":
      setStoredMembership(action.membership);
      return { ...state, membership: action.membership };
    case "LOGOUT":
      localStorage.removeItem("roundu_token");
      localStorage.removeItem("roundu_user");
      localStorage.removeItem("roundu_role");
      if (socket.connected) {
        socket.disconnect();
      }
      return { ...initialState };
    default:
      return state;
  }
}

interface Ctx extends State {
  dispatch: React.Dispatch<Action>;
  selectedProvider: Provider | null;
  addBooking: (booking: Booking) => void;
}

const AppContext = createContext<Ctx | null>(null);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(reducer, initialState);


  useEffect(() => {
    const syncData = async () => {
      if (state.phone && state.onboardingData.serviceIds.length > 0) {
        // Exclude homeType — column doesn't exist in onboarding_responses table
        const { homeType: _homeType, ...onboardingFields } = state.onboardingData;
        const { error } = await supabase
          .from('onboarding_responses')
          .upsert({
            phone: state.phone,
            ...onboardingFields,
            updated_at: new Date().toISOString()
          });
        if (error) console.error('Supabase sync error:', error);
      }
    };
    syncData();
  }, [state.onboardingData, state.phone]);

  useEffect(() => {
    const syncDb = async () => {
      if (state.isAuthenticated && state.user.id) {
        try {
          let serverRole = state.role;
          const currentToken = localStorage.getItem("roundu_token");
          if (currentToken && currentToken !== "mock-token") {
            try {
              const parts = currentToken.split('.');
              if (parts.length === 3) {
                const payloadStr = atob(parts[1]);
                const payload = JSON.parse(payloadStr);
                if (payload.role) {
                  serverRole = payload.role;
                }
              }
            } catch (e) {
              console.error("JWT parse error:", e);
            }
          }

          if (serverRole === 'provider') {
            const dashboard = await fetchProviderDashboard(state.user.id);
            if (dashboard.success) {
              dispatch({ type: "UPDATE_STATS", patch: dashboard.data.stats });
              const providerId = dashboard.data.provider.id;
              const pbRes = await fetchProviderBookings(providerId);
              if (pbRes.success) {
                const mappedRequests = pbRes.data.map((b: any) => {
                  const { date, time } = formatLocalBookingDateTime(b.scheduled_at);
                  return {
                    id: b.id,
                    customerId: b.customer_id,
                    customerName: "Customer",
                    serviceId: b.service_id,
                    date,
                    time,
                    address: b.address,
                    price: b.price,
                    status: b.status,
                    notes: b.notes,
                    voiceNote: b.voice_note || false,
                    voiceNoteUrl: b.voice_note_url || null,
                    scheduled_at: b.scheduled_at
                  };
                });
                dispatch({ type: "SET_PROVIDER_REQUESTS", requests: mappedRequests });
              }
            }
          } else if (serverRole === 'customer') {
            const bookings = await fetchCustomerBookings(state.user.id);
            if (bookings.success) {
              dispatch({ type: "SET_BOOKINGS", bookings: bookings.data });
            }
          }
        } catch (err) {
          console.error("DB Sync error:", err);
        }
      }
    };
    syncDb();
  }, [state.isAuthenticated, state.user.id, state.role]);

  useEffect(() => {
    if (state.isAuthenticated && state.user.id && state.role) {
      socket.emit("register", {
        userId: state.user.id,
        role: state.role,
        serviceIds: state.providerRegistrationDraft?.serviceIds || []
      });
    }
  }, [state.isAuthenticated, state.user.id, state.role, state.providerRegistrationDraft?.serviceIds]);

  useEffect(() => {
    socket.connect();

    socket.on("incoming_request", (request: ProviderRequest) => {
      dispatch({ type: "ADD_PROVIDER_REQUEST", request });
    });

    socket.on("provider_location_update", (data: { id: string; lat: number; lng: number; name: string }) => {
      dispatch({ type: "UPDATE_NEARBY_PROVIDER", ...data });

      // Auto-update status to 'arrived' when provider is within 100m of customer
      if (state.role === "customer" && state.currentLocation) {
        state.bookings.forEach((b) => {
          const providerId = (b as any).provider_id || b.providerId;
          if (providerId === data.id && b.status === "on_the_way") {
            const dist = getDistance(state.currentLocation!, { lat: data.lat, lng: data.lng });
            if (dist < 0.1) { // 100 metres
              socket.emit("update_job_status", { bookingId: b.id, status: "arrived" });
            }
          }
        });
      }
    });

    socket.on("incoming_broadcast", (broadcast: JobBroadcast) => {
      console.log("[socket] ✅ incoming_broadcast received:", broadcast);
      dispatch({ type: "HANDLE_INCOMING_BROADCAST", broadcast });
    });

    socket.on("new_quote_received", (quote: ProviderQuote) => {
      console.log("[socket] ✅ new_quote_received received:", quote);
      dispatch({ type: "ADD_RECEIVED_QUOTE", quote });
      dispatch({
        type: "ADD_NOTIFICATION",
        text: `💰 New Quote Received from ${quote.providerName} — ₹${quote.price}`,
        notificationType: "new_quote_received",
        metadata: quote,
        targetRole: "customer"
      });
    });

    socket.on("quote_sent_confirmation", (data: { broadcastId: string; price: number; serviceId: string }) => {
      console.log("[socket] ✅ quote_sent_confirmation received:", data);
      toast.success("Quote sent successfully!");
      dispatch({ type: "ADD_QUOTED_BROADCAST", id: data.broadcastId });
      const serviceLabel = data.serviceId ? (data.serviceId.charAt(0).toUpperCase() + data.serviceId.slice(1)) : "Service";
      dispatch({
        type: "ADD_NOTIFICATION",
        text: `You quoted ₹${data.price} for ${serviceLabel} Service`,
        notificationType: "quote_sent_confirmation",
        metadata: data,
        targetRole: "provider"
      });
    });

    socket.on("job_accepted", (booking: any) => {
      dispatch({ type: "HANDLE_JOB_ACCEPTED", booking });
    });

    socket.on("job_status_updated", (data: { bookingId: string; status: string }) => {
      dispatch({ type: "HANDLE_JOB_STATUS_UPDATED", data });
    });

    socket.on("chat_message_received", (data: { id?: string; bookingId: string; text: string; senderId: string; senderRole: string; time: string; audioBase64?: string; is_seen?: boolean }) => {
      dispatch({ type: "ADD_CHAT_MESSAGE", payload: data });
      // Show a notification if the user is not currently viewing this chat
      if (!window.location.pathname.includes(`/chat/${data.bookingId}`)) {
        const senderLabel = data.senderRole === 'provider' ? 'Provider' : 'Customer';
        const preview = data.audioBase64 ? '🎤 Voice message' : data.text.slice(0, 50);
        const targetRole = data.senderRole === 'provider' ? 'customer' : 'provider';
        dispatch({
          type: "ADD_NOTIFICATION",
          text: `💬 ${senderLabel}: ${preview}`,
          notificationType: "chat",
          targetRole
        });
      }
    });

    socket.on("message_seen", (data: { bookingId: string; seenBy: string }) => {
      dispatch({ type: "MARK_MESSAGES_SEEN", payload: data });
    });

    socket.on("user_status_changed", (data: { userId: string; isOnline: boolean }) => {
      dispatch({ type: "UPDATE_ONLINE_STATUS", payload: data });
    });

    socket.on("session_expired", (data: { reason: string }) => {
      alert("Session Expired: " + data.reason);
      dispatch({ type: "LOGOUT" });
      window.location.href = "/";
    });

    const handleWindowSessionExpired = (e: any) => {
      alert("Session Expired: " + (e.detail?.reason || "Logged in from another device."));
      dispatch({ type: "LOGOUT" });
      window.location.href = "/";
    };
    window.addEventListener("session_expired", handleWindowSessionExpired);

    return () => {
      socket.off("incoming_request");
      socket.off("provider_location_update");
      socket.off("incoming_broadcast");
      socket.off("new_quote_received");
      socket.off("quote_sent_confirmation");
      socket.off("job_accepted");
      socket.off("job_status_updated");
      socket.off("chat_message_received");
      socket.off("message_seen");
      socket.off("user_status_changed");
      socket.off("session_expired");
      window.removeEventListener("session_expired", handleWindowSessionExpired);
      socket.disconnect();
    };
  }, []);

  // Auto-join all active booking chat rooms so messages are never missed
  // This runs whenever bookings change (e.g. new booking added after quote accepted)
  useEffect(() => {
    if (!state.isAuthenticated) return;
    const joinRooms = () => {
      state.bookings.forEach((b) => {
        if (b.id) {
          socket.emit("join_chat_room", { bookingId: b.id });
        }
      });
      // Also join via req- prefix for provider-side requests
      state.providerRequests.forEach((r: any) => {
        if (r.id) {
          const normalId = String(r.id).replace('req-', '');
          socket.emit("join_chat_room", { bookingId: normalId });
        }
      });
    };
    if (socket.connected) {
      joinRooms();
    }
    socket.on('connect', joinRooms);
    return () => { socket.off('connect', joinRooms); };
  }, [state.bookings, state.providerRequests, state.isAuthenticated]);

  useEffect(() => {
    if (!state.isAuthenticated || !state.user.id) return;

    const doRegister = () => {
      // serviceIds: prefer onboardingData, fallback to user.serviceId if available
      const serviceIds: string[] =
        (state.onboardingData?.serviceIds?.length
          ? state.onboardingData.serviceIds
          : (state.user as any).serviceId
            ? [(state.user as any).serviceId]
            : []);

      console.log(`[socket] registering ${state.user.id} (${state.role}) services:`, serviceIds);
      socket.emit("register", {
        userId: state.user.id,
        role: state.role,
        serviceIds,
      });
    };

    // Register immediately if already connected
    if (socket.connected) {
      doRegister();
    }

    // Re-register on every (re)connect to fix race condition
    socket.on("connect", doRegister);

    return () => {
      socket.off("connect", doRegister);
    };
  }, [state.isAuthenticated, state.user.id, state.role, state.onboardingData.serviceIds]);

  const addBooking = useCallback((booking: Booking) => {
    dispatch({ type: "ADD_BOOKING", booking });
    socket.emit("new_booking", {
      ...booking,
      customerName: state.user.name,
      address: state.user.address,
      lat: state.currentLocation?.lat,
      lng: state.currentLocation?.lng
    });
  }, [dispatch, state.user, state.currentLocation]);

  const selectedProvider = state.selectedProviderId
    ? allProviders.find((p) => p.id === state.selectedProviderId) ?? null
    : null;

  useEffect(() => {
    localStorage.setItem("roundu_user", JSON.stringify(state.user));
  }, [state.user]);

  return (
    <AppContext.Provider value={{ ...state, dispatch, selectedProvider, addBooking }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
};

export const useAppActions = () => {
  const { dispatch } = useApp();
  return {
    notify: useCallback((text: string) => dispatch({ type: "ADD_NOTIFICATION", text }), [dispatch]),
  };
};
