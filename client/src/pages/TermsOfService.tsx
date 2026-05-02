import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const TermsOfService = () => {
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
        <h1 className="text-xl font-extrabold tracking-tight">Terms of Service</h1>
      </div>

      <div className="px-6 space-y-6 text-sm text-muted-foreground leading-relaxed">
        <section>
          <h2 className="text-lg font-bold text-foreground mb-2">1. Acceptance of Terms</h2>
          <p>
            By accessing or using the RoundU app, you agree to be bound by these Terms of Service. If you do not agree to all of these terms, do not use our services.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-foreground mb-2">2. Description of Service</h2>
          <p>
            RoundU provides a platform that connects customers with independent service providers (e.g., plumbers, electricians). RoundU does not provide the services itself and is not responsible for the quality or safety of the services provided by third-party professionals.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-foreground mb-2">3. User Accounts</h2>
          <p>
            You must be at least 18 years old to create an account. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-foreground mb-2">4. Payments and Refunds</h2>
          <p>
            Payments for services are processed through our third-party payment gateway. Cancellation and refund policies are specific to each booking and will be displayed at the time of booking.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-foreground mb-2">5. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by law, RoundU shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of the services.
          </p>
        </section>
      </div>
    </div>
  );
};

export default TermsOfService;
