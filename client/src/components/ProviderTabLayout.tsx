import { useLocation } from "react-router-dom";
import ProviderDashboard from "@/pages/provider/Dashboard";
import Jobs from "@/pages/provider/Jobs";
import ProviderEarnings from "@/pages/provider/Earnings";
import ProviderProfile from "@/pages/provider/ProviderProfile";
import ProviderBottomNav from "@/components/ProviderBottomNav";

const ProviderTabLayout = () => {
  const { pathname } = useLocation();

  // Normalize path to check active tab
  const activePath = pathname.replace(/\/$/, ""); // removes trailing slash if any

  return (
    <div className="h-full w-full flex flex-col bg-background relative">
      <div className={activePath === "/provider" ? "block flex-1 h-full w-full" : "hidden"}>
        <ProviderDashboard />
      </div>
      <div className={activePath === "/provider/jobs" ? "block flex-1 h-full w-full" : "hidden"}>
        <Jobs />
      </div>
      <div className={activePath === "/provider/earnings" ? "block flex-1 h-full w-full" : "hidden"}>
        <ProviderEarnings />
      </div>
      <div className={activePath === "/provider/profile" ? "block flex-1 h-full w-full" : "hidden"}>
        <ProviderProfile />
      </div>
      
      <ProviderBottomNav />
    </div>
  );
};

export default ProviderTabLayout;
