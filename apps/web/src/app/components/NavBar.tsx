"use client";

import Link from "next/link";
import { AppBar, Toolbar, Button, Typography, Chip } from "@mui/material";
import { useAtom } from "jotai";
import { authAtom } from "@/atoms/authAtom";
import { clearAuth } from "@/lib/auth";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { atom } from "jotai";
import { useEffect } from "react";
import { apiGet } from "@/lib/api";

// Global atom to track the currently selected event
export const selectedEventAtom = atom<{ id: number; title: string } | null>(null);

const STORAGE_KEY = "selectedEvent";

const rolePermissions: Record<string, string[]> = {
  admin: ["events", "speakers", "rooms", "uploads"],
  technician: ["uploads"],
  client: ["events", "speakers"],
  uploader: ["uploads"],
};

const eventScopedItems = [
  { title: "Speakers", key: "speakers", permission: "speakers" },
  { title: "Rooms", key: "rooms", permission: "rooms" },
  { title: "Uploads", key: "uploads", permission: "uploads" },
];

export default function NavBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [auth, setAuth] = useAtom(authAtom);
  const [selectedEvent, setSelectedEvent] = useAtom(selectedEventAtom);

  // Rehydrate selected event from URL or localStorage on every navigation
  useEffect(() => {
    const eventIdFromUrl = searchParams.get("eventId");

    if (eventIdFromUrl) {
      const eventId = Number(eventIdFromUrl);

      // Already loaded
      if (selectedEvent?.id === eventId) return;

      // Try localStorage first — instant, no flicker
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.id === eventId) {
            setSelectedEvent(parsed);
            return;
          }
        }
      } catch {
        // ignore
      }

      // Fetch from API to get the title
      apiGet<{ id: number; title: string }>(`/api/events/${eventId}`)
        .then((event) => {
          const selected = { id: event.id, title: event.title };
          setSelectedEvent(selected);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(selected));
        })
        .catch(() => {
          setSelectedEvent({ id: eventId, title: `Event ${eventId}` });
        });

    } else if (pathname === "/events") {
      // Clear when navigating back to events list
      setSelectedEvent(null);
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [searchParams, pathname]);

  // Persist to localStorage whenever atom changes
  useEffect(() => {
    if (selectedEvent) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedEvent));
    }
  }, [selectedEvent]);

  const logout = () => {
    clearAuth();
    setAuth({ token: null, role: null, email: null });
    setSelectedEvent(null);
    localStorage.removeItem(STORAGE_KEY);
    router.replace("/login");
  };

  const role = auth.role ?? "";
  const allowed = rolePermissions[role] ?? [];

  const buildHref = (key: string) => {
    if (!selectedEvent) return "/events";
    switch (key) {
      case "speakers": return `/speakers-management?eventId=${selectedEvent.id}`;
      case "rooms":    return `/rooms?eventId=${selectedEvent.id}`;
      case "uploads":  return `/uploader?eventId=${selectedEvent.id}`;
      default:         return "/events";
    }
  };

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href.split("?")[0]);

  return (
    <AppBar position="static" sx={{ mb: 2 }}>
      <Toolbar sx={{ gap: 1 }}>
        <Typography sx={{ flex: 1 }}>
          <Link href="/events" style={{ color: "inherit", textDecoration: "none", fontWeight: 600 }}>
            Event Management
          </Link>
        </Typography>

        {/* Always visible: Events */}
        {allowed.includes("events") && (
          <Button
            color="inherit"
            component={Link}
            href="/events"
            sx={{
              fontWeight: isActive("/events") ? 700 : 400,
              borderBottom: isActive("/events") ? "2px solid white" : "none",
            }}
          >
            Events
          </Button>
        )}

        {/* Event-scoped tabs — visible whenever an event is active */}
        {selectedEvent && (
          <>
            <Chip
              label={selectedEvent.title}
              size="small"
              sx={{
                bgcolor: "rgba(255,255,255,0.2)",
                color: "white",
                fontWeight: 600,
                mr: 1,
                maxWidth: 200,
              }}
            />
            {eventScopedItems
              .filter((item) => allowed.includes(item.permission))
              .map((item) => {
                const href = buildHref(item.key);
                return (
                  <Button
                    key={item.key}
                    color="inherit"
                    component={Link}
                    href={href}
                    sx={{
                      fontWeight: isActive(href.split("?")[0]) ? 700 : 400,
                      borderBottom: isActive(href.split("?")[0]) ? "2px solid white" : "none",
                    }}
                  >
                    {item.title}
                  </Button>
                );
              })}
          </>
        )}

        {auth.token ? (
          <Button color="inherit" onClick={logout}>Logout</Button>
        ) : (
          <Button color="inherit" component={Link} href="/login">Login</Button>
        )}
      </Toolbar>
    </AppBar>
  );
}