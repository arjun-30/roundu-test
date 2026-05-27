import { lazy, Suspense } from 'react';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";

import { TooltipProvider } from "@/components/ui/tooltip";
import { AppProvider, useApp } from "@/context/AppContext";
import MobileLayout from "@/components/MobileLayout";

const Splash = lazy(() => import("@/pages/Splash"));
const Login = lazy(() => import("@/pages/Login"));
const OtpVerify = lazy(() => import("@/pages/OtpVerify"));
const OnboardingName = lazy(() => import("@/pages/OnboardingName"));
const Onboarding = lazy(() => import("@/pages/Onboarding"));
const RoleSelect = lazy(() => import("@/pages/RoleSelect"));
const Location = lazy(() => import("@/pages/Location"));
const Home = lazy(() => import("@/pages/Home"));
const SearchPage = lazy(() => import("@/pages/SearchPage"));
const ServicesPage = lazy(() => import("@/pages/ServicesPage"));
const ProvidersPage = lazy(() => import("@/pages/ProvidersPage"));
const ProviderDetail = lazy(() => import("@/pages/ProviderDetail"));
const Chat = lazy(() => import("@/pages/Chat"));
const BookingDate = lazy(() => import("@/pages/BookingDate"));
const BookingTime = lazy(() => import("@/pages/BookingTime"));
const BookingNotes = lazy(() => import("@/pages/BookingNotes"));
const BookingPayment = lazy(() => import("@/pages/BookingPayment"));
const BookingSuccess = lazy(() => import("@/pages/BookingSuccess"));
const BookService = lazy(() => import("@/pages/BookService"));
const SearchingProviders = lazy(() => import("@/pages/SearchingProviders"));
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
const Portfolio = lazy(() => import("@/pages/provider/Portfolio"));
const Documents = lazy(() => import("@/pages/provider/Documents"));
const GPSMonitor = lazy(() => import("@/pages/provider/GPSMonitor"));
const Navigation = lazy(() => import("@/pages/provider/Navigation"));
const ServiceSelection = lazy(() => import("@/pages/ServiceSelection"));
const PrivacyPolicy = lazy(() => import("@/pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("@/pages/TermsOfService"));
import ErrorBoundary from "@/components/ErrorBoundary";
import NetworkStatus from "@/components/NetworkStatus";

const DbCheck = lazy(() => import("@/pages/DbCheck"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const RequireAuth = ({ children }: { children: JSX.Element }) => {
  const { isAuthenticated } = useApp();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
};

const AppRoutes = () => (
  <MobileLayout>
    <Suspense fallback={<div className="h-full w-full flex items-center justify-center p-4"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>}>
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

        {/* Provider */}
        <Route path="/provider" element={<RequireAuth><ProviderDashboard /></RequireAuth>} />
        <Route path="/provider/select-service" element={<RequireAuth><SelectService /></RequireAuth>} />
        <Route path="/provider/personal-details" element={<RequireAuth><PersonalDetails /></RequireAuth>} />
        <Route path="/provider/digilocker-kyc" element={<RequireAuth><DigiLockerKYC /></RequireAuth>} />
        <Route path="/provider/video-portfolio" element={<RequireAuth><ProviderVideoPortfolio /></RequireAuth>} />
        <Route path="/provider/gps-consent" element={<RequireAuth><GpsConsent /></RequireAuth>} />
        <Route path="/provider/pending-approval" element={<RequireAuth><PendingApproval /></RequireAuth>} />
        <Route path="/provider/job/:id" element={<RequireAuth><ProviderJob /></RequireAuth>} />
        <Route path="/provider/job/:id/report" element={<RequireAuth><ServiceReport /></RequireAuth>} />
        <Route path="/provider/navigation/:id" element={<RequireAuth><Navigation /></RequireAuth>} />
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
    </Suspense>
  </MobileLayout>
);

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>

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
