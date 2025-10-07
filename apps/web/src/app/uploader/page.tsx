"use client";

import {
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
} from "@mui/material";
import NavBar from "../components/NavBar";
import { useState } from "react";

// Define Delegate type
interface Delegate {
  id: number;
  name: string;
  session_title: string;
  venue: string;
  time: string;
  // Add other fields if needed
}

export default function UploaderDashboard() {
  const [search, setSearch] = useState<string>("");
  const [result, setResult] = useState<Delegate | null>(null);

  const handleSearch = async () => {
    try {
      const res = await fetch(
        `/api/delegates?name=${encodeURIComponent(search)}`
      );
      if (!res.ok) throw new Error("Failed to fetch delegate");

      const data: Delegate = await res.json();
      setResult(data);
    } catch (err: unknown) {
      console.error(err);
      setResult(null);
    }
  };

  return (
    <div>
      <NavBar />
      <div className="p-6">
        <Typography variant="h4" className="mb-6">
          Uploader Dashboard
        </Typography>
        <Card>
          <CardContent className="space-y-4">
            <TextField
              label="Search Delegate"
              fullWidth
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Button variant="contained" onClick={handleSearch}>
              Search
            </Button>

            {result && (
              <div className="mt-4 space-y-2">
                <Typography variant="h6">{result.name}</Typography>
                <Typography>Session: {result.session_title}</Typography>
                <Typography>Venue: {result.venue}</Typography>
                <Typography>Time: {result.time}</Typography>

                <input type="file" />
                <div>
                  <label>
                    <input type="checkbox" /> Has video
                  </label>
                  <label>
                    <input type="checkbox" /> Has audio
                  </label>
                  <label>
                    <input type="checkbox" /> Needs internet
                  </label>
                </div>
                <Button variant="outlined">Upload Presentation</Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
