import { useState, useEffect, useCallback } from 'react';
import { inventoryService } from '../services/api.js';
import { Boxes, Building2, AlertTriangle } from 'lucide-react';

export function InventoryCatalog() {
  const [stockLevels, setStockLevels] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedWarehouse, setSelectedWarehouse] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLowStockOnly, setFilterLowStockOnly] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [levelsRes, whRes] = await Promise.all([
        inventoryService.getStockLevels(),
        inventoryService.getWarehouses()
      ]);
      if (levelsRes?.data) setStockLevels(levelsRes.data);
      if (whRes?.data) setWarehouses(whRes.data);
    } catch (err) {
      console.warn('Inventory load error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredLevels = stockLevels.filter((sl) => {
    if (selectedWarehouse !== 'ALL' && String(sl.warehouse_id) !== String(selectedWarehouse)) return false;
    if (filterLowStockOnly && !sl.is_low_stock) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const match = sl.sku?.toLowerCase().includes(q)
        || sl.item_name?.toLowerCase().includes(q)
        || sl.warehouse_name?.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Boxes size={24} style={{ color: '#3b82f6' }} />
            <span>Master Inventory & Multi-Hub Stock</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
            Unified view of item catalogs, bin levels, and facility balances.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <select
            className="form-select"
            style={{ width: 'auto', minWidth: '220px' }}
            value={selectedWarehouse}
            onChange={(e) => setSelectedWarehouse(e.target.value)}
          >
            <option value="ALL">All Warehouse Facilities</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} ({w.warehouse_code})
              </option>
            ))}
          </select>

          <button
            className={`btn ${filterLowStockOnly ? 'btn-danger' : 'btn-secondary'} btn-sm`}
            onClick={() => setFilterLowStockOnly(!filterLowStockOnly)}
          >
            <AlertTriangle size={14} />
            <span>Low Stock Only</span>
          </button>
        </div>

        <input
          type="text"
          className="search-input"
          placeholder="Filter by SKU or item name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Item Description</th>
              <th>Warehouse Facility</th>
              <th>Available Balance</th>
              <th>Reorder Threshold</th>
              <th>Unit Price</th>
              <th>Valuation</th>
              <th style={{ textAlign: 'right' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                  Loading stock levels...
                </td>
              </tr>
            ) : filteredLevels.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                  No stock records found matching criteria.
                </td>
              </tr>
            ) : (
              filteredLevels.map((sl) => {
                const isLow = sl.is_low_stock || Number(sl.quantity) <= Number(sl.minimum_stock_level);
                const assetVal = Number(sl.quantity) * Number(sl.unit_price || 0);

                return (
                  <tr key={sl.id}>
                    <td>
                      <span style={{ fontWeight: 700, color: '#fff', fontFamily: 'var(--font-mono)' }}>
                        {sl.sku}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: '#fff' }}>{sl.item_name}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Building2 size={14} style={{ color: 'var(--text-muted)' }} />
                        <span>{sl.warehouse_name}</span>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontWeight: 700, color: isLow ? '#ef4444' : '#10b981', fontSize: '0.95rem' }}>
                        {sl.quantity}
                      </span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginLeft: '0.25rem' }}>
                        {sl.unit_of_measure}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>
                      {sl.minimum_stock_level} {sl.unit_of_measure}
                    </td>
                    <td>${Number(sl.unit_price).toFixed(2)}</td>
                    <td style={{ fontWeight: 700, color: '#10b981' }}>
                      ${assetVal.toFixed(2)}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span className={`badge ${isLow ? 'badge-pending' : 'badge-received'}`}>
                        {isLow ? 'REORDER NEEDED' : 'IN STOCK'}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
