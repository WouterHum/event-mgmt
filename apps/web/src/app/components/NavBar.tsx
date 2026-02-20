"use client";

import Link from "next/link";
import { AppBar, Toolbar, Button, Typography } from "@mui/material";
import { useAtom } from "jotai";
import { authAtom } from "@/atoms/authAtom";
import { clearAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";

// Define permissions for each role
const rolePermissions: Record<string, string[]> = {
  admin: ["events", "speakers", "rooms", "attendees", "uploads"],
  technician: ["uploads"],
  client: ["events", "speakers"],
  uploader: ["uploads"],
};

// Define nav items with required permission
const navItems = [
  { title: "Events", href: "/events", permission: "events" },
  { title: "Speakers", href: "/speakers", permission: "speakers" },
  { title: "Rooms", href: "/rooms", permission: "rooms" },
  { title: "Attendees", href: "/attendees", permission: "attendees" },
  { title: "Uploads", href: "/uploader", permission: "uploads" },
];

export default function NavBar() {
  const router = useRouter();
  const [auth, setAuth] = useAtom(authAtom);

  const logout = () => {
    clearAuth();
    setAuth({ token: null, role: null, email: null });
    router.replace("/login");
  };

  const role = auth.role ?? "";
  const allowedItems = navItems.filter((item) =>
    rolePermissions[role]?.includes(item.permission),
  );

  return (
    <AppBar position="static" sx={{ mb: 2 }}>
      <Toolbar>
        <Typography sx={{ flex: 1 }}>
          <Link
            href="/dashboard"
            style={{ color: "inherit", textDecoration: "none" }}
          >
            Event Management
          </Link>
        </Typography>

        {allowedItems.map((item) => (
          <Button
            key={item.title}
            color="inherit"
            component={Link}
            href={item.href}
          >
            {item.title}
          </Button>
        ))}

        {auth.token ? (
          <Button color="inherit" onClick={logout}>
            Logout
          </Button>
        ) : (
          <Button color="inherit" component={Link} href="/login">
            Login
          </Button>
        )}
      </Toolbar>
    </AppBar>
  );
}
