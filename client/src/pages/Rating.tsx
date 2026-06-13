import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Star } from "lucide-react";
import { useApp } from "@/context/AppContext";
import api from "@/lib/api";
const Rating = () => {
  const navigate = useNavigate();
  const { id = "" } = useParams();
  const { bookings, dispatch, user } = useApp();
  const booking = bookings.find((b) => b.id === id);
  const [stars, setStars] = useState(0);
  const [review, setReview] = useState("");
  const [error, setError] = useState("");

  if (!booking) {
    navigate("/home", { replace: true });
    return null;
  }

  const submit = async () => {
    if (stars === 0) {
      setError("Please select a rating");
      return;
    }
    setError("");
    
    try {
      await api.post('/ratings', {
        booking_id: booking.id,
        customer_id: booking.customer_id || booking.customerId || user?.id,
        provider_id: booking.provider_id || booking.providerId,
        rating: stars,
        comment: review
      });
      dispatch({ type: "UPDATE_BOOKING", id: booking.id, patch: { rating: stars, review } });
      navigate("/home", { replace: true });
    } catch (err: any) {
      console.error("Failed to submit rating", err);
      setError("Failed to submit rating. Please try again.");
    }
  };

  return (
    <div className="min-h-full flex flex-col bg-background pb-24">
      <div className="px-5 pt-6 pb-4 flex items-center gap-3 animate-fade-in">
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-xl bg-input border border-border flex items-center justify-center active:scale-95">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-bold text-foreground">Rate Service</h1>
      </div>

      <div className="flex-1 px-5 flex flex-col items-center text-center">
        <h2 className="text-xl font-extrabold text-foreground mt-6">How was your experience?</h2>
        <p className="text-xs text-muted-foreground mt-2">Your feedback helps others find great pros.</p>

        <div className="flex gap-2 mt-8">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} onClick={() => setStars(n)} className="active:scale-90 transition-transform">
              <Star
                size={42}
                className={n <= stars ? "text-accent fill-accent" : "text-border"}
              />
            </button>
          ))}
        </div>

        <textarea
          value={review}
          onChange={(e) => setReview(e.target.value)}
          placeholder="Share your experience (optional)"
          rows={5}
          className="w-full mt-8 p-4 rounded-2xl bg-input border border-border text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
        />
      </div>

      <div className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto p-5">
        {error && <p className="text-red-500 text-xs mb-2 text-center">{error}</p>}
        <button
          onClick={submit}
          className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-sm hover:bg-secondary active:scale-[0.98]"
        >
          Submit Review
        </button>
      </div>
    </div>
  );
};

export default Rating;
