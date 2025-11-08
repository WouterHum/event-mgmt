"use client";
import { useEffect, useState } from "react";
import { Attendee } from "@/types";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api";

export default function AttendeesPage() {
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Attendee | null>(null);
  const [form, setForm] = useState<Attendee>({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
  });

  const load = async () => {
    const d = await apiGet<Attendee[]>("/api/attendees/");
    setAttendees(d);
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    if (editing && editing.id)
      await apiPut(`/api/attendees/${editing.id}`, form);
    else await apiPost("/api/attendees/", form);
    load();
    setOpen(false);
    setEditing(null);
  };

  const remove = async (id?: number) => {
    if (!id) return;
    await apiDelete(`/api/attendees/${id}`);
    load();
  };

  return (
    <div className="min-h-screen bg-background text-foreground py-12">
      <div className="max-w-4xl mx-auto px-4">
        <header className="mb-10 text-center">
          <h1 className="text-4xl font-bold mb-2">Attendees</h1>
          <p className="text-muted-foreground">
            Create and manage conference attendees
          </p>
        </header>

        <div className="flex justify-center mb-8">
          <button
            onClick={() => {
              setEditing(null);
              setForm({ first_name: "", last_name: "", email: "", phone: "" });
              setOpen(true);
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium shadow-sm hover:bg-primary/90 transition-all"
          >
            + Add Attendee
          </button>
        </div>

        <div className="bg-card border border-gray-200 rounded-2xl shadow-sm divide-y divide-gray-200">
          {attendees.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No attendees found.
            </p>
          ) : (
            attendees.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between px-6 py-4 hover:bg-muted transition-all"
              >
                <div>
                  <h3 className="text-base font-semibold">{`${a.first_name} ${a.last_name}`}</h3>
                  <p className="text-sm text-muted-foreground">{a.email}</p>
                  {a.phone && (
                    <p className="text-sm text-muted-foreground">{a.phone}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditing(a);
                      setForm(a);
                      setOpen(true);
                    }}
                    className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-foreground bg-card hover:bg-muted transition-all"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => remove(a.id)}
                    className="rounded-md border border-red-300 text-red-600 px-3 py-1.5 text-sm bg-red-50 hover:bg-red-100 transition-all"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Dialog with blurred overlay */}
      {open && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 w-full max-w-lg mx-4">
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-semibold">
                {editing ? "Edit Attendee" : "Add Attendee"}
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  First Name
                </label>
                <input
                  type="text"
                  value={form.first_name || ""}
                  onChange={(e) =>
                    setForm({ ...form, first_name: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  value={form.last_name || ""}
                  onChange={(e) =>
                    setForm({ ...form, last_name: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  value={form.email || ""}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Phone</label>
                <input
                  type="text"
                  value={form.phone || ""}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
            </div>
            <div className="border-t border-gray-200 px-6 py-4 flex justify-end gap-2">
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
