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
import { apiGet } from "@/lib/api"; // typed API wrapper

// Define Speaker type
interface Speaker {
  id: number;
  name: string;
  email: string;
}

export default function SpeakersPage() {
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [message, setMessage] = useState<string>("");

  const fetchSpeakers = async () => {
    try {
      const data = await apiGet<Speaker[]>("/api/speakers");
      setSpeakers(data);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setMessage(err.message);
      } else {
        setMessage("An unexpected error occurred");
      }
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
