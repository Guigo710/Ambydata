import { QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import ReactDOM from "react-dom/client";
import './i18n'   // antes do render do <App />
import App from "./App";
import { AuthProvider } from "./auth/AuthContext";
import { criarQueryClient } from "./services/queryClient";
import "./index.css";

const queryClient = criarQueryClient();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
