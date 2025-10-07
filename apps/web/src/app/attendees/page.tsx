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
import { apiGet } from "@/lib/api"; // use the typed API wrapper

// Define Attendee type
interface Attendee {
  id: number;
  name: string;
  email: string;
}

export default function AttendeesPage() {
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [message, setMessage] = useState<string>("");

  const fetchAttendees = async () => {
    try {
      const data = await apiGet<Attendee[]>("/api/attendees");
      setAttendees(data);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setMessage(err.message);
      } else {
        setMessage("An unexpected error occurred");
      }
    }
  };

  useEffect(() => {
    fetchAttendees();
  }, []);

  return (
    <div>
      <NavBar />
      <div className="p-6">
        <Typography variant="h4" className="mb-4">
          Attendees
        </Typography>
        <Button variant="contained" color="primary" className="mb-4">
          Add Attendee
        </Button>
        <Card>
          <CardContent>
            <List>
              {attendees.length > 0 ? (
                attendees.map((a) => (
                  <ListItem key={a.id} divider>
                    <ListItemText primary={a.name} secondary={a.email} />
                    <Button size="small">Edit</Button>
                    <Button size="small" color="error">
                      Delete
                    </Button>
                  </ListItem>
                ))
              ) : (
                <Typography>No attendees found.</Typography>
              )}
            </List>
            {message && <Typography color="error">{message}</Typography>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
