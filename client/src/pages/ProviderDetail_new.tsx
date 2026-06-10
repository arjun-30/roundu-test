import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { 
  ArrowLeft, Star, MapPin, Clock, BadgeCheck, Briefcase, 
  MessageCircle, Phone, MoreVertical, CheckCircle2, CreditCard, X
} from "lucide-react";
import { getProviderById, getServiceById } from "@/data/mockData";
import { useApp } from "@/context/AppContext";
import api, { createBooking } from "@/lib/api";
import { socket } from "@/lib/socket";

const ProviderDetail = () => {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, dispatch, currentLocation } = useApp();
  
  const initialProvider = location.state?.provider || getProviderById(id);
  const quote = location.state?.quote;
  
  const [dynamicProfile, setDynamicProfile] = useState<any>(null);
  const [dynamicStats, setDynamicStats] = useState<any>(null);
  const [notification, setNotification] = useState("");
  const [isBooking, setIsBooking] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [portfolio, setPortfolio] = useState<any[]>([]);
  const [loadingPortfolio, setLoadingPortfolio] = useState(true);
  const [showGalleryModal, setShowGalleryModal] = useState(false);
  const [showReviewsModal, setShowReviewsModal] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      const targetUserId = quote?.providerId || id;
      if (!targetUserId) return;
      try {
        const res = await api.get(`/providers/${targetUserId}`);
        if (res.data.success) {
          setDynamicProfile(res.data.data.provider);
          setDynamicStats(res.data.data.stats);
        }
      } catch (err) {
        console.warn("Could not fetch profile:", err);
      }
    };
    fetchProfile();
  }, [quote, id]);

  const provider = useMemo(() => {
    if (initialProvider) {
      if (quote) {
        return {
          ...initialProvider,
          pricePerHr: quote.price,
          etaMin: quote.etaMin,
          distanceKm: quote.distanceKm,
          rating: quote.rating || initialProvider.rating
        };
      }
      return initialProvider;
    }

    if (quote || dynamicProfile) {
      return {
        id: quote?.providerId || id,
        name: quote?.providerName || dynamicProfile?.name || "Professional",
        avatar: quote?.providerAvatar || "P",
        pricePerHr: quote?.price || 500,
        etaMin: quote?.etaMin || 15,
        distanceKm: quote?.distanceKm || 0,
        rating: dynamicStats?.rating || quote?.rating || 0,
        reviews: dynamicStats?.total_jobs || quote?.reviews || 0,
        experienceYrs: dynamicProfile?.experience_years || 2,
        verified: true,
        jobs: dynamicStats?.completed_jobs || 0,
        bio: dynamicProfile?.bio || "Independent professional dedicated to quality service.",
        tags: ["Fast", "Reliable"],
        available: dynamicProfile?.is_online ?? true,
        serviceId: ""
      };
    }

    return null;
  }, [initialProvider, quote, dynamicProfile, dynamicStats, id]);

  useEffect(() => {
    setLoadingPortfolio(true);
    setTimeout(() => {
      setPortfolio([
        { id: 1, title: "Plumbing Fix", image: "/provider_work_gallery_1_1778838516658.png", desc: "Complete pipe replacement and leak repair." },
        { id: 2, title: "Electrical Setup", image: "/provider_work_gallery_2_1778838540729.png", desc: "Main panel wiring and safety circuit installation." },
        { id: 3, title: "Bathroom Renovation", image: "/provider_work_gallery_3_1778838557643.png", desc: "Modern fixture installation and waterproofing." },
        { id: 4, title: "Kitchen Drain Clear", image: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=400&h=300&fit=crop", desc: "Deep clog removal and drainage optimization." },
        { id: 5, title: "Water Heater Fix", image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&h=300&fit=crop", desc: "Thermostat replacement and heating element scaling." },
        { id: 6, title: "Smart Home Lighting", image: "https://images.unsplash.com/photo-1558002038-1055907df827?w=400&h=300&fit=crop", desc: "Automated ambient lighting setup and switchboard repair." },
      ]);
      setLoadingPortfolio(false);
    }, 800);
  }, [id]);

  const mockReviews = [
    { id: 1, user: "Amit S.", rating: 5, comment: "Excellent work! Fixed my leaking tap in minutes. Very professional.", date: "2 days ago", verified: true },
    { id: 2, user: "Priya K.", rating: 4, comment: "On time and efficient. Highly recommended for electrical issues.", date: "1 week ago", verified: true },
    { id: 3, user: "Vikram R.", rating: 5, comment: "Best service I've had in a while. Polite and thorough.", date: "2 weeks ago", verified: true },
  ];

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(""), 3000);
  };

  const handleCall = () => {
    showNotification("Connecting via secure masked number...");
    window.open("tel:+911234567890", "_self");
  };

  const handleBook = async () => {
    // Validation checks
    if (!user?.id) {
      showNotification("❌ Please log in to book a service.");
      return;
    }

    if (!provider) {
      showNotification("❌ Provider information not available.");
      return;
    }

    if (!currentLocation?.lat || !currentLocation?.lng) {
      showNotification("❌ Location access required. Please enable location.");
      return;
    }

    if (isBooking || bookingSuccess) {
      return;
    }

    setIsBooking(true);

    try {
      const bookingData = {
        customer_id: user.id,
        provider_id: provider.id,
        service_id: provider.serviceId || (quote?.broadcastId?.split('-')?.[2] ?? 'service'),
        status: "assigned",
        scheduled_at: new Date(Date.now() + (provider.etaMin || 15) * 60000).toISOString(),
        address: user.address || "Client Address",
        lat: currentLocation?.lat,
        lng: currentLocation?.lng,
        price: provider.pricePerHr,
        notes: quote ? `Accepting quote for ${provider.name}` : "Booking from provider profile",
      };

      const res = await createBooking(bookingData);
      
      if (res.success && res.data) {
        const enrichedBooking = {
          ...res.data,
          providerDetails: {
            name: provider.name,
            avatar: provider.avatar,
            rating: provider.rating,
            experienceYrs: provider.experienceYrs,
            phone: provider.phone || "",
          }
        };
        dispatch({ type: "ADD_BOOKING", booking: enrichedBooking });

        // Accept the quote if coming from a quote
        if (quote) {
          socket.emit("accept_quote", {
            broadcastId: quote.broadcastId,
            acceptedProviderId: provider.id,
            bookingId: res.data.id,
            customerName: user.name,
            customerPhone: user.phone,
            address: user.address || "Customer Location",
            serviceId: provider.serviceId,
            price: provider.pricePerHr,
            lat: currentLocation?.lat,
            lng: currentLocation?.lng,
            scheduled_at: res.data.scheduled_at,
          });
          showNotification("✅ Quote accepted! Opening chat...");
        } else {
          showNotification("✅ Booking confirmed!");
        }
        
        setBookingSuccess(true);
        setTimeout(() => navigate(`/chat/${res.data.id}`), 1000);
      } else {
        showNotification("❌ Booking failed. Please try again.");
        setIsBooking(false);
      }
    } catch (err: any) {
      console.error("Booking error:", err);
      showNotification(err?.message || "❌ Network error. Please try again.");
      setIsBooking(false);
    }
  };

  if (!provider) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background gap-4">
        <p className="text-muted-foreground font-medium">Provider profile not found</p>
        <button onClick={() => navigate("/home")} className="text-primary font-bold">Go Back Home</button>
      </div>
    );
  }

  const service = getServiceById(provider.serviceId);

  return (
    <div className="min-h-screen bg-gray-50 pb-32 font-['DM_Sans',sans-serif]">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
        <button 
          onClick={() => navigate(-1)} 
          className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-700 active:scale-95"
        >
          <ArrowLeft size={20} />
        </button>
        <button className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-700">
          <MoreVertical size={20} />
        </button>
      </div>

      {/* Content */}
      <div className="px-4 sm:px-6 py-6">
        
        {/* Profile Section */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative mb-4">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg border-4 border-white overflow-hidden">
              {provider.avatar && typeof provider.avatar === 'string' && provider.avatar.startsWith('http') ? (
                <img src={provider.avatar} alt={provider.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-5xl sm:text-6xl font-bold text-white">{provider.name?.charAt(0)}</span>
              )}
            </div>
            <div className="absolute bottom-0 right-0 w-6 h-6 bg-green-500 rounded-full border-4 border-white flex items-center justify-center">
              <div className="w-2 h-2 bg-white rounded-full" />
            </div>
          </div>

          <div className="text-center mb-3">
            <div className="flex items-center justify-center gap-2 mb-1">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground">{provider.name}</h1>
              {provider.verified && <BadgeCheck className="text-blue-500" size={24} />}
            </div>
            <p className="text-sm sm:text-base text-muted-foreground font-medium">{service?.label || "Professional Service"}</p>
          </div>

          <div className="text-center mb-4">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Star size={14} className="text-yellow-500 fill-yellow-500" />
              <span className="text-sm font-bold text-foreground">{provider.rating || 0}</span>
              <span className="text-xs text-muted-foreground">({provider.reviews || 0} reviews)</span>
            </div>
            <p className="text-xs text-muted-foreground">Member since May 2024</p>
          </div>

          <button 
            onClick={handleCall}
            className="flex items-center gap-2 bg-white border-2 border-foreground rounded-full px-6 py-2 font-bold text-foreground active:scale-95"
          >
            <Phone size={16} />
            Call
          </button>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          <div className="bg-white rounded-xl p-3 sm:p-4 border border-gray-200 text-center">
            <MapPin size={20} className="text-red-500 mx-auto mb-2" />
            <p className="text-xs font-bold text-foreground mb-1">Koramangala, Bangalore</p>
            <p className="text-[10px] text-muted-foreground">Karnataka - 560034</p>
          </div>
          <div className="bg-white rounded-xl p-3 sm:p-4 border border-gray-200 text-center">
            <Clock size={20} className="text-blue-500 mx-auto mb-2" />
            <p className="text-xs font-bold text-foreground mb-1">ETA Preference</p>
            <p className="text-[10px] text-muted-foreground">{provider.etaMin || 15} mins</p>
          </div>
          <div className="bg-white rounded-xl p-3 sm:p-4 border border-gray-200 text-center">
            <CheckCircle2 size={20} className="text-green-500 mx-auto mb-2" />
            <p className="text-xs font-bold text-foreground mb-1">Verified</p>
            <p className="text-[10px] text-muted-foreground">Documents verified</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-8 bg-white rounded-2xl p-4 sm:p-5 border border-gray-200">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <span className="text-2xl sm:text-3xl font-black text-foreground">{provider.rating || 0}</span>
              <Star size={16} className="text-yellow-500 fill-yellow-500" />
            </div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase">Rating</p>
          </div>
          <div className="text-center">
            <span className="text-2xl sm:text-3xl font-black text-foreground block mb-1">{provider.jobs || 0}</span>
            <p className="text-[10px] font-bold text-muted-foreground uppercase">Total Jobs</p>
          </div>
          <div className="text-center">
            <span className="text-2xl sm:text-3xl font-black text-foreground block mb-1">100%</span>
            <p className="text-[10px] font-bold text-muted-foreground uppercase">Response Rate</p>
          </div>
        </div>

        {/* Services & Work Details */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-200">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                <Briefcase size={16} className="text-purple-600" />
              </div>
              <h3 className="font-bold text-foreground">Services</h3>
            </div>
            <div className="space-y-2">
              {(provider.tags || ['Bike Taxi', 'Quick Pickups', 'Safe Rides']).slice(0, 3).map((svc: string) => (
                <div key={svc} className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-blue-500 flex-shrink-0" />
                  <span className="text-xs sm:text-sm text-foreground font-medium">{svc}</span>
                </div>
              ))}
            </div>
            <button className="w-full mt-3 text-primary text-xs font-bold text-center">View All Services</button>
          </div>

          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-200">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                <Briefcase size={16} className="text-green-600" />
              </div>
              <h3 className="font-bold text-foreground">Work Details</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Working Hours</span>
                </div>
                <span className="text-xs font-bold text-foreground">All day</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin size={14} className="text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Service Radius</span>
                </div>
                <span className="text-xs font-bold text-foreground">Up to 5 km</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageCircle size={14} className="text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Languages</span>
                </div>
                <span className="text-xs font-bold text-foreground">3 langs</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard size={14} className="text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Payment</span>
                </div>
                <span className="text-xs font-bold text-foreground">Cash, UPI</span>
              </div>
            </div>
            <button className="w-full mt-3 text-primary text-xs font-bold text-center">View Full Details</button>
          </div>
        </div>

        {/* Before & After Photos */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-extrabold text-foreground flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                <span className="text-sm">📸</span>
              </div>
              Before & After Photos
            </h3>
            <button onClick={() => setShowGalleryModal(true)} className="text-primary text-xs font-bold">View All</button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {portfolio.slice(0, 4).map((item, idx) => (
              <div 
                key={item.id} 
                className="relative h-32 rounded-xl overflow-hidden shadow-md cursor-pointer group"
                onClick={() => setShowGalleryModal(true)}
              >
                <img src={item.image} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                <span className="absolute bottom-2 left-2 text-white text-xs font-bold bg-black/40 px-2 py-1 rounded-full">
                  {idx % 2 === 0 ? 'Before' : 'After'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Certificates */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-extrabold text-foreground flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center">
                <span className="text-sm">📋</span>
              </div>
              Certificates & Licenses
            </h3>
            <button className="text-primary text-xs font-bold">View All</button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="bg-white rounded-xl p-3 border border-gray-200 text-center hover:shadow-md cursor-pointer">
              <div className="text-3xl mb-2">🪪</div>
              <p className="text-xs font-bold text-foreground line-clamp-2">Driving License</p>
            </div>
            <div className="bg-white rounded-xl p-3 border border-gray-200 text-center hover:shadow-md cursor-pointer">
              <div className="text-3xl mb-2">📋</div>
              <p className="text-xs font-bold text-foreground line-clamp-2">Insurance</p>
            </div>
            <div className="bg-white rounded-xl p-3 border border-gray-200 text-center hover:shadow-md cursor-pointer">
              <div className="text-3xl mb-2">🏍️</div>
              <p className="text-xs font-bold text-foreground line-clamp-2">Bike RC</p>
            </div>
            <div className="bg-white rounded-xl p-3 border border-gray-200 text-center hover:shadow-md cursor-pointer">
              <div className="text-3xl mb-2">✅</div>
              <p className="text-xs font-bold text-foreground line-clamp-2">PESO</p>
            </div>
          </div>
        </div>

        {/* Reviews */}
        <div className="mb-4">
          <h3 className="text-lg font-extrabold text-foreground mb-4 flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center">
              <Star size={16} className="text-yellow-600" />
            </div>
            Customer Reviews
          </h3>
          <div className="bg-white rounded-2xl p-4 sm:p-6 border border-gray-200">
            <div className="flex justify-between">
              <div>
                <p className="text-4xl font-black text-foreground">{provider.rating || 0}.0</p>
                <div className="flex gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={12} className={i < Math.round(provider.rating || 0) ? "text-yellow-500 fill-yellow-500" : "text-gray-300"} />
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-1">({mockReviews.length} reviews)</p>
              </div>
              <div className="flex flex-col gap-1">
                {[5, 4, 3, 2, 1].map((rating) => (
                  <div key={rating} className="flex items-center gap-2">
                    <div className="flex gap-0.5 w-12">
                      {[...Array(rating)].map((_, i) => (
                        <Star key={i} size={10} className="text-yellow-500 fill-yellow-500" />
                      ))}
                      {[...Array(5 - rating)].map((_, i) => (
                        <div key={i} className="w-1.5 h-1.5 bg-gray-300 rounded-full" />
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground w-6 text-right">0</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="text-center py-6">
              <MessageCircle size={32} className="text-gray-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-foreground">No reviews yet</p>
              <p className="text-xs text-muted-foreground">Be the first customer to review</p>
            </div>
          </div>
        </div>

      </div>

      {/* Gallery Modal */}
      {showGalleryModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-6" onClick={() => setShowGalleryModal(false)}>
          <div className="bg-white w-full max-w-lg rounded-t-[32px] sm:rounded-[32px] max-h-[85vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-4 sm:p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 z-10">
              <h3 className="text-base sm:text-lg font-extrabold">Project Gallery</h3>
              <button onClick={() => setShowGalleryModal(false)} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
                <X size={18} />
              </button>
            </div>
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
              {portfolio.map((item) => (
                <div key={item.id} className="bg-gray-50 rounded-xl overflow-hidden group">
                  <div className="aspect-video w-full overflow-hidden relative bg-gray-100">
                    <img src={item.image} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  </div>
                  <div className="p-4">
                    <h4 className="text-sm font-bold text-foreground mb-1">{item.title}</h4>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 p-4 sm:p-6 bg-white/80 backdrop-blur-xl border-t border-gray-200 z-50">
        <div className="max-w-md mx-auto">
          {notification && (
            <div className="absolute -top-14 left-4 right-4 sm:left-6 sm:right-6 bg-primary text-white py-3 px-5 rounded-[18px] text-[12px] sm:text-[13px] font-bold text-center shadow-lg animate-bounce">
              {notification}
            </div>
          )}
          <div className="flex gap-2 sm:gap-4 w-full">
            <button
              onClick={handleBook}
              disabled={isBooking || bookingSuccess}
              className={`flex-1 h-12 sm:h-14 rounded-[16px] sm:rounded-[22px] text-white font-extrabold text-[13px] sm:text-[15px] shadow-[0_12px_24px_rgba(21,46,75,0.2)] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-80 disabled:scale-100 ${bookingSuccess ? 'bg-green-500' : 'bg-primary hover:bg-blue-700 active:bg-blue-800'}`}
            >
              {isBooking && !bookingSuccess && (
                <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white/30 border-t-white rounded-full animate-spin flex-shrink-0" />
              )}
              <span className="line-clamp-1">
                {bookingSuccess ? (
                  <>
                    <CheckCircle2 size={16} className="sm:hidden inline" /> Confirmed!
                  </>
                ) : isBooking ? (
                  "Processing..."
                ) : quote ? (
                  `Accept Quote — ₹${provider.pricePerHr}`
                ) : (
                  `Book — ₹${provider.pricePerHr}`
                )}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProviderDetail;
