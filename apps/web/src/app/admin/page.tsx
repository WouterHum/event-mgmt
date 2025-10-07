"use client";

import { Stack, Card, CardContent, Button, Typography } from "@mui/material";
import NavBar from "../components/NavBar";

interface Tile {
  title: string;
  href: string;
}

export default function AdminDashboard() {
  const tiles: Tile[] = [
    { title: "Manage Events", href: "/events" },
    { title: "Manage Speakers", href: "/speakers" },
    { title: "Manage Rooms", href: "/rooms" },
    { title: "Manage Attendees", href: "/attendees" },
    { title: "Manage Uploads", href: "/uploader" },
  ];

  return (
    <div>
      <NavBar />
      <div className="p-6">
        <Typography variant="h4" className="mb-6">
          Admin Dashboard
        </Typography>
        <Stack direction="row" spacing={2} flexWrap="wrap">
          {tiles.map(tile => (
            <Card
              key={tile.title}
              sx={{
                width: { xs: '100%', sm: '48%', md: '30%' },
                mb: 2
              }}
            >
              <CardContent>
                <Typography variant="h6">{tile.title}</Typography>
                <Button href={tile.href} variant="outlined">Open</Button>
              </CardContent>
            </Card>
          ))}
        </Stack>
      </div>
    </div>
  );
}
