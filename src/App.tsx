// src/App.tsx
import React, { useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Test from "./pages/Test";
import Result from "./pages/Result";
import { telegram } from "./services/telegram";
import "./styles/app.css";

export default function App() {
  useEffect(() => {
    // initialize Telegram SDK like Blazor's TelegramService.InitializeAsync()
    telegram.ready().catch(() => {});
  }, []);

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/test" element={<Test />} />
      <Route path="/result/:key" element={<Result />} />
    </Routes>
  );
}
