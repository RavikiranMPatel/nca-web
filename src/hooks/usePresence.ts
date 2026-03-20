import { useEffect, useRef, useState } from "react";

const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
const host =
  window.location.hostname === "localhost"
    ? "localhost:8080"
    : window.location.host;
const WS_URL = `${protocol}//${host}/ws/presence`;

export function usePresence(entity: string, id: string | undefined) {
  const [otherUsers, setOtherUsers] = useState<string[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const userName = localStorage.getItem("userName") || "Admin";

  useEffect(() => {
    if (!id) return;

    // ── Connect ────────────────────────────────────────────────────────
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          action: "JOIN",
          entity,
          id,
          userName,
        }),
      );
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "PRESENCE_UPDATE") {
        // 👇 deduplicate and filter current user
        const unique = [...new Set(data.users as string[])];
        setOtherUsers(unique.filter((u: string) => u !== userName));
      }
    };

    ws.onerror = () => {
      // Silently fail — presence is non-critical
    };

    // ── Cleanup on unmount / page leave ───────────────────────────────
    const handleLeave = () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            action: "LEAVE",
            entity,
            id,
            userName,
          }),
        );
        ws.close();
      }
      // 👇 Add this — don't try to close if already closing/closed
      else if (ws.readyState === WebSocket.CONNECTING) {
        ws.close(); // just close, don't send LEAVE
      }
    };

    window.addEventListener("beforeunload", handleLeave);

    return () => {
      handleLeave();
      window.removeEventListener("beforeunload", handleLeave);
    };
  }, [entity, id]);

  return { otherUsers };
}
