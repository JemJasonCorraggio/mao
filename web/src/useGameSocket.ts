import { useEffect, useRef, useState } from "react";

export function useGameSocket() {
  const socketRef = useRef<WebSocket | null>(null);
  const [gameState, setGameState] = useState<any>(null);
  const [connected, setConnected] = useState(false);

  const reconnectAttempt = useRef(0);
  const shouldReconnect = useRef(true);
  const pendingSends = useRef<any[]>([]);
  const pingInterval = useRef<number | null>(null);

  const WS_URL = "wss://mao.fly.dev/ws";

  function flushQueue() {
    while (pendingSends.current.length > 0 && socketRef.current?.readyState === WebSocket.OPEN) {
      const m = pendingSends.current.shift();
      socketRef.current?.send(JSON.stringify(m));
    }
  }

  function startKeepalive() {
    stopKeepalive();
    pingInterval.current = window.setInterval(() => {
      try {
        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
          socketRef.current.send(JSON.stringify({ type: "PING" }));
        }
      } catch (e) {

      }
    }, 20_000) as unknown as number;
  }

  function stopKeepalive() {
    if (pingInterval.current) {
      window.clearInterval(pingInterval.current);
      pingInterval.current = null;
    }
  }

  function scheduleReconnect() {
    if (!shouldReconnect.current) return;
    reconnectAttempt.current += 1;
    const attempt = reconnectAttempt.current;
    const base = Math.min(30000, 1000 * Math.pow(2, Math.min(attempt, 6)));
    const jitter = Math.floor(Math.random() * 400);
    const delay = base + jitter;

    setTimeout(() => {
      if (shouldReconnect.current) connect();
    }, delay);
  }

  function connect() {

    try {
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.close();
      }
    } catch (e) {
    }

    const ws = new WebSocket(WS_URL);
    socketRef.current = ws;

    ws.onopen = () => {
      reconnectAttempt.current = 0;
      setConnected(true);
      flushQueue();
      startKeepalive();
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "GAME_STATE") {
          setGameState(msg.payload);
        }
      } catch (e) {
      }
    };

    ws.onerror = () => {
      setConnected(false);
    };

    ws.onclose = (ev) => {
      setConnected(false);
      stopKeepalive();
      if (shouldReconnect.current) {
        scheduleReconnect();
      }
    };
  }

  function send(message: any) {
    try {
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify(message));
      } else {
        pendingSends.current.push(message);
      }
    } catch (e) {
      pendingSends.current.push(message);
    }
  }

  useEffect(() => {
    // auto-connect on mount
    shouldReconnect.current = true;
    connect();

    return () => {
      shouldReconnect.current = false;
      stopKeepalive();
      try {
        socketRef.current?.close();
      } catch (e) {}
    };
  }, []);

  return { connect, send, gameState, connected };
}
