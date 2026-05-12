import { useEffect, useState } from "react";
import { Network } from "@capacitor/network";
import { WifiOff } from "lucide-react";

const NetworkStatus = () => {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    let handler: any;

    const checkStatus = async () => {
      const status = await Network.getStatus();
      setIsOffline(!status.connected);
      
      handler = await Network.addListener("networkStatusChange", (status) => {
        setIsOffline(!status.connected);
      });
    };

    checkStatus();

    return () => {
      if (handler) {
        handler.remove();
      }
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-red-500 text-white px-4 py-2 flex items-center justify-center gap-2 animate-slide-down font-bold text-sm shadow-lg">
      <WifiOff size={16} />
      You are currently offline. Some features may not work.
    </div>
  );
};

export default NetworkStatus;
