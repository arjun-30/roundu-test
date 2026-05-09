import { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { ArrowLeft, Star, MapPin, Clock, BadgeCheck, Briefcase, MessageCircle, Phone } from "lucide-react";
import { getProviderById, getServiceById } from "@/data/mockData";
import { useApp } from "@/context/AppContext";

const ProviderDetail = () => {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedDate, selectedTime, dispatch } = useApp();
  const provider = location.state?.provider || getProviderById(id);

  const [notification, setNotification] = useState("");

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(""), 3000);
  };

  const [portfolio, setPortfolio] = useState<any[]>([]);
  const [loadingPortfolio, setLoadingPortfolio] = useState(true);

  useEffect(() => {
    setLoadingPortfolio(true);
    setTimeout(() => {
      setPortfolio([
        { id: 1, title: "Previous Work 1", image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&h=300&fit=crop" },
        { id: 2, title: "Previous Work 2", image: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=400&h=300&fit=crop" },
      ]);
      setLoadingPortfolio(false);
    }, 1000);
  }, [id]);

  const handleCall = () => {
    showNotification("Connecting via secure masked number...");
    window.open("tel:+911234567890", "_self");
  };

  if (!provider) {
    return (
      <div className="flex items-center justify-center h-screen">Provider not found</div>
    );
  }

  const handleBook = () => {
    navigate(`/booking/${provider.id}`, { state: { provider } });
  };

  return (
    <div className="pb-24">
      <div className="relative h-64 bg-gray-200">
        <img src={provider.image} alt={provider.name} className="w-full h-full object-cover" />
        <button onClick={() => navigate(-1)} className="absolute top-4 left-4 p-2 bg-white/50 rounded-full backdrop-blur-md">
          <ArrowLeft size={20} />
        </button>
      </div>

      <div className="px-6 py-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              {provider.name}
              <BadgeCheck className="text-blue-500" size={20} />
            </h1>
            <p className="text-muted-foreground">{provider.service}</p>
          </div>
          <div className="flex items-center gap-1 bg-yellow-50 px-2 py-1 rounded-lg">
            <Star size={16} className="text-yellow-500 fill-yellow-500" />
            <span className="font-bold text-sm">{provider.rating}</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 my-8 p-4 bg-secondary/50 rounded-2xl">
          <Stat icon={Briefcase} value={provider.experience} label="Years Exp" />
          <Stat icon={Clock} value={provider.jobs} label="Jobs Done" />
          <Stat icon={MapPin} value={provider.distance} label="Distance" />
        </div>

        <h3 className="font-bold mb-2">About</h3>
        <p className="text-muted-foreground text-sm mb-6">{provider.about}</p>

        <h3 className="font-bold mb-4">Portfolio</h3>
        {loadingPortfolio ? (
          <div className="h-32 bg-secondary animate-pulse rounded-2xl" />
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-4">
            {portfolio.map((item) => (
              <img key={item.id} src={item.image} className="w-32 h-32 object-cover rounded-2xl flex-shrink-0" />
            ))}
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t">
        {notification && <div className="absolute -top-12 left-4 right-4 bg-primary text-primary-foreground p-2 rounded-lg text-sm text-center">{notification}</div>}
        <div className="flex gap-3">
          <button onClick={handleCall} className="w-12 h-12 rounded-2xl bg-input border border-border flex items-center justify-center">
            <Phone size={18} className="text-primary" />
          </button>
          <button onClick={() => navigate(`/chat/${provider.id}`)} className="w-12 h-12 rounded-2xl bg-input border border-border flex items-center justify-center">
            <MessageCircle size={18} className="text-primary" />
          </button>
          <button
            onClick={handleBook}
            className="flex-1 py-3.5 rounded-2xl bg-primary text-primary-foreground font-bold text-sm hover:bg-secondary active:scale-[0.98] transition-all"
          >
            Book Now — ₹{provider.pricePerHr}/hr
          </button>
        </div>
      </div>
    </div>
  );
};

const Stat = ({ icon: Icon, value, label }: { icon: any; value: string; label: string }) => (
  <div className="text-center">
    <Icon size={16} className="text-primary mx-auto mb-1" />
    <p className="text-sm font-bold text-foreground">{value}</p>
    <p className="text-[10px] text-muted-foreground">{label}</p>
  </div>
);

export default ProviderDetail;
