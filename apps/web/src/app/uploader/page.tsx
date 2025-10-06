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

export default function UploaderDashboard() {
  const [search, setSearch] = useState("");
  const [result, setResult] = useState<any>(null);

  const handleSearch = async () => {
    // Call backend API: /api/delegates?name=${search}
    const res = await fetch(
      `/api/delegates?name=${encodeURIComponent(search)}`
    );
    if (res.ok) {
      setResult(await res.json());
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
