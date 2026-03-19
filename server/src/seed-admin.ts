import 'dotenv/config';
import { eq } from 'drizzle-orm';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './db/schema.js';

async function main() {
  const sql = neon(process.env.DATABASE_URL!);
  const db = drizzle(sql, { schema });

  const [updated] = await db.update(schema.profiles)
    .set({ persona: 'admin_delta' })
    .where(eq(schema.profiles.id, 'aa991ff3-31ed-4c4a-b1c0-71a076372fdb'))
    .returning();

  console.log('Admin persona set:', updated);
}

main().catch(console.error);
