import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./auth/AuthContext";
import "./index.css";
import { Toaster } from "react-hot-toast";
import { FeatureFlagProvider } from "./components/FeatureFlagContext";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <FeatureFlagProvider>
          <App />
          <Toaster position="top-right" reverseOrder={false} />
        </FeatureFlagProvider>
      </BrowserRouter>
    </AuthProvider>
  </React.StrictMode>,
);
