"use client";

import { Typography, Stack, Card, CardContent } from "@mui/material";
import NavBar from "../components/NavBar";
import EventViewerDashboard from "./event/page"; // import your component

export default function ClientDashboard() {
  return (
    <div>
      <NavBar />
      <div className="p-6">
        <Typography variant="h4" className="mb-6">
          Client Dashboard
        </Typography>

        <Stack direction="row" spacing={2} flexWrap="wrap">
          {/* Render EventViewerDashboard directly */}
          <Card
            sx={{
              width: { xs: "100%", sm: "48%", md: "100%" }, // full width for dashboard
              mb: 2,
            }}
          >
            <CardContent>
              <EventViewerDashboard />
            </CardContent>
          </Card>
        </Stack>
      </div>
    </div>
  );
}
