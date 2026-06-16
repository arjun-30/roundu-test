import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/context/AppContext";
import { useSocket } from "@/context/SocketProvider";
import IncomingRequestPopup from "@/components/IncomingRequestPopup";
import { toast } from "sonner";
import { getAbsoluteIsoTimestamp } from "@/lib/utils";

const GlobalIncomingRequestPopup = () => {
  const appState = useApp() as any;
  const { socket, isConnected } = useSocket();
  const navigate = useNavigate();

  // Play sound on new request (only once)
  useEffect(() => {
    if (isConnected) {
      const audio = new Audio("https://cdn.jsdelivr.net/gh/gleitz/termly-sounds/notification.mp3");
      audio.play().catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const request = appState.requestQueue?.[0];

  const isBusy = (() => {
    const activeJobs = appState.providerRequests.filter((r: any) => 
      ["assigned", "in_progress", "on_the_way", "arrived", "payment_pending"].includes(r.status)
    );

    if (activeJobs.length === 0) return false;
    if (!request) return false;

    // Compute request timestamp
    let reqTimeMs = Date.now();
    if (request.date && request.time) {
      reqTimeMs = new Date(getAbsoluteIsoTimestamp(request.date, request.time)).getTime();
    } else if (request.scheduled_at) {
      reqTimeMs = new Date(request.scheduled_at).getTime();
    }

    const now = new Date();
    
    // If request is scheduled for tomorrow or greater -> allow
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime();
    if (reqTimeMs >= tomorrow) {
      return false;
    }

    // Check if the request conflicts with any active job
    for (const job of activeJobs) {
      let jobTimeMs = now.getTime();
      if (job.date && job.time) {
        jobTimeMs = new Date(getAbsoluteIsoTimestamp(job.date, job.time)).getTime();
      } else if (job.scheduled_at) {
        jobTimeMs = new Date(job.scheduled_at).getTime();
      }

      // If the active job is scheduled for tomorrow or later, it shouldn't block today's request
      if (jobTimeMs >= tomorrow) {
        continue;
      }

      // Difference in hours
      const hoursDiff = Math.abs(reqTimeMs - jobTimeMs) / (1000 * 60 * 60);

      // If it's less than 3 hours from the active job, block it
      if (hoursDiff < 3) {
        return true;
      }
    }

    // No conflicts
    return false;
  })();

  useEffect(() => {
    if (isBusy && request) {
      appState.dispatch({ type: "DEQUEUE_REQUEST" });
    }
  }, [isBusy, request, appState]);

  if (!request || isBusy) return null;

  const isBroadcast = !!request.broadcastId;

  const handleAccept = () => {
    if (appState.isFrozen) {
      toast.error("Clear your commission due to provide a quote.");
      return;
    }

    if (isBroadcast) {
      if (appState.setQuotingBroadcast) {
        appState.setQuotingBroadcast(request);
      }
      appState.dispatch({ type: "DEQUEUE_REQUEST" });
    } else {
      console.log("[SOCKET] [PROVIDER ACCEPTED] Booking ID:", request.id);
      socket.emit("update_job_status", { jobId: request.id, status: "accepted" });
      appState.dispatch({ type: "ACCEPT_REQUEST", id: request.id });
      appState.dispatch({ type: "DEQUEUE_REQUEST" });
      navigate(`/provider/job/${request.id}`);
    }
  };

  const handleReject = () => {
    if (isBroadcast) {
      appState.dispatch({ type: "DEQUEUE_REQUEST" });
    } else {
      console.log("[SOCKET] [PROVIDER REJECTED] Booking ID:", request.id);
      appState.dispatch({ type: "REJECT_REQUEST", id: request.id });
      appState.dispatch({ type: "DEQUEUE_REQUEST" });
    }
  };

  return (
    <IncomingRequestPopup
      request={request}
      isBroadcast={isBroadcast}
      isBusy={isBusy}
      onAccept={handleAccept}
      onReject={handleReject}
    />
  );
};

export default GlobalIncomingRequestPopup;
