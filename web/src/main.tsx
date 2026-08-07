import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

let visitorId = localStorage.getItem('demo-visitor-id');
if (!visitorId) {
  visitorId = 'visitor-' + Math.random().toString(36).slice(2);
  localStorage.setItem('demo-visitor-id', visitorId);
}
pendo.initialize({
  visitor: {
    id: visitorId,
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
