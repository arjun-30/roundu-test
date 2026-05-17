import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Wallet, Smartphone, Check } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Booking } from "@/data/mockData";
import { getAbsoluteIsoTimestamp } from "@/lib/utils";

import api, { createBooking, loadRazorpay } from "@/lib/api";

const BookingPayment = () => {
  const navigate = useNavigate();
  const { 
    selectedProvider, 
    selectedServiceId, 
    selectedDate = new Date().toISOString().slice(0, 10), 
    selectedTime = "10:00 AM", 
    bookingNotes,
    bookingVoiceNote,
    bookingVoiceNoteUrl,
    bookings,
    user,
    dispatch,
    addBooking
  } = useApp();
  
  const [method, setMethod] = useState<"wallet" | "upi">("wallet");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Fix: Move navigate to useEffect
  useEffect(() => {
    if (!selectedProvider || !selectedServiceId) {
      navigate("/home", { replace: true });
    }
  }, [selectedProvider, selectedServiceId, navigate]);

  if (!selectedProvider || !selectedServiceId) return null;

  const base = selectedProvider?.pricePerHr || 299;
  const tax = Math.round(base * 0.05);
  const platform = 19;
  const total = base + tax + platform;


  const handleConfirm = async () => {
    setLoading(true);
    const res = await loadRazorpay();

    if (!res) {
      setError("Payment gateway failed to load. Are you online?");
      setLoading(false);
      return;
    }
    setError("");

    try {
      // 1. Create order on backend
      const orderRes = await api.post("/payments/create-order", {
        amount: total,
        currency: "INR",
        receipt: `receipt_${Date.now()}`,
      });

      if (!orderRes.data.success) {
        throw new Error("Order creation failed");
      }

      const order = orderRes.data.order;

      // 2. Open Razorpay Checkout
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || "rzp_test_SjkbAFGdLhaT6C",
        amount: order.amount,
        currency: order.currency,
        name: "RoundU Services",
        description: `Booking for ${selectedProvider.name}`,
        order_id: order.id,
        handler: async (response: any) => {
          try {
            setLoading(true);
            // 3. Verify on backend
            const verifyRes = await api.post("/payments/verify", {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });

            if (!verifyRes.data.success) {
              setError("Payment verification failed. Please contact support.");
              return;
            }

            // 4. Create booking
            const bookingData = {
              customer_id: user.id,
              provider_id: selectedProvider.id,
              service_id: selectedServiceId,
              scheduled_at: getAbsoluteIsoTimestamp(selectedDate, selectedTime),
              address: user.address || "Client Address",
              price: total,
              notes: bookingNotes,
              voice_note: bookingVoiceNote, // Pass the boolean flag
              voice_note_url: bookingVoiceNoteUrl || null,
              payment_id: response.razorpay_payment_id,
            };

            const bookingRes = await createBooking(bookingData);
            if (bookingRes.success) {
              addBooking(bookingRes.data);
              dispatch({ type: "RESET_BOOKING_DRAFT" });
              navigate(`/booking/success/${bookingRes.data.id}`, { replace: true });
            }
          } catch (err) {
            console.error("Verification/Booking error:", err);
            setError("Failed to complete booking. Please check your internet.");
          } finally {
            setLoading(false);
          }
        },
        prefill: {
          name: user.name,
          email: user.email,
          contact: user.phone,
        },
        theme: { color: "#6366F1" },
        modal: {
          ondismiss: () => {
            setLoading(false);
            setError("Payment cancelled");
          }
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (error) {
      console.error("Payment error:", error);
      setError("Failed to initialize payment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-full flex flex-col bg-background pb-28">
      <div className="px-5 pt-6 pb-4 flex items-center gap-3 animate-fade-in">
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-xl bg-input border border-border flex items-center justify-center active:scale-95">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-bold text-foreground">Payment</h1>
      </div>

      <div className="flex-1 px-5 space-y-5">
        {error && (
          <div className="bg-destructive/10 text-destructive text-xs font-bold p-3 rounded-xl border border-destructive/20">
            {error}
          </div>
        )}
        <div className="bg-card border border-border rounded-2xl p-4 shadow-card">
          <h3 className="text-xs font-bold text-foreground mb-3">Price Breakdown</h3>
          <Row label="Service charge" value={`₹${base}`} />
          <Row label="Taxes (5%)" value={`₹${tax}`} />
          <Row label="Platform fee" value={`₹${platform}`} />
          <div className="h-px bg-border my-2" />
          <Row label="Total" value={`₹${total}`} bold />
        </div>

        <div>
          <h3 className="text-xs font-bold text-foreground mb-3">Payment Method</h3>
          <div className="space-y-2">
            <PaymentOption
              active={method === "wallet"}
              onClick={() => setMethod("wallet")}
              icon={Wallet}
              title="Roundu Wallet"
              subtitle="Balance: ₹2,400"
            />
            <PaymentOption
              active={method === "upi"}
              onClick={() => setMethod("upi")}
              icon={Smartphone}
              title="UPI"
              subtitle="Pay via Google Pay / PhonePe"
            />
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto p-5 bg-card border-t border-border">
        <button
          onClick={handleConfirm}
          disabled={loading}
          className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-sm hover:bg-secondary active:scale-[0.98] transition-all disabled:opacity-60"
        >
          {loading ? "Processing..." : `Confirm & Pay ₹${total}`}
        </button>
      </div>
    </div>
  );
};

const Row = ({ label, value, bold }: { label: string; value: string; bold?: boolean }) => (
  <div className="flex items-center justify-between py-1.5">
    <span className={`text-xs ${bold ? "font-bold text-foreground" : "text-muted-foreground"}`}>{label}</span>
    <span className={`text-xs ${bold ? "font-extrabold text-primary text-base" : "font-semibold text-foreground"}`}>{value}</span>
  </div>
);

const PaymentOption = ({ active, onClick, icon: Icon, title, subtitle }: any) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 p-4 rounded-2xl border transition-all active:scale-[0.98] ${
      active ? "bg-primary/5 border-primary" : "bg-card border-border"
    }`}
  >
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${active ? "bg-primary text-primary-foreground" : "bg-input text-primary"}`}>
      <Icon size={18} />
    </div>
    <div className="flex-1 text-left">
      <p className="text-sm font-bold text-foreground">{title}</p>
      <p className="text-[10px] text-muted-foreground">{subtitle}</p>
    </div>
    {active && (
      <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
        <Check size={12} className="text-primary-foreground" />
      </div>
    )}
  </button>
);

export default BookingPayment;
