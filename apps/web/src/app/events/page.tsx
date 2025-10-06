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
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  DialogActions,
} from "@mui/material";
import NavBar from "../components/NavBar";
import { useAuthGuard } from "@/lib/useAuthGuard";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api";

export default function EventsPage() {
  const auth = useAuthGuard();
  const [events, setEvents] = useState<any[]>([]);
  const [message, setMessage] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);

  const [form, setForm] = useState({
    title: "",
    description: "",
    start_time: "",
    end_time: "",
    location: "",
  });

  const loadEvents = async () => {
    try {
      const data = await apiGet("/api/events");
      setEvents(data);
    } catch (err: any) {
      setMessage(err.message);
    }
  };

   useEffect(() => {
    if (auth.ready && auth.token) {
      loadEvents();
    }
  }, [auth.ready, auth.token]);

  const handleOpen = (event?: any) => {
    if (event) {
      setEditing(event);
      setForm(event);
    } else {
      setEditing(null);
      setForm({ title: "", description: "", start_time: "", end_time: "", location: "" });
    }
    setOpen(true);
  };

  const handleSave = async () => {
    try {
      if (editing) {
        await apiPut(`/api/events/${editing.id}`, form);
      } else {
        await apiPost("/api/events", form);
      }
      setOpen(false);
      loadEvents();
    } catch (err: any) {
      setMessage(err.message);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await apiDelete(`/api/events/${id}`);
      loadEvents();
    } catch (err: any) {
      setMessage(err.message);
    }
  };

  return (
    <div>
      <NavBar />
      <div className="p-6">
        <Typography variant="h4" className="mb-4">
          Events
        </Typography>
        <Button variant="contained" color="primary" className="mb-4" onClick={() => handleOpen()}>
          Add Event
        </Button>
        <Card>
          <CardContent>
            <List>
              {events.length > 0 ? (
                events.map((evt) => (
                  <ListItem key={evt.id} divider>
                    <ListItemText
                      primary={evt.title}
                      secondary={`${evt.start_time} @ ${evt.location}`}
                    />
                    <Button size="small" onClick={() => handleOpen(evt)}>
                      Edit
                    </Button>
                    <Button size="small" color="error" onClick={() => handleDelete(evt.id)}>
                      Delete
                    </Button>
                  </ListItem>
                ))
              ) : (
                <Typography>No events found.</Typography>
              )}
            </List>
            {message && <Typography color="error">{message}</Typography>}
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editing ? "Edit Event" : "Add Event"}</DialogTitle>
        <DialogContent className="flex flex-col gap-4 mt-2">
          <TextField
            label="Title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            fullWidth
          />
          <TextField
            label="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            fullWidth
          />
          <TextField
            label="Start Time"
            type="datetime-local"
            value={form.start_time}
            onChange={(e) => setForm({ ...form, start_time: e.target.value })}
            fullWidth
          />
          <TextField
            label="End Time"
            type="datetime-local"
            value={form.end_time}
            onChange={(e) => setForm({ ...form, end_time: e.target.value })}
            fullWidth
          />
          <TextField
            label="Location"
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            fullWidth
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
