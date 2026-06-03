import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Phone, MessageSquare, ChevronLeft, Navigation2, MapPin,
  Wrench, CheckCircle, MoreVertical, Send, Mic, AlertTriangle,
  Key, Calendar, CreditCard, IndianRupee, ChevronRight,
} from "lucide-react";
import { useApp } from "@/context/AppContext";
import MapComponent from "@/components/MapComponent";
import { socket } from "@/lib/socket";
import { getProviderById, getServiceById } from "@/data/mockData";
import api from "@/lib/api";

// ── Stages matching the mockup (horizontal progress bar) ────────────────────
const STAGES = [
  { key: "on_the_way",  label: "On the way",   icon: "🛵" },
  { key: "arrived",     label: "Arrived",       icon: "👤" },
  { key: "in_progress", label: "On Progress",   icon: "🔧" },
  { key: "completed",   label: "Completed",     icon: "✓"  },
] as const;

const STATUS_ORDER = ["assigned", "on_the_way", "arrived", "in_progress", "completed"];

const stageIndex = (status: string) => {
  const mappedStatus = status === "payment_pending" ? "completed" : status;
  const i = STATUS_ORDER.indexOf(mappedStatus);
  return Math.max(i - 1, -1); // -1 = not started, 0 = on_the_way, etc.
};

// ── Chat message type ────────────────────────────────────────────────────────
interface ChatMsg {
  id: string;
  text: string;
  sender: "provider" | "customer";
  time: string;
}

