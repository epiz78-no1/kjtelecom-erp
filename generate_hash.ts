
import bcrypt from 'bcryptjs';
const hash = await bcrypt.hash('admin', 10);
console.log(hash);
