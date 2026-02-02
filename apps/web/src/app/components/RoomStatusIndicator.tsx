"use client";

import { RoomStatus } from "@/types";

const statusColorMap: Record<RoomStatus, string> = {
  offline: "#f87171", // red-400
  busy: "#fbbf24", // amber-400
  online: "#4ade80", // green-400
  synced: "#3b82f6", // blue-400
};

interface Props {
  status?: string; // accept raw backend value
}

const statusLabelMap: Record<RoomStatus, string> = {
  offline: "Offline",
  busy: "Busy",
  online: "Online",
  synced: "Up to date",
};

export default function RoomStatusIndicator({ status }: Props) {
  // normalize backend value
  const normalized = (status ?? "offline").toLowerCase() as RoomStatus;

  const color = statusColorMap[normalized] ?? statusColorMap.offline;

  return (
    <div className="flex items-center gap-2">
      <svg width="10" height="10" viewBox="0 0 10 10">
        <circle cx="5" cy="5" r="5" fill={color} />
      </svg>
      <span className="text-sm capitalize">{normalized}</span>
    </div>
  );
}
