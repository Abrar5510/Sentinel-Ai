import { db } from './client';

export async function initializeDatabase() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT UNIQUE NOT NULL,
      circle_wallet_id TEXT,
      wallet_address TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
    
    CREATE TABLE IF NOT EXISTS positions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id),
      protocol_name TEXT NOT NULL,
      protocol_address TEXT NOT NULL,
      amount DECIMAL(20,6) NOT NULL,
      last_health_score INTEGER DEFAULT 100,
      last_updated TIMESTAMP DEFAULT NOW()
    );
  `);
}