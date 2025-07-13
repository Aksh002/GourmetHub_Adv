import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@shared/schema';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Create the connection
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}

console.log('Using database URL:', connectionString);

const client = postgres(connectionString);
export const db = drizzle(client, { schema });

// Test the connection
async function testConnection() {
  try {
    await client`SELECT 1`;
    console.log('Successfully connected to PostgreSQL database');
  } catch (error) {
    console.error('Failed to connect to PostgreSQL database:', error);
    process.exit(1);
  }
}

// Run the test
testConnection(); 