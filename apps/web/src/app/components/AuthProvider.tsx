"use client";

import { useEffect } from "react";
import { useSetAtom } from "jotai";
import { loadAuth, clearAuth, isTokenExpired } from "@/lib/auth";
import { authAtom } from "@/atoms/authAtom"; 

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const setAuth = useSetAtom(authAtom);

  useEffect(() => {
    const saved = loadAuth();

    // if token exists but expired, clear it
    if (saved.token && isTokenExpired(saved.token)) {
      clearAuth();
      setAuth({ token: null, role: null, email: null, loaded: true });
    } else {
      setAuth(saved);
    }
  }, [setAuth]);

  return <>{children}</>;
}
