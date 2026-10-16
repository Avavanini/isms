import { useState } from 'react';
import { AlertTriangle, Zap, ChevronDown, ChevronUp } from 'lucide-react';
import { purchaseOrderService } from '../services/api.js';

export function LowStockBanner({ alerts = [], onReordersTriggered }) {
  const [isTriggering, setIsTriggering] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  if (!alerts || alerts.length === 0) return null;

  const criticalCount = alerts.filter((a) => a.severity === 'CRITICAL' || a.severity === 'OUT_OF_STOCK').length;

  const handleAutoReorder = async () => {
    setIsTriggering(true);
    try {
      await purchaseOrderService.triggerReorders();
      if (onReordersTriggered) {
        onReordersTriggered();
      }
    } catch (err) {
      console.error('Failed to trigger reorders:', err);
    } finally {
      setIsTriggering(false);
    }
  };

  return (
    <div className="low-stock-banner">
      <div className="banner-content">
        <div className="banner-icon">
          <AlertTriangle size={22} />
        </div>
        <div className="banner-text">
          <h3>
            Automated Reorder Alert: {alerts.length} Item{alerts.length > 1 ? 's' : ''} Below Minimum Stock Threshold!
          </h3>
          <p>
            {criticalCount > 0 && <strong>{criticalCount} critical stockout risks detected. </strong>}
            Automated triggers recommend immediate vendor purchase orders to replenish buffers.
          </p>
        </div>
      </div>

      <div className="banner-actions">
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <span>{isExpanded ? 'Hide Items' : 'View Items'}</span>
          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        <button
          className="btn btn-primary btn-sm"
          style={{ background: 'linear-gradient(135deg, #ef4444, #f97316)', borderColor: '#ef4444' }}
          onClick={handleAutoReorder}
          disabled={isTriggering}
        >
          <Zap size={14} />
          <span>{isTriggering ? 'Generating POs...' : '⚡ Generate Auto-Reorders'}</span>
        </button>
      </div>

      {isExpanded && (
        <div style={{
          width: '100%',
          marginTop: '1rem',
          paddingTop: '1rem',
          borderTop: '1px solid rgba(239, 68, 68, 0.2)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '0.75rem'
        }}>
          {alerts.map((alert) => (
            <div
              key={`${alert.item_id}-${alert.warehouse_id}`}
              style={{
                background: 'rgba(0, 0, 0, 0.3)',
                padding: '0.75rem',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                fontSize: '0.8rem'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                <span style={{ fontWeight: 700, color: '#fff' }}>{alert.sku}</span>
                <span style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  color: alert.severity === 'CRITICAL' ? '#ef4444' : '#f59e0b',
                  textTransform: 'uppercase'
                }}>
                  {alert.severity}
                </span>
              </div>
              <div style={{ color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                {alert.item_name} ({alert.warehouse_name})
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                <span>Stock: <strong style={{ color: '#ef4444' }}>{alert.current_stock}</strong> / Min: {alert.minimum_stock_level}</span>
                <span>Deficit: <strong style={{ color: '#fbbf24' }}>+{alert.suggested_reorder}</strong></span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
