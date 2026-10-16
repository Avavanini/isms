import pool from '../config/database.js';

export async function checkDatabaseConnection() {
  try {
    const [rows] = await pool.query('SELECT 1 AS status');
    return Array.isArray(rows) && rows.length > 0;
  } catch (error) {
    if (process.env.NODE_ENV !== 'test') {
      console.warn('Database health check error:', error.message);
    }
    return false;
  }
}

export async function closeDatabasePool() {
  try {
    await pool.end();
  } catch (error) {
    console.error('Error closing database pool:', error);
  }
}
