import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/context/AppContext";
import { useSocket } from "@/context/SocketProvider";
import IncomingRequestPopup from "@/components/IncomingRequestPopup";

const GlobalIncomingRequestPopup = () => {
  const { state, dispatch } = useApp();
  const { socket, isConnected } = useSocket();
  const navigate = useNavigate();

  const request = state.requestQueue[0];
  if (!request) return null;

  const isBroadcast = !!(request as any).broadcastId;

  // Play sound on new request (only once)
  useEffect(() => {
    if (isConnected) {
      const audio = new Audio("https://cdn.jsdelivr.net/gh/gleitz/termly-sounds/notification.mp3");
      audio.play().catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAccept = () => {
    if (isBroadcast) {
      // For broadcast, open quoting modal (handled elsewhere)
      // Dispatch to set quoting broadcast via existing state
      // Assuming AppContext has setQuotingBroadcast setter in context value
      // We'll call dispatch indirectly via a custom action
      dispatch({ type: "SET_QUOTING_BROADCAST", request }); // custom placeholder if needed
    } else {
      console.log("[SOCKET] [PROVIDER ACCEPTED] Booking ID:", request.id);
      socket.emit("update_job_status", { jobId: request.id, status: "accepted" });
      dispatch({ type: "ACCEPT_REQUEST", id: request.id });
      dispatch({ type: "DEQUEUE_REQUEST" });
      navigate(`/provider/job/${request.id}`);
    }
  };

  const handleReject = () => {
    console.log("[SOCKET] [PROVIDER REJECTED] Booking ID:", request.id);
    dispatch({ type: "REJECT_REQUEST", id: request.id });
    dispatch({ type: "DEQUEUE_REQUEST" });
  };

  return (
    <IncomingRequestPopup
      request={request}
      isBroadcast={isBroadcast}
      isBusy={state.providerRequests.some((r) => ["in_progress", "on_the_way", "arrived", "payment_pending"].includes(r.status))}
      onAccept={handleAccept}
      onReject={handleReject}
    />
  );
};

export default GlobalIncomingRequestPopup;
