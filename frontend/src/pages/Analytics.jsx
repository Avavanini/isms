import { useState, useEffect, useCallback } from 'react';
import { analyticsService } from '../services/api.js';
import {
  BarChart3,
  FileSpreadsheet,
  Printer,
  Zap,
  Clock,
  AlertOctagon,
  X
} from 'lucide-react';

export function Analytics() {
  const [fsnItems, setFsnItems] = useState([]);
  const [auditData, setAuditData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fsnFilter, setFsnFilter] = useState('ALL');
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [fsnRes, auditRes] = await Promise.all([
        analyticsService.getFsnAnalysis(),
        analyticsService.getStockAuditReport()
      ]);
      if (fsnRes?.data) setFsnItems(fsnRes.data);
      if (auditRes?.data) setAuditData(auditRes.data);
    } catch (err) {
      console.warn('Analytics load fallback:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const fItems = fsnItems.filter((i) => i.fsn_category === 'F');
  const sItems = fsnItems.filter((i) => i.fsn_category === 'S');
  const nItems = fsnItems.filter((i) => i.fsn_category === 'N');

  const filteredItems = fsnItems.filter((item) => {
    if (fsnFilter === 'ALL') return true;
    return item.fsn_category === fsnFilter;
  });

  const deadStockValue = nItems.reduce((sum, item) => sum + (Number(item.total_valuation) || 0), 0);
  const fastStockValue = fItems.reduce((sum, item) => sum + (Number(item.total_valuation) || 0), 0);

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <BarChart3 size={24} style={{ color: '#8b5cf6' }} />
            <span>FSN Inventory Velocity & Valuation Analytics</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
            Classifies inventory into Fast-Moving, Slow-Moving, and Non-Moving (FSN) assets for working capital optimization.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            className="btn btn-secondary"
            onClick={() => setIsPrintModalOpen(true)}
          >
            <Printer size={16} />
            <span>Print Audit Report</span>
          </button>

          <button
            className="btn btn-primary"
            style={{ background: 'linear-gradient(135deg, #10b981, #059669)', borderColor: '#10b981' }}
            onClick={() => window.open(analyticsService.getExportCsvUrl(), '_blank')}
          >
            <FileSpreadsheet size={16} />
            <span>Export to Excel / CSV</span>
          </button>
        </div>
      </div>

      {/* FSN KPI Metrics Summary */}
      <div className="metrics-grid" style={{ marginBottom: '1.75rem' }}>
        <div className="metric-card" style={{ borderLeft: '4px solid #10b981' }}>
          <div className="metric-top">
            <span className="metric-label" style={{ color: '#10b981' }}>Fast-Moving (F-Class)</span>
            <div className="metric-icon-box" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
              <Zap size={20} />
            </div>
          </div>
          <div className="metric-value">{fItems.length} SKUs</div>
          <div className="metric-sub">
            <span>Valuation: <strong>${fastStockValue.toLocaleString()}</strong> (Continuous demand)</span>
          </div>
        </div>

        <div className="metric-card" style={{ borderLeft: '4px solid #f59e0b' }}>
          <div className="metric-top">
            <span className="metric-label" style={{ color: '#f59e0b' }}>Slow-Moving (S-Class)</span>
            <div className="metric-icon-box" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
              <Clock size={20} />
            </div>
          </div>
          <div className="metric-value">{sItems.length} SKUs</div>
          <div className="metric-sub">
            <span>Moderate replenishment cycles; buffer optimized</span>
          </div>
        </div>

        <div className="metric-card" style={{ borderLeft: '4px solid #ef4444' }}>
          <div className="metric-top">
            <span className="metric-label" style={{ color: '#ef4444' }}>Non-Moving (N-Class / Stagnant)</span>
            <div className="metric-icon-box" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
              <AlertOctagon size={20} />
            </div>
          </div>
          <div className="metric-value" style={{ color: '#ef4444' }}>{nItems.length} SKUs</div>
          <div className="metric-sub">
            <span>Tying up <strong>${deadStockValue.toLocaleString()}</strong> in stagnant capital</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="filter-bar">
        <div className="tabs">
          {[
            { id: 'ALL', label: 'All Items' },
            { id: 'F', label: 'Fast-Moving (F)' },
            { id: 'S', label: 'Slow-Moving (S)' },
            { id: 'N', label: 'Non-Moving (N)' }
          ].map((tab) => (
            <button
              key={tab.id}
              className={`tab-btn ${fsnFilter === tab.id ? 'active' : ''}`}
              onClick={() => setFsnFilter(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          Showing {filteredItems.length} items analyzed from stock movement frequency
        </div>
      </div>

      {/* FSN Matrix Table */}
      <div className="table-wrapper" style={{ marginBottom: '2rem' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>FSN Category</th>
              <th>SKU Code</th>
              <th>Item Name</th>
              <th>Category</th>
              <th>Current Stock</th>
              <th>Unit Price</th>
              <th>Asset Valuation</th>
              <th>Turnover Index</th>
              <th>Strategic Recommendation</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                  Calculating FSN movement algorithms...
                </td>
              </tr>
            ) : filteredItems.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                  No items in this category.
                </td>
              </tr>
            ) : (
              filteredItems.map((item) => {
                const badgeClass =
                  item.fsn_category === 'F' ? 'badge-fsn-f' :
                  item.fsn_category === 'S' ? 'badge-fsn-s' : 'badge-fsn-n';

                return (
                  <tr key={item.item_id}>
                    <td>
                      <span className={`badge ${badgeClass}`}>
                        {item.fsn_category === 'F' ? 'FAST' : item.fsn_category === 'S' ? 'SLOW' : 'NON-MOVING'}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 700, color: '#fff', fontFamily: 'var(--font-mono)' }}>
                        {item.sku}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600, color: '#fff' }}>{item.name}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{item.category_name}</td>
                    <td style={{ fontWeight: 700 }}>{item.current_stock} pcs</td>
                    <td>${Number(item.unit_price).toFixed(2)}</td>
                    <td style={{ fontWeight: 700, color: '#10b981' }}>
                      ${Number(item.total_valuation).toLocaleString()}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ width: '50px', height: '6px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '9999px', overflow: 'hidden' }}>
                          <div
                            style={{
                              width: `${Math.round(item.turnover_score * 100)}%`,
                              height: '100%',
                              background: item.fsn_category === 'F' ? '#10b981' : item.fsn_category === 'S' ? '#f59e0b' : '#ef4444'
                            }}
                          />
                        </div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {Math.round(item.turnover_score * 100)}%
                        </span>
                      </div>
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {item.recommendation}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Print Audit Modal */}
      {isPrintModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '820px' }}>
            <div className="modal-header">
              <h2>Inventory Stock Audit & Asset Valuation Report</h2>
              <button className="modal-close-btn" onClick={() => setIsPrintModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" id="printable-audit-section">
              <div style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1.2rem', color: '#fff' }}>ISMS Formal Stock Audit Certificate</h3>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  Generated on: {new Date().toUTCString()} | Multi-Warehouse Valuation
                </div>
              </div>

              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Facility</th>
                      <th>SKU</th>
                      <th>Item Description</th>
                      <th>Quantity</th>
                      <th>Unit Price</th>
                      <th>Asset Value</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditData.map((row, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 600 }}>{row.warehouse}</td>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>{row.sku}</td>
                        <td>{row.item_name}</td>
                        <td>{row.quantity_on_hand} {row.unit_of_measure}</td>
                        <td>${Number(row.unit_price).toFixed(2)}</td>
                        <td style={{ fontWeight: 700, color: '#10b981' }}>${Number(row.total_asset_value).toFixed(2)}</td>
                        <td>
                          <span className={`badge ${row.status === 'OPTIMAL' ? 'badge-received' : 'badge-pending'}`}>
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setIsPrintModalOpen(false)}>
                Close
              </button>
              <button className="btn btn-primary" onClick={() => window.print()}>
                <Printer size={16} />
                <span>Send to Printer</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
