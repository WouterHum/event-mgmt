"use client";

import { useEffect, useState } from "react";
import { Room } from "@/types";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api";

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Room | null>(null);
  const [form, setForm] = useState<Room>({
    name: "",
    capacity: 0,
    location: "",
    layout: "",
    equipment: "",
  });

  const load = async () => {
    const data = await apiGet<Room[]>("/api/rooms/");
    setRooms(data);
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    if (editing && editing.id) await apiPut(`/api/rooms/${editing.id}`, form);
    else await apiPost("/api/rooms/", form);
    await load();
    setOpen(false);
    setEditing(null);
    setForm({ name: "", capacity: 0, location: "", layout: "", equipment: "" });
  };

  const remove = async (id?: number) => {
    if (!id) return;
    await apiDelete(`/api/rooms/${id}`);
    load();
  };

  return (
    <div className="min-h-screen bg-background text-foreground py-12">
      <div className="max-w-4xl mx-auto px-4">
        <header className="mb-10 text-center">
          <h1 className="text-4xl font-bold mb-2">Rooms</h1>
          <p className="text-muted-foreground">
            Manage your venue’s rooms and capacity details
          </p>
        </header>

        {/* Action button */}
        <div className="flex justify-center mb-8">
          <button
            onClick={() => {
              setEditing(null);
              setForm({
                name: "",
                capacity: 0,
                location: "",
                layout: "",
                equipment: "",
              });
              setOpen(true);
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium shadow-sm hover:bg-primary/90 transition-all"
          >
            + Add Room
          </button>
        </div>

        {/* Rooms List */}
        <div className="bg-card border border-gray-200 rounded-2xl shadow-sm divide-y divide-gray-200">
          {rooms.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No rooms found.
            </p>
          ) : (
            rooms.map((r) => (
              <div
                key={r.id}
                className="flex items-start justify-between px-6 py-4 hover:bg-muted transition-all"
              >
                <div>
                  <h3 className="text-base font-semibold">{r.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    Capacity: {r.capacity || "N/A"}
                  </p>
                  {r.location && (
                    <p className="text-sm text-muted-foreground">
                      Location: {r.location}
                    </p>
                  )}
                  {r.layout && (
                    <p className="text-sm text-muted-foreground">
                      Layout: {r.layout}
                    </p>
                  )}
                  {r.equipment && (
                    <p className="text-sm text-muted-foreground">
                      Equipment: {r.equipment}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditing(r);
                      setForm(r);
                      setOpen(true);
                    }}
                    className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-foreground bg-card hover:bg-muted transition-all"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => remove(r.id)}
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

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 w-full max-w-lg mx-4">
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-semibold">
                {editing ? "Edit Room" : "Add Room"}
              </h2>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Capacity
                </label>
                <input
                  type="number"
                  value={form.capacity || 0}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      capacity: Number(e.target.value),
                    })
                  }
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Location
                </label>
                <input
                  type="text"
                  value={form.location || ""}
                  onChange={(e) =>
                    setForm({ ...form, location: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Layout</label>
                <input
                  type="text"
                  value={form.layout || ""}
                  onChange={(e) => setForm({ ...form, layout: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Equipment
                </label>
                <input
                  type="text"
                  value={form.equipment || ""}
                  onChange={(e) =>
                    setForm({ ...form, equipment: e.target.value })
                  }
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
