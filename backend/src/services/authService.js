import pool from '../config/database.js';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export const authService = {
  async getCurrentUser(req) {
    // Check session cookie or authorization header or fallback to mock admin for dev
    const token = req.cookies?.isms_session || req.headers?.authorization?.replace('Bearer ', '');
    if (token) {
      try {
        const decoded = jwt.verify(token, env.jwtSecret);
        return {
          id: decoded.id || 1,
          full_name: decoded.full_name || 'Admin User',
          email: decoded.email || 'admin@isms.local',
          role: decoded.role || 'ADMIN',
          is_active: true
        };
      } catch {
        // Invalid or expired token
      }
    }
    // Return standard active user for development/demonstration
    return {
      id: 1,
      full_name: 'Admin User',
      email: 'admin@isms.local',
      role: 'ADMIN',
      is_active: true
    };
  },

  async login(email, _password) {
    // Try DB first if available
    try {
      const [users] = await pool.query('SELECT id, full_name, email, role, is_active FROM users WHERE email = ? LIMIT 1', [email]);
      if (Array.isArray(users) && users.length > 0 && users[0].is_active) {
        const user = users[0];
        const token = jwt.sign({ id: user.id, email: user.email, role: user.role, full_name: user.full_name }, env.jwtSecret, { expiresIn: '15m' });
        return { user, token };
      }
    } catch {
      // Fallback
    }

    const user = {
      id: 1,
      full_name: email.split('@')[0] || 'Admin User',
      email: email || 'admin@isms.local',
      role: 'ADMIN',
      is_active: true
    };
    const token = jwt.sign(user, env.jwtSecret, { expiresIn: '15m' });
    return { user, token };
  },

  async logout(_token) {
    return true;
  }
};
