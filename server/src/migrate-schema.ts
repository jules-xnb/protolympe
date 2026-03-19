import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

async function main() {
  const sql = neon(process.env.DATABASE_URL!);

  // Profiles: rename full_name → first_name, add last_name, drop avatar_url & preferred_language
  await sql`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS first_name text`;
  await sql`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_name text`;

  // Migrate existing full_name data (split on last space)
  await sql`
    UPDATE profiles
    SET first_name = CASE
      WHEN full_name IS NOT NULL AND full_name LIKE '% %'
      THEN substring(full_name from 1 for length(full_name) - length(substring(full_name from '([^ ]+)$')))
      ELSE full_name
    END,
    last_name = CASE
      WHEN full_name IS NOT NULL AND full_name LIKE '% %'
      THEN substring(full_name from '([^ ]+)$')
      ELSE NULL
    END
    WHERE full_name IS NOT NULL
  `;

  await sql`ALTER TABLE profiles DROP COLUMN IF EXISTS full_name`;
  await sql`ALTER TABLE profiles DROP COLUMN IF EXISTS avatar_url`;
  await sql`ALTER TABLE profiles DROP COLUMN IF EXISTS preferred_language`;

  // Clients: drop slug, default_language, active_languages
  await sql`ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_slug_unique`;
  await sql`ALTER TABLE clients DROP COLUMN IF EXISTS slug`;
  await sql`ALTER TABLE clients DROP COLUMN IF EXISTS default_language`;
  await sql`ALTER TABLE clients DROP COLUMN IF EXISTS active_languages`;

  console.log('Schema migration complete!');
}

main().catch(console.error);
