import { useNavigate } from "react-router-dom";
import { MapPin } from "lucide-react";
import HybridMap from "@/components/Maps/HybridMap";
import { useApp } from "@/context/AppContext";

const Location = () => {
  const navigate = useNavigate();
  const { dispatch } = useApp();

  const handleLocationSelect = (location: { lat: number; lng: number; address: string }) => {
    dispatch({ type: "UPDATE_USER", user: { address: location.address } });
    navigate("/home", { replace: true });
  };

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="px-6 pt-8 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <MapPin className="text-primary" size={20} />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-foreground tracking-tight">Set Location</h1>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Pinpoint your service area</p>
          </div>
        </div>
        <button 
          onClick={() => navigate("/home", { replace: true })}
          className="text-xs font-extrabold text-primary px-4 py-2 rounded-lg bg-primary/5 hover:bg-primary/10 transition-all"
        >
          Skip
        </button>
      </div>

      <div className="flex-1 p-4">
        <div className="w-full h-full rounded-[2rem] overflow-hidden border border-border shadow-2xl">
          <HybridMap onLocationSelect={handleLocationSelect} />
        </div>
      </div>
    </div>
  );
};

export default Location;
