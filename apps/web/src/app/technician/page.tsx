"use client";

import { Typography, Stack, Card, CardContent, Button } from "@mui/material";
import NavBar from "../components/NavBar";

export default function TechnicianDashboard() {
  const tiles = [
    { title: "Room Configs", href: "/rooms" },
    { title: "Workstations", href: "/workstations" },
    { title: "Attendee Stations", href: "/attendees" },
    { title: "Presentation Peripherals", href: "/peripherals/presentation" },
    { title: "Connectivity Peripherals", href: "/peripherals/connectivity" },
  ];

  return (
    <div>
      <NavBar />
      <div className="p-6">
        <Typography variant="h4" className="mb-6">
          Technician Dashboard
        </Typography>

        <Stack direction="row" spacing={2} flexWrap="wrap">
          {tiles.map((t) => (
            <Card
              key={t.title}
              sx={{
                width: { xs: "100%", sm: "48%", md: "30%" },
                mb: 2,
              }}
            >
              <CardContent className="flex flex-col gap-4">
                <Typography variant="h6">{t.title}</Typography>
                <Button href={t.href} variant="outlined">
                  Open
                </Button>
              </CardContent>
            </Card>
          ))}
        </Stack>
      </div>
    </div>
  );
}
