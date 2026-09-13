import "./theme.css";
import "@xyflow/react/dist/style.css";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { DagmarProvider } from "./dagmar/DagmarProvider.tsx";
import { App } from "./App.tsx";

// No StrictMode: it double-invokes effects in dev, which would open/close the
// Dagmar WebSocket twice.
createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <DagmarProvider>
      <App />
    </DagmarProvider>
  </BrowserRouter>,
);
