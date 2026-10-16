import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';

const WebSocketContext = createContext(null);

export function WebSocketProvider({ children }) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState(null);
  const [toasts, setToasts] = useState([]);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  const addToast = useCallback((toast) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, ...toast }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const connect = useCallback(() => {
    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:3000/ws';
    try {
      const socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        setIsConnected(true);
        console.info('[WebSocket] Connected to live stock & logistics stream');
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setLastEvent(data);

          if (data.type === 'PO_RECEIVED') {
            addToast({
              title: 'Purchase Order Received',
              message: data.payload?.message || 'Stock levels updated successfully',
              type: 'success'
            });
          } else if (data.type === 'TRANSFER_DISPATCHED') {
            addToast({
              title: 'Transfer Dispatched',
              message: data.payload?.message || 'Stock is now in transit',
              type: 'info'
            });
          } else if (data.type === 'TRANSFER_RECEIVED') {
            addToast({
              title: 'Transfer Completed',
              message: data.payload?.message || 'Destination stock levels updated',
              type: 'success'
            });
          } else if (data.type === 'REORDER_TRIGGERED') {
            addToast({
              title: 'Automated Reorders Generated',
              message: `${data.payload?.count} draft purchase orders created for low stock items!`,
              type: 'alert'
            });
          }
        } catch {
          // Non-json
        }
      };

      socket.onclose = () => {
        setIsConnected(false);
        // Exponential/delayed reconnect attempt
        reconnectTimeoutRef.current = setTimeout(connect, 4000);
      };

      socket.onerror = () => {
        socket.close();
      };

      wsRef.current = socket;
    } catch {
      setIsConnected(false);
      reconnectTimeoutRef.current = setTimeout(connect, 5000);
    }
  }, [addToast]);

  useEffect(() => {
    connect();
    return () => {
      if (wsRef.current) wsRef.current.close();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
  }, [connect]);

  return (
    <WebSocketContext.Provider value={{ isConnected, lastEvent, toasts, addToast, removeToast }}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
}
