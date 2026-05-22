import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { 
  ArrowLeft, Star, MapPin, Clock, BadgeCheck, Briefcase, 
  MessageCircle, Phone, Share2, MoreVertical, ShieldCheck, 
  ThumbsUp, Zap, Calendar, Heart, CheckCircle2, ChevronRight, X
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
  
  // Get provider from state (e.g. from Search) or fallback to mock data
  const initialProvider = location.state?.provider || getProviderById(id);
  const quote = location.state?.quote; // If coming from SearchingProviders.tsx

  const [dynamicProfile, setDynamicProfile] = useState<any>(null);
  const [dynamicStats, setDynamicStats] = useState<any>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      const targetUserId = quote?.providerId || id;
      if (!targetUserId) return;
      try {
        const res = await api.get(`/providers/dashboard?userId=${targetUserId}`);
        if (res.data.success) {
          setDynamicProfile(res.data.data.provider);
          setDynamicStats(res.data.data.stats);
        }
      } catch (err) {
        console.warn("Could not fetch dynamic profile:", err);
      }
    };
    fetchProfile();
  }, [quote, id]);

  // Override fields if coming from a specific quote or API
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

    // Dynamic fallback for real users who aren't in mockData.ts
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

  const [notification, setNotification] = useState("");
  const [isFavorite, setIsFavorite] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(""), 3000);
  };

  const [portfolio, setPortfolio] = useState<any[]>([]);
  const [loadingPortfolio, setLoadingPortfolio] = useState(true);
  const [showGalleryModal, setShowGalleryModal] = useState(false);
  const [showReviewsModal, setShowReviewsModal] = useState(false);

  useEffect(() => {
    setLoadingPortfolio(true);
    // Simulating API fetch for portfolio
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
    { id: 4, user: "Suresh M.", rating: 5, comment: "Very knowledgeable and polite. Fixed the wiring issue flawlessly and explained everything.", date: "3 weeks ago", verified: true },
    { id: 5, user: "Neha G.", rating: 5, comment: "Cleaned up after the job was done. Impressive dedication to quality and absolute transparency.", date: "1 month ago", verified: true },
    { id: 6, user: "Rahul T.", rating: 4, comment: "Arrived a bit late but finished the job perfectly. Transparent pricing with no hidden charges.", date: "1 month ago", verified: true },
    { id: 7, user: "Anjali D.", rating: 5, comment: "Super fast arrival and excellent communication throughout the service booking.", date: "2 months ago", verified: true },
    { id: 8, user: "Manoj P.", rating: 5, comment: "Absolute expert. Solved a persistent plumbing issue no one else could fix in months.", date: "2 months ago", verified: true },
  ];

  const handleShare = async () => {
    const shareUrl = `https://roundu.in/provider/${provider?.id}`;
    const shareText = `Check out ${provider?.name} on RoundU — ${service?.label || "Professional Service"} starting at ₹${provider?.pricePerHr}/hr. Book now!`;
    try {
      await navigator.share({ title: provider?.name, text: shareText, url: shareUrl });
    } catch {
      // Cancelled or not supported
    }
  };

  const handleCall = () => {
    showNotification("Connecting via secure masked number...");
    window.open("tel:+911234567890", "_self");
  };


  const handleBook = async () => {
    if (isBooking || !provider || !user?.id) return;
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
        notes: "Booking from provider profile",
      };

      const res = await createBooking(bookingData);
      if (res.success) {
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

        // Notify the provider via socket
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
        }

        setBookingSuccess(true);
        showNotification("✅ Booking confirmed! Opening chat...");
        setTimeout(() => navigate(`/chat/${res.data.id}`), 900);
      } else {
        showNotification("Failed to create booking. Try again.");
        setIsBooking(false);
      }
    } catch (err) {
      console.error(err);
      showNotification("Network error. Please try again.");
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
    <div className="min-h-screen bg-background pb-28 font-['DM_Sans',sans-serif]">
      {/* Header Image & Action Bar */}
      <div className="relative h-80 bg-gray-900 overflow-hidden">
        <img 
          src={provider.avatar.length === 2 ? `https://ui-avatars.com/api/?name=${provider.name}&background=152E4B&color=fff&size=512` : provider.image} 
          alt={provider.name} 
          className="w-full h-full object-cover opacity-80" 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        
        {/* Top Controls */}
        <div className="absolute top-0 left-0 right-0 p-5 flex justify-between items-center z-10">
          <button 
            onClick={() => navigate(-1)} 
            className="w-11 h-11 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/30 active:scale-90 transition-all"
          >
            <ArrowLeft size={22} />
          </button>
          <div className="flex gap-3">
            <button 
              onClick={() => setIsFavorite(!isFavorite)}
              className="w-11 h-11 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/30 active:scale-90 transition-all"
            >
              <Heart size={20} className={isFavorite ? "fill-red-500 text-red-500" : ""} />
            </button>
            <button
              onClick={handleShare}
              className="w-11 h-11 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/30 active:scale-90 transition-all"
            >
              <Share2 size={20} />
            </button>
          </div>
        </div>

        {/* Floating Info Over Image */}
        <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end">
          <div>
             <div className="flex items-center gap-2 mb-1">
                <span className="bg-green-500 w-2.5 h-2.5 rounded-full animate-pulse" />
                <span className="text-white text-xs font-extrabold uppercase tracking-widest drop-shadow-md">
                  {provider.available ? "Available Now" : "Busy"}
                </span>
             </div>
             <h1 className="text-3xl font-extrabold text-white flex items-center gap-2 drop-shadow-lg">
                {provider.name}
                {provider.verified && <BadgeCheck className="text-blue-400" size={24} />}
             </h1>
             <p className="text-white/80 font-bold text-sm mt-1 flex items-center gap-1.5 drop-shadow-md">
               <Zap size={14} className="text-yellow-400 fill-yellow-400" />
               {service?.label || "General Specialist"}
             </p>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="px-6 -mt-6 relative z-20">
        <div className="bg-white rounded-t-[32px] p-6 shadow-[0_-12px_40px_rgba(0,0,0,0.06)] border-x border-t border-border/50">
          
          {/* Stats Bar */}
          <div className="grid grid-cols-3 gap-2 bg-[#F8FAFC] rounded-[24px] p-4 mb-8">
            <StatItem 
               icon={Star} 
               value={provider.rating === 0 ? "New" : provider.rating.toString()} 
               label={`${provider.reviews} Reviews`} 
               color="text-yellow-500"
            />
            <StatItem 
               icon={CheckCircle2} 
               value={provider.experienceYrs.toString()} 
               label="Years Exp" 
               color="text-blue-500"
            />
            <StatItem 
               icon={Briefcase} 
               value={provider.jobs?.toString() || "250+"} 
               label="Jobs Done" 
               color="text-primary"
            />
          </div>

          {/* Availability Box */}
          <div className="bg-primary/5 rounded-[24px] p-5 mb-8 flex items-center justify-between border border-primary/10">
             <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-sm">
                   <Clock size={24} className="text-primary" />
                </div>
                <div>
                   <p className="text-[12px] font-extrabold text-primary uppercase tracking-wider">Fastest Arrival</p>
                   <p className="text-[15px] font-bold text-foreground">Estimated in {provider.etaMin || 15} mins</p>
                </div>
             </div>
             <ChevronRight size={20} className="text-primary/40" />
          </div>

          {/* Pricing Info */}
          <div className="mb-8">
            <h3 className="text-[17px] font-extrabold text-foreground mb-3 px-1">Pricing Details</h3>
            <div className="bg-white border border-border rounded-[20px] p-4 flex justify-between items-center shadow-sm">
               <div>
                  <p className="text-[13px] text-muted-foreground font-medium">Standard Service Fee</p>
                  <p className="text-[18px] font-extrabold text-primary">₹{provider.pricePerHr}<span className="text-[13px] font-bold text-muted-foreground">/hr</span></p>
               </div>
               <div className="text-right">
                  <span className="text-[10px] font-extrabold uppercase bg-amber-50 text-amber-600 px-2 py-1 rounded-md border border-amber-100">Transparent</span>
               </div>
            </div>
          </div>

          {/* Experience & Skills */}
          <div className="mb-8">
             <h3 className="text-[17px] font-extrabold text-foreground mb-4 px-1">Specialties & Skills</h3>
             <div className="flex flex-wrap gap-2.5">
                {provider.tags.map(tag => (
                   <span key={tag} className="px-4 py-2 bg-secondary/5 rounded-full text-[13px] font-bold text-secondary border border-secondary/10">
                      {tag}
                   </span>
                ))}
                <span className="px-4 py-2 bg-secondary/5 rounded-full text-[13px] font-bold text-secondary border border-secondary/10">Quick Fixes</span>
                <span className="px-4 py-2 bg-secondary/5 rounded-full text-[13px] font-bold text-secondary border border-secondary/10">Installation</span>
             </div>
          </div>

          {/* About Section */}
          <div className="mb-8 px-1">
            <h3 className="text-[17px] font-extrabold text-foreground mb-3">About Provider</h3>
            <p className="text-[14px] text-muted-foreground leading-relaxed font-medium">
              {provider.bio || "Highly skilled professional with extensive experience in providing top-tier service. Committed to quality, reliability, and absolute customer satisfaction."}
            </p>
          </div>

          {/* Portfolio Gallery */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4 px-1">
               <h3 className="text-[17px] font-extrabold text-foreground">Project Gallery</h3>
               <button onClick={() => setShowGalleryModal(true)} className="text-[12px] font-bold text-primary uppercase tracking-wide active:opacity-60 transition-opacity">View All</button>
            </div>
            {loadingPortfolio ? (
              <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
                {[1,2,3].map(i => <div key={i} className="w-56 h-40 bg-secondary/10 animate-pulse rounded-[24px] flex-shrink-0" />)}
              </div>
            ) : (
              <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar -mx-6 px-6">
                {portfolio.map((item) => (
                  <div key={item.id} onClick={() => setShowGalleryModal(true)} className="relative w-64 h-44 rounded-[24px] overflow-hidden flex-shrink-0 shadow-md group cursor-pointer">
                    <img src={item.image} alt={item.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                    <p className="absolute bottom-4 left-4 text-white text-[13px] font-bold drop-shadow-md">{item.title}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Reviews Section */}
          <div className="mb-4">
             <div className="flex justify-between items-center mb-6 px-1">
                <h3 className="text-[17px] font-extrabold text-foreground">Client Reviews</h3>
                <div className="flex items-center gap-1.5">
                   <Star size={16} className="text-yellow-500 fill-yellow-500" />
                   <span className="text-[15px] font-extrabold text-foreground">{provider.rating}</span>
                </div>
             </div>
             
             <div className="space-y-4">
                {mockReviews.slice(0, 3).map(review => (
                   <div key={review.id} className="bg-[#F8FAFC] rounded-[24px] p-5 border border-border/40">
                      <div className="flex justify-between items-start mb-2">
                         <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                               {review.user.charAt(0)}
                            </div>
                            <div>
                               <p className="text-[14px] font-bold text-foreground">{review.user}</p>
                               <p className="text-[11px] text-muted-foreground font-medium">{review.date}</p>
                            </div>
                         </div>
                         <div className="flex gap-0.5">
                            {[...Array(5)].map((_, i) => (
                               <Star key={i} size={12} className={i < review.rating ? "text-yellow-500 fill-yellow-500" : "text-gray-300"} />
                            ))}
                         </div>
                      </div>
                      <p className="text-[13px] text-muted-foreground font-medium leading-relaxed mt-3 italic">
                         "{review.comment}"
                      </p>
                   </div>
                ))}
             </div>
             
             <button onClick={() => setShowReviewsModal(true)} className="w-full py-4 text-[14px] font-extrabold text-primary bg-primary/5 rounded-[20px] mt-6 active:scale-[0.98] transition-all hover:bg-primary/10">
                Read All Reviews ({mockReviews.length})
             </button>
          </div>

          {/* Safety & Trust */}
          <div className="mt-10 py-6 border-t border-border flex justify-between gap-4">
             <TrustBadge icon={ShieldCheck} label="Verified Expert" />
             <TrustBadge icon={ThumbsUp} label="Insured Work" />
             <TrustBadge icon={BadgeCheck} label="Top Rated" />
          </div>

        </div>
      </div>

      {/* Gallery Modal */}
      {showGalleryModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6 animate-fade-in" onClick={() => setShowGalleryModal(false)}>
          <div className="bg-background w-full max-w-lg rounded-t-[32px] sm:rounded-[32px] max-h-[85vh] flex flex-col overflow-hidden shadow-2xl animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-border flex justify-between items-center bg-white sticky top-0 z-10">
              <div>
                <h3 className="text-lg font-extrabold text-foreground">Project Gallery</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{portfolio.length} verified projects completed</p>
              </div>
              <button onClick={() => setShowGalleryModal(false)} className="w-9 h-9 rounded-full bg-secondary/10 flex items-center justify-center text-secondary hover:bg-secondary/20 active:scale-95 transition-all">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-[#F8FAFC]">
              {portfolio.map((item) => (
                <div key={item.id} className="bg-white rounded-[24px] overflow-hidden border border-border/60 shadow-sm group">
                  <div className="aspect-video w-full overflow-hidden relative bg-slate-100">
                    <img src={item.image} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-[11px] font-extrabold text-primary shadow-sm">
                      Verified Work
                    </div>
                  </div>
                  <div className="p-5">
                    <h4 className="text-[16px] font-bold text-foreground mb-1">{item.title}</h4>
                    <p className="text-[13px] text-muted-foreground font-medium leading-relaxed">{item.desc || "Professional service execution with high quality standards."}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Reviews Modal */}
      {showReviewsModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6 animate-fade-in" onClick={() => setShowReviewsModal(false)}>
          <div className="bg-background w-full max-w-lg rounded-t-[32px] sm:rounded-[32px] max-h-[85vh] flex flex-col overflow-hidden shadow-2xl animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-border flex justify-between items-center bg-white sticky top-0 z-10">
              <div>
                <h3 className="text-lg font-extrabold text-foreground flex items-center gap-2">
                  Client Reviews
                  <span className="bg-yellow-100 text-yellow-800 text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Star size={12} className="fill-yellow-600 text-yellow-600" /> {provider.rating}
                  </span>
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">All {mockReviews.length} verified customer reviews</p>
              </div>
              <button onClick={() => setShowReviewsModal(false)} className="w-9 h-9 rounded-full bg-secondary/10 flex items-center justify-center text-secondary hover:bg-secondary/20 active:scale-95 transition-all">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4 flex-1 bg-[#F8FAFC]">
              {mockReviews.map((review) => (
                <div key={review.id} className="bg-white rounded-[24px] p-5 border border-border/60 shadow-sm space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                        {review.user.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-[15px] font-bold text-foreground">{review.user}</p>
                          {review.verified && (
                            <span className="bg-green-50 text-green-600 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-green-200">
                              Verified
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground font-medium mt-0.5">{review.date}</p>
                      </div>
                    </div>
                    <div className="flex gap-0.5 bg-yellow-50 px-2.5 py-1 rounded-full border border-yellow-100">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} size={12} className={i < review.rating ? "text-yellow-500 fill-yellow-500" : "text-gray-300"} />
                      ))}
                    </div>
                  </div>
                  <p className="text-[14px] text-slate-700 font-medium leading-relaxed italic pl-1">
                    "{review.comment}"
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-white/80 backdrop-blur-xl border-t border-border z-50">
        <div className="max-w-md mx-auto">
          {notification && (
            <div className="absolute -top-14 left-6 right-6 bg-primary text-white py-3 px-5 rounded-[18px] text-[13px] font-bold text-center shadow-lg animate-bounce">
              {notification}
            </div>
          )}
          <div className="flex gap-4">
            <button 
              onClick={handleCall} 
              className="w-14 h-14 rounded-[22px] bg-secondary/10 border border-secondary/20 flex items-center justify-center active:scale-90 transition-all hover:bg-secondary/20"
            >
              <Phone size={22} className="text-secondary" />
            </button>
            <button 
              onClick={() => navigate(`/chat/${provider.id}`)} 
              className="w-14 h-14 rounded-[22px] bg-primary/10 border border-primary/20 flex items-center justify-center active:scale-90 transition-all hover:bg-primary/20"
            >
              <MessageCircle size={22} className="text-primary" />
            </button>
            <button
              onClick={handleBook}
              disabled={isBooking}
              className={`flex-1 h-14 rounded-[22px] text-white font-extrabold text-[15px] shadow-[0_12px_24px_rgba(21,46,75,0.2)] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-80 disabled:scale-100 ${bookingSuccess ? 'bg-green-500' : 'bg-primary hover:bg-[#1C3D63]'}`}
            >
              {isBooking && !bookingSuccess && (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              {bookingSuccess ? (
                <><CheckCircle2 size={18} /> Confirmed!</>
              ) : isBooking ? (
                "Booking..."
              ) : (
                `Book Service — ₹${provider.pricePerHr}`
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatItem = ({ icon: Icon, value, label, color }: { icon: any; value: string; label: string; color: string }) => (
  <div className="text-center flex flex-col items-center">
    <div className={`w-10 h-10 rounded-2xl bg-white flex items-center justify-center shadow-sm mb-2`}>
       <Icon size={20} className={color} />
    </div>
    <p className="text-[15px] font-extrabold text-foreground leading-tight">{value}</p>
    <p className="text-[10px] text-muted-foreground font-extrabold uppercase tracking-widest mt-0.5">{label}</p>
  </div>
);

const TrustBadge = ({ icon: Icon, label }: { icon: any; label: string }) => (
  <div className="flex flex-col items-center gap-1.5 opacity-60">
     <Icon size={22} className="text-primary" />
     <span className="text-[9px] font-extrabold text-primary uppercase tracking-[0.1em]">{label}</span>
  </div>
);

export default ProviderDetail;

