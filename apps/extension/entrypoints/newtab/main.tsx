import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "@/src/App";
import "./style.css";

// Default to dark on first paint (the theme pref corrects this once loaded),
// so there's no light flash before React mounts.
document.documentElement.classList.add("dark");
document.documentElement.style.backgroundColor = "#09090b";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
