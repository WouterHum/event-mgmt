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
import { useAtom } from "jotai";
import { authAtom } from "@/atoms/authAtom";

interface Speaker {
  id?: number;
  name: string;
  email: string;
  bio: string;
}

export default function SpeakersPage() {
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Speaker | null>(null);
  const [form, setForm] = useState<Speaker>({ name: "", email: "", bio: "" });
  const [errors, setErrors] = useState<Partial<Record<keyof Speaker, string>>>(
    {},
  );
  const [auth] = useAtom(authAtom);
  const load = async () => {
    const data = await apiGet<Speaker[]>("/api/speakers/");
    setSpeakers(data);
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    // validate fields
    const fieldErrors = validateFields(form, ["name", "email"]);
    setErrors(fieldErrors);

    if (Object.keys(fieldErrors).length > 0) return; // stop save if errors

    // save via API
    if (editing && editing.id) {
      await apiPut(`/api/speakers/${editing.id}`, form);
    } else {
      await apiPost("/api/speakers/", form);
    }

    await load();
    setOpen(false);
    setEditing(null);
    setForm({ name: "", email: "", bio: "" });
  };

  const remove = async (id?: number) => {
    if (!id) return;
    await apiDelete(`/api/speakers/${id}`);
    load();
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Speakers</h1>
        <p className="page-subtitle">Add, update, or delete speakers</p>
      </div>

      <div className="my-4 flex flex-wrap gap-3">
        <button
          onClick={() => {
            setEditing(null);
            setForm({ name: "", email: "", bio: "" });
            setOpen(true);
          }}
          className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium shadow-sm hover:bg-primary/90 transition-all"
        >
          + Add Speaker
        </button>
      </div>

      <div className="modern-card mt-4 border border-gray-200 rounded-xl">
        {speakers.length === 0 ? (
          <p className="text-gray-500 text-center py-6">No speakers found</p>
        ) : (
          <ul>
            {speakers.map((s, idx) => (
              <li
                key={s.id}
                className={`flex justify-between items-center py-3 px-4 ${
                  idx !== speakers.length - 1 ? "border-b border-gray-200" : ""
                }`}
              >
                <div>
                  <p className="font-semibold text-gray-800">{s.name}</p>
                  <p className="text-sm text-gray-500">{s.email}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditing(s);
                      setForm({ name: s.name, email: s.email, bio: s.bio });
                      setOpen(true);
                    }}
                    className="px-3 py-1.5 rounded-lg font-semibold bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-200 transition"
                  >
                    Edit
                  </button>

                  {/* Only admins can delete */}
                  {auth.role === "admin" && (
                    <button
                      onClick={() => remove(s.id)}
                      className="px-3 py-1.5 rounded-lg font-semibold bg-red-100 text-red-700 hover:bg-red-200 border border-red-200 transition"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog
        open={open}
        onClose={() => {
          setOpen(false);
          setEditing(null);
          setForm({ name: "", email: "", bio: "" });
        }}
        fullWidth
        slotProps={{
          backdrop: { className: "backdrop-blur-sm bg-black/30" },
        }}
        PaperProps={{
          className:
            "bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 !m-4",
        }}
      >
        <DialogTitle className="font-semibold text-xl border-b border-gray-200 py-3">
          {editing ? "Edit Speaker" : "Add Speaker"}
        </DialogTitle>

        <DialogContent className="space-y-4 py-5">
          <TextField
            fullWidth
            label="Name"
            value={form.name}
            onChange={(e) => {
              const name = e.target.value;
              setForm({ ...form, name });
              setErrors(validateFields({ ...form, name }, ["name", "email"]));
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
              setErrors(validateFields({ ...form, email }, ["name", "email"]));
            }}
            error={!!errors.email}
            helperText={errors.email}
          />
          <TextField
            fullWidth
            label="Bio"
            multiline
            minRows={3}
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
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
