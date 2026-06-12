"use client";

import { useEffect } from "react";
import { syncOfflineTransactions } from "@/lib/offline-db";

export default function PwaRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    const handleOnline = () => {
      syncOfflineTransactions().catch(() => {});
    };

    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, []);

  return null;
}
