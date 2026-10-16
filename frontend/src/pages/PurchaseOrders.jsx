import { useState, useEffect, useCallback } from 'react';
import { purchaseOrderService, supplierService, inventoryService } from '../services/api.js';
import { useWebSocket } from '../context/WebSocketContext.jsx';
import {
  ShoppingCart,
  Plus,
  CheckCircle2,
  PackageCheck,
  XCircle,
  Trash2,
  Building2,
  Truck,
  Eye,
  X
} from 'lucide-react';

export function PurchaseOrders({ isCreateModalOpen, setIsCreateModalOpen }) {
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [catalogItems, setCatalogItems] = useState([]);
  const [selectedPO, setSelectedPO] = useState(null);
  const [activeTab, setActiveTab] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // New PO Wizard State
  const [newPoData, setNewPoData] = useState({
    supplier_id: '',
    destination_warehouse_id: '',
    expected_delivery_date: '',
    notes: '',
    items: [{ item_id: '', quantity: 100, unit_price: 0 }]
  });

  const { lastEvent } = useWebSocket();

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [posRes, supRes, whRes, itemsRes] = await Promise.all([
        purchaseOrderService.getPurchaseOrders(),
        supplierService.getSuppliers(),
        inventoryService.getWarehouses(),
        inventoryService.getItems()
      ]);
      if (posRes?.data) setPurchaseOrders(posRes.data);
      if (supRes?.data) setSuppliers(supRes.data);
      if (whRes?.data) setWarehouses(whRes.data);
      if (itemsRes?.data) setCatalogItems(itemsRes.data);
    } catch (err) {
      console.warn('PO data load fallback:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData, lastEvent]);

  // Wizard line item manipulation
  const addItemLine = () => {
    setNewPoData((prev) => ({
      ...prev,
      items: [...prev.items, { item_id: '', quantity: 50, unit_price: 0 }]
    }));
  };

  const removeItemLine = (index) => {
    setNewPoData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const updateItemLine = (index, field, value) => {
    setNewPoData((prev) => {
      const items = [...prev.items];
      items[index] = { ...items[index], [field]: value };
      if (field === 'item_id') {
        const matched = catalogItems.find((i) => String(i.id) === String(value));
        if (matched) {
          items[index].unit_price = Number(matched.unit_price);
        }
      }
      return { ...prev, items };
    });
  };

  const handleCreatePO = async (e) => {
    e.preventDefault();
    if (!newPoData.supplier_id || !newPoData.destination_warehouse_id) {
      alert('Please select both a supplier and a destination warehouse.');
      return;
    }
    const validItems = newPoData.items.filter((i) => i.item_id && Number(i.quantity) > 0);
    if (validItems.length === 0) {
      alert('Please add at least one valid item to the purchase order.');
      return;
    }

    setActionLoading(true);
    try {
      await purchaseOrderService.createPurchaseOrder({
        ...newPoData,
        items: validItems
      });
      setIsCreateModalOpen(false);
      setNewPoData({
        supplier_id: '',
        destination_warehouse_id: '',
        expected_delivery_date: '',
        notes: '',
        items: [{ item_id: '', quantity: 100, unit_price: 0 }]
      });
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to create Purchase Order');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprovePO = async (poId) => {
    setActionLoading(true);
    try {
      await purchaseOrderService.approvePurchaseOrder(poId);
      loadData();
      if (selectedPO?.id === poId) {
        const refreshed = await purchaseOrderService.getPurchaseOrder(poId);
        setSelectedPO(refreshed.data);
      }
    } catch (err) {
      alert(err.message || 'Approval failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReceivePO = async (poId) => {
    if (!window.confirm('Receive goods and automatically increase destination warehouse stock?')) return;
    setActionLoading(true);
    try {
      await purchaseOrderService.receivePurchaseOrder(poId);
      loadData();
      if (selectedPO?.id === poId) {
        const refreshed = await purchaseOrderService.getPurchaseOrder(poId);
        setSelectedPO(refreshed.data);
      }
    } catch (err) {
      alert(err.message || 'Receiving failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelPO = async (poId) => {
    if (!window.confirm('Are you sure you want to cancel this purchase order?')) return;
    setActionLoading(true);
    try {
      await purchaseOrderService.cancelPurchaseOrder(poId);
      loadData();
      if (selectedPO?.id === poId) {
        const refreshed = await purchaseOrderService.getPurchaseOrder(poId);
        setSelectedPO(refreshed.data);
      }
    } catch (err) {
      alert(err.message || 'Cancel failed');
    } finally {
      setActionLoading(false);
    }
  };

  // Filtered POs
  const filteredPOs = purchaseOrders.filter((po) => {
    if (activeTab !== 'ALL' && po.status !== activeTab) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const match = po.po_number?.toLowerCase().includes(q)
        || po.supplier_name?.toLowerCase().includes(q)
        || po.warehouse_name?.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const calculateSubtotal = () => {
    return newPoData.items.reduce((sum, item) => {
      const price = Number(item.unit_price) || 0;
      const qty = Number(item.quantity) || 0;
      return sum + (price * qty);
    }, 0);
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <ShoppingCart size={24} style={{ color: '#3b82f6' }} />
            <span>Procurement & Purchase Orders</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
            Multi-stage PO lifecycle workflow: Draft ➔ Pending Approval ➔ Ordered ➔ Received
          </p>
        </div>

        <button className="btn btn-primary" onClick={() => setIsCreateModalOpen(true)}>
          <Plus size={16} />
          <span>New Purchase Order Wizard</span>
        </button>
      </div>

      {/* Filter and Tab Bar */}
      <div className="filter-bar">
        <div className="tabs">
          {['ALL', 'DRAFT', 'PENDING_APPROVAL', 'ORDERED', 'RECEIVED', 'CANCELLED'].map((tab) => (
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
          placeholder="Search PO #, supplier, warehouse..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* PO Data Table */}
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>PO Number</th>
              <th>Supplier</th>
              <th>Destination Hub</th>
              <th>Status Workflow</th>
              <th>Total Amount</th>
              <th>Delivery ETA</th>
              <th>Created Date</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                  Loading purchase orders...
                </td>
              </tr>
            ) : filteredPOs.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                  No purchase orders found matching current filters.
                </td>
              </tr>
            ) : (
              filteredPOs.map((po) => {
                const statusClass =
                  po.status === 'RECEIVED' ? 'badge-received' :
                  po.status === 'ORDERED' ? 'badge-ordered' :
                  po.status === 'PENDING_APPROVAL' ? 'badge-pending' :
                  po.status === 'CANCELLED' ? 'badge-cancelled' : 'badge-draft';

                return (
                  <tr key={po.id}>
                    <td>
                      <span style={{ fontWeight: 700, color: '#fff', fontFamily: 'var(--font-mono)' }}>
                        {po.po_number}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#fff', fontWeight: 600 }}>
                        <Truck size={14} style={{ color: '#3b82f6' }} />
                        <span>{po.supplier_name}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Building2 size={14} style={{ color: '#10b981' }} />
                        <span>{po.warehouse_name}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${statusClass}`}>
                        {po.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700, color: '#10b981' }}>
                      ${Number(po.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td>
                      {po.expected_delivery_date || <span style={{ color: 'var(--text-muted)' }}>TBD</span>}
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      {new Date(po.created_at).toLocaleDateString()}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => setSelectedPO(po)}
                          title="View PO Details & Workflow"
                        >
                          <Eye size={13} />
                          <span>View</span>
                        </button>

                        {(po.status === 'DRAFT' || po.status === 'PENDING_APPROVAL') && (
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => handleApprovePO(po.id)}
                            disabled={actionLoading}
                            title="Approve & Place Order with Supplier"
                          >
                            <CheckCircle2 size={13} />
                            <span>Approve</span>
                          </button>
                        )}

                        {po.status === 'ORDERED' && (
                          <button
                            className="btn btn-success btn-sm"
                            onClick={() => handleReceivePO(po.id)}
                            disabled={actionLoading}
                            title="Receive Shipment & Auto-Update Inventory"
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

      {/* PO Creation Wizard Modal */}
      {isCreateModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '720px' }}>
            <div className="modal-header">
              <h2>Create Purchase Order Wizard</h2>
              <button className="modal-close-btn" onClick={() => setIsCreateModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreatePO}>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Vendor / Supplier *</label>
                    <select
                      className="form-select"
                      required
                      value={newPoData.supplier_id}
                      onChange={(e) => setNewPoData({ ...newPoData, supplier_id: e.target.value })}
                    >
                      <option value="">Select an active supplier...</option>
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} (★ {s.rating || 5.0})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Destination Warehouse *</label>
                    <select
                      className="form-select"
                      required
                      value={newPoData.destination_warehouse_id}
                      onChange={(e) => setNewPoData({ ...newPoData, destination_warehouse_id: e.target.value })}
                    >
                      <option value="">Select receiving warehouse...</option>
                      {warehouses.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name} ({w.warehouse_code})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Expected Delivery ETA</label>
                    <input
                      type="date"
                      className="form-input"
                      value={newPoData.expected_delivery_date}
                      onChange={(e) => setNewPoData({ ...newPoData, expected_delivery_date: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Order Notes / Justification</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Replenishment for assembly line"
                      value={newPoData.notes}
                      onChange={(e) => setNewPoData({ ...newPoData, notes: e.target.value })}
                    />
                  </div>
                </div>

                {/* Dynamic Item Lines */}
                <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem', marginTop: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <label className="form-label" style={{ margin: 0, color: '#fff', fontSize: '0.9rem' }}>
                      Item Lines & Quantities
                    </label>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={addItemLine}>
                      <Plus size={13} />
                      <span>Add Line</span>
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {newPoData.items.map((line, index) => {
                      const lineTotal = (Number(line.quantity) || 0) * (Number(line.unit_price) || 0);
                      return (
                        <div
                          key={index}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '2fr 1fr 1fr 1fr auto',
                            gap: '0.5rem',
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
                            onChange={(e) => updateItemLine(index, 'item_id', e.target.value)}
                          >
                            <option value="">Select item...</option>
                            {catalogItems.map((ci) => (
                              <option key={ci.id} value={ci.id}>
                                {ci.sku} - {ci.name} (${ci.unit_price})
                              </option>
                            ))}
                          </select>

                          <input
                            type="number"
                            min="1"
                            step="any"
                            required
                            className="form-input"
                            placeholder="Qty"
                            value={line.quantity}
                            onChange={(e) => updateItemLine(index, 'quantity', e.target.value)}
                          />

                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            required
                            className="form-input"
                            placeholder="Price"
                            value={line.unit_price}
                            onChange={(e) => updateItemLine(index, 'unit_price', e.target.value)}
                          />

                          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#10b981', textAlign: 'right' }}>
                            ${lineTotal.toFixed(2)}
                          </div>

                          {newPoData.items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeItemLine(index)}
                              style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem', fontSize: '1rem', fontWeight: 700 }}>
                    <span style={{ color: 'var(--text-muted)', marginRight: '0.5rem' }}>Estimated Total:</span>
                    <span style={{ color: '#10b981' }}>${calculateSubtotal().toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsCreateModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={actionLoading}>
                  {actionLoading ? 'Creating PO...' : 'Create Purchase Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PO Details & Lifecycle Modal */}
      {selectedPO && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '680px' }}>
            <div className="modal-header">
              <div>
                <h2>{selectedPO.po_number} Details</h2>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Created {new Date(selectedPO.created_at).toLocaleString()}
                </div>
              </div>
              <button className="modal-close-btn" onClick={() => setSelectedPO(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              {/* Stepper Workflow Visualizer */}
              <div className="stepper">
                {['DRAFT', 'ORDERED', 'RECEIVED'].map((step, idx) => {
                  const isCompleted =
                    selectedPO.status === 'RECEIVED' ||
                    (selectedPO.status === 'ORDERED' && (step === 'DRAFT' || step === 'ORDERED')) ||
                    (selectedPO.status === 'PENDING_APPROVAL' && step === 'DRAFT');
                  const isActive =
                    selectedPO.status === step ||
                    (selectedPO.status === 'PENDING_APPROVAL' && step === 'ORDERED');

                  return (
                    <div
                      key={step}
                      className={`step-item ${isCompleted ? 'completed' : ''} ${isActive ? 'active' : ''}`}
                    >
                      <div className="step-circle">{idx + 1}</div>
                      <div className="step-label">{step}</div>
                    </div>
                  );
                })}
              </div>

              {/* Summary Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', margin: '1.25rem 0' }}>
                <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '0.85rem', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Supplier Vendor</div>
                  <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.95rem', marginTop: '0.2rem' }}>{selectedPO.supplier_name}</div>
                </div>

                <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '0.85rem', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Destination Hub</div>
                  <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.95rem', marginTop: '0.2rem' }}>{selectedPO.warehouse_name}</div>
                </div>
              </div>

              {/* Items List */}
              <h3 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Ordered Line Items
              </h3>
              <div className="table-wrapper" style={{ marginBottom: '1rem' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>SKU</th>
                      <th>Item Description</th>
                      <th>Qty Ordered</th>
                      <th>Qty Received</th>
                      <th>Unit Price</th>
                      <th style={{ textAlign: 'right' }}>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedPO.items || []).map((item) => (
                      <tr key={item.id}>
                        <td style={{ fontWeight: 700, color: '#fff' }}>{item.sku}</td>
                        <td>{item.item_name}</td>
                        <td style={{ fontWeight: 600 }}>{item.quantity}</td>
                        <td style={{ color: item.received_quantity > 0 ? '#10b981' : 'var(--text-muted)' }}>
                          {item.received_quantity || 0}
                        </td>
                        <td>${Number(item.unit_price).toFixed(2)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: '#10b981' }}>
                          ${(Number(item.quantity) * Number(item.unit_price)).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Notes: {selectedPO.notes || 'None provided'}
                </span>
                <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#10b981' }}>
                  Total: ${Number(selectedPO.total_amount).toFixed(2)}
                </span>
              </div>
            </div>

            <div className="modal-footer">
              {selectedPO.status !== 'CANCELLED' && selectedPO.status !== 'RECEIVED' && (
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => handleCancelPO(selectedPO.id)}
                  disabled={actionLoading}
                >
                  <XCircle size={14} />
                  <span>Cancel PO</span>
                </button>
              )}

              {(selectedPO.status === 'DRAFT' || selectedPO.status === 'PENDING_APPROVAL') && (
                <button
                  className="btn btn-primary"
                  onClick={() => handleApprovePO(selectedPO.id)}
                  disabled={actionLoading}
                >
                  <CheckCircle2 size={16} />
                  <span>Approve & Place Order</span>
                </button>
              )}

              {selectedPO.status === 'ORDERED' && (
                <button
                  className="btn btn-success"
                  onClick={() => handleReceivePO(selectedPO.id)}
                  disabled={actionLoading}
                >
                  <PackageCheck size={16} />
                  <span>Receive Shipment & Add Stock</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
