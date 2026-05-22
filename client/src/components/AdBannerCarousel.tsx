import { useState, useEffect, useRef } from "react";
import { ExternalLink } from "lucide-react";

const AD_BANNERS = [
  {
    id: "asian-paints",
    image: "/ads/ad_asian_paints.png",
    brand: "Asian Paints",
    tagline: "Transform Your Home",
    cta: "Explore Colors",
    accentFrom: "from-orange-500",
    accentTo: "to-red-500",
    url: "#",
  },
  {
    id: "toolmaster",
    image: "/ads/ad_hardware_store.png",
    brand: "ToolMaster Hardware",
    tagline: "Quality Tools for Every Pro",
    cta: "Shop Now",
    accentFrom: "from-slate-600",
    accentTo: "to-zinc-800",
    url: "#",
  },
  {
    id: "berger-paints",
    image: "/ads/ad_berger_paints.png",
    brand: "Berger Paints",
    tagline: "Color Your World",
    cta: "View Collection",
    accentFrom: "from-sky-500",
    accentTo: "to-blue-600",
    url: "#",
  },
];

const AUTO_SCROLL_MS = 4500;

const AdBannerCarousel = () => {
  const [activeIdx, setActiveIdx] = useState(0);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-rotate
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setActiveIdx((prev) => (prev + 1) % AD_BANNERS.length);
    }, AUTO_SCROLL_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Sync scroll to activeIdx
  useEffect(() => {
    if (scrollRef.current) {
      const cardW = scrollRef.current.clientWidth;
      scrollRef.current.scrollTo({
        left: activeIdx * cardW,
        behavior: "smooth",
      });
    }
  }, [activeIdx]);

  const handleScroll = () => {
    if (scrollRef.current) {
      const idx = Math.round(
        scrollRef.current.scrollLeft / scrollRef.current.clientWidth
      );
      if (idx !== activeIdx) {
        setActiveIdx(idx);
        // Reset timer on manual scroll
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
          setActiveIdx((prev) => (prev + 1) % AD_BANNERS.length);
        }, AUTO_SCROLL_MS);
      }
    }
  };

  return (
    <div className="pt-4 pb-2 animate-fade-in" style={{ animationDelay: "0.05s" }}>
      {/* Label */}
      <div className="px-5 flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-extrabold text-muted-foreground/50 uppercase tracking-[0.2em]">
            Sponsored
          </span>
        </div>
        {/* Dot indicators */}
        <div className="flex gap-1.5">
          {AD_BANNERS.map((_, i) => (
            <button
              key={i}
              onClick={() => setActiveIdx(i)}
              className={`rounded-full transition-all duration-300 ${
                i === activeIdx
                  ? "w-5 h-[5px] bg-primary"
                  : "w-[5px] h-[5px] bg-muted-foreground/25"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Scrollable cards */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="overflow-x-auto scrollbar-hide flex snap-x snap-mandatory"
      >
        {AD_BANNERS.map((ad) => (
          <a
            key={ad.id}
            href={ad.url}
            className="flex-shrink-0 w-full snap-start px-5"
            style={{ minWidth: "100%" }}
          >
            <div className="relative rounded-[20px] overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.08)] group">
              {/* Image */}
              <img
                src={ad.image}
                alt={ad.brand}
                className="w-full h-[160px] object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
              />

              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

              {/* Content overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-4 flex items-end justify-between">
                <div>
                  <p className="text-[10px] font-extrabold text-white/60 uppercase tracking-[0.2em] mb-0.5">
                    {ad.brand}
                  </p>
                  <h3 className="text-[17px] font-extrabold text-white leading-tight drop-shadow-sm">
                    {ad.tagline}
                  </h3>
                </div>
                <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20 hover:bg-white/30 transition-colors flex-shrink-0">
                  <span className="text-[11px] font-bold text-white">
                    {ad.cta}
                  </span>
                  <ExternalLink size={11} className="text-white/80" />
                </div>
              </div>

              {/* Premium "Ad" badge */}
              <div className="absolute top-3 left-3 bg-black/30 backdrop-blur-md px-2 py-0.5 rounded-md border border-white/10">
                <span className="text-[9px] font-bold text-white/70 uppercase tracking-wider">
                  Ad
                </span>
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
};

export default AdBannerCarousel;
