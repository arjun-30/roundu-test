import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import {
  ArrowLeft, Star, MapPin, Clock, BadgeCheck, Briefcase,
  MessageCircle, Phone, Share2, MoreVertical, ShieldCheck,
  ThumbsUp, Zap, Calendar, Heart, CheckCircle2, ChevronRight, X, Play
} from "lucide-react";
import FixedBackButton from "@/components/FixedBackButton";
import { getProviderById, getServiceById } from "@/data/mockData";
import { useApp } from "@/context/AppContext";
import api, { createBooking } from "@/lib/api";
import { socket } from "@/lib/socket";
import { getProviderVideo } from "@/lib/supabase";
import ImagePreviewModal from "@/components/ImagePreviewModal";

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
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      setIsLoading(true);
      const targetUserId = quote?.providerId || id;
      console.log('[ProviderDetail] useEffect: id from params=', id, 'quote.providerId=', quote?.providerId, 'targetUserId=', targetUserId);

      if (!targetUserId) {
        console.log('[ProviderDetail] No target user ID, using initialProvider');
        setIsLoading(false);
        return;
      }
      console.log('[ProviderDetail] Fetching API data for ID:', targetUserId);
      try {
        const res = await api.get(`/providers/${targetUserId}`);
        console.log('[ProviderDetail] API raw response:', res.data);

        if (res.data?.success && res.data?.data) {
          const provider = res.data.data.provider;
          const stats = res.data.data.stats;

          console.log('[ProviderDetail] Setting dynamicProfile:', provider);
          console.log('[ProviderDetail] Setting dynamicStats:', stats);

          setDynamicProfile(provider);
          setDynamicStats(stats);

          // Fetch service labels for the provider
          const serviceIds = provider?.serviceIds || provider?.service_ids || [];
          if (serviceIds && serviceIds.length > 0) {
            const serviceLabels = serviceIds.map((serviceId: string) => getServiceById(serviceId)?.label || serviceId).filter(Boolean);
            setProviderServices(serviceLabels);
          }
        } else {
          console.warn('[ProviderDetail] API response missing data:', res.data);
          setDynamicProfile(null);
          setDynamicStats(null);
        }
      } catch (err: any) {
        console.error("[ProviderDetail] API fetch failed:", err?.response?.data || err?.message || err);
        setDynamicProfile(null);
        setDynamicStats(null);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, [quote, id]);

  // Override fields if coming from a specific quote or API
  const provider = useMemo(() => {
    // PRIORITY 1: Use API data (dynamicProfile + dynamicStats) if available
    // PRIORITY 2: Fall back to navigation state (initialProvider)

    const fromApi = dynamicProfile && Object.keys(dynamicProfile).length > 0;
    console.log('[ProviderDetail] useMemo: fromApi=', fromApi, 'dynamicProfile=', dynamicProfile, 'initialProvider=', initialProvider);

    const baseProfile = fromApi ? dynamicProfile : initialProvider;

    if (!baseProfile) {
      console.log('[ProviderDetail] No provider data available');
      return null;
    }

    // Only use dynamicStats if we got data from API
    const stats = fromApi ? (dynamicStats || {}) : {};
    console.log('[ProviderDetail] Using stats:', stats, 'from API:', fromApi);

    const result = {
      id: baseProfile?.id || id,
      name: baseProfile?.name || "Professional",
      phone: baseProfile?.phone || "",
      avatar: baseProfile?.avatar || baseProfile?.avatar_url || baseProfile?.name?.charAt(0) || "P",
      pricePerHr: quote?.price || baseProfile?.pricePerHr || 500,
      etaMin: quote?.etaMin || baseProfile?.etaMin || 15,
      distanceKm: quote?.distanceKm || baseProfile?.distanceKm || baseProfile?.distance_km || 0,
      // CRITICAL: Rating and Jobs MUST come from API stats
      rating: fromApi ? (stats?.rating ?? 0) : (baseProfile?.rating || quote?.rating || 0),
      jobs: fromApi ? (stats?.total_jobs ?? 0) : (baseProfile?.jobs || 0),
      reviews: fromApi ? (stats?.total_jobs ?? 0) : (baseProfile?.reviews || 0),
      experienceYrs: baseProfile?.experience_years || baseProfile?.experienceYrs || 2,
      workingHours: baseProfile?.working_hours || "All day",
      verified: baseProfile?.is_verified !== undefined ? baseProfile.is_verified : (baseProfile?.verified !== undefined ? baseProfile.verified : true),
      bio: baseProfile?.bio || "Independent professional dedicated to quality service.",
      tags: baseProfile?.tags || ["Fast", "Reliable"],
      available: baseProfile?.available !== undefined ? baseProfile.available : (baseProfile?.is_online ?? true),
      serviceId: baseProfile?.serviceId || baseProfile?.service_id || "",
      serviceIds: baseProfile?.serviceIds || baseProfile?.service_ids || [],
      serviceCategory: baseProfile?.service_category || [],
      lat: baseProfile?.lat,
      lng: baseProfile?.lng,
      display_location: baseProfile?.display_location || "Service Area",
      service_radius: baseProfile?.service_radius || 20
    };

    console.log('[ProviderDetail] Final provider object:', result);

    // If we have a quote, override price/eta/distance from quote
    if (quote) {
      return {
        ...result,
        pricePerHr: quote.price || result.pricePerHr,
        etaMin: quote.etaMin || result.etaMin,
        distanceKm: quote.distanceKm || result.distanceKm,
        // But keep API rating if available, otherwise use quote rating
        rating: fromApi ? result.rating : (quote.rating || result.rating),
        name: quote.providerName || result.name
      };
    }

    return result;
  }, [dynamicProfile, dynamicStats, quote, initialProvider, id]);

  const [notification, setNotification] = useState("");
  const [isFavorite, setIsFavorite] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);
  const [providerServices, setProviderServices] = useState<string[]>([]);

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

  const [reviews, setReviews] = useState<any[]>([]);

  useEffect(() => {
    const fetchReviews = async () => {
      if (!provider?.id) return;
      try {
        const res = await api.get(`/ratings/provider/${provider.id}`);
        if (res.data?.success) {
          setReviews(res.data.data);
        }
      } catch (err) {
        console.error("Failed to fetch reviews", err);
      }
    };
    fetchReviews();
  }, [provider?.id]);

  const [isImagePreviewOpen, setIsImagePreviewOpen] = useState(false);
  const [video, setVideo] = useState<any | null>(null);
  const [loadingVideo, setLoadingVideo] = useState(true);

  useEffect(() => {
    const fetchVideo = async () => {
      if (!provider?.id) return;
      try {
        setLoadingVideo(true);
        const activeVideo = await getProviderVideo(provider.id);
        setVideo(activeVideo);
      } catch (err) {
        console.error("Error fetching provider video:", err);
      } finally {
        setLoadingVideo(false);
      }
    };
    fetchVideo();
  }, [provider?.id]);

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
    // Validation checks
    if (!provider) {
      showNotification("❌ Provider information not available.");
      return;
    }

    if (isBooking || bookingSuccess) {
      return;
    }

    setIsBooking(true);

    try {
      const bookingData = {
        customer_id: user?.id || "demo-user",
        provider_id: provider.id,
        service_id: provider.serviceId || provider.serviceIds?.[0] || provider.serviceCategory?.[0] || (quote?.broadcastId?.split('-')?.[2] ?? 'plumber'),
        status: "assigned",
        scheduled_at: new Date(Date.now() + (provider.etaMin || 15) * 60000).toISOString(),
        address: user?.address || "Client Address",
        lat: currentLocation?.lat || 12.9716,
        lng: currentLocation?.lng || 77.5946,
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
            customerName: user?.name || "Customer",
            customerPhone: user?.phone || "1234567890",
            address: user?.address || "Customer Location",
            serviceId: provider.serviceId,
            price: provider.pricePerHr,
            lat: currentLocation?.lat || 12.9716,
            lng: currentLocation?.lng || 77.5946,
            scheduled_at: res.data.scheduled_at,
          });
          showNotification("✅ Quote accepted! Redirecting to tracking...");
        } else {
          showNotification("✅ Booking confirmed! Redirecting to tracking...");
        }

        setBookingSuccess(true);
        setTimeout(() => {
          navigate('/home', { replace: true });
          navigate(`/tracking/${res.data.id}`);
        }, 1000);
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
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center h-screen bg-background gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-muted-foreground font-medium">Loading provider profile...</p>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background gap-4">
        <p className="text-muted-foreground font-medium">Provider profile not found</p>
        <button onClick={() => navigate(-1)} className="text-primary font-bold">Go Back</button>
      </div>
    );
  }

  const service = getServiceById(provider.serviceId);

  return (
    <>
      {/* Fixed Back Button Component */}
      <FixedBackButton />

      <div className="min-h-screen bg-gray-50 pb-32 font-['DM_Sans',sans-serif]">
        {/* Portfolio Video Cover Section */}
        <div className="relative w-full h-64 sm:h-80 bg-gradient-to-br from-blue-500 to-blue-700 overflow-hidden rounded-b-3xl">
          {/* Background Video */}
          <video
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover opacity-80"
            src={video?.video_url || "https://videos.pexels.com/video-files/6906106/6906106-hd_1920_1080_30fps.mp4"}
          />

          {/* Fallback: Show first portfolio image if video fails */}
          {portfolio.length > 0 && (
            <img
              src={portfolio[0]?.image}
              alt="Portfolio Cover"
              className="absolute inset-0 w-full h-full object-cover opacity-0 hover:opacity-100 transition-opacity"
            />
          )}

          {/* Dark Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

          {/* Play Button Overlay */}
          <button
            onClick={() => setShowVideoPlayer(!showVideoPlayer)}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm border border-white/50 flex items-center justify-center hover:bg-white/30 active:scale-95 transition-all shadow-lg"
          >
            <Play size={28} className="text-white fill-white ml-1" />
          </button>
        </div>

        {/* Content with Floating Avatar */}
        <div className="px-4 sm:px-6 py-6 relative">
          {/* Floating Avatar at Top Center */}
          <div className="flex justify-center -mt-16 mb-6 relative z-20">
            <div className="relative">
              <div
                onClick={() => provider.avatar && typeof provider.avatar === 'string' && (provider.avatar.startsWith('http') || provider.avatar.startsWith('data:image/')) && setIsImagePreviewOpen(true)}
                className={`w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg border-4 border-white overflow-hidden ${provider.avatar && typeof provider.avatar === 'string' && (provider.avatar.startsWith('http') || provider.avatar.startsWith('data:image/')) ? 'cursor-pointer hover:scale-105 active:scale-95 transition-transform duration-200' : ''}`}
              >
                {provider.avatar && typeof provider.avatar === 'string' && (provider.avatar.startsWith('http') || provider.avatar.startsWith('data:image/')) ? (
                  <img src={provider.avatar} alt={provider.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-6xl sm:text-7xl font-bold text-white">{provider.name?.charAt(0)}</span>
                )}
              </div>
              <div className="absolute bottom-0 right-0 w-7 h-7 bg-green-500 rounded-full border-4 border-white flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full" />
              </div>
            </div>
          </div>

          {/* Profile Section - Centered */}
          <div className="flex flex-col items-center mb-8">
            <div className="text-center mb-3">
              <div className="flex items-center justify-center gap-2 mb-1">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground">{provider.name}</h1>
                {provider.verified && <BadgeCheck className="text-blue-500" size={24} />}
              </div>
            </div>

            <div className="text-center mb-4">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Star size={14} className="text-yellow-500 fill-yellow-500" />
                <span className="text-sm font-bold text-foreground">{Number(provider.rating || 0).toFixed(1)}</span>
                <span className="text-xs text-muted-foreground">({provider.reviews || 0} reviews)</span>
              </div>
            </div>

            <button
              onClick={handleCall}
              className="flex items-center gap-2 bg-white border-2 border-foreground rounded-full px-6 py-2 font-bold text-foreground active:scale-95"
            >
              <Phone size={16} />
              Call
            </button>
          </div>

          {/* Info Cards Grid */}
          <div className="grid grid-cols-3 gap-3 mb-8">
            <div className="bg-white rounded-xl p-3 sm:p-4 border border-gray-200 text-center">
              <MapPin size={20} className="text-red-500 mx-auto mb-2" />
              <p className="text-xs font-bold text-foreground mb-1">{provider.display_location || "Service Area"}</p>
              <p className="text-[10px] text-muted-foreground">Location</p>
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

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-3 mb-8 bg-white rounded-2xl p-4 sm:p-5 border border-gray-200">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <span className="text-2xl sm:text-3xl font-black text-foreground">{Number(provider.rating || 0).toFixed(1)}</span>
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

          {/* Services & Work Details - Two Column */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            {/* Services Card */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-200">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Briefcase size={16} className="text-purple-600" />
                </div>
                <h3 className="font-bold text-foreground text-sm">Services</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {(provider.serviceCategory && provider.serviceCategory.length > 0
                  ? provider.serviceCategory
                  : provider.serviceIds && provider.serviceIds.length > 0
                    ? provider.serviceIds.map((s: string) => s.charAt(0).toUpperCase() + s.slice(1))
                    : providerServices.length > 0
                      ? providerServices
                      : [service?.label || "Professional"]
                ).map((svc: string) => (
                  <div key={svc} className="flex items-center gap-1.5 bg-blue-50 rounded-full px-3 py-1">
                    <CheckCircle2 size={12} className="text-blue-500 flex-shrink-0" />
                    <span className="text-xs font-semibold text-blue-700">{svc}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Work Details Card */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-200">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                  <Briefcase size={16} className="text-green-600" />
                </div>
                <h3 className="font-bold text-foreground text-sm">Work Details</h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <div className="w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <Clock size={12} className="text-blue-500" />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Hours</p>
                    <p className="text-xs font-bold text-foreground">{provider.workingHours || "All day"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-7 h-7 rounded-full bg-orange-50 flex items-center justify-center flex-shrink-0">
                    <MapPin size={12} className="text-orange-500" />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Radius</p>
                    <p className="text-xs font-bold text-foreground">Up to {provider.service_radius || 20} km</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-7 h-7 rounded-full bg-purple-50 flex items-center justify-center flex-shrink-0">
                    <Zap size={12} className="text-purple-500" />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Experience</p>
                    <p className="text-xs font-bold text-foreground">{provider.experienceYrs || 1} {provider.experienceYrs === 1 ? "yr" : "yrs"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-7 h-7 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0">
                    <ShieldCheck size={12} className="text-green-500" />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Verified</p>
                    <p className="text-xs font-bold text-green-600">{provider.verified ? "Verified ✓" : "Pending"}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Video Introduction Section */}
          {loadingVideo ? (
            <div className="mb-8 px-1">
              <h3 className="text-[17px] font-extrabold text-foreground mb-3">Video Introduction</h3>
              <div className="aspect-video bg-slate-100 animate-pulse rounded-[24px] flex flex-col items-center justify-center gap-2">
                <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                <span className="text-xs text-muted-foreground font-semibold">Loading video intro...</span>
              </div>
            </div>
          ) : video ? (
            <div className="mb-8 px-1">
              <h3 className="text-[17px] font-extrabold text-foreground mb-3 flex items-center gap-2">
                Video Introduction
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200">Active</span>
              </h3>
              <div className="aspect-video bg-black rounded-[24px] overflow-hidden flex items-center justify-center border border-slate-200 shadow-sm relative group">
                <video
                  src={video.video_url}
                  controls
                  className="w-full h-full object-contain"
                  preload="metadata"
                  playsInline
                />
              </div>
            </div>
          ) : null}

          {/* Experience & Skills */}
          <div className="mb-8">
            <h3 className="text-[17px] font-extrabold text-foreground mb-4 px-1">Before & After</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {portfolio.slice(0, 6).map((item: any, index: number) => (
                <div
                  key={item.id || index}
                  className="relative bg-gray-200 rounded-lg overflow-hidden cursor-pointer group hover:shadow-lg transition-shadow h-40 sm:h-32"
                  onClick={() => {
                    setShowGalleryModal(true);
                  }}
                >
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Play className="w-8 h-8 text-white fill-white" />
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                    <p className="text-white text-xs font-bold line-clamp-1">{item.title}</p>
                  </div>
                </div>
              ))}
            </div>
            {portfolio.length > 6 && (
              <button
                onClick={() => setShowGalleryModal(true)}
                className="mt-3 w-full py-2 text-center text-primary text-sm font-bold hover:bg-primary/5 rounded-lg transition-colors"
              >
                View All {portfolio.length} Projects
              </button>
            )}
          </div>

          {/* Certificates & Licenses */}
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

          {/* Customer Reviews */}
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
                  <p className="text-4xl font-black text-foreground">
                    {Number(provider.rating || 0).toFixed(1)}
                  </p>
                  <div className="flex gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={12} className={i < Math.round(provider.rating || 0) ? "text-yellow-500 fill-yellow-500" : "text-gray-300"} />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">({reviews.length} reviews)</p>
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
                      <span className="text-xs text-muted-foreground w-6 text-right">{reviews.filter(r => Math.round(r.rating) === rating).length}</span>
                    </div>
                  ))}
                </div>
              </div>
              {reviews.length === 0 ? (
                <div className="text-center py-6">
                  <MessageCircle size={32} className="text-gray-300 mx-auto mb-2" />
                  <p className="text-sm font-bold text-foreground">No reviews yet</p>
                  <p className="text-xs text-muted-foreground">Be the first customer to review</p>
                </div>
              ) : (
                <div className="mt-6 space-y-4 max-h-[300px] overflow-y-auto pr-2">
                  {reviews.map((rev: any) => (
                    <div key={rev.id} className="border-t border-gray-100 pt-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-blue-100 overflow-hidden flex items-center justify-center flex-shrink-0">
                            {rev.customer_avatar ? (
                              <img src={rev.customer_avatar} alt={rev.customer_name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-xs font-bold text-blue-600">{(rev.customer_name || 'U').charAt(0)}</span>
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-foreground">{rev.customer_name || 'User'}</p>
                            <p className="text-[10px] text-muted-foreground">{new Date(rev.created_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <div className="flex gap-0.5">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} size={10} className={i < Math.round(rev.rating) ? "text-yellow-500 fill-yellow-500" : "text-gray-300"} />
                          ))}
                        </div>
                      </div>
                      {rev.comment && <p className="text-xs text-muted-foreground">{rev.comment}</p>}
                    </div>
                  ))}
                </div>
              )}
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

        {/* Floating Book Button at Bottom */}
        <div className="fixed bottom-0 left-0 right-0 p-4 z-30 flex gap-3">
          <button
            onClick={handleBook}
            disabled={isBooking || bookingSuccess}
            className={`flex-1 py-4 rounded-2xl font-extrabold text-white text-base shadow-lg transition-all active:scale-[0.98] ${bookingSuccess
                ? "bg-green-500"
                : isBooking
                  ? "bg-blue-400"
                  : quote
                    ? "bg-[#152E4B]"
                    : "bg-blue-600 hover:bg-blue-700"
              }`}
          >
            <span>
              {bookingSuccess ? (
                "Confirmed!"
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

        <ImagePreviewModal
          isOpen={isImagePreviewOpen}
          imageUrl={provider.avatar || ""}
          alt={provider.name}
          onClose={() => setIsImagePreviewOpen(false)}
        />
      </div>
    </>
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


