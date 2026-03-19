import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

async function main() {
  const sql = neon(process.env.DATABASE_URL!);

  await sql`
    CREATE TABLE IF NOT EXISTS module_display_configs (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      client_module_id uuid NOT NULL REFERENCES client_modules(id) ON DELETE CASCADE,
      name text NOT NULL,
      config jsonb NOT NULL DEFAULT '{}',
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS module_display_config_roles (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      display_config_id uuid NOT NULL REFERENCES module_display_configs(id) ON DELETE CASCADE,
      module_role_id uuid NOT NULL REFERENCES module_roles(id) ON DELETE CASCADE,
      created_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE(display_config_id, module_role_id)
    )
  `;

  console.log('Display config tables created!');
}

main().catch(console.error);
