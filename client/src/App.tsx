import { lazy, Suspense, useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, Outlet } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppProvider, useApp } from "@/context/AppContext";
import { SocketProvider } from "@/context/SocketProvider";
import MobileLayout from "@/components/MobileLayout";
import ErrorBoundary from "@/components/ErrorBoundary";
import NetworkStatus from "@/components/NetworkStatus";
import { getSavedRoleForPhone } from "@/lib/roleStorage";
import SupportChatbot from "@/components/SupportChatbot";
import GlobalIncomingRequestPopup from "@/components/GlobalIncomingRequestPopup";
import { useProviderApprovalStatus } from "@/hooks/useProviderApprovalStatus";
import { Toaster } from "sonner";

// Admin Imports
import AdminLogin from "@/pages/admin/AdminLogin";
import { AdminLayout } from "@/pages/admin/AdminDashboard";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminUsers from "@/pages/admin/AdminUsers";
import AdminProviders from "@/pages/admin/AdminProviders";
import AdminBookings from "@/pages/admin/AdminBookings";
import AdminEarnings from "@/pages/admin/AdminEarnings";
import AdminReports from "@/pages/admin/AdminReports";
import AdminProviderApprovals from "@/pages/admin/ProviderApprovals";

// Lazy Loaded Pages
const Splash = lazy(() => import("@/pages/Splash"));
const Assistant = lazy(() => import("@/pages/Assistant"));
const Login = lazy(() => import("@/pages/Login"));
const OtpVerify = lazy(() => import("@/pages/OtpVerify"));
const OnboardingName = lazy(() => import("@/pages/OnboardingName"));
const Onboarding = lazy(() => import("@/pages/Onboarding"));
const RoleSelect = lazy(() => import("@/pages/RoleSelect"));
const Location = lazy(() => import("@/pages/Location"));
const Home = lazy(() => import("@/pages/Home"));
const SearchPage = lazy(() => import("@/pages/SearchPage"));
const ServicesPage = lazy(() => import("@/pages/ServicesPage"));
const ProviderQuotes = lazy(() => import("@/pages/ProviderQuotes"));
const NoProvidersFound = lazy(() => import("@/pages/NoProvidersFound"));
const ProviderDetail = lazy(() => import("@/pages/ProviderDetail"));
const Chat = lazy(() => import("@/pages/Chat"));
const BookingDate = lazy(() => import("@/pages/BookingDate"));
const BookingTime = lazy(() => import("@/pages/BookingTime"));
const BookingNotes = lazy(() => import("@/pages/BookingNotes"));
const BookingPayment = lazy(() => import("@/pages/BookingPayment"));
const BookingSuccess = lazy(() => import("@/pages/BookingSuccess"));
const BookService = lazy(() => import("@/pages/BookService"));
const SearchingProviders = lazy(() => import("@/pages/SearchingProviders"));
const SelectProvider = lazy(() => import("@/pages/SelectProvider"));
const ActingDriverBooking = lazy(() => import("@/pages/ActingDriverBooking"));
const Tracking = lazy(() => import("@/pages/Tracking"));
const Rating = lazy(() => import("@/pages/Rating"));
const Bookings = lazy(() => import("@/pages/Bookings"));
const BookingDetail = lazy(() => import("@/pages/BookingDetail"));
const Profile = lazy(() => import("@/pages/Profile"));
const EditProfile = lazy(() => import("@/pages/EditProfile"));
const Emergency = lazy(() => import("@/pages/Emergency"));
const Wallet = lazy(() => import("@/pages/Wallet"));
const WalletTopUp = lazy(() => import("@/pages/WalletTopUp"));
const PaymentCancelled = lazy(() => import("@/pages/PaymentCancelled"));
const WalletHistory = lazy(() => import("@/pages/WalletHistory"));
const ReferEarn = lazy(() => import("@/pages/ReferEarn"));
const TopReferrers = lazy(() => import("@/pages/TopReferrers"));
const Offers = lazy(() => import("@/pages/Offers"));
const Settings = lazy(() => import("@/pages/Settings"));
const Notifications = lazy(() => import("@/pages/Notifications"));
const HelpSupport = lazy(() => import("@/pages/HelpSupport"));
const Favorites = lazy(() => import("@/pages/Favorites"));
const GetHelp = lazy(() => import("@/pages/GetHelp"));
const ReportIssue = lazy(() => import("@/pages/ReportIssue"));
const ManageSubscriptions = lazy(() => import("@/pages/ManageSubscriptions"));
const Subscription = lazy(() => import("@/pages/Subscription"));
const Cancellation = lazy(() => import("@/pages/Cancellation"));
const ProviderDashboard = lazy(() => import("@/pages/provider/Dashboard"));
const ProviderJob = lazy(() => import("@/pages/provider/Job"));
const ServiceReport = lazy(() => import("@/pages/provider/ServiceReport"));
const Jobs = lazy(() => import("@/pages/provider/Jobs"));
const ProviderEarnings = lazy(() => import("@/pages/provider/Earnings"));
const ProviderProfile = lazy(() => import("@/pages/provider/ProviderProfile"));
const ProviderVideoPortfolio = lazy(() => import("@/pages/provider/VideoPortfolio"));
const SelectService = lazy(() => import("@/pages/provider/SelectService"));
const PersonalDetails = lazy(() => import("@/pages/provider/PersonalDetails"));
const DigiLockerKYC = lazy(() => import("@/pages/provider/DigiLockerKYC"));
const GpsConsent = lazy(() => import("@/pages/provider/GpsConsent"));
const PendingApproval = lazy(() => import("@/pages/provider/PendingApproval"));
const ApplicationRejected = lazy(() => import("@/pages/provider/ApplicationRejected"));
const Portfolio = lazy(() => import("@/pages/provider/Portfolio"));
const Documents = lazy(() => import("@/pages/provider/Documents"));
const GPSMonitor = lazy(() => import("@/pages/provider/GPSMonitor"));
const Navigation = lazy(() => import("@/pages/provider/Navigation"));
const ServiceSelection = lazy(() => import("@/pages/ServiceSelection"));
const PrivacyPolicy = lazy(() => import("@/pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("@/pages/TermsOfService"));
const DbCheck = lazy(() => import("@/pages/DbCheck"));
const NotFound = lazy(() => import("./pages/NotFound"));
const ProviderTabLayout = lazy(() => import("@/components/ProviderTabLayout"));


const queryClient = new QueryClient();

// Auth Guard for Customers/Providers
const RequireAuth = ({ children }: { children: JSX.Element }) => {
  const { isAuthenticated } = useApp();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
};

// Provider Route Guard — enforces approval status on every render
const RequireProviderRole = ({ children }: { children: JSX.Element }) => {
  const { isAuthenticated, role, user, dispatch } = useApp();
  const { status: approvalStatus, loading: statusLoading } = useProviderApprovalStatus(
    isAuthenticated && user?.accountType === "provider" ? (user?.id ?? null) : null
  );

  useEffect(() => {
    if (isAuthenticated && user?.accountType === "provider" && role !== "provider") {
      dispatch({ type: "SET_ROLE", role: "provider" });
    }
  }, [isAuthenticated, user?.accountType, role, dispatch]);

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user.accountType !== "provider") return <Navigate to="/home" replace />;

  // Wait for DB status before deciding
  if (statusLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-4 border-[#17375E] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Rejected — hard block, show rejection page
  if (approvalStatus === "rejected") {
    return <Navigate to="/provider/application-rejected" replace />;
  }

  // Pending — submitted but not yet approved, show waiting page
  if (approvalStatus === "pending") {
    return <Navigate to="/provider/pending-approval" replace />;
  }

  // null = no provider record yet (still in onboarding), approved = cleared
  return children;
};

// Admin Route Guard
function RequireAdmin() {
  const token = localStorage.getItem("roundu_admin_token");
  if (token !== "rdu-admin-2025") {
    return <Navigate to="/admin/login" replace />;
  }
  return <Outlet />;
}

// Layout wrapper component to enforce Mobile Viewport constraints selectively
const MobileRoutesLayout = () => (
  <MobileLayout>
    <Outlet />
  </MobileLayout>
);

// Smart Role Routing Logic
const SmartRoleRoute = () => {
  const { user, role, dispatch, providerRegistrationDraft } = useApp();
  const phone = user.phone || "";
  const savedRole = phone ? getSavedRoleForPhone(phone) : null;

  useEffect(() => {
    if (savedRole && savedRole !== role) {
      dispatch({ type: "SET_ROLE", role: savedRole });
    }
  }, [savedRole, role, dispatch]);

  const effectiveRole = savedRole || user.accountType || (user.role === "provider" ? "provider" : undefined);

  if (effectiveRole) {
    if (effectiveRole === "provider") {
      const hasCompletedPersonalDetails = user.name && user.name.trim().length >= 3;
      return hasCompletedPersonalDetails
        ? <Navigate to="/provider" replace />
        : <Navigate to="/provider/personal-details" replace />;
    }

    return <Navigate to="/home" replace />;
  }

  return <RoleSelect />;
};

const DebugLogs = () => {
  const [logs, setLogs] = useState<string[]>([]);
  useEffect(() => {
    const interval = setInterval(() => {
      setLogs([...((window as any).__logs || [])]);
    }, 500);
    return () => clearInterval(interval);
  }, []);
  return (
    <div className="p-5 font-mono text-xs bg-slate-900 text-green-400 h-screen overflow-y-auto">
      <h1 className="text-lg font-bold mb-4 text-white">Debug Logs Console</h1>
      <button onClick={() => { (window as any).__logs = []; setLogs([]); }} className="mb-4 px-3 py-1.5 bg-red-600 text-white rounded font-bold">Clear Logs</button>
      <div className="space-y-1">
        {logs.map((log, idx) => (
          <div key={idx} className="border-b border-slate-800 pb-1">{log}</div>
        ))}
      </div>
    </div>
  );
};

const AppRoutes = () => (
  <Suspense
    fallback={
      <div className="h-full w-full flex items-center justify-center p-4 min-h-screen bg-[#F8FAFC]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    }
  >
    <Routes>
      {/* 📱 SELECTIVE MOBILE APPS CONTAINER WRAPPER */}
      <Route element={<MobileRoutesLayout />}>
        <Route path="/" element={<Splash />} />
        <Route path="/login" element={<Login />} />
        <Route path="/otp" element={<OtpVerify />} />
        <Route path="/onboarding-name" element={<RequireAuth><OnboardingName /></RequireAuth>} />
        <Route path="/onboarding" element={<RequireAuth><Onboarding /></RequireAuth>} />
        <Route path="/select-role" element={<RequireAuth><RoleSelect /></RequireAuth>} />
        <Route path="/role-switch" element={<RequireAuth><RoleSelect /></RequireAuth>} />
        <Route path="/role" element={<RequireAuth><SmartRoleRoute /></RequireAuth>} />
        <Route path="/location" element={<RequireAuth><Location /></RequireAuth>} />

        {/* Customer Routes */}
        <Route path="/home" element={<RequireAuth><Home /></RequireAuth>} />
        <Route path="/search" element={<RequireAuth><SearchPage /></RequireAuth>} />
        <Route path="/services" element={<RequireAuth><ServicesPage /></RequireAuth>} />
        <Route path="/service-select/:serviceId" element={<RequireAuth><ServiceSelection /></RequireAuth>} />
        <Route path="/get-help/:serviceId" element={<RequireAuth><GetHelp /></RequireAuth>} />
        <Route path="/provider-quotes/:serviceId" element={<RequireAuth><ProviderQuotes /></RequireAuth>} />
        <Route path="/provider/:id" element={<RequireAuth><ProviderDetail /></RequireAuth>} />
        <Route path="/book-service/:serviceId" element={<RequireAuth><BookService /></RequireAuth>} />
        <Route path="/searching-providers/:serviceId" element={<RequireAuth><SearchingProviders /></RequireAuth>} />
        <Route path="/select-provider/:serviceId" element={<RequireAuth><SelectProvider /></RequireAuth>} />
        <Route path="/book-driver/:serviceId" element={<RequireAuth><ActingDriverBooking /></RequireAuth>} />
        <Route path="/booking/date" element={<RequireAuth><BookingDate /></RequireAuth>} />
        <Route path="/booking/time" element={<RequireAuth><BookingTime /></RequireAuth>} />
        <Route path="/booking/notes" element={<RequireAuth><BookingNotes /></RequireAuth>} />
        <Route path="/booking/payment" element={<RequireAuth><BookingPayment /></RequireAuth>} />
        <Route path="/booking/success/:id" element={<RequireAuth><BookingSuccess /></RequireAuth>} />
        <Route path="/tracking/:id" element={<RequireAuth><Tracking /></RequireAuth>} />
        <Route path="/chat/:id" element={<RequireAuth><Chat /></RequireAuth>} />
        <Route path="/rating/:id" element={<RequireAuth><Rating /></RequireAuth>} />
        <Route path="/bookings" element={<RequireAuth><Bookings /></RequireAuth>} />
        <Route path="/bookings/:id" element={<RequireAuth><BookingDetail /></RequireAuth>} />
        <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
        <Route path="/profile/edit" element={<RequireAuth><EditProfile /></RequireAuth>} />
        <Route path="/emergency" element={<RequireAuth><Emergency /></RequireAuth>} />
        <Route path="/wallet" element={<RequireAuth><Wallet /></RequireAuth>} />
        <Route path="/wallet/topup" element={<RequireAuth><WalletTopUp /></RequireAuth>} />
        <Route path="/wallet/history" element={<RequireAuth><WalletHistory /></RequireAuth>} />
        <Route path="/payment-cancelled" element={<RequireAuth><PaymentCancelled /></RequireAuth>} />
        <Route path="/refer-earn" element={<RequireAuth><ReferEarn /></RequireAuth>} />
        <Route path="/top-referrers" element={<RequireAuth><TopReferrers /></RequireAuth>} />
        <Route path="/offers" element={<RequireAuth><Offers /></RequireAuth>} />
        <Route path="/settings" element={<RequireAuth><Settings /></RequireAuth>} />
        <Route path="/notifications" element={<RequireAuth><Notifications /></RequireAuth>} />
        <Route path="/favorites" element={<RequireAuth><Favorites /></RequireAuth>} />
        <Route path="/support" element={<RequireAuth><HelpSupport /></RequireAuth>} />
        <Route path="/get-help" element={<RequireAuth><GetHelp /></RequireAuth>} />
        <Route path="/report-issue" element={<RequireAuth><ReportIssue /></RequireAuth>} />
        <Route path="/subscriptions" element={<RequireAuth><Subscription /></RequireAuth>} />
        <Route path="/subscriptions/manage" element={<RequireAuth><ManageSubscriptions /></RequireAuth>} />
        <Route path="/cancellation" element={<RequireAuth><Cancellation /></RequireAuth>} />
        <Route path="/assistant" element={<RequireAuth><Assistant /></RequireAuth>} />

        {/* Provider Routes — approval-gated */}
        <Route element={<RequireProviderRole><Outlet /></RequireProviderRole>}>
          <Route path="/provider" element={<ProviderTabLayout />}>
            <Route index element={null} />
            <Route path="jobs" element={null} />
            <Route path="earnings" element={null} />
            <Route path="profile" element={null} />
          </Route>
          <Route path="/provider/select-service" element={<SelectService />} />
          <Route path="/provider/personal-details" element={<PersonalDetails />} />
          <Route path="/provider/digilocker-kyc" element={<DigiLockerKYC />} />
          <Route path="/provider/video-portfolio" element={<ProviderVideoPortfolio />} />
          <Route path="/provider/gps-consent" element={<GpsConsent />} />
          <Route path="/provider/job/:id" element={<ProviderJob />} />
          <Route path="/provider/job/:id/report" element={<ServiceReport />} />
          <Route path="/provider/navigation/:id" element={<Navigation />} />
          <Route path="/provider/portfolio" element={<Portfolio />} />
          <Route path="/provider/documents" element={<Documents />} />
          <Route path="/provider/gps-monitor" element={<GPSMonitor />} />
        </Route>

        {/* Status pages — outside RequireProviderRole so pending/rejected can always reach them */}
        <Route path="/provider/pending-approval" element={<RequireAuth><PendingApproval /></RequireAuth>} />
        <Route path="/provider/application-rejected" element={<RequireAuth><ApplicationRejected /></RequireAuth>} />

        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/db-check" element={<DbCheck />} />
      </Route>

      {/* 🖥️ DESKTOP UNBOUND ADMIN CONTAINER ROUTES */}
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route element={<RequireAdmin />}>
        <Route element={<AdminLayout />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/providers" element={<AdminProviders />} />
          <Route path="/admin/provider-approvals" element={<AdminProviderApprovals />} />
          <Route path="/admin/bookings" element={<AdminBookings />} />
          <Route path="/admin/earnings" element={<AdminEarnings />} />
          <Route path="/admin/reports" element={<AdminReports />} />
        </Route>
      </Route>

      <Route path="/debug-logs" element={<DebugLogs />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </Suspense>
);

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <NetworkStatus />
        <BrowserRouter>
          <AppProvider>
            <SocketProvider>
              <AppRoutes />
              <SupportChatbot />
              <GlobalIncomingRequestPopup />
              <Toaster position="top-center" />
            </SocketProvider>
          </AppProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
export { RequireAdmin };