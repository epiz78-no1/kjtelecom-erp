
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import 'dotenv/config';

async function checkSessionTable() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
      console.error('DATABASE_URL is missing');
      return;
  }
  const client = postgres(connectionString);
  const db = drizzle(client);

  try {
    const result = await client`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'session';
    `;
    
    if (result.length > 0) {
      console.log('✅ session table found!');
    } else {
      console.error('❌ session table NOT found!');
    }
  } catch (error) {
    console.error('Error querying DB:', error);
  } finally {
    await client.end();
  }
}

checkSessionTable();

