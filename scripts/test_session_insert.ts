
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import 'dotenv/config';

async function testSessionInsert() {
  const connectionString = process.env.DATABASE_URL;
  const client = postgres(connectionString);

  try {
    const expired = new Date(Date.now() + 1000 * 60 * 60); // 1 hour later
    await client`
      INSERT INTO session (sid, sess, expire) 
      VALUES ('test-sid-' || gen_random_uuid(), '{}', ${expired})
      ON CONFLICT (sid) DO NOTHING
    `;
    console.log('✅ Session INSERT successful!');
  } catch (error) {
    console.error('❌ Session INSERT failed:', error);
  } finally {
    await client.end();
  }
}

testSessionInsert();

