import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

async function main() {
  const sql = neon(process.env.DATABASE_URL!);

  // client_modules
  await sql`
    CREATE TABLE IF NOT EXISTS client_modules (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      module_slug text NOT NULL,
      config jsonb DEFAULT '{}',
      is_active boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE(client_id, module_slug)
    )
  `;

  // module_roles
  await sql`
    CREATE TABLE IF NOT EXISTS module_roles (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      client_module_id uuid NOT NULL REFERENCES client_modules(id) ON DELETE CASCADE,
      name text NOT NULL,
      slug text NOT NULL,
      color text,
      description text,
      is_active boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE(client_module_id, slug)
    )
  `;

  // module_permissions
  await sql`
    CREATE TABLE IF NOT EXISTS module_permissions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      client_module_id uuid NOT NULL REFERENCES client_modules(id) ON DELETE CASCADE,
      permission_slug text NOT NULL,
      module_role_id uuid NOT NULL REFERENCES module_roles(id) ON DELETE CASCADE,
      is_granted boolean NOT NULL DEFAULT false,
      created_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE(client_module_id, permission_slug, module_role_id)
    )
  `;

  // module_workflows
  await sql`
    CREATE TABLE IF NOT EXISTS module_workflows (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      client_module_id uuid NOT NULL REFERENCES client_modules(id) ON DELETE CASCADE,
      name text NOT NULL,
      description text,
      is_active boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `;

  // module_bo_links
  await sql`
    CREATE TABLE IF NOT EXISTS module_bo_links (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      client_module_id uuid NOT NULL REFERENCES client_modules(id) ON DELETE CASCADE,
      bo_definition_id uuid NOT NULL,
      config jsonb,
      display_order integer NOT NULL DEFAULT 0,
      created_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE(client_module_id, bo_definition_id)
    )
  `;

  // navigation_configs
  await sql`
    CREATE TABLE IF NOT EXISTS navigation_configs (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      parent_id uuid,
      label text NOT NULL,
      display_label text,
      slug text NOT NULL,
      icon text,
      type text NOT NULL DEFAULT 'group',
      view_config_id uuid,
      client_module_id uuid REFERENCES client_modules(id) ON DELETE SET NULL,
      url text,
      display_order integer DEFAULT 0,
      is_active boolean DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      created_by uuid
    )
  `;

  console.log('Module system tables created successfully!');
}

main().catch(console.error);
