"use client";

import { useEffect } from "react";
import { useSetAtom } from "jotai";
import { authAtom } from "@/lib/auth";
import { loadAuth } from "@/lib/api";

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const setAuth = useSetAtom(authAtom);

  useEffect(() => {
    const saved = loadAuth();
    if (saved) setAuth(saved);
  }, [setAuth]);

  return <>{children}</>;
}
