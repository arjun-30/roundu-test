import { createContext, useContext, useReducer, ReactNode, useCallback, useEffect } from "react";
import {
  Booking, Provider, ProviderRequest,
  initialProviderRequests, initialCompletedJobs,
  providers as allProviders,
} from "@/data/mockData";
import { supabase } from "@/lib/supabase";
import { socket } from "@/lib/socket";
import { fetchProviderDashboard, fetchCustomerBookings, fetchProviderBookings } from "@/lib/api";

type Role = "customer" | "provider" | null;

interface UserProfile {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
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
  | { type: "SET_NOTES"; notes: string }
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
  | { type: "LOGOUT" };

const initialState: State = {
  isAuthenticated: false,
  phone: "",
  role: null,
  user: {
    id: "",
    name: "",
    phone: "",
    email: "",
    address: "",
  },
  selectedServiceId: null,
  selectedProviderId: null,
  selectedDate: null,
  selectedTime: null,
  bookingNotes: "",
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
    case "ADD_PROVIDER_REQUEST":
      return { ...state, providerRequests: [action.request, ...state.providerRequests] };
    case "SET_PROVIDER_REQUESTS":
      return { ...state, providerRequests: action.requests };
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
      return { ...state, bookingNotes: action.notes };
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
      };
    case "COMPLETE_REQUEST": {
      const req = state.providerRequests.find((r) => r.id === action.id);
      if (!req) return state;
      return {
        ...state,
        providerRequests: state.providerRequests.filter((r) => r.id !== action.id),
        completedJobs: [{ ...req, status: "completed" }, ...state.completedJobs],
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
      // Async sync to Supabase (side effect in reducer is bad practice, but for rapid prototyping we can do it here or better in a useEffect in the provider)
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
    case "LOGOUT":
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
  
  // Sync onboarding data to Supabase
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

  // Sync data from DB
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
                  customerName: "Customer", // In a full app, join with users table
                  serviceId: b.service_id,
                  date: b.scheduled_at?.split(' ')[0] || "Today",
                  time: b.scheduled_at?.split(' ')[1] || "10:00 AM",
                  address: b.address,
                  price: b.price,
                  status: b.status,
                  notes: b.notes
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

  // Socket.io Real-time Setup
  useEffect(() => {
    socket.connect();

    socket.on("incoming_request", (request: ProviderRequest) => {
      dispatch({ type: "ADD_PROVIDER_REQUEST", request });
      dispatch({ type: "ADD_NOTIFICATION", text: `New ${request.serviceId} request from ${request.customerName}!` });
    });

    socket.on("provider_location_update", (data: { id: string; lat: number; lng: number; name: string }) => {
      dispatch({ type: "UPDATE_NEARBY_PROVIDER", ...data });
    });

    return () => {
      socket.off("incoming_request");
      socket.disconnect();
    };
  }, []);

  // Sync bookings to socket (notify providers)
  const addBooking = useCallback((booking: Booking) => {
    dispatch({ type: "ADD_BOOKING", booking });
    socket.emit("new_booking", {
      ...booking,
      customerName: state.user.name,
      address: state.user.address,
    });
  }, [dispatch, state.user]);

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

// Helper to create stable action callbacks
export const useAppActions = () => {
  const { dispatch } = useApp();
  return {
    notify: useCallback((text: string) => dispatch({ type: "ADD_NOTIFICATION", text }), [dispatch]),
  };
};
