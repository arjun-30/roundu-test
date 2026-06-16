import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./styles/background.css";

if (typeof window !== 'undefined') {
  (window as any).__logs = (window as any).__logs || [];
  const originalLog = console.log;
  console.log = (...args) => {
    (window as any).__logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '));
    originalLog.apply(console, args);
  };
}

createRoot(document.getElementById("root")!).render(<App />);
