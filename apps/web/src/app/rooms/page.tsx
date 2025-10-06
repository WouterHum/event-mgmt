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

export default function RoomsPage() {
  const [rooms, setRooms] = useState<any[]>([]);
  const [message, setMessage] = useState("");

  const fetchRooms = async () => {
    const token = localStorage.getItem("token");
    if (!token) return setMessage("Not logged in");

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/rooms`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load rooms");
      setRooms(await res.json());
    } catch (err: any) {
      setMessage(err.message);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  return (
    <div>
      <NavBar />
      <div className="p-6">
        <Typography variant="h4" className="mb-4">
          Rooms
        </Typography>
        <Button variant="contained" color="primary" className="mb-4">
          Add Room
        </Button>
        <Card>
          <CardContent>
            <List>
              {rooms.length > 0 ? (
                rooms.map((rm) => (
                  <ListItem key={rm.id} divider>
                    <ListItemText
                      primary={rm.name}
                      secondary={`Capacity: ${rm.capacity}`}
                    />
                    <Button size="small">Edit</Button>
                    <Button size="small" color="error">
                      Delete
                    </Button>
                  </ListItem>
                ))
              ) : (
                <Typography>No rooms found.</Typography>
              )}
            </List>
            {message && <Typography color="error">{message}</Typography>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
