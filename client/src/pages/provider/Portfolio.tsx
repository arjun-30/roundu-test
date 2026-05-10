import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Image as ImageIcon, Play } from "lucide-react";
import ProviderBottomNav from "@/components/ProviderBottomNav";

import { useState } from "react";

const Portfolio = () => {
  const navigate = useNavigate();
  const [notification, setNotification] = useState("");
  const mockPortfolio = [
    { id: 1, title: "AC Repair", date: "22 Oct 2023", image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&h=300&fit=crop" },
    { id: 2, title: "Electrical Wiring", date: "15 Oct 2023", image: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=400&h=300&fit=crop" },
    { id: 3, title: "Switchboard Fix", date: "10 Oct 2023", image: "https://images.unsplash.com/photo-1558002038-1055907df827?w=400&h=300&fit=crop" },
    { id: 4, title: "Fan Installation", date: "05 Oct 2023", image: "https://images.unsplash.com/photo-1591130901921-3f0652bb3915?w=400&h=300&fit=crop" },
    { id: 5, title: "Heater Repair", date: "01 Oct 2023", image: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=400&h=300&fit=crop" },
    { id: 6, title: "Kitchen Lighting", date: "28 Sep 2023", image: "https://images.unsplash.com/photo-1565538810643-b5bdb714032a?w=400&h=300&fit=crop" },
  ];

  const [portfolio, setPortfolio] = useState(mockPortfolio);
  const [isManaging, setIsManaging] = useState(false);

  const handleAddPair = () => {
    if (portfolio.length >= 5) {
      setNotification("Maximum of 5 pairs allowed.");
      setTimeout(() => setNotification(""), 3000);
      return;
    }
    const newPair = {
      id: Date.now(),
      title: "New Service Entry",
      date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&h=300&fit=crop"
    };
    setPortfolio([newPair, ...portfolio]);
    setNotification("Added mock pair. Actual upload coming soon!");
    setTimeout(() => setNotification(""), 3000);
  };

  const handleDeletePair = (id: number) => {
    setPortfolio(portfolio.filter(p => p.id !== id));
  };

  return (
    <div className="min-h-full flex flex-col bg-background pb-24">
      <div className="px-5 pt-6 pb-4 flex items-center gap-3 bg-white sticky top-0 z-10 border-b border-border shadow-sm">
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-xl bg-input border border-border flex items-center justify-center active:scale-95 transition-transform">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-lg font-bold text-foreground leading-tight">My Portfolio</h1>
          <p className="text-xs text-muted-foreground">Showcase your best work</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {notification && (
          <div className="bg-secondary/10 text-blue-700 p-3 m-5 rounded-xl text-sm font-semibold text-center mb-0">
            {notification}
          </div>
        )}
        {/* Video Introduction Section */}
        <div className="p-5">
           <div className="bg-slate-900 rounded-[28px] p-6 shadow-xl relative overflow-hidden group">
              <div className="flex items-center justify-between mb-4">
                 <h2 className="text-white font-extrabold text-base">Video Introduction</h2>
                 <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full">Active</span>
              </div>
              <div className="aspect-video bg-slate-800 rounded-2xl relative overflow-hidden flex items-center justify-center border border-slate-700">
                 <img src="https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&q=80" alt="Video Preview" className="w-full h-full object-cover opacity-50" />
                 <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 group-hover:scale-110 transition-transform">
                       <Play size={24} className="text-white fill-white ml-1" />
                    </div>
                 </div>
              </div>
              <button onClick={() => navigate("/provider/video-portfolio")} className="w-full mt-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-bold text-xs hover:bg-white/10 transition-colors">
                Re-record Introduction
              </button>
           </div>
        </div>

        {/* Before/After Portfolio Section */}
        <div className="px-5 pb-10 space-y-6">
          <div className="flex items-center justify-between">
             <h2 className="text-sm font-bold text-foreground">Service History (Before & After)</h2>
             <button onClick={() => setIsManaging(!isManaging)} className="text-primary text-[11px] font-bold">
               {isManaging ? "Done" : "Manage Pairs"}
             </button>
          </div>
          {isManaging && (
             <button onClick={handleAddPair} className="w-full py-3 rounded-xl border border-dashed border-primary text-primary font-bold text-xs hover:bg-primary/5 transition-colors">
               + Add New Pair ({portfolio.length}/5)
             </button>
          )}

          <div className="space-y-4">
            {portfolio.slice(0, 5).map((item) => (
              <div key={item.id} className="bg-card border border-border rounded-[24px] p-4 shadow-sm space-y-3 relative">
                {isManaging && (
                  <button onClick={() => handleDeletePair(item.id)} className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-destructive text-white flex items-center justify-center shadow-md active:scale-95 transition-transform z-10">
                    <span className="text-sm font-bold leading-none mb-0.5">×</span>
                  </button>
                )}
                <div className="flex justify-between items-center">
                   <p className="text-sm font-bold text-foreground">{item.title}</p>
                   <p className="text-[10px] text-muted-foreground">{item.date}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                   <div className="space-y-1.5 relative group">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase text-center">Before</p>
                      <div className="aspect-square rounded-2xl overflow-hidden border border-border shadow-inner relative">
                         <img src="https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=300&q=80" alt="Before" className="w-full h-full object-cover grayscale-[0.3]" />
                         {isManaging && (
                           <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                             <span className="text-white text-xs font-bold">Replace</span>
                           </div>
                         )}
                      </div>
                   </div>
                   <div className="space-y-1.5 relative group">
                      <p className="text-[10px] font-bold text-emerald-600 uppercase text-center">After</p>
                      <div className="aspect-square rounded-2xl overflow-hidden border border-emerald-200 shadow-inner ring-2 ring-emerald-500/20 relative">
                         <img src={item.image} alt="After" className="w-full h-full object-cover" />
                         {isManaging && (
                           <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                             <span className="text-white text-xs font-bold">Replace</span>
                           </div>
                         )}
                      </div>
                   </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>




      <ProviderBottomNav />
    </div>
  );
};

export default Portfolio;
