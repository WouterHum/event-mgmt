"use client";

import { useAuthGuard } from "@/lib/useAuthGuard";
import NavBar from "../components/NavBar";
import { usePathname } from "next/navigation";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { token, role, loaded } = useAuthGuard();
  const pathname = usePathname();

  if (loaded) return <div>Loading...</div>;
  if (!token) return null; // Redirect handled by the guard

  console.log(`✅ Authenticated user: ${role} on ${pathname}`);

  return (
    <div>
      <NavBar />
      <main className="p-6">{children}</main>
    </div>
  );
}
