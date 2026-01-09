
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import 'dotenv/config';

async function checkUsers() {
  const connectionString = process.env.DATABASE_URL;
  const client = postgres(connectionString);

  try {
    const result = await client`SELECT count(*) FROM users`;
    console.log('User count:', result[0].count);
    
    if (result[0].count > 0) {
      const users = await client`SELECT username FROM users LIMIT 5`;
      console.log('Existing users:', users.map(u => u.username));
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

checkUsers();

