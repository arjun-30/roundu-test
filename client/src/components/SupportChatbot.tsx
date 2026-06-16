import { MessageSquare } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useApp } from "@/context/AppContext";
import "./chatbot.css";

const SupportChatbot = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useApp() as any;

  // Hide chatbot on auth screens + ALL admin pages
  const hiddenRoutes = [
    "/",
    "/login",
    "/otp",
    "/onboarding-name",
    "/onboarding",
    "/role",
    "/select-role",
    "/role-switch",
    "/location",
  ];

  // REMOVE CHATBOT FROM ADMIN
  if (
    pathname.startsWith("/admin") ||
    !isAuthenticated ||
    hiddenRoutes.includes(pathname) ||
    pathname === "/assistant"
  ) {
    return null;
  }

  const isJobPage = pathname.startsWith("/provider/job/");
  const bottomClass = isJobPage ? "bottom-32" : "bottom-24";

  return (
    <button
      onClick={() =>
        navigate("/assistant", {
          state: { from: pathname },
        })
      }
      className={`fixed ${bottomClass} right-5 w-14 h-14 rounded-full bg-primary text-white shadow-[0_8px_30px_rgba(21,46,75,0.3)] flex items-center justify-center z-50 hover:scale-105 active:scale-95 transition-all`}
    >
      <div className="relative">
        <MessageSquare size={24} />

        <span className="absolute -top-1 -right-2 w-3 h-3 bg-red-500 rounded-full border-2 border-primary animate-pulse" />
      </div>
    </button>
  );
};

export default SupportChatbot;