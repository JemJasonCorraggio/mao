import { useEffect, useRef, useState } from "react";

export function useGameSocket() {
  const socketRef = useRef<WebSocket | null>(null);
  const [gameState, setGameState] = useState<any>(null);
  const [connected, setConnected] = useState(false);

  function connect() {
    const ws = new WebSocket("wss://expert-winner-wv9wxgr56xjhgqgw-8080.app.github.dev/ws");
    socketRef.current = ws;

    ws.onopen = () => setConnected(true);

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === "GAME_STATE") {
        setGameState(msg.payload);
      }
    };

    ws.onclose = () => setConnected(false);
  }

  function send(message: any) {
    socketRef.current?.send(JSON.stringify(message));
  }

  return { connect, send, gameState, connected };
}
