"use client";
import { useEffect, useState } from "react";
import { Speaker } from "@/types";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from "@mui/material";

export default function SpeakersPage() {
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Speaker | null>(null);
  const [form, setForm] = useState<Speaker>({ name: "", bio: "", email: "" });
  const [bulkFile, setBulkFile] = useState<File | null>(null);

  const load = async () => {
    const data = await apiGet<Speaker[]>("/api/speakers/");
    setSpeakers(data);
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    if (editing && editing.id)
      await apiPut(`/api/speakers/${editing.id}`, form);
    else await apiPost("/api/speakers/", form);
    await load();
    setOpen(false);
    setEditing(null);
    setForm({ name: "", bio: "", email: "" });
  };

  const remove = async (id?: number) => {
    if (!id) return;
    await apiDelete(`/api/speakers/${id}`);
    load();
  };

  const handleBulk = async () => {
    if (!bulkFile) return alert("Select CSV");
    const fd = new FormData();
    fd.append("file", bulkFile);
    await apiPost("/api/speakers/bulk", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    setBulkFile(null);
    load();
  };

  return (
    <div className="page-container">
      <div className="page-header text-center">        
        <h1 className="text-4xl font-bold mb-2">Speakers</h1>
        <p className="page-subtitle text-gray-500">
          Add, update, or bulk import speaker profiles
        </p>
      </div>

      <div className="my-4 flex flex-wrap gap-3">
        <button
          onClick={() => {
            setEditing(null);
            setForm({ name: "", bio: "", email: "" });
            setOpen(true);
          }}
          className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium shadow-sm hover:bg-primary/90 transition-all"
        >
          + Add Speaker
        </button>

        <div className="flex items-center gap-2">
          <input
            type="file"
            accept=".csv"
            onChange={(e) => setBulkFile(e.target.files?.[0] ?? null)}
            className="text-sm text-gray-500 border border-gray-300 rounded-lg p-1.5 cursor-pointer"
          />
          <button
            onClick={handleBulk}
            className="px-4 py-2 rounded-lg font-semibold bg-gray-100 text-gray-800 hover:bg-gray-200 border border-gray-300 transition"
          >
            Bulk Upload
          </button>
        </div>
      </div>

      <div className="bg-card border border-gray-200 rounded-2xl shadow-sm mt-4">
        <ul className="divide-y divide-gray-200">
          {speakers.length === 0 ? (
            <li className="text-gray-500 text-center py-6">
              No speakers found
            </li>
          ) : (
            speakers.map((s) => (
              <li
                key={s.id}
                className="flex justify-between items-center px-6 py-4 hover:bg-muted transition-all"
              >
                <div>
                  <p className="font-semibold text-gray-800">{s.name}</p>
                  <p className="text-sm text-gray-500">{s.email}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditing(s);
                      setForm({
                        name: s.name,
                        bio: s.bio ?? "",
                        email: s.email ?? "",
                      });
                      setOpen(true);
                    }}
                    className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-foreground bg-card hover:bg-muted transition-all"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => remove(s.id)}
                    className="rounded-md border border-red-300 text-red-600 px-3 py-1.5 text-sm bg-red-50 hover:bg-red-100 transition-all"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>

      {/* Dialog */}
      <Dialog
        open={open}
        onClose={() => {
          setOpen(false);
          setEditing(null);
          setForm({ name: "", bio: "", email: "" });
        }}
        fullWidth
        slotProps={{
          backdrop: {
            className: "backdrop-blur-sm bg-black/30", // ✅ blurred & dimmed overlay
          },
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
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <TextField
            fullWidth
            label="Bio"
            multiline
            rows={3}
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
          />
          <TextField
            fullWidth
            label="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </DialogContent>

        <DialogActions className="flex justify-end gap-2 p-4 border-t border-gray-200">
          <button
            onClick={() => {
              setOpen(false);
              setEditing(null);
            }}
            className="px-4 py-2 rounded-md border border-gray-300 text-sm text-foreground bg-card hover:bg-muted transition-all"
          >
            Cancel
          </button>
          <button
            onClick={save}
            className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all"
          >
            Save
          </button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
