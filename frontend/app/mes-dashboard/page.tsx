"use client";

import { useState } from "react";
import { useMesSignalR } from "@/lib/useMesSignalR";

type Machine = {
  tag: string;
  state?: string | null;
  reason?: string | null;
  metrics?: {
    running_time?: number;
    stopped_time?: number;
  } | null;
  oee?: {
    availability?: number;
    performance?: number;
    quality?: number;
    oee?: number;
  } | null;
};

export default function Dashboard() {
  const [machines, setMachines] = useState<Machine[]>([]);

  useMesSignalR({
    onMesSnapshot: (snapshot) => setMachines(snapshot as Machine[]),
    onMesUpdate: (update) => setMachines((previous) => {
      const machine = update as Machine;
      const exists = previous.some((item) => item.tag === machine.tag);
      return exists
        ? previous.map((item) => item.tag === machine.tag ? machine : item)
        : [...previous, machine];
    }),
  });

  return (
    <div style={{ minHeight: "100vh", padding: 20, background: "#111827", color: "white" }}>
      <h1 style={{ marginBottom: 8 }}>MES Dashboard</h1>
      <p style={{ color: "#9ca3af", marginBottom: 20 }}>Status, tempo operacional e OEE em tempo real</p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
          gap: "15px",
        }}
      >
        {machines.map((m) => (
          <div
            key={m.tag}
            style={{
              background: "#1f2937",
              padding: "15px",
              borderRadius: "10px",
              color: "white",
              borderLeft: `6px solid ${m.state === "RUNNING" ? "#00ff88" : m.state === "STOPPED" ? "#ff4d4d" : "#64748b"}`,
            }}
          >
            <h3 style={{ marginTop: 0 }}>{m.tag}</h3>
            <p>Estado: {m.state || "-"}</p>
            <p>Motivo: {m.reason || "-"}</p>
            <p>OEE: {m.oee?.oee !== undefined ? `${(m.oee.oee * 100).toFixed(1)}%` : "-"}</p>
            <p>Disponibilidade: {m.oee?.availability !== undefined ? `${(m.oee.availability * 100).toFixed(1)}%` : "-"}</p>
            <p>Performance: {m.oee?.performance !== undefined ? `${(m.oee.performance * 100).toFixed(1)}%` : "-"}</p>
            <p>Qualidade: {m.oee?.quality !== undefined ? `${(m.oee.quality * 100).toFixed(1)}%` : "-"}</p>
            <p>Rodando: {Math.round(m.metrics?.running_time || 0)}s</p>
            <p>Parado: {Math.round(m.metrics?.stopped_time || 0)}s</p>
          </div>
        ))}
      </div>
    </div>
  );
}
