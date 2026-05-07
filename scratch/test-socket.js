import { io } from "socket.io-client";

const socket = io("https://roundu-app-production.up.railway.app", {
  transports: ["polling", "websocket"],
});

socket.on("connect", () => {
  console.log("Connected to Railway Socket with ID:", socket.id);
  
  socket.emit("broadcast_job", {
    broadcastId: "test-bc-1",
    customerId: "test-cust",
    customerName: "Test Customer",
    serviceId: "plumber",
    address: "Test Location",
    date: "2026-05-07",
    time: "10:00 AM",
    notes: "Test Notes"
  });
  console.log("Emitted broadcast_job");
});

socket.on("incoming_broadcast", (data) => {
  console.log("Received incoming_broadcast:", data);
  process.exit(0);
});

socket.on("connect_error", (err) => {
  console.error("Connection Error:", err.message);
});

setTimeout(() => {
  console.log("Timeout waiting for broadcast");
  process.exit(1);
}, 10000);
