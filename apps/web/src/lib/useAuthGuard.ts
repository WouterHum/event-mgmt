"use client";

import { useAtom } from "jotai";
import { useEffect, useState } from "react";
import { authAtom } from "./auth";
import { loadAuth } from "./api";

export function useAuthGuard() {
  const [auth, setAuth] = useAtom(authAtom);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!auth.token) {
      const saved = loadAuth();
      if (saved) {
        setAuth(saved); // ✅ hydrate from localStorage
        setReady(true);
        return;
      }

      // no saved session, force login
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    } else {
      setReady(true);
    }
  }, [auth.token, setAuth]);

  return { ...auth, ready };
}
