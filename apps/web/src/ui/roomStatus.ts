import { RoomStatus } from "../types/index";

export const statusColorMap: Record<RoomStatus, string> = {
  offline: "#f87171", // 🔴 red-400
  busy: "#fbbf24", // 🟡 amber-400
  online: "#4ade80", // 🟢 green-400
  synced: "#3b82f6", // 🔵 blue-500
};

export const statusLabelMap: Record<RoomStatus, string> = {
  offline: "offline",
  busy: "busy",
  online: "online",
  synced: "synced",
};
