"use client";

import { useEffect } from "react";
import { useAtom } from "jotai";
import { authAtom } from "@/lib/auth";

export default function Dashboard() {
  const [auth] = useAtom(authAtom);

  useEffect(() => {
    if (!auth.token) {
      window.location.href = "/login";
      return;
    }

    switch (auth.role) {
      case "admin":
        window.location.href = "/admin";
        break;
      case "technician":
        window.location.href = "/technician";
        break;
      case "client":
        window.location.href = "/client";
        break;
      case "uploader":
        window.location.href = "/uploader";
        break;
      default:
        window.location.href = "/login";
    }
  }, [auth]);

  return null; // nothing to render, acts as a redirect page
}
