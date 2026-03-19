import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

async function main() {
  const sql = neon(process.env.DATABASE_URL!);
  await sql`UPDATE profiles SET first_name = trim(first_name), last_name = trim(last_name)`;
  console.log('Names trimmed');
}

main().catch(console.error);
