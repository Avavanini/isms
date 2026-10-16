import pool from '../config/database.js';

let fallbackSuppliers = [
  {
    id: 1,
    name: 'Global Silicon Dynamics',
    contact_name: 'Elena Rostov',
    email: 'orders@globalsilicondynamics.com',
    phone: '+1 (408) 555-0192',
    address: '740 Microchip Parkway, San Jose, CA',
    rating: 4.9,
    is_active: true,
    created_at: new Date(Date.now() - 60 * 86400000).toISOString()
  },
  {
    id: 2,
    name: 'Apex Sensor Systems Ltd',
    contact_name: 'Kenji Takahashi',
    email: 'sales@apexsensors.io',
    phone: '+1 (650) 555-8321',
    address: '12 Innovation Way, Tokyo Tech Hub',
    rating: 4.8,
    is_active: true,
    created_at: new Date(Date.now() - 45 * 86400000).toISOString()
  },
  {
    id: 3,
    name: 'Voltaic Energy Solutions',
    contact_name: 'David Miller',
    email: 'b2b@voltaic-energy.com',
    phone: '+1 (312) 555-4920',
    address: '88 Battery Drive, Chicago, IL',
    rating: 4.7,
    is_active: true,
    created_at: new Date(Date.now() - 30 * 86400000).toISOString()
  },
  {
    id: 4,
    name: 'Precision Enclosures Corp',
    contact_name: 'Sophie Dubois',
    email: 'supply@precisionenclosures.com',
    phone: '+1 (512) 555-3104',
    address: '500 Fabrication Blvd, Austin, TX',
    rating: 4.6,
    is_active: true,
    created_at: new Date(Date.now() - 20 * 86400000).toISOString()
  }
];

export const supplierService = {
  async listSuppliers(query = {}) {
    try {
      let sql = 'SELECT * FROM suppliers WHERE 1=1';
      const params = [];
      if (query.search) {
        sql += ' AND (name LIKE ? OR contact_name LIKE ? OR email LIKE ?)';
        params.push(`%${query.search}%`, `%${query.search}%`, `%${query.search}%`);
      }
      if (query.is_active !== undefined) {
        sql += ' AND is_active = ?';
        params.push(query.is_active === 'true' || query.is_active === true ? 1 : 0);
      }
      sql += ' ORDER BY is_active DESC, name ASC';
      const [rows] = await pool.query(sql, params);
      if (Array.isArray(rows) && rows.length > 0) return rows;
    } catch {
      // Fallback
    }

    return fallbackSuppliers.filter((s) => {
      if (query.search) {
        const q = query.search.toLowerCase();
        const match = s.name.toLowerCase().includes(q)
          || (s.contact_name && s.contact_name.toLowerCase().includes(q))
          || s.email.toLowerCase().includes(q);
        if (!match) return false;
      }
      if (query.is_active !== undefined) {
        const active = query.is_active === 'true' || query.is_active === true;
        if (s.is_active !== active) return false;
      }
      return true;
    });
  },

  async getSupplierById(id) {
    try {
      const [rows] = await pool.query('SELECT * FROM suppliers WHERE id = ? LIMIT 1', [id]);
      if (Array.isArray(rows) && rows.length > 0) return rows[0];
    } catch {
      // Fallback
    }
    return fallbackSuppliers.find((s) => String(s.id) === String(id)) || null;
  },

  async createSupplier(data) {
    const { name, contact_name, email, phone, address, rating = 5.0 } = data;
    try {
      const [result] = await pool.query(
        `INSERT INTO suppliers (name, contact_name, email, phone, address, rating)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [name, contact_name || null, email, phone || null, address || null, rating]
      );
      return this.getSupplierById(result.insertId);
    } catch {
      // Fallback
      const newSup = {
        id: fallbackSuppliers.length + 1,
        name,
        contact_name: contact_name || '',
        email,
        phone: phone || '',
        address: address || '',
        rating: Number(rating) || 5.0,
        is_active: true,
        created_at: new Date().toISOString()
      };
      fallbackSuppliers.push(newSup);
      return newSup;
    }
  },

  async updateSupplier(id, data) {
    const { name, contact_name, email, phone, address, rating, is_active } = data;
    try {
      await pool.query(
        `UPDATE suppliers
         SET name = COALESCE(?, name),
             contact_name = COALESCE(?, contact_name),
             email = COALESCE(?, email),
             phone = COALESCE(?, phone),
             address = COALESCE(?, address),
             rating = COALESCE(?, rating),
             is_active = COALESCE(?, is_active)
         WHERE id = ?`,
        [name, contact_name, email, phone, address, rating, is_active, id]
      );
      return this.getSupplierById(id);
    } catch {
      // Fallback
      const s = fallbackSuppliers.find((item) => String(item.id) === String(id));
      if (s) {
        if (name !== undefined) s.name = name;
        if (contact_name !== undefined) s.contact_name = contact_name;
        if (email !== undefined) s.email = email;
        if (phone !== undefined) s.phone = phone;
        if (address !== undefined) s.address = address;
        if (rating !== undefined) s.rating = Number(rating);
        if (is_active !== undefined) s.is_active = Boolean(is_active);
      }
      return s;
    }
  },

  async deleteSupplier(id) {
    return this.updateSupplier(id, { is_active: false });
  }
};
