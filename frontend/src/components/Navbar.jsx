import { useWebSocket } from '../context/WebSocketContext.jsx';
import { Wifi, WifiOff, Bell, RefreshCw } from 'lucide-react';

export function Navbar({ onRefresh, isRefreshing = false, alertCount = 0 }) {
  const { isConnected } = useWebSocket();

  return (
    <header className="top-navbar">
      <div className="top-navbar-left">
        <div className={`ws-status-badge ${!isConnected ? 'disconnected' : ''}`}>
          <span className="pulse-dot" style={{ backgroundColor: isConnected ? '#10b981' : '#ef4444' }} />
          {isConnected ? (
            <>
              <Wifi size={14} />
              <span>WebSocket Stream Active</span>
            </>
          ) : (
            <>
              <WifiOff size={14} />
              <span>WebSocket Offline (Polling Fallback)</span>
            </>
          )}
        </div>
      </div>

      <div className="top-navbar-right">
        {onRefresh && (
          <button
            className="btn btn-secondary btn-sm"
            onClick={onRefresh}
            disabled={isRefreshing}
            title="Refresh System Data"
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
            <span>Sync</span>
          </button>
        )}

        <div style={{ position: 'relative' }}>
          <button className="btn btn-secondary btn-sm" style={{ padding: '0.45rem' }}>
            <Bell size={16} />
            {alertCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                background: '#ef4444',
                color: '#fff',
                fontSize: '0.65rem',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {alertCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
