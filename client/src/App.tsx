import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppProvider, useApp } from "@/context/AppContext";
import MobileLayout from "@/components/MobileLayout";

import Splash from "@/pages/Splash";
import Login from "@/pages/Login";
import OtpVerify from "@/pages/OtpVerify";
import OnboardingName from "@/pages/OnboardingName";
import Onboarding from "@/pages/Onboarding";
import RoleSelect from "@/pages/RoleSelect";
import Location from "@/pages/Location";
import Home from "@/pages/Home";
import SearchPage from "@/pages/SearchPage";
import ServicesPage from "@/pages/ServicesPage";
import ProvidersPage from "@/pages/ProvidersPage";
import ProviderDetail from "@/pages/ProviderDetail";
import BookingDate from "@/pages/BookingDate";
import BookingTime from "@/pages/BookingTime";
import BookingNotes from "@/pages/BookingNotes";
import BookingPayment from "@/pages/BookingPayment";
import BookingSuccess from "@/pages/BookingSuccess";
import BookService from "@/pages/BookService";
import SearchingProviders from "@/pages/SearchingProviders";
import Tracking from "@/pages/Tracking";
import Rating from "@/pages/Rating";
import Bookings from "@/pages/Bookings";
import BookingDetail from "@/pages/BookingDetail";
import Profile from "@/pages/Profile";
import EditProfile from "@/pages/EditProfile";
import Emergency from "@/pages/Emergency";
import Wallet from "@/pages/Wallet";
import WalletTopUp from "@/pages/WalletTopUp";
import WalletHistory from "@/pages/WalletHistory";
import ReferEarn from "@/pages/ReferEarn";
import Offers from "@/pages/Offers";
import Settings from "@/pages/Settings";
import Notifications from "@/pages/Notifications";
import HelpSupport from "@/pages/HelpSupport";
import ReportIssue from "@/pages/ReportIssue";
import ManageSubscriptions from "@/pages/ManageSubscriptions";
import Subscription from "@/pages/Subscription";
import Cancellation from "@/pages/Cancellation";
import ProviderDashboard from "@/pages/provider/Dashboard";
import ProviderJob from "@/pages/provider/Job";
import Jobs from "@/pages/provider/Jobs";
import ProviderEarnings from "@/pages/provider/Earnings";
import ProviderProfile from "@/pages/provider/ProviderProfile";
import ProviderVideoPortfolio from "@/pages/provider/VideoPortfolio";
import SelectService from "@/pages/provider/SelectService";
import PersonalDetails from "@/pages/provider/PersonalDetails";
import DigiLockerKYC from "@/pages/provider/DigiLockerKYC";
import GpsConsent from "@/pages/provider/GpsConsent";
import PendingApproval from "@/pages/provider/PendingApproval";
import Portfolio from "@/pages/provider/Portfolio";
import Documents from "@/pages/provider/Documents";
import GPSMonitor from "@/pages/provider/GPSMonitor";
import ServiceSelection from "@/pages/ServiceSelection";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import TermsOfService from "@/pages/TermsOfService";
import ErrorBoundary from "@/components/ErrorBoundary";
import NetworkStatus from "@/components/NetworkStatus";

import DbCheck from "@/pages/DbCheck";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const RequireAuth = ({ children }: { children: JSX.Element }) => {
  const { isAuthenticated } = useApp();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
};

