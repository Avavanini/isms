import { useState, useEffect, useCallback } from 'react';
import { transferService, inventoryService } from '../services/api.js';
import { useWebSocket } from '../context/WebSocketContext.jsx';
import {
  ArrowLeftRight,
  Plus,
  Send,
  PackageCheck,
  CheckCircle2,
  XCircle,
  Building2,
  Trash2,
  Eye,
  X
} from 'lucide-react';

export function StockTransfers({ isCreateModalOpen, setIsCreateModalOpen }) {
  const [transfers, setTransfers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [catalogItems, setCatalogItems] = useState([]);
  const [selectedTransfer, setSelectedTransfer] = useState(null);
  const [activeTab, setActiveTab] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // New Transfer Wizard State
  const [newTransferData, setNewTransferData] = useState({
    source_warehouse_id: '',
    destination_warehouse_id: '',
    notes: '',
    items: [{ item_id: '', quantity: 20 }]
  });

  const { lastEvent } = useWebSocket();

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [trfRes, whRes, itemsRes] = await Promise.all([
        transferService.getTransfers(),
        inventoryService.getWarehouses(),
        inventoryService.getItems()
      ]);
      if (trfRes?.data) setTransfers(trfRes.data);
      if (whRes?.data) setWarehouses(whRes.data);
      if (itemsRes?.data) setCatalogItems(itemsRes.data);
    } catch (err) {
      console.warn('Transfers load error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData, lastEvent]);

  const addItemLine = () => {
    setNewTransferData((prev) => ({
      ...prev,
      items: [...prev.items, { item_id: '', quantity: 10 }]
    }));
  };

  const removeItemLine = (index) => {
    setNewTransferData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const updateItemLine = (index, field, value) => {
    setNewTransferData((prev) => {
      const items = [...prev.items];
      items[index] = { ...items[index], [field]: value };
      return { ...prev, items };
    });
  };

  const handleCreateTransfer = async (e) => {
    e.preventDefault();
    if (!newTransferData.source_warehouse_id || !newTransferData.destination_warehouse_id) {
      alert('Please select both source and destination warehouses.');
      return;
    }
    if (newTransferData.source_warehouse_id === newTransferData.destination_warehouse_id) {
      alert('Source and destination warehouse cannot be the same facility!');
      return;
    }
    const validItems = newTransferData.items.filter((i) => i.item_id && Number(i.quantity) > 0);
    if (validItems.length === 0) {
      alert('Please add at least one item line to transfer.');
      return;
    }

    setActionLoading(true);
    try {
      await transferService.createTransfer({
        ...newTransferData,
        items: validItems
      });
      setIsCreateModalOpen(false);
      setNewTransferData({
        source_warehouse_id: '',
        destination_warehouse_id: '',
        notes: '',
        items: [{ item_id: '', quantity: 20 }]
      });
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to create transfer request');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async (id) => {
    setActionLoading(true);
    try {
      await transferService.approveTransfer(id);
      loadData();
      if (selectedTransfer?.id === id) {
        const refreshed = await transferService.getTransfer(id);
        setSelectedTransfer(refreshed.data);
      }
    } catch (err) {
      alert(err.message || 'Approval failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDispatch = async (id) => {
    if (!window.confirm('Dispatch shipment? This will deduct stock from source warehouse and put goods in transit.')) return;
    setActionLoading(true);
    try {
      await transferService.dispatchTransfer(id);
      loadData();
      if (selectedTransfer?.id === id) {
        const refreshed = await transferService.getTransfer(id);
        setSelectedTransfer(refreshed.data);
      }
    } catch (err) {
      alert(err.message || 'Dispatch failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReceive = async (id) => {
    if (!window.confirm('Confirm receipt of shipment? This will add stock into the destination warehouse.')) return;
    setActionLoading(true);
    try {
      await transferService.receiveTransfer(id);
      loadData();
      if (selectedTransfer?.id === id) {
        const refreshed = await transferService.getTransfer(id);
        setSelectedTransfer(refreshed.data);
      }
    } catch (err) {
      alert(err.message || 'Receiving failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this transfer request?')) return;
    setActionLoading(true);
    try {
      await transferService.cancelTransfer(id);
      loadData();
      if (selectedTransfer?.id === id) {
        const refreshed = await transferService.getTransfer(id);
        setSelectedTransfer(refreshed.data);
      }
    } catch (err) {
      alert(err.message || 'Cancel failed');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredTransfers = transfers.filter((t) => {
    if (activeTab !== 'ALL' && t.status !== activeTab) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const match = t.transfer_number?.toLowerCase().includes(q)
        || t.source_warehouse_name?.toLowerCase().includes(q)
        || t.destination_warehouse_name?.toLowerCase().includes(q);
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
            <ArrowLeftRight size={24} style={{ color: '#06b6d4' }} />
            <span>Inter-Warehouse Stock Transfers</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
            Multi-branch logistics tracking with automatic source deduction and destination credit.
          </p>
        </div>

        <button className="btn btn-primary" onClick={() => setIsCreateModalOpen(true)}>
          <Plus size={16} />
          <span>New Transfer Request</span>
        </button>
      </div>

      {/* Tabs & Search */}
      <div className="filter-bar">
        <div className="tabs">
          {['ALL', 'REQUESTED', 'APPROVED', 'DISPATCHED', 'RECEIVED', 'CANCELLED'].map((tab) => (
            <button
              key={tab}
              className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab.replace('_', ' ')}
            </button>
          ))}
        </div>

        <input
          type="text"
          className="search-input"
          placeholder="Search transfer # or warehouse..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Transfer #</th>
              <th>Source Facility</th>
              <th>Destination Facility</th>
              <th>Status</th>
              <th>Items Transferred</th>
              <th>Dispatch Time</th>
              <th>Receipt Time</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                  Loading stock transfers...
                </td>
              </tr>
            ) : filteredTransfers.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                  No transfers found matching current criteria.
                </td>
              </tr>
            ) : (
              filteredTransfers.map((trf) => {
                const statusClass =
                  trf.status === 'RECEIVED' ? 'badge-received' :
                  trf.status === 'DISPATCHED' ? 'badge-dispatched' :
                  trf.status === 'APPROVED' ? 'badge-ordered' :
                  trf.status === 'CANCELLED' ? 'badge-cancelled' : 'badge-pending';

                const totalUnits = (trf.items || []).reduce((s, i) => s + Number(i.quantity), 0);

                return (
                  <tr key={trf.id}>
                    <td>
                      <span style={{ fontWeight: 700, color: '#fff', fontFamily: 'var(--font-mono)' }}>
                        {trf.transfer_number}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#f59e0b', fontWeight: 600 }}>
                        <Building2 size={14} />
                        <span>{trf.source_warehouse_name}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#10b981', fontWeight: 600 }}>
                        <Building2 size={14} />
                        <span>{trf.destination_warehouse_name}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${statusClass}`}>
                        {trf.status}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: '#fff' }}>{totalUnits} units</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginLeft: '0.35rem' }}>
                        ({(trf.items || []).length} SKUs)
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {trf.dispatched_at ? new Date(trf.dispatched_at).toLocaleString() : 'Pending'}
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {trf.received_at ? new Date(trf.received_at).toLocaleString() : 'In Transit'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => setSelectedTransfer(trf)}
                          title="View Transfer Details"
                        >
                          <Eye size={13} />
                          <span>View</span>
                        </button>

                        {trf.status === 'REQUESTED' && (
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => handleApprove(trf.id)}
                            disabled={actionLoading}
                            title="Approve Transfer Request"
                          >
                            <CheckCircle2 size={13} />
                            <span>Approve</span>
                          </button>
                        )}

                        {(trf.status === 'REQUESTED' || trf.status === 'APPROVED') && (
                          <button
                            className="btn btn-primary btn-sm"
                            style={{ background: '#06b6d4', borderColor: '#0891b2' }}
                            onClick={() => handleDispatch(trf.id)}
                            disabled={actionLoading}
                            title="Dispatch Shipment (Deducts source stock)"
                          >
                            <Send size={13} />
                            <span>Dispatch</span>
                          </button>
                        )}

                        {trf.status === 'DISPATCHED' && (
                          <button
                            className="btn btn-success btn-sm"
                            onClick={() => handleReceive(trf.id)}
                            disabled={actionLoading}
                            title="Receive Shipment (Adds destination stock)"
                          >
                            <PackageCheck size={13} />
                            <span>Receive</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Transfer Request Wizard Modal */}
      {isCreateModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '680px' }}>
            <div className="modal-header">
              <h2>New Inter-Warehouse Stock Transfer</h2>
              <button className="modal-close-btn" onClick={() => setIsCreateModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateTransfer}>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Source Warehouse (Origin) *</label>
                    <select
                      className="form-select"
                      required
                      value={newTransferData.source_warehouse_id}
                      onChange={(e) => setNewTransferData({ ...newTransferData, source_warehouse_id: e.target.value })}
                    >
                      <option value="">Select dispatch facility...</option>
                      {warehouses.map((w) => (
                        <option
                          key={w.id}
                          value={w.id}
                          disabled={String(w.id) === String(newTransferData.destination_warehouse_id)}
                        >
                          {w.name} ({w.warehouse_code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Destination Warehouse (Recipient) *</label>
                    <select
                      className="form-select"
                      required
                      value={newTransferData.destination_warehouse_id}
                      onChange={(e) => setNewTransferData({ ...newTransferData, destination_warehouse_id: e.target.value })}
                    >
                      <option value="">Select receiving facility...</option>
                      {warehouses.map((w) => (
                        <option
                          key={w.id}
                          value={w.id}
                          disabled={String(w.id) === String(newTransferData.source_warehouse_id)}
                        >
                          {w.name} ({w.warehouse_code})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Logistics Notes / Purpose</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Urgent stock rebalancing for Q4 customer demands"
                    value={newTransferData.notes}
                    onChange={(e) => setNewTransferData({ ...newTransferData, notes: e.target.value })}
                  />
                </div>

                {/* Transfer Items */}
                <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem', marginTop: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <label className="form-label" style={{ margin: 0, color: '#fff' }}>
                      Items to Transfer
                    </label>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={addItemLine}>
                      <Plus size={13} />
                      <span>Add Item</span>
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {newTransferData.items.map((line, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '2fr 1fr auto',
                          gap: '0.75rem',
                          alignItems: 'center',
                          background: 'rgba(255, 255, 255, 0.02)',
                          padding: '0.5rem',
                          borderRadius: '8px',
                          border: '1px solid var(--border-subtle)'
                        }}
                      >
                        <select
                          className="form-select"
                          required
                          value={line.item_id}
                          onChange={(e) => updateItemLine(idx, 'item_id', e.target.value)}
                        >
                          <option value="">Select item from catalog...</option>
                          {catalogItems.map((ci) => (
                            <option key={ci.id} value={ci.id}>
                              {ci.sku} - {ci.name}
                            </option>
                          ))}
                        </select>

                        <input
                          type="number"
                          min="1"
                          step="any"
                          required
                          className="form-input"
                          placeholder="Quantity"
                          value={line.quantity}
                          onChange={(e) => updateItemLine(idx, 'quantity', e.target.value)}
                        />

                        {newTransferData.items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeItemLine(idx)}
                            style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsCreateModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={actionLoading}>
                  {actionLoading ? 'Creating Transfer...' : 'Initiate Transfer Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transfer Detail Modal */}
      {selectedTransfer && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '640px' }}>
            <div className="modal-header">
              <div>
                <h2>{selectedTransfer.transfer_number} Logistics Overview</h2>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Requested {new Date(selectedTransfer.created_at).toLocaleString()}
                </div>
              </div>
              <button className="modal-close-btn" onClick={() => setSelectedTransfer(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '0.85rem', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Origin Warehouse</div>
                  <div style={{ fontWeight: 700, color: '#f59e0b', fontSize: '0.95rem', marginTop: '0.2rem' }}>
                    {selectedTransfer.source_warehouse_name}
                  </div>
                </div>

                <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '0.85rem', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Destination Hub</div>
                  <div style={{ fontWeight: 700, color: '#10b981', fontSize: '0.95rem', marginTop: '0.2rem' }}>
                    {selectedTransfer.destination_warehouse_name}
                  </div>
                </div>
              </div>

              <h3 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                Manifest Items
              </h3>
              <div className="table-wrapper" style={{ marginBottom: '1rem' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>SKU</th>
                      <th>Item Name</th>
                      <th>Quantity Dispatched</th>
                      <th style={{ textAlign: 'right' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedTransfer.items || []).map((item) => (
                      <tr key={item.id}>
                        <td style={{ fontWeight: 700, color: '#fff' }}>{item.sku}</td>
                        <td>{item.item_name}</td>
                        <td style={{ fontWeight: 700, color: '#06b6d4' }}>{item.quantity}</td>
                        <td style={{ textAlign: 'right', color: selectedTransfer.status === 'RECEIVED' ? '#10b981' : 'var(--text-muted)' }}>
                          {selectedTransfer.status === 'RECEIVED' ? 'Delivered' : 'En Route'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                <strong>Logistics Notes:</strong> {selectedTransfer.notes || 'Standard inter-branch transfer'}
              </div>
            </div>

            <div className="modal-footer">
              {selectedTransfer.status !== 'CANCELLED' && selectedTransfer.status !== 'RECEIVED' && (
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => handleCancel(selectedTransfer.id)}
                  disabled={actionLoading}
                >
                  <XCircle size={14} />
                  <span>Cancel Transfer</span>
                </button>
              )}

              {selectedTransfer.status === 'REQUESTED' && (
                <button
                  className="btn btn-primary"
                  onClick={() => handleApprove(selectedTransfer.id)}
                  disabled={actionLoading}
                >
                  <CheckCircle2 size={16} />
                  <span>Approve Transfer</span>
                </button>
              )}

              {(selectedTransfer.status === 'REQUESTED' || selectedTransfer.status === 'APPROVED') && (
                <button
                  className="btn btn-primary"
                  style={{ background: '#06b6d4', borderColor: '#0891b2' }}
                  onClick={() => handleDispatch(selectedTransfer.id)}
                  disabled={actionLoading}
                >
                  <Send size={16} />
                  <span>Dispatch Shipment Now</span>
                </button>
              )}

              {selectedTransfer.status === 'DISPATCHED' && (
                <button
                  className="btn btn-success"
                  onClick={() => handleReceive(selectedTransfer.id)}
                  disabled={actionLoading}
                >
                  <PackageCheck size={16} />
                  <span>Confirm Receipt & Increase Stock</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
