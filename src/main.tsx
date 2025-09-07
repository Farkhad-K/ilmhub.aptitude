// src/main.tsx
import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./styles/app.css";
import "./i18n"; // initialize i18n (loads your src/locales/* JSONs)
import { ensureAnonymousAuth } from './firebase';

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);

ensureAnonymousAuth()
  .then(() => console.log('ensureAnonymousAuth: ok'))
  .catch(e => console.warn('ensureAnonymousAuth failed at startup', e));
