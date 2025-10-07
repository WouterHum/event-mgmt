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

// Define Room type
interface Room {
  id: number;
  name: string;
  capacity: number;
}

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [message, setMessage] = useState<string>("");

  const fetchRooms = async () => {
    try {
      const data = await apiGet<Room[]>("/api/rooms");
      setRooms(data);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setMessage(err.message);
      } else {
        setMessage("An unexpected error occurred");
      }
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
