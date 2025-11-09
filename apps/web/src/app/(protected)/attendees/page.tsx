"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from "@mui/material";
import { validateFields } from "@/lib/validation";

interface Attendee {
  id?: number;
  name: string;
  email: string;
}

export default function AttendeesPage() {
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Attendee | null>(null);
  const [form, setForm] = useState<Attendee>({ name: "", email: "" });
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});

  const load = async () => {
    const data = await apiGet<Attendee[]>("/api/attendees/");
    setAttendees(data);
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    try {
      // validate inline
      const fieldErrors = validateAttendee(form);
      setErrors(fieldErrors);

      // stop if there are errors
      if (Object.keys(fieldErrors).length > 0) return;

      const payload = {
        name: form.name,
        email: form.email,
      };

      let created;
      if (editing && editing.id) {
        created = await apiPut(`/api/attendees/${editing.id}`, payload);
      } else {
        created = await apiPost("/api/attendees/", payload);
      }

      console.log("API response (save):", created);

      await load();
      setOpen(false);
      setEditing(null);
      setForm({ name: "", email: "" });
    } catch (err) {
      console.error("Failed to save attendee:", err);
      alert("Save failed — check console for details.");
    }
  };

  const remove = async (id?: number) => {
    if (!id) return;
    await apiDelete(`/api/attendees/${id}`);
    load();
  };

  function validateAttendee(attendee: { name: string; email: string }) {
    const errors: { name?: string; email?: string } = {};

    if (!attendee.name || attendee.name.trim() === "") {
      errors.name = "Name is required";
    }

    if (!attendee.email || attendee.email.trim() === "") {
      errors.email = "Email is required";
    } else if (!/^\S+@\S+\.\S+$/.test(attendee.email)) {
      errors.email = "Email is invalid";
    }

    return errors;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Attendees</h1>
        <p className="page-subtitle">Add, update, or delete event attendees</p>
      </div>

      <div className="my-4 flex flex-wrap gap-3">
        <button
          onClick={() => {
            setEditing(null);
            setForm({ name: "", email: "" });
            setOpen(true);
          }}
          className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium shadow-sm hover:bg-primary/90 transition-all"
        >
          + Add Attendee
        </button>
      </div>

      <div className="modern-card mt-4 border border-gray-200 rounded-xl">
        {attendees.length === 0 ? (
          <p className="text-gray-500 text-center py-6">No attendees found</p>
        ) : (
          <ul>
            {attendees.map((a, idx) => (
              <li
                key={a.id}
                className={`flex justify-between items-center py-3 px-4 ${
                  idx !== attendees.length - 1 ? "border-b border-gray-200" : ""
                }`}
              >
                <div>
                  <p className="font-semibold text-gray-800">{a.name}</p>
                  <p className="text-sm text-gray-500">{a.email}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditing(a);
                      setForm({ name: a.name, email: a.email });
                      setOpen(true);
                    }}
                    className="px-3 py-1.5 rounded-lg font-semibold bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-200 transition"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => remove(a.id)}
                    className="px-3 py-1.5 rounded-lg font-semibold bg-red-100 text-red-700 hover:bg-red-200 border border-red-200 transition"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Dialog */}
      <Dialog
        open={open}
        onClose={() => {
          setOpen(false);
          setEditing(null);
          setForm({ name: "", email: "" });
        }}
        fullWidth
        slotProps={{
          backdrop: {
            className: "backdrop-blur-sm bg-black/30",
          },
        }}
        PaperProps={{
          className:
            "bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 !m-4",
        }}
      >
        <DialogTitle className="font-semibold text-xl border-b border-gray-200 py-3">
          {editing ? "Edit Attendee" : "Add Attendee"}
        </DialogTitle>

        <DialogContent className="space-y-4 py-5">
          <TextField
            fullWidth
            label="Name"
            value={form.name}
            onChange={(e) => {
              const name = e.target.value;
              setForm({ ...form, name });
              setErrors(validateAttendee({ ...form, name })); // real-time
            }}
            error={!!errors.name}
            helperText={errors.name}
          />
          <TextField
            fullWidth
            label="Email"
            value={form.email}
            onChange={(e) => {
              const email = e.target.value;
              setForm({ ...form, email });
              setErrors(validateAttendee({ ...form, email })); // real-time
            }}
            error={!!errors.email}
            helperText={errors.email}
          />
        </DialogContent>

        <DialogActions className="flex justify-end gap-3 p-4 border-t border-gray-200">
          <button
            onClick={() => {
              setOpen(false);
              setEditing(null);
            }}
            className="px-4 py-2 rounded-md border border-gray-300 text-sm text-gray-700 bg-white hover:bg-gray-100 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={save}
            className="px-4 py-2 rounded-md text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 transition-all shadow-sm"
          >
            Save
          </button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
