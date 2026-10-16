import { useState, useEffect, useCallback } from 'react';
import { supplierService } from '../services/api.js';
import { Truck, Plus, Star, Mail, Phone, MapPin, X } from 'lucide-react';

export function Suppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    contact_name: '',
    email: '',
    phone: '',
    address: '',
    rating: 4.8
  });

  const loadSuppliers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await supplierService.getSuppliers();
      if (res?.data) {
        setSuppliers(res.data);
      }
    } catch (err) {
      console.warn('Suppliers load fallback:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSuppliers();
  }, [loadSuppliers]);

  const handleCreateSupplier = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email) {
      alert('Supplier name and email are required');
      return;
    }

    setActionLoading(true);
    try {
      await supplierService.createSupplier(formData);
      setIsModalOpen(false);
      setFormData({
        name: '',
        contact_name: '',
        email: '',
        phone: '',
        address: '',
        rating: 4.8
      });
      loadSuppliers();
    } catch (err) {
      alert(err.message || 'Failed to save supplier');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleActive = async (supplier) => {
    try {
      await supplierService.updateSupplier(supplier.id, { is_active: !supplier.is_active });
      loadSuppliers();
    } catch (err) {
      alert(err.message || 'Update failed');
    }
  };

  const filteredSuppliers = suppliers.filter((s) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        s.name?.toLowerCase().includes(q) ||
        s.contact_name?.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="page-container">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Truck size={24} style={{ color: '#10b981' }} />
            <span>Supplier & Vendor Directory</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
            Manage strategic component vendors, performance ratings, and procurement channels.
          </p>
        </div>

        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={16} />
          <span>Add New Supplier</span>
        </button>
      </div>

      {/* Search Input */}
      <div style={{ marginBottom: '1.5rem' }}>
        <input
          type="text"
          className="search-input"
          style={{ width: '100%', maxWidth: '400px' }}
          placeholder="Search supplier name, contact, or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Grid */}
      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading suppliers...
        </div>
      ) : filteredSuppliers.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          No suppliers found matching your query.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
          {filteredSuppliers.map((s) => (
            <div key={s.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', marginBottom: '0.2rem' }}>
                      {s.name}
                    </h3>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-primary)', fontWeight: 600 }}>
                      {s.contact_name || 'Direct Sales Representative'}
                    </div>
                  </div>

                  <span className={`badge ${s.is_active ? 'badge-received' : 'badge-draft'}`}>
                    {s.is_active ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                </div>

                {/* Rating */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '1rem', color: '#f59e0b', fontSize: '0.85rem' }}>
                  <Star size={16} fill="#f59e0b" />
                  <strong style={{ color: '#fff' }}>{Number(s.rating || 5.0).toFixed(1)}</strong>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Vendor Reliability Score</span>
                </div>

                {/* Details */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Mail size={14} style={{ color: 'var(--text-muted)' }} />
                    <a href={`mailto:${s.email}`} style={{ color: '#60a5fa', textDecoration: 'none' }}>
                      {s.email}
                    </a>
                  </div>

                  {s.phone && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Phone size={14} style={{ color: 'var(--text-muted)' }} />
                      <span>{s.phone}</span>
                    </div>
                  )}

                  {s.address && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                      <MapPin size={14} style={{ color: 'var(--text-muted)', marginTop: '2px', flexShrink: 0 }} />
                      <span>{s.address}</span>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ marginTop: '1.25rem', paddingTop: '0.85rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleToggleActive(s)}
                >
                  {s.is_active ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Supplier Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <h2>Register New Vendor / Supplier</h2>
              <button className="modal-close-btn" onClick={() => setIsModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSupplier}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Company / Supplier Name *</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    placeholder="e.g. Apex Sensor Systems Ltd"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Contact Person Name</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Kenji Takahashi"
                    value={formData.contact_name}
                    onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Official Email *</label>
                    <input
                      type="email"
                      required
                      className="form-input"
                      placeholder="sales@vendor.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Phone Number</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="+1 (555) 000-0000"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Corporate Address / Hub</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Street, City, State/Country"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Initial Performance Rating (1.0 to 5.0)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="1.0"
                    max="5.0"
                    className="form-input"
                    value={formData.rating}
                    onChange={(e) => setFormData({ ...formData, rating: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={actionLoading}>
                  {actionLoading ? 'Saving Supplier...' : 'Register Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
