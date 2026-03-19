import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './db/schema.js';

async function main() {
  const sql = neon(process.env.DATABASE_URL!);
  const db = drizzle(sql, { schema });

  const [role] = await db.insert(schema.userSystemRoles).values({
    userId: 'aa991ff3-31ed-4c4a-b1c0-71a076372fdb',
    persona: 'admin_delta',
  }).returning();

  console.log('Admin role created:', role);
}

main().catch(console.error);
