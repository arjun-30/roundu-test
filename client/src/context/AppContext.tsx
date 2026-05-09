import { createContext, useContext, useReducer, ReactNode, useCallback, useEffect } from "react";
import {
  Booking, Provider, ProviderRequest,
  initialProviderRequests, initialCompletedJobs,
  providers as allProviders,
} from "@/data/mockData";
import { supabase } from "@/lib/supabase";
import { socket } from "@/lib/socket";
import { fetchProviderDashboard, fetchCustomerBookings, fetchProviderBookings } from "@/lib/api";
import { toast } from "sonner";

const getDistance = (l1: { lat: number; lng: number }, l2: { lat: number; lng: number }) => {
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

type Role = "customer" | "provider" | null;

export interface JobBroadcast {
  broadcastId: string;
  customerId: string;
  customerName: string;
  serviceId: string;
  address: string;
  date: string;
  time: string;
  notes: string;
  status: string;
  createdAt: number;
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
  // Records
  bookings: Booking[];
  providerRequests: ProviderRequest[];
  completedJobs: ProviderRequest[];
  notifications: { id: string; text: string; ts: number }[];
  nearbyProviders: Record<string, { id: string; lat: number; lng: number; lastSeen: number; name: string }>;
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
  onboardingData: {
    serviceIds: string[];
    homeType: string;
    householdSize: string;
    frequency: string;
    budget: string;
  };
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
  | { type: "SET_NOTES"; notes: string; voiceNote?: boolean }
  | { type: "RESET_BOOKING_DRAFT" }
  | { type: "ADD_BOOKING"; booking: Booking }
  | { type: "SET_BOOKINGS"; bookings: Booking[] }
  | { type: "UPDATE_BOOKING"; id: string; patch: Partial<Booking> }
  | { type: "ADD_NOTIFICATION"; text: string }
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
  | { type: "REMOVE_LIVE_BROADCAST"; broadcastId: string }
  | { type: "CLEAR_RECEIVED_QUOTES" }
  | { type: "ADD_RECEIVED_QUOTE"; quote: ProviderQuote }
  | { type: "REMOVE_RECEIVED_QUOTE"; broadcastId: string; providerId: string }
  | { type: "UPDATE_BOOKING_STATUS"; bookingId: string; status: string }
  | { type: "HANDLE_JOB_ACCEPTED"; booking: any }
  | { type: "HANDLE_JOB_STATUS_UPDATED"; data: { bookingId: string; status: string } }
  | { type: "LOGOUT" };

const token = localStorage.getItem("roundu_token");
const savedUser = localStorage.getItem("roundu_user");
const savedRole = localStorage.getItem("roundu_role");

let parsedUser = { id: "", name: "", phone: "", email: "", address: "" };
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
  },
  selectedServiceId: null,
  selectedProviderId: null,
  selectedDate: null,
  selectedTime: null,
  bookingNotes: "",
  bookingVoiceNote: false,
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
  onboardingData: {
    serviceIds: [],
    homeType: "",
    householdSize: "",
    frequency: "",
    budget: "",
  },
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
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(state.currentLocation.lat * Math.PI / 180) * Math.cos(request.lat * Math.PI / 180) *
                  Math.sin(dLng/2) * Math.sin(dLng/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance = R * c;

        const maxRadius = state.providerRegistrationDraft?.serviceRadius || 10;
        if (distance > maxRadius) {
          return state;
        }
      }

      // Check if request already exists
      if (state.providerRequests.some(r => r.id === request.id)) return state;

      return { 
        ...state, 
        providerRequests: [request, ...state.providerRequests],
        notifications: [
          { id: `n-${Date.now()}`, text: `📦 New ${request.serviceId} job from ${request.customerName}!`, ts: Date.now() },
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
        const mappedRequest = {
          id: booking.id,
          customerId: booking.customer_id,
          customerName: "Customer",
          serviceId: booking.service_id,
          date: booking.scheduled_at?.split('T')[0] || "Today",
          time: booking.scheduled_at?.split('T')[1]?.slice(0, 5) || "Now",
          address: booking.address,
          price: booking.price,
          status: booking.status || "assigned",
          notes: booking.notes,
          lat: booking.lat,
          lng: booking.lng,
          voiceNote: booking.voice_note || false
        };
        setTimeout(() => toast.success("🎉 Your quote was accepted! Job added."), 100);
        
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
        return {
          ...state,
          bookings: state.bookings.map((b) =>
            (b.id === normalizedId || b.id === bookingId) ? { ...b, status: status as any } : b
          ),
        };
      } else {
        return {
          ...state,
          providerRequests: state.providerRequests.map((r) =>
            (r.id === normalizedId || r.id === bookingId) ? { ...r, status: status as any } : r
          ),
        };
      }
    }
    case "SET_PROVIDER_REQUESTS":
      return { ...state, providerRequests: action.requests };
    case "ADD_REQUEST":
      return { ...state, providerRequests: [action.request, ...state.providerRequests] };
    case "SET_PHONE":
      return { ...state, phone: action.phone, user: { ...state.user, phone: action.phone } };
    case "SET_USER_ID":
      return { ...state, user: { ...state.user, id: action.id } };
    case "SET_AUTH":
      return { ...state, isAuthenticated: action.value };
    case "SET_ROLE":
      return { ...state, role: action.role };
    case "UPDATE_USER":
      return { ...state, user: { ...state.user, ...action.user } };
    case "SELECT_SERVICE":
      return { ...state, selectedServiceId: action.id };
    case "SELECT_PROVIDER":
      return { ...state, selectedProviderId: action.id };
    case "SELECT_DATE":
      return { ...state, selectedDate: action.date };
    case "SELECT_TIME":
      return { ...state, selectedTime: action.time };
    case "SET_NOTES":
      return { ...state, bookingNotes: action.notes, bookingVoiceNote: action.voiceNote || false };
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
      };
    case "ADD_BOOKING":
      return { ...state, bookings: [action.booking, ...state.bookings] };
    case "SET_BOOKINGS":
      return { ...state, bookings: action.bookings };
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
          { id: `n-${Date.now()}`, text: action.text, ts: Date.now() },
          ...state.notifications,
        ].slice(0, 20),
      };
    case "ACCEPT_REQUEST":
      return {
        ...state,
        providerRequests: state.providerRequests.map((r) =>
          r.id === action.id ? { ...r, status: "accepted" } : r
        ),
        bookings: state.bookings.map((b) => 
          b.id === action.id.replace('req-', '') ? { ...b, status: "assigned" } : b
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
          b.id === action.id.replace('req-', '') ? { ...b, ...action.patch } : b
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
          b.id === action.id.replace('req-', '') ? { ...b, status: "completed" } : b
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
      return { ...state, liveBroadcasts: state.liveBroadcasts.filter(b => b.broadcastId !== action.broadcastId) };
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
}

const AppContext = createContext<Ctx | null>(null);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(reducer, initialState);


  useEffect(() => {
    const syncData = async () => {
      if (state.phone && state.onboardingData.serviceIds.length > 0) {
        const { error } = await supabase
          .from('onboarding_responses')
          .upsert({
            phone: state.phone,
            ...state.onboardingData,
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
          if (state.role === 'provider') {
            const dashboard = await fetchProviderDashboard(state.user.id);
            if (dashboard.success) {
              dispatch({ type: "UPDATE_STATS", patch: dashboard.data.stats });
              const providerId = dashboard.data.provider.id;
              const pbRes = await fetchProviderBookings(providerId);
              if (pbRes.success) {
                const mappedRequests = pbRes.data.map((b: any) => ({
                  id: b.id,
                  customerId: b.customer_id,
                  customerName: "Customer",
                  serviceId: b.service_id,
                  date: b.scheduled_at?.split(' ')[0] || "Today",
                  time: b.scheduled_at?.split(' ')[1] || "10:00 AM",
                  address: b.address,
                  price: b.price,
                  status: b.status,
                  notes: b.notes,
                  voiceNote: b.voice_note || false
                }));
                dispatch({ type: "SET_PROVIDER_REQUESTS", requests: mappedRequests });
              }
            }
          } else if (state.role === 'customer') {
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
      dispatch({ type: "ADD_LIVE_BROADCAST", broadcast });
      dispatch({ type: "ADD_NOTIFICATION", text: `🚨 Job Alert: ${broadcast.serviceId} requested at ${broadcast.address}` });
    });

    socket.on("quote_received", (quote: ProviderQuote) => {
      dispatch({ type: "ADD_RECEIVED_QUOTE", quote });
      dispatch({ type: "ADD_NOTIFICATION", text: `💰 New Quote: ₹${quote.price} from ${quote.providerName}` });
    });

    socket.on("job_accepted", (booking: any) => {
      dispatch({ type: "HANDLE_JOB_ACCEPTED", booking });
    });

    socket.on("job_status_updated", (data: { bookingId: string; status: string }) => {
      dispatch({ type: "HANDLE_JOB_STATUS_UPDATED", data });
    });

    return () => {
      socket.off("incoming_request");
      socket.off("provider_location_update");
      socket.off("incoming_broadcast");
      socket.off("quote_received");
      socket.off("job_accepted");
      socket.off("job_status_updated");
      socket.disconnect();
    };
  }, []);

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
