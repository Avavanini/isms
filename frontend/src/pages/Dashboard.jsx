import { useEffect, useState, useCallback } from 'react';
import { analyticsService } from '../services/api.js';
import { useWebSocket } from '../context/WebSocketContext.jsx';
import {
  DollarSign,
  ShoppingCart,
  ArrowLeftRight,
  AlertTriangle,
  TrendingUp,
  Building2,
  FileSpreadsheet,
  Plus
} from 'lucide-react';
import { Link } from 'react-router-dom';

export function Dashboard({ onOpenCreatePO, onOpenCreateTransfer }) {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const { lastEvent } = useWebSocket();

  const loadMetrics = useCallback(async () => {
    try {
      const res = await analyticsService.getMetrics();
      if (res?.data) {
        setMetrics(res.data);
      }
    } catch (err) {
      console.warn('Dashboard metrics fallback load:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMetrics();
  }, [loadMetrics, lastEvent]);

  if (loading && !metrics) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px', color: 'var(--text-muted)' }}>
        Loading executive dashboard metrics...
      </div>
    );
  }

  const overview = metrics?.overview || {
    total_valuation: 84250.00,
    total_sku_count: 8,
    total_units_in_stock: 1245,
    low_stock_alert_count: 5,
    critical_alert_count: 2,
    active_pos_count: 3,
    active_pos_valuation: 4490.00,
    in_transit_transfers_count: 1
  };

  const warehouseBreakdown = metrics?.warehouse_breakdown || [];
  const categoryBreakdown = metrics?.category_breakdown || [];

  return (
    <div className="page-container">
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span>Operations & Logistics Dashboard</span>
            <span style={{ fontSize: '0.75rem', background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', padding: '0.2rem 0.6rem', borderRadius: '9999px', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
              Developer 2 Engine
            </span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
            Multi-facility inventory valuation, automated reorders, and inter-warehouse dispatch tracking.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => window.open(analyticsService.getExportCsvUrl(), '_blank')}
          >
            <FileSpreadsheet size={16} />
            <span>Export Audit CSV</span>
          </button>

          {onOpenCreateTransfer && (
            <button className="btn btn-secondary btn-sm" onClick={onOpenCreateTransfer}>
              <ArrowLeftRight size={16} />
              <span>New Transfer</span>
            </button>
          )}

          {onOpenCreatePO && (
            <button className="btn btn-primary btn-sm" onClick={onOpenCreatePO}>
              <Plus size={16} />
              <span>Create Purchase Order</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-top">
            <span className="metric-label">Total Inventory Valuation</span>
            <div className="metric-icon-box" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
              <DollarSign size={20} />
            </div>
          </div>
          <div className="metric-value">
            ${Number(overview.total_valuation).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="metric-sub">
            <TrendingUp size={14} style={{ color: '#10b981' }} />
            <span>{overview.total_sku_count} active catalog items ({overview.total_units_in_stock} total units)</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-top">
            <span className="metric-label">Active Procurement Value</span>
            <div className="metric-icon-box" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
              <ShoppingCart size={20} />
            </div>
          </div>
          <div className="metric-value">
            ${Number(overview.active_pos_valuation).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="metric-sub">
            <span>{overview.active_pos_count} purchase orders in progress</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-top">
            <span className="metric-label">Inter-Warehouse In Transit</span>
            <div className="metric-icon-box" style={{ background: 'rgba(6, 182, 212, 0.15)', color: '#06b6d4' }}>
              <ArrowLeftRight size={20} />
            </div>
          </div>
          <div className="metric-value">{overview.in_transit_transfers_count}</div>
          <div className="metric-sub">
            <span>Active branch shipments moving</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-top">
            <span className="metric-label">Low Stock Alerts</span>
            <div className="metric-icon-box" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
              <AlertTriangle size={20} />
            </div>
          </div>
          <div className="metric-value" style={{ color: overview.low_stock_alert_count > 0 ? '#ef4444' : '#fff' }}>
            {overview.low_stock_alert_count}
          </div>
          <div className="metric-sub">
            <span style={{ color: '#f59e0b' }}>
              {overview.critical_alert_count} critical threshold deficits
            </span>
          </div>
        </div>
      </div>

      {/* Visual Breakdowns Section */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))', gap: '1.5rem', marginBottom: '1.75rem' }}>
        {/* Warehouse Valuation Split */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">
                <Building2 size={18} style={{ color: '#3b82f6' }} />
                <span>Facility Stock & Asset Allocation</span>
              </div>
              <div className="card-subtitle">Real-time valuation across all registered warehouses</div>
            </div>
            <Link to="/inventory" className="btn btn-secondary btn-sm">View Hubs</Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {warehouseBreakdown.map((w) => {
              const maxVal = Math.max(...warehouseBreakdown.map((item) => item.valuation), 1);
              const pct = Math.min(100, Math.round((w.valuation / maxVal) * 100));
              return (
                <div key={w.warehouse_id} style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <span style={{ fontWeight: 600, color: '#fff' }}>
                      {w.warehouse_name} <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>({w.warehouse_code})</span>
                    </span>
                    <span style={{ fontWeight: 700, color: '#10b981' }}>
                      ${w.valuation.toLocaleString()}
                    </span>
                  </div>
                  <div style={{ height: '8px', background: 'rgba(255, 255, 255, 0.06)', borderRadius: '9999px', overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg, #3b82f6, #06b6d4)', borderRadius: '9999px', transition: 'width 0.8s ease-out' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <span>{w.sku_count} distinct SKUs stocked</span>
                    {w.low_stock_count > 0 ? (
                      <span style={{ color: '#ef4444', fontWeight: 600 }}>{w.low_stock_count} low-stock warnings</span>
                    ) : (
                      <span style={{ color: '#10b981' }}>Optimal stock levels</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Category Valuation Split */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">
                <TrendingUp size={18} style={{ color: '#10b981' }} />
                <span>Category Asset Distribution</span>
              </div>
              <div className="card-subtitle">Capital allocated across product groups</div>
            </div>
            <Link to="/analytics" className="btn btn-secondary btn-sm">FSN Analysis</Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {categoryBreakdown.map((cat, idx) => {
              const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];
              const color = colors[idx % colors.length];
              const totalVal = categoryBreakdown.reduce((s, c) => s + c.valuation, 0) || 1;
              const pct = Math.round((cat.valuation / totalVal) * 100);

              return (
                <div key={cat.category_id} style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <span style={{ fontWeight: 600, color: '#fff' }}>{cat.category_name}</span>
                    <span style={{ fontWeight: 700, color }}>
                      ${cat.valuation.toLocaleString()} ({pct}%)
                    </span>
                  </div>
                  <div style={{ height: '8px', background: 'rgba(255, 255, 255, 0.06)', borderRadius: '9999px', overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: '9999px' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
