import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-full flex flex-col bg-background pb-10">
      <div className="px-6 pt-8 pb-4 flex items-center gap-4 sticky top-0 bg-background/80 backdrop-blur-md z-10">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-xl bg-input border border-border flex items-center justify-center text-foreground active:scale-95 transition-all"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-extrabold tracking-tight">Privacy Policy</h1>
      </div>

      <div className="px-6 space-y-6 text-sm text-muted-foreground leading-relaxed">
        <section>
          <h2 className="text-lg font-bold text-foreground mb-2">1. Introduction</h2>
          <p>
            Welcome to RoundU. We are committed to protecting your personal data and your privacy. This Privacy Policy explains how we collect, use, and share information about you when you use our mobile application and services.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-foreground mb-2">2. Information We Collect</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Personal Information:</strong> Name, phone number, email address, and postal address.</li>
            <li><strong>Location Data:</strong> We collect your location data to match you with nearby service providers and for real-time tracking during bookings.</li>
            <li><strong>Payment Information:</strong> We use third-party payment processors (Razorpay) to handle payments. We do not store your full card details on our servers.</li>
            <li><strong>Device Information:</strong> We collect information about the device you use to access our services, including the hardware model, operating system, and unique device identifiers.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-foreground mb-2">3. How We Use Information</h2>
          <p>
            We use the information we collect to provide, maintain, and improve our services, to process transactions, to send you technical notices and support messages, and to communicate with you about products, services, and offers.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-foreground mb-2">4. Data Deletion</h2>
          <p>
            You have the right to request the deletion of your account and personal data at any time through the Settings page in the app. Once requested, your data will be permanently removed from our active databases within 30 days.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-foreground mb-2">5. Contact Us</h2>
          <p>
            If you have any questions about this Privacy Policy, please contact us at support@roundu.app.
          </p>
        </section>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
