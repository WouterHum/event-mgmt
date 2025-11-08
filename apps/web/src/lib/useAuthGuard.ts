"use client";

import { useEffect, useState } from "react";
import { useAtom } from "jotai";
import { authAtom, AuthState } from "@/atoms/authAtom";
import { loadAuth } from "@/lib/api"; 
import { useRouter } from "next/navigation";

export function useAuthGuard(): AuthState & { checked: boolean } {
  const [auth, setAuth] = useAtom(authAtom);
  const [checked, setChecked] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const stored = loadAuth();

    if (stored && stored.token) {
      setAuth({
        token: stored.token,
        role: stored.role ?? null,
        email: stored.email ?? null,
      });
      setChecked(true);
    } else {
      setAuth({ token: null, role: null, email: null });
      router.replace("/login");
      setChecked(true);
    }
  }, [setAuth, router]); // ✅ reruns if auth changes

  // ✅ NEW: redirect again if token is cleared after login
  useEffect(() => {
    if (checked && !auth.token) {
      router.replace("/login");
    }
  }, [auth.token, checked, router]);

  return { ...auth, checked };
}
