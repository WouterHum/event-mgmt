"use client";

import { useEffect, useState } from "react";
import {
  Typography,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  Button,
} from "@mui/material";
import NavBar from "../components/NavBar";

export default function SpeakersPage() {
  const [speakers, setSpeakers] = useState<any[]>([]);
  const [message, setMessage] = useState("");

  const fetchSpeakers = async () => {
    const token = localStorage.getItem("token");
    if (!token) return setMessage("Not logged in");

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/speakers`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!res.ok) throw new Error("Failed to load speakers");
      setSpeakers(await res.json());
    } catch (err: any) {
      setMessage(err.message);
    }
  };

  useEffect(() => {
    fetchSpeakers();
  }, []);

  return (
    <div>
      <NavBar />
      <div className="p-6">
        <Typography variant="h4" className="mb-4">
          Speakers
        </Typography>
        <Button variant="contained" color="primary" className="mb-4">
          Add Speaker
        </Button>
        <Card>
          <CardContent>
            <List>
              {speakers.length > 0 ? (
                speakers.map((sp) => (
                  <ListItem key={sp.id} divider>
                    <ListItemText primary={sp.name} secondary={sp.email} />
                    <Button size="small">Edit</Button>
                    <Button size="small" color="error">
                      Delete
                    </Button>
                  </ListItem>
                ))
              ) : (
                <Typography>No speakers found.</Typography>
              )}
            </List>
            {message && <Typography color="error">{message}</Typography>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
