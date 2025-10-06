"use client";

import Link from "next/link";
import { AppBar, Toolbar, Typography, Button } from "@mui/material";

export default function NavBar() {
  return (
    <AppBar position="static">
      <Toolbar className="flex justify-between">
        <Typography variant="h6">Event Management</Typography>
        <div className="flex gap-4">
          <Button color="inherit" component={Link} href="/dashboard">
            Dashboard
          </Button>
          <Button color="inherit" component={Link} href="/uploader">
            Upload Files
          </Button>
        </div>
      </Toolbar>
    </AppBar>
  );
}
