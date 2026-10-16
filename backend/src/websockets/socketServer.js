import { WebSocketServer, WebSocket } from 'ws';

let wss = null;

export function setupWebSocketServer(httpServer) {
  wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws, req) => {
    const ip = req.socket.remoteAddress;
    if (process.env.NODE_ENV !== 'test') {
      console.info(`[WebSocket] Client connected from ${ip} (Total: ${wss.clients.size})`);
    }

    // Send initial greeting and heartbeat ping
    ws.send(JSON.stringify({
      type: 'CONNECTION_ESTABLISHED',
      message: 'Connected to ISMS Real-Time Stock & Transfer Stream',
      timestamp: new Date().toISOString()
    }));

    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
      }
    }, 30000);

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        if (data.type === 'PING') {
          ws.send(JSON.stringify({ type: 'PONG', timestamp: new Date().toISOString() }));
        }
      } catch {
        // Ignore non-json
      }
    });

    ws.on('close', () => {
      clearInterval(pingInterval);
      if (process.env.NODE_ENV !== 'test') {
        console.info(`[WebSocket] Client disconnected (Remaining: ${wss.clients.size})`);
      }
    });

    ws.on('error', (err) => {
      console.warn('[WebSocket] Client error:', err.message);
    });
  });

  return wss;
}

export function broadcastEvent(eventType, payload) {
  if (!wss || !wss.clients) return;
  const message = JSON.stringify({
    type: eventType,
    payload,
    timestamp: new Date().toISOString()
  });

  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  }
}
