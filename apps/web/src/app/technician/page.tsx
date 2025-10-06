"use client";

import { Typography, Grid, Card, CardContent, Button } from "@mui/material";
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
        <Grid container spacing={2}>
          {tiles.map((t) => (
            <Grid key={t.title} item xs={12} sm={6} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6">{t.title}</Typography>
                  <Button href={t.href} variant="outlined">
                    Open
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </div>
    </div>
  );
}
