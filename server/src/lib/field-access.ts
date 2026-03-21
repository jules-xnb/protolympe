import { db } from '../db/index.js';
import { getUserPermissions, getModuleRoleIds } from './cache.js';
import {
  moduleOrgDisplayConfigs,
  moduleOrgDisplayConfigRoles,
  moduleOrgDisplayConfigFields,
  moduleUsersDisplayConfigs,
  moduleUsersDisplayConfigRoles,
  moduleUsersDisplayConfigFields,
  moduleProfilsDisplayConfigs,
  moduleProfilsDisplayConfigRoles,
  moduleProfilsDisplayConfigFields,
  moduleCvFormDisplayConfigs,
  moduleCvFormDisplayConfigRoles,
  moduleCvFormDisplayConfigFields,
  moduleCvFormFields,
} from '../db/schema.js';
import { eq, and, inArray } from 'drizzle-orm';

/**
 * Returns the set of editable field identifiers for a given user in a module.
 *
 * For fixed fields: the set contains the field_slug (e.g. "name", "description").
 * For custom fields: the set contains the field_definition_id (UUID string).
 *
 * Admin / integrator personas must bypass this check at the call site.
 */
export async function getEditableFieldSlugs(
  userId: string,
  moduleId: string,
  moduleSlug: 'organisation' | 'users' | 'profils',
  activeProfileId?: string
): Promise<Set<string>> {
  const permissions = await getUserPermissions(userId, activeProfileId);
  const roleIds = getModuleRoleIds(permissions, moduleId);

  const editableIds = new Set<string>();

  if (roleIds.length === 0) {
    return editableIds;
  }

  if (moduleSlug === 'organisation') {
    // 1. Find display configs assigned to at least one of the user's roles
    const configRoles = await db
      .select({ displayConfigId: moduleOrgDisplayConfigRoles.displayConfigId })
      .from(moduleOrgDisplayConfigRoles)
      .where(inArray(moduleOrgDisplayConfigRoles.moduleRoleId, roleIds));

    const configIds = [...new Set(configRoles.map((r) => r.displayConfigId))];
    if (configIds.length === 0) return editableIds;

    // 2. Get all fields where can_edit = true across those configs
    const fields = await db
      .select({
        fieldSlug: moduleOrgDisplayConfigFields.fieldSlug,
        eoFieldDefinitionId: moduleOrgDisplayConfigFields.eoFieldDefinitionId,
      })
      .from(moduleOrgDisplayConfigFields)
      .where(
        and(
          inArray(moduleOrgDisplayConfigFields.displayConfigId, configIds),
          eq(moduleOrgDisplayConfigFields.canEdit, true)
        )
      );

    for (const f of fields) {
      if (f.fieldSlug) editableIds.add(f.fieldSlug);
      if (f.eoFieldDefinitionId) editableIds.add(f.eoFieldDefinitionId);
    }
  } else if (moduleSlug === 'users') {
    const configRoles = await db
      .select({ displayConfigId: moduleUsersDisplayConfigRoles.displayConfigId })
      .from(moduleUsersDisplayConfigRoles)
      .where(inArray(moduleUsersDisplayConfigRoles.moduleRoleId, roleIds));

    const configIds = [...new Set(configRoles.map((r) => r.displayConfigId))];
    if (configIds.length === 0) return editableIds;

    const fields = await db
      .select({
        fieldSlug: moduleUsersDisplayConfigFields.fieldSlug,
        userFieldDefinitionId: moduleUsersDisplayConfigFields.userFieldDefinitionId,
      })
      .from(moduleUsersDisplayConfigFields)
      .where(
        and(
          inArray(moduleUsersDisplayConfigFields.displayConfigId, configIds),
          eq(moduleUsersDisplayConfigFields.canEdit, true)
        )
      );

    for (const f of fields) {
      if (f.fieldSlug) editableIds.add(f.fieldSlug);
      if (f.userFieldDefinitionId) editableIds.add(f.userFieldDefinitionId);
    }
  } else if (moduleSlug === 'profils') {
    const configRoles = await db
      .select({ displayConfigId: moduleProfilsDisplayConfigRoles.displayConfigId })
      .from(moduleProfilsDisplayConfigRoles)
      .where(inArray(moduleProfilsDisplayConfigRoles.moduleRoleId, roleIds));

    const configIds = [...new Set(configRoles.map((r) => r.displayConfigId))];
    if (configIds.length === 0) return editableIds;

    const fields = await db
      .select({ fieldSlug: moduleProfilsDisplayConfigFields.fieldSlug })
      .from(moduleProfilsDisplayConfigFields)
      .where(
        and(
          inArray(moduleProfilsDisplayConfigFields.displayConfigId, configIds),
          eq(moduleProfilsDisplayConfigFields.canEdit, true)
        )
      );

    for (const f of fields) {
      editableIds.add(f.fieldSlug);
    }
  }

  return editableIds;
}

/**
 * Returns the set of editable field_definition_ids for a CV form display config,
 * scoped to the user's roles in the given module.
 *
 * Admin / integrator personas must bypass this check at the call site.
 */
export async function getEditableCvFormFieldIds(
  userId: string,
  moduleId: string,
  formId: string,
  activeProfileId?: string
): Promise<Set<string>> {
  const permissions = await getUserPermissions(userId, activeProfileId);
  const roleIds = getModuleRoleIds(permissions, moduleId);

  const editableIds = new Set<string>();

  if (roleIds.length === 0) {
    return editableIds;
  }

  // 1. Find display configs for this form assigned to the user's roles
  const configRoles = await db
    .select({ displayConfigId: moduleCvFormDisplayConfigRoles.displayConfigId })
    .from(moduleCvFormDisplayConfigRoles)
    .innerJoin(
      moduleCvFormDisplayConfigs,
      eq(moduleCvFormDisplayConfigRoles.displayConfigId, moduleCvFormDisplayConfigs.id)
    )
    .where(
      and(
        eq(moduleCvFormDisplayConfigs.formId, formId),
        inArray(moduleCvFormDisplayConfigRoles.moduleRoleId, roleIds)
      )
    );

  const configIds = [...new Set(configRoles.map((r) => r.displayConfigId))];
  if (configIds.length === 0) return editableIds;

  // 2. Get form_field entries where can_edit = true, then resolve to field_definition_id
  const configFields = await db
    .select({ formFieldId: moduleCvFormDisplayConfigFields.formFieldId })
    .from(moduleCvFormDisplayConfigFields)
    .where(
      and(
        inArray(moduleCvFormDisplayConfigFields.displayConfigId, configIds),
        eq(moduleCvFormDisplayConfigFields.canEdit, true)
      )
    );

  const formFieldIds = [...new Set(configFields.map((f) => f.formFieldId))];
  if (formFieldIds.length === 0) return editableIds;

  // 3. Resolve form_field_id → field_definition_id
  const formFields = await db
    .select({ fieldDefinitionId: moduleCvFormFields.fieldDefinitionId })
    .from(moduleCvFormFields)
    .where(inArray(moduleCvFormFields.id, formFieldIds));

  for (const ff of formFields) {
    editableIds.add(ff.fieldDefinitionId);
  }

  return editableIds;
}
