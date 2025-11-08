"use client";
import Link from "next/link";
import { AppBar, Toolbar, Button, Typography } from "@mui/material";
import { useAtom } from "jotai";
import { authAtom } from "@/atoms/authAtom";
import { clearAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";

export default function NavBar() {
  const router = useRouter();
  const [auth, setAuth] = useAtom(authAtom);

  const logout = () => {
    clearAuth();
    setAuth({ token: null, role: null, email: null });
    router.replace("/login");
  };

  //console.log("Auth state:", auth);

  return (
    <AppBar position="static" sx={{ mb: 2 }}>
      <Toolbar>
        <Typography sx={{ flex: 1 }}>
          <Link href="/dashboard">Event Managememt</Link>
        </Typography>
        <Button color="inherit" component={Link} href="/events">
          Events
        </Button>
        <Button color="inherit" component={Link} href="/speakers">
          Speakers
        </Button>
        <Button color="inherit" component={Link} href="/rooms">
          Rooms
        </Button>
        <Button color="inherit" component={Link} href="/attendees">
          Attendees
        </Button>
        <Button color="inherit" component={Link} href="/uploader">
          Uploads
        </Button>
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
