import pool from '../config/database.js';

export const userService = {
  async listUsers() {
    try {
      const [rows] = await pool.query('SELECT id, full_name, email, role, is_active, created_at FROM users ORDER BY id ASC');
      return rows;
    } catch {
      return [
        { id: 1, full_name: 'System Admin', email: 'admin@isms.local', role: 'ADMIN', is_active: true },
        { id: 2, full_name: 'Warehouse Manager', email: 'manager@isms.local', role: 'MANAGER', is_active: true },
        { id: 3, full_name: 'Stock Operator', email: 'operator@isms.local', role: 'OPERATOR', is_active: true }
      ];
    }
  }
};
