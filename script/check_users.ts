import { db } from '../server/db';
import { users } from '../shared/schema';

(async () => {
  const res = await db.select().from(users);
  console.log('User count:', res.length);
  console.log('Users:', res.map(u => u.username));
  process.exit(0);
})();