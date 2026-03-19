import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

async function main() {
  const sql = neon(process.env.DATABASE_URL!);

  // =============================================
  // Organizational Entities
  // =============================================

  await sql`
    CREATE TABLE IF NOT EXISTS organizational_entities (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      name text NOT NULL,
      code text,
      description text,
      parent_id uuid,
      path text NOT NULL DEFAULT '',
      level integer NOT NULL DEFAULT 0,
      slug text NOT NULL,
      is_active boolean NOT NULL DEFAULT true,
      is_archived boolean NOT NULL DEFAULT false,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      created_by uuid
    )
  `;
  console.log('✓ organizational_entities');

  await sql`
    CREATE TABLE IF NOT EXISTS eo_field_definitions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      name text NOT NULL,
      slug text NOT NULL,
      description text,
      field_type text NOT NULL,
      is_required boolean NOT NULL DEFAULT false,
      is_unique boolean NOT NULL DEFAULT false,
      is_system boolean NOT NULL DEFAULT false,
      is_hidden boolean NOT NULL DEFAULT false,
      is_active boolean NOT NULL DEFAULT true,
      display_order integer NOT NULL DEFAULT 0,
      settings jsonb,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  console.log('✓ eo_field_definitions');

  await sql`
    CREATE TABLE IF NOT EXISTS eo_field_values (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      eo_id uuid NOT NULL REFERENCES organizational_entities(id) ON DELETE CASCADE,
      field_definition_id uuid NOT NULL REFERENCES eo_field_definitions(id) ON DELETE CASCADE,
      value text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      last_modified_by uuid
    )
  `;
  console.log('✓ eo_field_values');

  await sql`
    CREATE TABLE IF NOT EXISTS eo_groups (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      name text NOT NULL,
      description text,
      is_active boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  console.log('✓ eo_groups');

  await sql`
    CREATE TABLE IF NOT EXISTS eo_group_members (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      group_id uuid NOT NULL REFERENCES eo_groups(id) ON DELETE CASCADE,
      eo_id uuid NOT NULL REFERENCES organizational_entities(id) ON DELETE CASCADE,
      include_descendants boolean NOT NULL DEFAULT false,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  console.log('✓ eo_group_members');

  await sql`
    CREATE TABLE IF NOT EXISTS eo_field_change_comments (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      eo_id uuid NOT NULL REFERENCES organizational_entities(id) ON DELETE CASCADE,
      field_definition_id uuid NOT NULL REFERENCES eo_field_definitions(id) ON DELETE CASCADE,
      old_value text,
      new_value text,
      comment text,
      created_at timestamptz NOT NULL DEFAULT now(),
      created_by uuid
    )
  `;
  console.log('✓ eo_field_change_comments');

  await sql`
    CREATE TABLE IF NOT EXISTS eo_audit_log (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      entity_id uuid NOT NULL REFERENCES organizational_entities(id) ON DELETE CASCADE,
      action text NOT NULL,
      changed_by uuid,
      changed_fields jsonb,
      previous_values jsonb,
      new_values jsonb,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  console.log('✓ eo_audit_log');

  await sql`
    CREATE TABLE IF NOT EXISTS eo_export_history (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      exported_by uuid,
      exported_at timestamptz NOT NULL DEFAULT now(),
      row_count integer,
      file_name text
    )
  `;
  console.log('✓ eo_export_history');

  // =============================================
  // Roles
  // =============================================

  await sql`
    CREATE TABLE IF NOT EXISTS role_categories (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      name text NOT NULL,
      slug text NOT NULL,
      description text,
      is_required boolean NOT NULL DEFAULT false,
      is_active boolean NOT NULL DEFAULT true,
      is_archived boolean NOT NULL DEFAULT false,
      display_order integer NOT NULL DEFAULT 0,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  console.log('✓ role_categories');

  await sql`
    CREATE TABLE IF NOT EXISTS roles (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      name text NOT NULL,
      slug text NOT NULL,
      description text,
      color text,
      is_active boolean NOT NULL DEFAULT true,
      is_archived boolean NOT NULL DEFAULT false,
      category_id uuid REFERENCES role_categories(id) ON DELETE SET NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  console.log('✓ roles');

  await sql`
    CREATE TABLE IF NOT EXISTS user_role_assignments (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
      client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      assigned_by uuid REFERENCES profiles(id),
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  console.log('✓ user_role_assignments');

  // =============================================
  // Business Objects
  // =============================================

  await sql`
    CREATE TABLE IF NOT EXISTS business_objects (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      definition_id uuid NOT NULL REFERENCES business_object_definitions(id) ON DELETE CASCADE,
      reference text NOT NULL,
      status text,
      workflow_id uuid,
      current_node_id uuid,
      eo_id uuid REFERENCES organizational_entities(id),
      created_by_user_id uuid NOT NULL REFERENCES profiles(id),
      is_archived boolean NOT NULL DEFAULT false,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  console.log('✓ business_objects');

  await sql`
    CREATE TABLE IF NOT EXISTS field_definitions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      bo_definition_id uuid NOT NULL REFERENCES business_object_definitions(id) ON DELETE CASCADE,
      name text NOT NULL,
      slug text NOT NULL,
      description text,
      field_type text NOT NULL,
      is_required boolean NOT NULL DEFAULT false,
      is_unique boolean NOT NULL DEFAULT false,
      is_system boolean NOT NULL DEFAULT false,
      is_hidden boolean NOT NULL DEFAULT false,
      is_active boolean NOT NULL DEFAULT true,
      display_order integer NOT NULL DEFAULT 0,
      parent_field_id uuid,
      settings jsonb,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  console.log('✓ field_definitions');

  await sql`
    CREATE TABLE IF NOT EXISTS object_field_values (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      business_object_id uuid NOT NULL REFERENCES business_objects(id) ON DELETE CASCADE,
      field_definition_id uuid NOT NULL REFERENCES field_definitions(id) ON DELETE CASCADE,
      value text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      last_modified_by uuid
    )
  `;
  console.log('✓ object_field_values');

  await sql`
    CREATE TABLE IF NOT EXISTS bo_documents (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      business_object_id uuid NOT NULL REFERENCES business_objects(id) ON DELETE CASCADE,
      field_definition_id uuid NOT NULL REFERENCES field_definitions(id) ON DELETE CASCADE,
      file_name text NOT NULL,
      file_path text NOT NULL,
      file_size integer NOT NULL DEFAULT 0,
      mime_type text,
      display_order integer NOT NULL DEFAULT 0,
      uploaded_at timestamptz NOT NULL DEFAULT now(),
      uploaded_by uuid
    )
  `;
  console.log('✓ bo_documents');

  await sql`
    CREATE TABLE IF NOT EXISTS bo_field_value_audit_log (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      business_object_id uuid NOT NULL REFERENCES business_objects(id) ON DELETE CASCADE,
      field_definition_id uuid REFERENCES field_definitions(id),
      field_name text,
      old_value text,
      new_value text,
      changed_by uuid,
      changed_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  console.log('✓ bo_field_value_audit_log');

  await sql`
    CREATE TABLE IF NOT EXISTS object_reference_sequences (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      definition_id uuid NOT NULL REFERENCES business_object_definitions(id) ON DELETE CASCADE,
      prefix text NOT NULL,
      current_value integer NOT NULL DEFAULT 0,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  console.log('✓ object_reference_sequences');

  // =============================================
  // Workflows
  // =============================================

  await sql`
    CREATE TABLE IF NOT EXISTS workflows (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      name text NOT NULL,
      slug text NOT NULL,
      description text,
      bo_definition_id uuid REFERENCES business_object_definitions(id) ON DELETE CASCADE,
      is_active boolean NOT NULL DEFAULT true,
      is_archived boolean NOT NULL DEFAULT false,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  console.log('✓ workflows');

  await sql`
    CREATE TABLE IF NOT EXISTS workflow_nodes (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      workflow_id uuid NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
      name text NOT NULL,
      node_type text NOT NULL,
      position_x integer NOT NULL DEFAULT 0,
      position_y integer NOT NULL DEFAULT 0,
      display_order integer NOT NULL DEFAULT 0,
      config jsonb,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  console.log('✓ workflow_nodes');

  await sql`
    CREATE TABLE IF NOT EXISTS workflow_transitions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      workflow_id uuid NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
      from_node_id uuid NOT NULL REFERENCES workflow_nodes(id) ON DELETE CASCADE,
      to_node_id uuid NOT NULL REFERENCES workflow_nodes(id) ON DELETE CASCADE,
      label text,
      condition jsonb,
      display_order integer NOT NULL DEFAULT 0,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  console.log('✓ workflow_transitions');

  await sql`
    CREATE TABLE IF NOT EXISTS node_sections (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      node_id uuid NOT NULL REFERENCES workflow_nodes(id) ON DELETE CASCADE,
      name text NOT NULL,
      display_order integer NOT NULL DEFAULT 0,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  console.log('✓ node_sections');

  await sql`
    CREATE TABLE IF NOT EXISTS node_fields (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      node_id uuid NOT NULL REFERENCES workflow_nodes(id) ON DELETE CASCADE,
      field_definition_id uuid NOT NULL REFERENCES field_definitions(id) ON DELETE CASCADE,
      is_editable boolean NOT NULL DEFAULT true,
      is_required boolean NOT NULL DEFAULT false,
      is_visible boolean NOT NULL DEFAULT true,
      display_order integer NOT NULL DEFAULT 0,
      section_id uuid REFERENCES node_sections(id) ON DELETE SET NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  console.log('✓ node_fields');

  await sql`
    CREATE TABLE IF NOT EXISTS node_field_role_overrides (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      node_field_id uuid NOT NULL REFERENCES node_fields(id) ON DELETE CASCADE,
      role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
      is_editable boolean,
      is_visible boolean
    )
  `;
  console.log('✓ node_field_role_overrides');

  await sql`
    CREATE TABLE IF NOT EXISTS node_role_permissions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      node_id uuid NOT NULL REFERENCES workflow_nodes(id) ON DELETE CASCADE,
      role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
      can_view boolean NOT NULL DEFAULT false,
      can_edit boolean NOT NULL DEFAULT false,
      can_execute_transition boolean NOT NULL DEFAULT false
    )
  `;
  console.log('✓ node_role_permissions');

  // =============================================
  // Surveys & Campaigns
  // =============================================

  await sql`
    CREATE TABLE IF NOT EXISTS surveys (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      name text NOT NULL,
      description text,
      bo_definition_id uuid REFERENCES business_object_definitions(id) ON DELETE SET NULL,
      settings jsonb,
      is_active boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      created_by uuid
    )
  `;
  console.log('✓ surveys');

  await sql`
    CREATE TABLE IF NOT EXISTS survey_campaigns (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      survey_id uuid NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
      name text NOT NULL,
      description text,
      status text NOT NULL DEFAULT 'draft',
      start_date timestamptz,
      end_date timestamptz,
      settings jsonb,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      created_by uuid
    )
  `;
  console.log('✓ survey_campaigns');

  await sql`
    CREATE TABLE IF NOT EXISTS survey_campaign_targets (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      campaign_id uuid NOT NULL REFERENCES survey_campaigns(id) ON DELETE CASCADE,
      eo_id uuid NOT NULL REFERENCES organizational_entities(id) ON DELETE CASCADE,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  console.log('✓ survey_campaign_targets');

  await sql`
    CREATE TABLE IF NOT EXISTS survey_responses (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      campaign_id uuid NOT NULL REFERENCES survey_campaigns(id) ON DELETE CASCADE,
      business_object_id uuid REFERENCES business_objects(id) ON DELETE SET NULL,
      respondent_eo_id uuid NOT NULL REFERENCES organizational_entities(id),
      status text DEFAULT 'pending',
      current_step_id uuid,
      submitted_at timestamptz,
      validated_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  console.log('✓ survey_responses');

  await sql`
    CREATE TABLE IF NOT EXISTS survey_field_comments (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      response_id uuid NOT NULL REFERENCES survey_responses(id) ON DELETE CASCADE,
      field_definition_id uuid NOT NULL REFERENCES field_definitions(id) ON DELETE CASCADE,
      comment text,
      created_at timestamptz NOT NULL DEFAULT now(),
      created_by uuid
    )
  `;
  console.log('✓ survey_field_comments');

  await sql`
    CREATE TABLE IF NOT EXISTS survey_validation_rules (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      survey_id uuid NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
      field_definition_id uuid REFERENCES field_definitions(id) ON DELETE CASCADE,
      rule_type text,
      config jsonb,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  console.log('✓ survey_validation_rules');

  await sql`
    CREATE TABLE IF NOT EXISTS survey_response_permissions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      survey_id uuid NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
      role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
      can_view boolean NOT NULL DEFAULT false,
      can_edit boolean NOT NULL DEFAULT false,
      can_validate boolean NOT NULL DEFAULT false
    )
  `;
  console.log('✓ survey_response_permissions');

  // =============================================
  // Profile Templates
  // =============================================

  await sql`
    CREATE TABLE IF NOT EXISTS profile_templates (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      name text NOT NULL,
      description text,
      is_active boolean NOT NULL DEFAULT true,
      is_archived boolean NOT NULL DEFAULT false,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  console.log('✓ profile_templates');

  await sql`
    CREATE TABLE IF NOT EXISTS user_profile_templates (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      template_id uuid NOT NULL REFERENCES profile_templates(id) ON DELETE CASCADE,
      client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  console.log('✓ user_profile_templates');

  await sql`
    CREATE TABLE IF NOT EXISTS profile_template_eos (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      template_id uuid NOT NULL REFERENCES profile_templates(id) ON DELETE CASCADE,
      eo_id uuid NOT NULL REFERENCES organizational_entities(id) ON DELETE CASCADE,
      include_descendants boolean NOT NULL DEFAULT false,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  console.log('✓ profile_template_eos');

  await sql`
    CREATE TABLE IF NOT EXISTS profile_template_eo_groups (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      template_id uuid NOT NULL REFERENCES profile_templates(id) ON DELETE CASCADE,
      group_id uuid NOT NULL REFERENCES eo_groups(id) ON DELETE CASCADE,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  console.log('✓ profile_template_eo_groups');

  await sql`
    CREATE TABLE IF NOT EXISTS profile_template_roles (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      template_id uuid NOT NULL REFERENCES profile_templates(id) ON DELETE CASCADE,
      role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  console.log('✓ profile_template_roles');

  // =============================================
  // View & Navigation
  // =============================================

  await sql`
    CREATE TABLE IF NOT EXISTS view_configs (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      name text NOT NULL,
      slug text NOT NULL,
      type text NOT NULL,
      description text,
      bo_definition_id uuid REFERENCES business_object_definitions(id) ON DELETE SET NULL,
      config jsonb,
      is_active boolean DEFAULT true,
      is_default boolean DEFAULT false,
      is_published boolean DEFAULT false,
      published_at timestamptz,
      display_order integer DEFAULT 0,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      created_by uuid
    )
  `;
  console.log('✓ view_configs');

  await sql`
    CREATE TABLE IF NOT EXISTS view_config_widgets (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      view_config_id uuid NOT NULL REFERENCES view_configs(id) ON DELETE CASCADE,
      widget_type text NOT NULL,
      title text,
      config jsonb,
      position_x integer NOT NULL DEFAULT 0,
      position_y integer NOT NULL DEFAULT 0,
      width integer NOT NULL DEFAULT 1,
      height integer NOT NULL DEFAULT 1,
      display_order integer NOT NULL DEFAULT 0,
      is_active boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  console.log('✓ view_config_widgets');

  await sql`
    CREATE TABLE IF NOT EXISTS view_permissions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      view_config_id uuid NOT NULL REFERENCES view_configs(id) ON DELETE CASCADE,
      role_id uuid REFERENCES roles(id) ON DELETE CASCADE,
      category_id uuid REFERENCES role_categories(id) ON DELETE CASCADE,
      can_view boolean DEFAULT false,
      field_overrides jsonb,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  console.log('✓ view_permissions');

  await sql`
    CREATE TABLE IF NOT EXISTS nav_permissions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      navigation_config_id uuid NOT NULL REFERENCES navigation_configs(id) ON DELETE CASCADE,
      role_id uuid REFERENCES roles(id) ON DELETE CASCADE,
      category_id uuid REFERENCES role_categories(id) ON DELETE CASCADE,
      is_visible boolean DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  console.log('✓ nav_permissions');

  // =============================================
  // Reference Data
  // =============================================

  await sql`
    CREATE TABLE IF NOT EXISTS referentials (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      name text NOT NULL,
      slug text NOT NULL,
      description text,
      tag text,
      is_active boolean NOT NULL DEFAULT true,
      is_archived boolean NOT NULL DEFAULT false,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  console.log('✓ referentials');

  await sql`
    CREATE TABLE IF NOT EXISTS referential_values (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      referential_id uuid NOT NULL REFERENCES referentials(id) ON DELETE CASCADE,
      label text NOT NULL,
      code text,
      description text,
      color text,
      icon text,
      display_order integer NOT NULL DEFAULT 0,
      is_active boolean NOT NULL DEFAULT true,
      parent_id uuid,
      level integer DEFAULT 0,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  console.log('✓ referential_values');

  // =============================================
  // Design & i18n
  // =============================================

  await sql`
    CREATE TABLE IF NOT EXISTS client_design_configs (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      primary_color text NOT NULL DEFAULT '#3B82F6',
      secondary_color text NOT NULL DEFAULT '#6B7280',
      text_on_primary text NOT NULL DEFAULT '#FFFFFF',
      text_on_secondary text NOT NULL DEFAULT '#FFFFFF',
      accent_color text,
      border_radius integer NOT NULL DEFAULT 8,
      font_family text NOT NULL DEFAULT 'Inter',
      logo_url text,
      app_name text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  console.log('✓ client_design_configs');

  await sql`
    CREATE TABLE IF NOT EXISTS translations (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      scope text NOT NULL,
      language text NOT NULL,
      key text NOT NULL,
      value text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  console.log('✓ translations');

  // =============================================
  // Tiers
  // =============================================

  await sql`
    CREATE TABLE IF NOT EXISTS tiers (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      name text NOT NULL,
      level integer NOT NULL DEFAULT 0,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  console.log('✓ tiers');

  console.log('\n✅ All tables created successfully!');
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
