import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

const port = Number(process.env.PORT) || 3000;
const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim())
  : ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000'];

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port,
  corsOrigins,
  jwtSecret: process.env.JWT_SECRET || 'isms-dev-super-secure-jwt-secret-key-32chars+',
  cookieSecure: process.env.COOKIE_SECURE === 'true',
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    name: process.env.DB_NAME || 'isms_db',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || ''
  }
};
