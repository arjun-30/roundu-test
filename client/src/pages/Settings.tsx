import { ArrowLeft, Bell, Globe, Trash2, ChevronRight, Info, Percent } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { useApp } from "@/context/AppContext";
import axios from "axios";
import { API_BASE_URL } from "@/config/env";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const Settings = () => {
  const navigate = useNavigate();
  const { user, dispatch } = useApp();
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [promosEnabled, setPromosEnabled] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const handleDeleteAccount = async () => {
    if (!user?.id) return;
    setDeleting(true);

    try {
      const response = await axios.delete(`${API_BASE_URL}/users/${user.id}`);

      if (response.data.success) {
        localStorage.removeItem("roundu_token");
        dispatch({ type: "SET_AUTH", value: false });
        navigate("/splash", { replace: true });
      }
    } catch (err: any) {
      console.error("Delete Account Error:", err);
      setError(err.response?.data?.message || "Failed to delete account");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-full flex flex-col bg-background pb-24 font-sans">
      <div className="bg-white px-5 pt-6 pb-4 flex items-center shadow-sm sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-background flex items-center justify-center mr-3 hover:bg-gray-100 active:scale-95 transition-all">
          <ArrowLeft size={20} className="text-primary" />
        </button>
        <h1 className="text-xl font-extrabold text-foreground">Settings</h1>
      </div>

      <div className="px-5 pt-6">
        {/* Languages */}
        <div className="mb-8">
          <h2 className="text-xs font-extrabold text-muted-foreground uppercase tracking-widest pl-1 mb-3">Preferences</h2>
          <button className="w-full bg-white rounded-2xl p-4 flex justify-between items-center shadow-sm border border-border active:scale-[0.98] transition-transform">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/5 flex items-center justify-center">
                <Globe size={18} className="text-primary" />
              </div>
              <div className="text-left">
                <p className="font-bold text-[14px] text-foreground">Language</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">English</p>
              </div>
            </div>
            <ChevronRight size={18} className="text-gray-300" />
          </button>
        </div>

        {/* Notifications */}
        <div className="mb-8">
          <h2 className="text-xs font-extrabold text-muted-foreground uppercase tracking-widest pl-1 mb-3">Notifications</h2>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-border space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-background flex items-center justify-center border border-border">
                  <Bell size={16} className="text-muted-foreground" />
                </div>
                <p className="font-semibold text-[14px] text-foreground">Push Notifications</p>
              </div>
              <Switch checked={pushEnabled} onCheckedChange={setPushEnabled} />
            </div>
            <div className="h-px bg-gray-100 w-full" />
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-background flex items-center justify-center border border-border">
                  <Info size={16} className="text-muted-foreground" />
                </div>
                <p className="font-semibold text-[14px] text-foreground">Booking Updates</p>
              </div>
              <Switch checked={emailEnabled} onCheckedChange={setEmailEnabled} />
            </div>
            <div className="h-px bg-gray-100 w-full" />
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-background flex items-center justify-center border border-border">
                  <Percent size={16} className="text-muted-foreground" />
                </div>
                <p className="font-semibold text-[14px] text-foreground">Offers & Promos</p>
              </div>
              <Switch checked={promosEnabled} onCheckedChange={setPromosEnabled} />
            </div>
          </div>
        </div>
        {/* Legal Section */}
        <div className="mb-8">
          <h2 className="text-xs font-extrabold text-muted-foreground uppercase tracking-widest pl-1 mb-3">Legal</h2>
          <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
            <button 
              onClick={() => navigate("/privacy")}
              className="w-full p-4 flex justify-between items-center hover:bg-background transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-background flex items-center justify-center border border-border">
                  <Info size={16} className="text-muted-foreground" />
                </div>
                <p className="font-semibold text-[14px] text-foreground">Privacy Policy</p>
              </div>
              <ChevronRight size={18} className="text-gray-300" />
            </button>
            <div className="h-px bg-gray-100 w-full" />
            <button 
              onClick={() => navigate("/terms")}
              className="w-full p-4 flex justify-between items-center hover:bg-background transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-background flex items-center justify-center border border-border">
                  <Globe size={16} className="text-muted-foreground" />
                </div>
                <p className="font-semibold text-[14px] text-foreground">Terms of Service</p>
              </div>
              <ChevronRight size={18} className="text-gray-300" />
            </button>
          </div>
        </div>

        {/* Danger Zone */}
        <div>
          <h2 className="text-xs font-extrabold text-red-300 uppercase tracking-widest pl-1 mb-3">Account</h2>
          {error && <p className="text-red-500 text-xs mb-2">{error}</p>}
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button 
                disabled={deleting}
                className="w-full bg-white rounded-2xl p-4 flex items-center gap-3 shadow-sm border border-red-100 hover:bg-red-50 transition-colors active:scale-[0.98] disabled:opacity-50"
              >
                <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
                  <Trash2 size={18} className="text-red-500" />
                </div>
                <div className="text-left flex-1">
                  <p className="font-bold text-[14px] text-red-600">Delete Account</p>
                  <p className="text-[11px] text-red-400 mt-0.5">Permanently remove your data</p>
                </div>
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-[32px] border-none shadow-2xl">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-xl font-extrabold text-foreground">Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription className="text-muted-foreground text-sm">
                  This action cannot be undone. This will permanently delete your account
                  and remove your data from our servers.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="gap-2 sm:gap-0">
                <AlertDialogCancel className="rounded-2xl border-border font-bold text-muted-foreground">Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleDeleteAccount}
                  className="rounded-2xl bg-red-500 hover:bg-red-600 font-bold text-white shadow-lg shadow-red-200"
                >
                  {deleting ? "Deleting..." : "Delete My Account"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>


      </div>
    </div>
  );
};
export default Settings;