const AppRoutes = () => (
  <MobileLayout>
    <Routes>
      <Route path="/" element={<Splash />} />
      <Route path="/login" element={<Login />} />
      <Route path="/otp" element={<OtpVerify />} />
      <Route path="/onboarding-name" element={<RequireAuth><OnboardingName /></RequireAuth>} />
      <Route path="/onboarding" element={<RequireAuth><Onboarding /></RequireAuth>} />
      <Route path="/role" element={<RequireAuth><RoleSelect /></RequireAuth>} />
      <Route path="/location" element={<RequireAuth><Location /></RequireAuth>} />

      {/* Customer */}
      <Route path="/home" element={<RequireAuth><Home /></RequireAuth>} />
      <Route path="/search" element={<RequireAuth><SearchPage /></RequireAuth>} />
      <Route path="/services" element={<RequireAuth><ServicesPage /></RequireAuth>} />
      <Route path="/service-select/:serviceId" element={<RequireAuth><ServiceSelection /></RequireAuth>} />
      <Route path="/providers/:serviceId" element={<RequireAuth><ProvidersPage /></RequireAuth>} />
      <Route path="/provider/:id" element={<RequireAuth><ProviderDetail /></RequireAuth>} />
      <Route path="/book-service/:serviceId" element={<RequireAuth><BookService /></RequireAuth>} />
      <Route path="/searching-providers/:serviceId" element={<RequireAuth><SearchingProviders /></RequireAuth>} />
      <Route path="/booking/date" element={<RequireAuth><BookingDate /></RequireAuth>} />
      <Route path="/booking/time" element={<RequireAuth><BookingTime /></RequireAuth>} />
      <Route path="/booking/notes" element={<RequireAuth><BookingNotes /></RequireAuth>} />
      <Route path="/booking/payment" element={<RequireAuth><BookingPayment /></RequireAuth>} />
      <Route path="/booking/success/:id" element={<RequireAuth><BookingSuccess /></RequireAuth>} />
      <Route path="/tracking/:id" element={<RequireAuth><Tracking /></RequireAuth>} />
      <Route path="/rating/:id" element={<RequireAuth><Rating /></RequireAuth>} />
      <Route path="/bookings" element={<RequireAuth><Bookings /></RequireAuth>} />
      <Route path="/bookings/:id" element={<RequireAuth><BookingDetail /></RequireAuth>} />
      <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
      <Route path="/profile/edit" element={<RequireAuth><EditProfile /></RequireAuth>} />
      <Route path="/emergency" element={<RequireAuth><Emergency /></RequireAuth>} />
      <Route path="/wallet" element={<RequireAuth><Wallet /></RequireAuth>} />
      <Route path="/wallet/topup" element={<RequireAuth><WalletTopUp /></RequireAuth>} />
      <Route path="/wallet/history" element={<RequireAuth><WalletHistory /></RequireAuth>} />
      <Route path="/refer-earn" element={<RequireAuth><ReferEarn /></RequireAuth>} />
      <Route path="/offers" element={<RequireAuth><Offers /></RequireAuth>} />
      <Route path="/settings" element={<RequireAuth><Settings /></RequireAuth>} />
      <Route path="/notifications" element={<RequireAuth><Notifications /></RequireAuth>} />
      <Route path="/support" element={<RequireAuth><HelpSupport /></RequireAuth>} />
      <Route path="/report-issue" element={<RequireAuth><ReportIssue /></RequireAuth>} />
      <Route path="/subscriptions" element={<RequireAuth><Subscription /></RequireAuth>} />
      <Route path="/subscriptions/manage" element={<RequireAuth><ManageSubscriptions /></RequireAuth>} />
      <Route path="/cancellation" element={<RequireAuth><Cancellation /></RequireAuth>} />

      {/* Provider */}
      <Route path="/provider" element={<RequireAuth><ProviderDashboard /></RequireAuth>} />
      <Route path="/provider/select-service" element={<RequireAuth><SelectService /></RequireAuth>} />
      <Route path="/provider/personal-details" element={<RequireAuth><PersonalDetails /></RequireAuth>} />
      <Route path="/provider/digilocker-kyc" element={<RequireAuth><DigiLockerKYC /></RequireAuth>} />
      <Route path="/provider/video-portfolio" element={<RequireAuth><ProviderVideoPortfolio /></RequireAuth>} />
      <Route path="/provider/gps-consent" element={<RequireAuth><GpsConsent /></RequireAuth>} />
      <Route path="/provider/pending-approval" element={<RequireAuth><PendingApproval /></RequireAuth>} />
      <Route path="/provider/job/:id" element={<RequireAuth><ProviderJob /></RequireAuth>} />
      <Route path="/provider/jobs" element={<RequireAuth><Jobs /></RequireAuth>} />
      <Route path="/provider/earnings" element={<RequireAuth><ProviderEarnings /></RequireAuth>} />
      <Route path="/provider/profile" element={<RequireAuth><ProviderProfile /></RequireAuth>} />
      <Route path="/provider/portfolio" element={<RequireAuth><Portfolio /></RequireAuth>} />
      <Route path="/provider/documents" element={<RequireAuth><Documents /></RequireAuth>} />
      <Route path="/provider/gps-monitor" element={<RequireAuth><GPSMonitor /></RequireAuth>} />

      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/terms" element={<TermsOfService />} />

      <Route path="/db-check" element={<DbCheck />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </MobileLayout>
);

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <NetworkStatus />
        <BrowserRouter>
          <AppProvider>
            <AppRoutes />
          </AppProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