const Tracking = () => {
  const navigate = useNavigate();
  const { id = "" } = useParams();
  const { user, bookings, dispatch } = useApp();
  const booking = bookings.find((b) => b.id === id);

  // Provider state – initialised from context/mock, then enriched via API
  const [provider, setProvider] = useState<any>(() => {
    if (!booking) return undefined;
    if ((booking as any).providerDetails) return (booking as any).providerDetails;
    const mock = getProviderById(booking.providerId);
    if (mock) return mock;
    // Friendly default fallback to prevent crashes for real users in DB
    return {
      id: booking.providerId,
      name: "Professional",
      rating: 4.8,
      reviews: 120,
      pricePerHr: 399,
      experienceYrs: 5,
      avatar: "P",
      verified: true,
      available: true,
      serviceId: booking.serviceId,
    };
  });

  // OTP for the booking
  const [otp, setOtp] = useState<string>((booking as any)?.otp || "8306");

  // Live status & stage
  const [liveStatus, setLiveStatus] = useState<string | null>(null);
  const [stageTimes, setStageTimes] = useState<Record<string, string>>({});

  // ETA
  const [eta, setEta] = useState<number>(provider?.etaMin || 12);

  // Notification toast
  const [notification, setNotification] = useState<{ text: string; emoji: string }>({ text: "", emoji: "" });
  const notifTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Pending quote
  const [pendingQuote, setPendingQuote] = useState<{ amount: number } | null>(null);

  const chatHistories = (useApp() as any).chatHistories || {};
  const globalChat = chatHistories[id] || [];

  // ── Fetch full provider details if not already loaded ─────────────────────
  useEffect(() => {
    if (!booking?.providerId) return;
    if (provider?.phone) return; // already have full details
    api.get(`/providers/${booking.providerId}`)
      .then((res) => {
        if (res.data?.success && res.data?.data?.provider) {
          setProvider(res.data.data.provider);
        }
      })
      .catch((err) => {
        console.warn("Could not fetch provider details via api:", err);
      });
  }, [booking?.providerId]);

  // ── Fetch OTP ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    fetch(`/api/bookings/${id}/otp`)
      .then((r) => r.json())
      .then((data) => { if (data?.otp) setOtp(String(data.otp)); })
      .catch(() => {});
  }, [id]);

  // ── Fetch chat history ────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    socket.emit("join_chat_room", { bookingId: id });
  }, [id]);

  // ── Socket: location & status ─────────────────────────────────────────────
  useEffect(() => {
    const onStatus = (data: { bookingId: string; status: string; quote?: number }) => {
      const nid = data.bookingId.replace("req-", "");
      if (nid !== id && data.bookingId !== id) return;
      setLiveStatus(data.status);
      dispatch({ type: "UPDATE_BOOKING_STATUS", bookingId: id, status: data.status as any });
      const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      setStageTimes((p) => ({ ...p, [data.status]: now }));
      if (data.status === "quote_set" && data.quote) {
        setPendingQuote({ amount: data.quote });
        showNotification("💰", `Provider sent a quote: ₹${data.quote}`);
      } else if (data.status === "on_the_way") showNotification("🛵", "Provider is on the way!");
      else if (data.status === "arrived")    showNotification("📍", "Provider has arrived!");
      else if (data.status === "in_progress") showNotification("🔧", "Service has started!");
      else if (data.status === "completed" || data.status === "payment_pending") {
        showNotification("✅", "Service completed!");
        setTimeout(() => navigate(`/booking/payment`, { state: { bookingId: id }, replace: true }), 2000);
      }
    };

    socket.on("job_status_updated", onStatus);
    return () => {
      socket.off("job_status_updated", onStatus);
    };
  }, [id, dispatch, navigate]);

  // ── Redirect if booking missing ───────────────────────────────────────────
  useEffect(() => {
    if (!booking) {
      const t = setTimeout(() => { if (!bookings.find((b) => b.id === id)) navigate("/home", { replace: true }); }, 500);
      return () => clearTimeout(t);
    }
  }, [booking, bookings, id, navigate]);

  // ── Redirect if completed & unpaid ────────────────────────────────────────
  useEffect(() => {
    if (booking && (booking.status === "completed" || booking.status === "payment_pending") && !(booking as any).paid) {
      showNotification("✅", "Service completed!");
      const t = setTimeout(() => {
        dispatch({ type: "SELECT_PROVIDER", id: booking.providerId });
        dispatch({ type: "SELECT_SERVICE", id: booking.serviceId });
        navigate("/booking/payment", { state: { bookingId: booking.id }, replace: true });
      }, 2000);
      return () => clearTimeout(t);
    }
  }, [booking?.status, (booking as any)?.paid, navigate, dispatch]);

  if (!booking) return null;

  // ── ETA countdown ─────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => setEta((e) => Math.max(0, e - 1)), 60_000);
    return () => clearInterval(t);
  }, []);



  const showNotification = (emoji: string, text: string) => {
    setNotification({ text, emoji });
    if (notifTimer.current) clearTimeout(notifTimer.current);
    notifTimer.current = setTimeout(() => setNotification({ text: "", emoji: "" }), 4000);
  };

  const handleCall = () => {
    const phone = provider?.phone || "+919999999999";
    window.open(`tel:${phone}`, "_self");
  };



  const handleApproveQuote = () => {
    dispatch({ type: "UPDATE_BOOKING_STATUS", bookingId: id, status: "in_progress" as any });
    socket.emit("update_job_status", { bookingId: id, status: "in_progress" });
    setPendingQuote(null);
    showNotification("✅", "Quote approved!");
  };

  const handleRejectQuote = () => {
    setPendingQuote(null);
    showNotification("❌", "Quote rejected.");
  };

  const currentStatus = liveStatus || booking.status;
  const activeStage = stageIndex(currentStatus);
  const service = getServiceById(booking.serviceId);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="tracking-root">
      {/* ── Top Header ──────────────────────────────────────────────────── */}
      <div className="tracking-header">
        <button className="tracking-header-back" onClick={() => navigate("/home")}>
          <ChevronLeft size={20} />
        </button>

        <div className="tracking-header-provider">
          <div className="tracking-provider-avatar">
            {user?.profilePicture || user?.avatar_url ? (
              <img src={user.profilePicture || user.avatar_url} alt={user?.name} />
            ) : (
              <span>{user?.name?.[0] || "C"}</span>
            )}
          </div>
          <div>
            <p className="tracking-provider-name">{user?.name || "Customer"}</p>
            <p className="tracking-provider-role">Customer</p>
          </div>
        </div>
      </div>

      {/* ── Safety Banner ─────────────────────────────────────────────── */}
      <div className="tracking-safety-banner">
        <AlertTriangle size={14} className="tracking-safety-icon" />
        <span><strong>For your safety:</strong> Do not negotiate prices or share payment details outside the app.</span>
      </div>

      {/* ── Map ───────────────────────────────────────────────────────── */}
      <div className="tracking-map">
        <MapComponent
          bookingId={id}
          customerLocation={[12.9716, 77.5946]}
          providerLocation={provider && typeof provider.lat === 'number' && typeof provider.lng === 'number' ? [provider.lat, provider.lng] : [12.9766, 77.5996]}
        />
        <div className="tracking-eta-badge">
          <span>⏱</span>
          <div>
            <span className="tracking-eta-num">{eta} min</span>
            <span className="tracking-eta-label">Away</span>
          </div>
        </div>
      </div>

      {/* ── Bottom Sheet ──────────────────────────────────────────────── */}
      <div className="tracking-sheet">
        {/* Drag handle */}
        <div className="tracking-sheet-handle" />

        {/* Notification toast */}
        {notification.text && (
          <div className="tracking-toast">
            <span>{notification.emoji}</span> {notification.text}
          </div>
        )}

        {/* Pending quote */}
        {pendingQuote && (
          <div className="tracking-quote-card">
            <p className="tracking-quote-title"><IndianRupee size={14} /> Provider Sent a Quote</p>
            <p className="tracking-quote-amount">₹{pendingQuote.amount}</p>
            <div className="tracking-quote-actions">
              <button className="tracking-quote-approve" onClick={handleApproveQuote}>✓ Approve</button>
              <button className="tracking-quote-reject" onClick={handleRejectQuote}>✕ Reject</button>
            </div>
          </div>
        )}

        {/* Status heading + OTP */}
        <div className="tracking-status-section">
          <h2 className="tracking-status-heading">
            {currentStatus === "on_the_way" ? "Provider is on the way" :
             currentStatus === "arrived"     ? "Provider has arrived" :
             currentStatus === "in_progress" ? "Service in progress" :
             (currentStatus === "completed" || currentStatus === "payment_pending")   ? "Service completed" :
             "Provider assigned"}
          </h2>
          {(currentStatus === "on_the_way" || currentStatus === "arrived") && (
            <>
              <p className="tracking-otp-label">Please show this OTP to your provider</p>
              <div className="tracking-otp-row">
                {otp.split("").map((d, i) => (
                  <span key={i} className="tracking-otp-digit">{d}</span>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Provider info row */}
        <div className="tracking-provider-row">
          <div className="tracking-provider-row-avatar">
            {typeof provider?.avatar === "string" && provider.avatar.startsWith("http") ? (
              <img src={provider.avatar} alt={provider?.name} />
            ) : (
              <span>{provider?.name?.[0] || "P"}</span>
            )}
          </div>
          <div className="tracking-provider-row-info">
            <p className="tracking-provider-row-name">{provider?.name || "Provider"}</p>
            <p className="tracking-provider-row-role">{service?.label || "Service"}</p>
            <p className="tracking-provider-row-rating">⭐ {provider?.rating?.toFixed(1) || "4.8"}</p>
          </div>
          <div className="tracking-provider-row-btns">
            <button className="tracking-icon-btn" onClick={(e) => { e.stopPropagation(); handleCall(); }}>
              <Phone size={18} />
            </button>
          </div>
        </div>

        <div className="tracking-divider" />

        {/* 4-step horizontal progress */}
        <div className="tracking-steps">
          {STAGES.map((stage, idx) => {
            const done   = activeStage > idx;
            const active = activeStage === idx;
            return (
              <div key={stage.key} className={`tracking-step ${active ? "tracking-step--active" : done ? "tracking-step--done" : ""}`}>
                <div className={`tracking-step-icon ${active ? "tracking-step-icon--active" : done ? "tracking-step-icon--done" : ""}`}>
                  {stage.icon}
                </div>
                <p className={`tracking-step-label ${active ? "tracking-step-label--active" : ""}`}>{stage.label}</p>
                {idx < STAGES.length - 1 && (
                  <div className={`tracking-step-connector ${done || active ? "tracking-step-connector--filled" : ""}`} />
                )}
              </div>
            );
          })}
        </div>
        <p className="tracking-eta-text">
          Expected arrival in <strong style={{ color: "#f97316" }}>{eta} min</strong>
        </p>

        <div className="tracking-divider" />

        {/* Booking detail rows */}
        <div className="tracking-details">
          <DetailRow icon={<Wrench size={15} />}      label="Service"        value={service?.label || booking.serviceId || "Service"} />
          <DetailRow icon={<Key size={15} />}          label="Booking ID"     value={`KA${String(booking.id).slice(-6).toUpperCase()}`} />
          <DetailRow icon={<Calendar size={15} />}     label="Scheduled Time" value={`${booking.date || "Today"}, ${booking.time || "Now"}`} />
          <DetailRow icon={<IndianRupee size={15} />}  label="Estimated Price" value={booking.price ? `₹${booking.price}` : "₹299 – ₹599"} />
          <DetailRow icon={<CreditCard size={15} />}   label="Payment Mode"   value="Cash after service" />
        </div>

        <div className="tracking-divider" />

        {/* Start Conversation button */}
        <button className="tracking-chat-btn" onClick={() => navigate(`/chat/${booking.id}`)}>
          <MessageSquare size={17} /> Start Conversation
        </button>

        {/* Complete & Pay */}
        {(currentStatus === "completed" || currentStatus === "payment_pending") && (
          <button
            className="tracking-pay-btn"
            onClick={() => {
              if (!(booking as any).paid) {
                dispatch({ type: "SELECT_PROVIDER", id: booking.providerId });
                dispatch({ type: "SELECT_SERVICE", id: booking.serviceId });
                navigate("/booking/payment", { state: { bookingId: booking.id } });
              } else {
                navigate(`/rating/${booking.id}`);
              }
            }}
          >
            {!(booking as any).paid ? "Complete & Pay" : "Rate Your Experience"}
          </button>
        )}
      </div>

      <style>{`
        /* ── Root ── */
        .tracking-root {
          min-height: 100dvh;
          display: flex;
          flex-direction: column;
          background: #f5f5f5;
          font-family: 'Inter', sans-serif;
          max-width: 430px;
          margin: 0 auto;
        }

        /* ── Header ── */
        .tracking-header {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px 16px 12px;
          background: #fff;
          border-bottom: 1px solid #f0f0f0;
        }
        .tracking-header-back {
          width: 36px; height: 36px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          background: #f5f5f5; border: none; cursor: pointer; flex-shrink: 0;
          color: #111;
        }
        .tracking-header-provider {
          display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0;
        }
        .tracking-provider-avatar {
          width: 42px; height: 42px; border-radius: 50%;
          background: #1e293b; color: #fff;
          display: flex; align-items: center; justify-content: center;
          font-weight: 700; font-size: 17px; flex-shrink: 0; overflow: hidden;
        }
        .tracking-provider-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .tracking-provider-name { font-weight: 700; font-size: 15px; color: #111; line-height: 1.2; }
        .tracking-provider-role { font-size: 12px; color: #f97316; font-weight: 600; }
        .tracking-header-actions {
          display: flex; gap: 8px; align-items: center;
        }
        .tracking-header-actions button {
          width: 36px; height: 36px; border-radius: 50%;
          border: 1.5px solid #e5e7eb; background: #fff;
          display: flex; align-items: center; justify-content: center;
          color: #374151; cursor: pointer;
        }

        /* ── Safety Banner ── */
        .tracking-safety-banner {
          background: #fffbeb; border-bottom: 1px solid #fde68a;
          padding: 8px 14px; display: flex; align-items: flex-start; gap: 8px;
          font-size: 12px; color: #92400e;
        }
        .tracking-safety-icon { color: #f59e0b; margin-top: 1px; flex-shrink: 0; }

        /* ── Map ── */
        .tracking-map {
          height: 220px; position: relative; background: #e2e8f0;
        }
        .tracking-map > div { height: 100%; }
        .tracking-eta-badge {
          position: absolute; bottom: 14px; right: 14px;
          background: #fff; border-radius: 12px; padding: 6px 12px;
          display: flex; align-items: center; gap: 6px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.12);
          font-size: 12px; color: #374151;
        }
        .tracking-eta-num { font-weight: 700; font-size: 15px; color: #111; display: block; }
        .tracking-eta-label { font-size: 11px; color: #6b7280; display: block; }

        /* ── Bottom Sheet ── */
        .tracking-sheet {
          flex: 1; background: #fff;
          border-radius: 22px 22px 0 0; margin-top: -14px;
          padding: 8px 20px 40px; overflow-y: auto;
          box-shadow: 0 -4px 20px rgba(0,0,0,0.07);
        }
        .tracking-sheet-handle {
          width: 36px; height: 4px; border-radius: 2px;
          background: #d1d5db; margin: 4px auto 16px;
        }

        /* ── Toast ── */
        .tracking-toast {
          background: #1e293b; color: #fff; border-radius: 12px;
          padding: 10px 14px; font-size: 13px; font-weight: 600;
          margin-bottom: 12px; display: flex; align-items: center; gap: 8px;
          animation: slideDown 0.3s ease;
        }

        /* ── Quote card ── */
        .tracking-quote-card {
          background: #fffbeb; border: 2px solid #fcd34d; border-radius: 16px;
          padding: 16px; margin-bottom: 14px;
        }
        .tracking-quote-title {
          font-size: 13px; font-weight: 700; color: #92400e;
          display: flex; align-items: center; gap: 4px; margin-bottom: 6px;
        }
        .tracking-quote-amount { font-size: 28px; font-weight: 800; color: #b45309; margin-bottom: 12px; }
        .tracking-quote-actions { display: flex; gap: 10px; }
        .tracking-quote-approve {
          flex: 1; padding: 10px; border-radius: 10px;
          background: #22c55e; color: #fff; font-weight: 700; border: none; cursor: pointer; font-size: 14px;
        }
        .tracking-quote-reject {
          flex: 1; padding: 10px; border-radius: 10px;
          background: #fee2e2; color: #dc2626; font-weight: 700;
          border: 1px solid #fecaca; cursor: pointer; font-size: 14px;
        }

        /* ── Status heading + OTP ── */
        .tracking-status-section { text-align: center; margin-bottom: 16px; }
        .tracking-status-heading { font-size: 17px; font-weight: 800; color: #111; margin-bottom: 4px; }
        .tracking-otp-label { font-size: 12px; color: #6b7280; margin-bottom: 10px; }
        .tracking-otp-row { display: flex; justify-content: center; gap: 10px; }
        .tracking-otp-digit {
          width: 48px; height: 56px; border: 1.5px solid #e5e7eb; border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          font-size: 26px; font-weight: 800; color: #111; background: #fff;
        }

        /* ── Provider info row ── */
        .tracking-provider-row {
          display: flex; align-items: center; gap: 12px; width: 100%;
          background: none; border: none; padding: 4px 0; text-align: left;
          margin-bottom: 4px;
        }
        .tracking-provider-row-avatar {
          width: 50px; height: 50px; border-radius: 50%; overflow: hidden;
          background: #1e293b; color: #fff; display: flex; align-items: center;
          justify-content: center; font-weight: 700; font-size: 18px; flex-shrink: 0;
        }
        .tracking-provider-row-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .tracking-provider-row-info { flex: 1; min-width: 0; }
        .tracking-provider-row-name { font-size: 15px; font-weight: 700; color: #111; }
        .tracking-provider-row-role { font-size: 12px; color: #6b7280; }
        .tracking-provider-row-rating { font-size: 13px; color: #374151; margin-top: 2px; }
        .tracking-provider-row-btns { display: flex; gap: 8px; }
        .tracking-icon-btn {
          width: 38px; height: 38px; border-radius: 50%;
          border: 1.5px solid #e5e7eb; background: #fff;
          display: flex; align-items: center; justify-content: center;
          color: #374151; cursor: pointer;
        }

        /* ── Divider ── */
        .tracking-divider { height: 1px; background: #f3f4f6; margin: 14px 0; }

        /* ── Horizontal steps ── */
        .tracking-steps {
          display: flex; align-items: flex-start; justify-content: space-between;
          position: relative; margin-bottom: 8px;
        }
        .tracking-step {
          display: flex; flex-direction: column; align-items: center;
          gap: 6px; flex: 1; position: relative;
        }
        .tracking-step-icon {
          width: 42px; height: 42px; border-radius: 50%;
          background: #f3f4f6; display: flex; align-items: center; justify-content: center;
          font-size: 18px; border: 2px solid #e5e7eb; z-index: 1; position: relative;
        }
        .tracking-step-icon--active {
          background: #fff7ed; border-color: #f97316; color: #f97316;
        }
        .tracking-step-icon--done {
          background: #fff7ed; border-color: #f97316;
        }
        .tracking-step-label { font-size: 10px; color: #9ca3af; text-align: center; font-weight: 500; }
        .tracking-step-label--active { color: #f97316; font-weight: 700; }
        .tracking-step-connector {
          position: absolute; top: 20px; left: 50%; width: 100%;
          height: 2px; background: #e5e7eb; z-index: 0;
        }
        .tracking-step-connector--filled { background: #f97316; }
        .tracking-eta-text { text-align: center; font-size: 12px; color: #6b7280; margin-top: 4px; }

        /* ── Booking details ── */
        .tracking-details { display: flex; flex-direction: column; }
        .tracking-detail-row {
          display: flex; align-items: center; padding: 11px 0;
          border-bottom: 1px solid #f3f4f6; gap: 10px;
        }
        .tracking-detail-row:last-child { border-bottom: none; }
        .tracking-detail-icon { color: #6b7280; flex-shrink: 0; }
        .tracking-detail-label { font-size: 13px; color: #374151; flex: 1; }
        .tracking-detail-value { font-size: 13px; font-weight: 600; color: #111; }
        .tracking-detail-arrow { color: #9ca3af; }

        /* ── Start conversation button ── */
        .tracking-chat-btn {
          width: 100%; padding: 14px; border-radius: 14px;
          border: 1.5px solid #e5e7eb; background: #fff;
          font-size: 14px; font-weight: 700; color: #111;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          cursor: pointer; margin-bottom: 4px;
        }
        .tracking-chat-btn:active { background: #f9fafb; }

        /* ── Chat panel ── */
        .tracking-chat-panel {
          border: 1.5px solid #e5e7eb; border-radius: 16px;
          overflow: hidden; margin-top: 8px; background: #fff;
        }
        .tracking-chat-date {
          text-align: center; font-size: 11px; color: #9ca3af;
          padding: 10px 0 4px; font-weight: 500;
        }
        .tracking-chat-messages {
          padding: 8px 12px; max-height: 240px; overflow-y: auto;
          display: flex; flex-direction: column; gap: 12px;
        }
        .tracking-chat-msg { display: flex; gap: 8px; align-items: flex-end; }
        .tracking-chat-msg--customer { flex-direction: row-reverse; }
        .tracking-chat-avatar {
          width: 30px; height: 30px; border-radius: 50%;
          background: #1e293b; color: #fff; display: flex;
          align-items: center; justify-content: center;
          font-size: 13px; font-weight: 700; flex-shrink: 0;
        }
        .tracking-chat-bubble {
          background: #f3f4f6; padding: 10px 13px; border-radius: 16px 16px 16px 4px;
          font-size: 13px; color: #111; max-width: 220px;
        }
        .tracking-chat-bubble--customer {
          background: #e0e7ff; border-radius: 16px 16px 4px 16px;
        }
        .tracking-chat-time { font-size: 10px; color: #9ca3af; margin-top: 3px; }
        .tracking-chat-time--right { text-align: right; }
        .tracking-chat-input-bar {
          display: flex; align-items: center; gap: 8px;
          padding: 10px 12px; border-top: 1px solid #f3f4f6;
        }
        .tracking-chat-mic {
          width: 36px; height: 36px; border-radius: 50%;
          border: 1.5px solid #e5e7eb; background: #fff;
          display: flex; align-items: center; justify-content: center;
          color: #374151; cursor: pointer; flex-shrink: 0;
        }
        .tracking-chat-input {
          flex: 1; border: 1.5px solid #e5e7eb; border-radius: 20px;
          padding: 8px 14px; font-size: 13px; color: #111;
          outline: none; background: #f9fafb;
        }
        .tracking-chat-input::placeholder { color: #9ca3af; }
        .tracking-chat-send {
          width: 36px; height: 36px; border-radius: 50%;
          background: #1e293b; color: #fff; border: none;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; flex-shrink: 0;
        }

        /* ── Pay button ── */
        .tracking-pay-btn {
          width: 100%; padding: 15px; margin-top: 14px; border-radius: 14px;
          background: #1e293b; color: #fff; font-weight: 700; font-size: 15px;
          border: none; cursor: pointer;
        }
        .tracking-pay-btn:active { opacity: 0.9; }

        /* ── Animations ── */
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

// ── Helper: booking detail row ──────────────────────────────────────────────
const DetailRow = ({
  icon, label, value,
}: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="tracking-detail-row">
    <span className="tracking-detail-icon">{icon}</span>
    <span className="tracking-detail-label">{label}</span>
    <span className="tracking-detail-value">{value}</span>
    <ChevronRight size={14} className="tracking-detail-arrow" />
  </div>
);

export default Tracking;
