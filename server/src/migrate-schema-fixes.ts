import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

async function main() {
  const sql = neon(process.env.DATABASE_URL!);

  // =============================================
  // 1. Missing columns (ALTER TABLE ADD COLUMN)
  // =============================================

  // business_objects: campaign_id, completed_at
  await sql`ALTER TABLE business_objects ADD COLUMN IF NOT EXISTS campaign_id uuid`;
  await sql`ALTER TABLE business_objects ADD COLUMN IF NOT EXISTS completed_at timestamptz`;
  console.log('+ business_objects: campaign_id, completed_at');

  // field_definitions: calculation_formula, is_readonly, placeholder, referential_id, validation_rules, visibility_conditions
  await sql`ALTER TABLE field_definitions ADD COLUMN IF NOT EXISTS calculation_formula text`;
  await sql`ALTER TABLE field_definitions ADD COLUMN IF NOT EXISTS is_readonly boolean NOT NULL DEFAULT false`;
  await sql`ALTER TABLE field_definitions ADD COLUMN IF NOT EXISTS placeholder text`;
  await sql`ALTER TABLE field_definitions ADD COLUMN IF NOT EXISTS referential_id uuid`;
  await sql`ALTER TABLE field_definitions ADD COLUMN IF NOT EXISTS validation_rules jsonb`;
  await sql`ALTER TABLE field_definitions ADD COLUMN IF NOT EXISTS visibility_conditions jsonb`;
  console.log('+ field_definitions: calculation_formula, is_readonly, placeholder, referential_id, validation_rules, visibility_conditions');

  // client_design_configs: font_size_base, font_weight_main
  await sql`ALTER TABLE client_design_configs ADD COLUMN IF NOT EXISTS font_size_base integer`;
  await sql`ALTER TABLE client_design_configs ADD COLUMN IF NOT EXISTS font_weight_main text`;
  console.log('+ client_design_configs: font_size_base, font_weight_main');

  // eo_groups: created_by, updated_at
  await sql`ALTER TABLE eo_groups ADD COLUMN IF NOT EXISTS created_by uuid`;
  await sql`ALTER TABLE eo_groups ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now()`;
  console.log('+ eo_groups: created_by, updated_at');

  // node_fields: is_required_override, settings, updated_at, visibility_condition
  await sql`ALTER TABLE node_fields ADD COLUMN IF NOT EXISTS is_required_override boolean`;
  await sql`ALTER TABLE node_fields ADD COLUMN IF NOT EXISTS settings jsonb`;
  await sql`ALTER TABLE node_fields ADD COLUMN IF NOT EXISTS updated_at timestamptz`;
  await sql`ALTER TABLE node_fields ADD COLUMN IF NOT EXISTS visibility_condition jsonb`;
  console.log('+ node_fields: is_required_override, settings, updated_at, visibility_condition');

  // node_field_role_overrides: is_required, created_at, updated_at
  await sql`ALTER TABLE node_field_role_overrides ADD COLUMN IF NOT EXISTS is_required boolean`;
  await sql`ALTER TABLE node_field_role_overrides ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now()`;
  await sql`ALTER TABLE node_field_role_overrides ADD COLUMN IF NOT EXISTS updated_at timestamptz`;
  console.log('+ node_field_role_overrides: is_required, created_at, updated_at');

  // =============================================
  // 2. Missing FK constraints
  // =============================================

  // module_bo_links.bo_definition_id -> business_object_definitions.id
  await sql`
    DO $$ BEGIN
      ALTER TABLE module_bo_links
        ADD CONSTRAINT fk_module_bo_links_bo_definition
        FOREIGN KEY (bo_definition_id) REFERENCES business_object_definitions(id) ON DELETE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$
  `;
  console.log('+ FK module_bo_links.bo_definition_id -> business_object_definitions.id');

  // business_objects.workflow_id -> workflows.id
  await sql`
    DO $$ BEGIN
      ALTER TABLE business_objects
        ADD CONSTRAINT fk_business_objects_workflow
        FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE SET NULL;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$
  `;
  console.log('+ FK business_objects.workflow_id -> workflows.id');

  // business_objects.current_node_id -> workflow_nodes.id
  await sql`
    DO $$ BEGIN
      ALTER TABLE business_objects
        ADD CONSTRAINT fk_business_objects_current_node
        FOREIGN KEY (current_node_id) REFERENCES workflow_nodes(id) ON DELETE SET NULL;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$
  `;
  console.log('+ FK business_objects.current_node_id -> workflow_nodes.id');

  // navigation_configs.view_config_id -> view_configs.id
  await sql`
    DO $$ BEGIN
      ALTER TABLE navigation_configs
        ADD CONSTRAINT fk_navigation_configs_view_config
        FOREIGN KEY (view_config_id) REFERENCES view_configs(id) ON DELETE SET NULL;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$
  `;
  console.log('+ FK navigation_configs.view_config_id -> view_configs.id');

  // navigation_configs.created_by -> profiles.id
  await sql`
    DO $$ BEGIN
      ALTER TABLE navigation_configs
        ADD CONSTRAINT fk_navigation_configs_created_by
        FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$
  `;
  console.log('+ FK navigation_configs.created_by -> profiles.id');

  // business_objects.campaign_id -> survey_campaigns.id
  await sql`
    DO $$ BEGIN
      ALTER TABLE business_objects
        ADD CONSTRAINT fk_business_objects_campaign
        FOREIGN KEY (campaign_id) REFERENCES survey_campaigns(id) ON DELETE SET NULL;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$
  `;
  console.log('+ FK business_objects.campaign_id -> survey_campaigns.id');

  // field_definitions.referential_id -> referentials.id
  await sql`
    DO $$ BEGIN
      ALTER TABLE field_definitions
        ADD CONSTRAINT fk_field_definitions_referential
        FOREIGN KEY (referential_id) REFERENCES referentials(id) ON DELETE SET NULL;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$
  `;
  console.log('+ FK field_definitions.referential_id -> referentials.id');

  // --- Self-referencing FKs (via ALTER TABLE to avoid circular issues) ---

  // organizational_entities.parent_id -> organizational_entities.id
  await sql`
    DO $$ BEGIN
      ALTER TABLE organizational_entities
        ADD CONSTRAINT fk_oe_parent
        FOREIGN KEY (parent_id) REFERENCES organizational_entities(id) ON DELETE SET NULL;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$
  `;
  console.log('+ FK organizational_entities.parent_id -> organizational_entities.id');

  // field_definitions.parent_field_id -> field_definitions.id
  await sql`
    DO $$ BEGIN
      ALTER TABLE field_definitions
        ADD CONSTRAINT fk_field_definitions_parent
        FOREIGN KEY (parent_field_id) REFERENCES field_definitions(id) ON DELETE SET NULL;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$
  `;
  console.log('+ FK field_definitions.parent_field_id -> field_definitions.id');

  // referential_values.parent_id -> referential_values.id
  await sql`
    DO $$ BEGIN
      ALTER TABLE referential_values
        ADD CONSTRAINT fk_referential_values_parent
        FOREIGN KEY (parent_id) REFERENCES referential_values(id) ON DELETE SET NULL;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$
  `;
  console.log('+ FK referential_values.parent_id -> referential_values.id');

  // =============================================
  // 3. Unique constraints
  // =============================================

  await sql`CREATE UNIQUE INDEX IF NOT EXISTS uq_bo_definitions_client_slug ON business_object_definitions(client_id, slug)`;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS uq_roles_client_slug ON roles(client_id, slug)`;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS uq_workflows_client_slug ON workflows(client_id, slug)`;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS uq_navigation_configs_client_slug ON navigation_configs(client_id, slug)`;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS uq_referentials_client_slug ON referentials(client_id, slug)`;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS uq_eo_field_definitions_client_slug ON eo_field_definitions(client_id, slug)`;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS uq_field_definitions_bo_def_slug ON field_definitions(bo_definition_id, slug)`;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS uq_integrator_client_assignments_user_client ON integrator_client_assignments(user_id, client_id)`;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS uq_user_role_assignments_user_role_client ON user_role_assignments(user_id, role_id, client_id)`;
  console.log('+ 9 unique constraints created');

  // =============================================
  // 4. Performance indexes
  // =============================================

  // FK lookup indexes
  await sql`CREATE INDEX IF NOT EXISTS idx_business_objects_definition_id ON business_objects(definition_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_business_objects_workflow_id ON business_objects(workflow_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_business_objects_current_node_id ON business_objects(current_node_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_business_objects_eo_id ON business_objects(eo_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_business_objects_campaign_id ON business_objects(campaign_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_business_objects_created_by ON business_objects(created_by_user_id)`;

  await sql`CREATE INDEX IF NOT EXISTS idx_field_definitions_bo_definition_id ON field_definitions(bo_definition_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_field_definitions_parent_field_id ON field_definitions(parent_field_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_field_definitions_referential_id ON field_definitions(referential_id)`;

  await sql`CREATE INDEX IF NOT EXISTS idx_object_field_values_bo_id ON object_field_values(business_object_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_object_field_values_field_def_id ON object_field_values(field_definition_id)`;

  await sql`CREATE INDEX IF NOT EXISTS idx_organizational_entities_client_id ON organizational_entities(client_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_organizational_entities_parent_id ON organizational_entities(parent_id)`;

  await sql`CREATE INDEX IF NOT EXISTS idx_workflows_client_id ON workflows(client_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_workflows_bo_definition_id ON workflows(bo_definition_id)`;

  await sql`CREATE INDEX IF NOT EXISTS idx_workflow_nodes_workflow_id ON workflow_nodes(workflow_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_workflow_transitions_workflow_id ON workflow_transitions(workflow_id)`;

  await sql`CREATE INDEX IF NOT EXISTS idx_node_fields_node_id ON node_fields(node_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_node_fields_field_definition_id ON node_fields(field_definition_id)`;

  await sql`CREATE INDEX IF NOT EXISTS idx_node_field_role_overrides_node_field_id ON node_field_role_overrides(node_field_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_node_field_role_overrides_role_id ON node_field_role_overrides(role_id)`;

  await sql`CREATE INDEX IF NOT EXISTS idx_node_role_permissions_node_id ON node_role_permissions(node_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_node_role_permissions_role_id ON node_role_permissions(role_id)`;

  await sql`CREATE INDEX IF NOT EXISTS idx_module_bo_links_bo_definition_id ON module_bo_links(bo_definition_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_module_bo_links_client_module_id ON module_bo_links(client_module_id)`;

  await sql`CREATE INDEX IF NOT EXISTS idx_navigation_configs_client_id ON navigation_configs(client_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_navigation_configs_parent_id ON navigation_configs(parent_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_navigation_configs_view_config_id ON navigation_configs(view_config_id)`;

  await sql`CREATE INDEX IF NOT EXISTS idx_view_configs_client_id ON view_configs(client_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_view_configs_bo_definition_id ON view_configs(bo_definition_id)`;

  await sql`CREATE INDEX IF NOT EXISTS idx_referential_values_referential_id ON referential_values(referential_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_referential_values_parent_id ON referential_values(parent_id)`;

  await sql`CREATE INDEX IF NOT EXISTS idx_surveys_client_id ON surveys(client_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_survey_campaigns_survey_id ON survey_campaigns(survey_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_survey_responses_campaign_id ON survey_responses(campaign_id)`;

  await sql`CREATE INDEX IF NOT EXISTS idx_user_role_assignments_user_id ON user_role_assignments(user_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_user_role_assignments_role_id ON user_role_assignments(role_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_user_role_assignments_client_id ON user_role_assignments(client_id)`;

  await sql`CREATE INDEX IF NOT EXISTS idx_integrator_client_assignments_user_id ON integrator_client_assignments(user_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_integrator_client_assignments_client_id ON integrator_client_assignments(client_id)`;

  await sql`CREATE INDEX IF NOT EXISTS idx_user_client_memberships_user_id ON user_client_memberships(user_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_user_client_memberships_client_id ON user_client_memberships(client_id)`;

  await sql`CREATE INDEX IF NOT EXISTS idx_eo_field_values_eo_id ON eo_field_values(eo_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_eo_field_values_field_def_id ON eo_field_values(field_definition_id)`;

  await sql`CREATE INDEX IF NOT EXISTS idx_eo_group_members_group_id ON eo_group_members(group_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_eo_group_members_eo_id ON eo_group_members(eo_id)`;

  await sql`CREATE INDEX IF NOT EXISTS idx_bo_definitions_client_id ON business_object_definitions(client_id)`;

  await sql`CREATE INDEX IF NOT EXISTS idx_roles_client_id ON roles(client_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_roles_category_id ON roles(category_id)`;

  await sql`CREATE INDEX IF NOT EXISTS idx_client_modules_client_id ON client_modules(client_id)`;

  console.log('+ FK lookup indexes created');

  // Filter indexes: (client_id, is_active) and (client_id, slug) on client-scoped tables
  await sql`CREATE INDEX IF NOT EXISTS idx_bo_definitions_client_active ON business_object_definitions(client_id, is_active)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_bo_definitions_client_slug ON business_object_definitions(client_id, slug)`;

  await sql`CREATE INDEX IF NOT EXISTS idx_roles_client_active ON roles(client_id, is_active)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_roles_client_slug ON roles(client_id, slug)`;

  await sql`CREATE INDEX IF NOT EXISTS idx_workflows_client_active ON workflows(client_id, is_active)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_workflows_client_slug ON workflows(client_id, slug)`;

  await sql`CREATE INDEX IF NOT EXISTS idx_navigation_configs_client_active ON navigation_configs(client_id, is_active)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_navigation_configs_client_slug ON navigation_configs(client_id, slug)`;

  await sql`CREATE INDEX IF NOT EXISTS idx_referentials_client_active ON referentials(client_id, is_active)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_referentials_client_slug ON referentials(client_id, slug)`;

  await sql`CREATE INDEX IF NOT EXISTS idx_eo_field_defs_client_active ON eo_field_definitions(client_id, is_active)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_eo_field_defs_client_slug ON eo_field_definitions(client_id, slug)`;

  await sql`CREATE INDEX IF NOT EXISTS idx_oe_client_active ON organizational_entities(client_id, is_active)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_oe_client_slug ON organizational_entities(client_id, slug)`;

  await sql`CREATE INDEX IF NOT EXISTS idx_client_modules_client_active ON client_modules(client_id, is_active)`;

  console.log('+ filter indexes (client_id, is_active) and (client_id, slug) created');

  // organizational_entities.path for hierarchy queries
  await sql`CREATE INDEX IF NOT EXISTS idx_oe_path ON organizational_entities(path)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_oe_path_text_pattern ON organizational_entities(path text_pattern_ops)`;
  console.log('+ organizational_entities.path index created');

  // business_objects.status
  await sql`CREATE INDEX IF NOT EXISTS idx_business_objects_status ON business_objects(status)`;
  console.log('+ business_objects.status index created');

  console.log('\nAll schema fixes applied successfully!');
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
