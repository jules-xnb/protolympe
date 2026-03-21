import { db } from '../db/index.js';
import {
  accounts,
  integratorClientAssignments,
  userClientMemberships,
  clientProfiles,
  clientProfileModuleRoles,
  clientProfileEos,
  clientProfileEoGroups,
  eoGroups,
  eoGroupMembers,
  eoEntities,
  modulePermissions,
  moduleRoles,
} from '../db/schema.js';
import { eq, and, inArray, like, isNull } from 'drizzle-orm';

const CACHE_TTL_MS = 60_000; // 1 minute

export interface CachedPermissions {
  clientIds: string[];
  activeProfileId: string | null;
  activeProfileClientId: string | null;
  moduleRoles: { moduleId: string; roleId: string; roleName: string }[];
  permissionsByModule: Record<string, Record<string, boolean>>;
  eoIds: Set<string>;
  loadedAt: number;
}

const cache = new Map<string, CachedPermissions>();

function isExpired(entry: CachedPermissions): boolean {
  return Date.now() - entry.loadedAt > CACHE_TTL_MS;
}

export function invalidateUserCache(userId: string): void {
  // Invalidate all cache entries for this user (any profile)
  for (const key of cache.keys()) {
    if (key.startsWith(userId)) {
      cache.delete(key);
    }
  }
}

/**
 * Get permissions for a user.
 * For client_user: permissions are scoped to the active profile.
 * For admin/integrator: no profile needed, full access to assigned clients.
 */
export async function getUserPermissions(userId: string, activeProfileId?: string): Promise<CachedPermissions> {
  const cacheKey = activeProfileId ? `${userId}:${activeProfileId}` : userId;
  const existing = cache.get(cacheKey);
  if (existing && !isExpired(existing)) {
    return existing;
  }

  const [account] = await db
    .select({ persona: accounts.persona })
    .from(accounts)
    .where(eq(accounts.id, userId))
    .limit(1);

  if (!account) {
    throw new Error('Account not found');
  }

  const persona = account.persona;
  let clientIds: string[] = [];

  if (persona === 'admin_delta') {
    clientIds = [];
  } else if (persona === 'integrator_delta' || persona === 'integrator_external') {
    const assignments = await db
      .select({ clientId: integratorClientAssignments.clientId })
      .from(integratorClientAssignments)
      .where(and(eq(integratorClientAssignments.userId, userId), isNull(integratorClientAssignments.deletedAt)));
    clientIds = assignments.map((a) => a.clientId);
  } else {
    const memberships = await db
      .select({ clientId: userClientMemberships.clientId })
      .from(userClientMemberships)
      .where(and(eq(userClientMemberships.userId, userId), eq(userClientMemberships.isActive, true)));
    clientIds = memberships.map((m) => m.clientId);
  }

  // For admin/integrator: no profile-scoped permissions
  if (persona !== 'client_user' || !activeProfileId) {
    const result: CachedPermissions = {
      clientIds,
      activeProfileId: null,
      activeProfileClientId: null,
      moduleRoles: [],
      permissionsByModule: {},
      eoIds: new Set(),
      loadedAt: Date.now(),
    };
    cache.set(cacheKey, result);
    return result;
  }

  // === CLIENT_USER with active profile ===

  // Verify the profile exists, is not archived, and belongs to the user
  const [profile] = await db
    .select({ id: clientProfiles.id, clientId: clientProfiles.clientId })
    .from(clientProfiles)
    .where(and(eq(clientProfiles.id, activeProfileId), eq(clientProfiles.isArchived, false)));

  if (!profile) {
    throw new Error('Profile not found or archived');
  }

  // Load module roles for THIS profile only (not all profiles)
  const profileRoles = await db
    .select({
      moduleRoleId: clientProfileModuleRoles.moduleRoleId,
      roleName: moduleRoles.name,
      clientModuleId: moduleRoles.clientModuleId,
    })
    .from(clientProfileModuleRoles)
    .innerJoin(moduleRoles, eq(clientProfileModuleRoles.moduleRoleId, moduleRoles.id))
    .where(and(
      eq(clientProfileModuleRoles.profileId, activeProfileId),
      isNull(clientProfileModuleRoles.deletedAt),
      eq(moduleRoles.isActive, true)
    ));

  const moduleRolesList = profileRoles.map((pr) => ({
    moduleId: pr.clientModuleId,
    roleId: pr.moduleRoleId,
    roleName: pr.roleName,
  }));

  // Load permissions for the roles of this profile
  const permissionsByModule: Record<string, Record<string, boolean>> = {};
  const allRoleIds = profileRoles.map((pr) => pr.moduleRoleId);

  if (allRoleIds.length > 0) {
    const perms = await db
      .select({
        moduleRoleId: modulePermissions.moduleRoleId,
        permissionSlug: modulePermissions.permissionSlug,
        isGranted: modulePermissions.isGranted,
        clientModuleId: modulePermissions.clientModuleId,
      })
      .from(modulePermissions)
      .where(inArray(modulePermissions.moduleRoleId, allRoleIds));

    for (const p of perms) {
      if (!permissionsByModule[p.clientModuleId]) permissionsByModule[p.clientModuleId] = {};
      if (p.isGranted) {
        permissionsByModule[p.clientModuleId][p.permissionSlug] = true;
      }
    }
  }

  // Load EO perimeter for THIS profile only
  const eoIds = new Set<string>();

  // Direct EO assignments
  const directEos = await db
    .select({
      eoId: clientProfileEos.eoId,
      includeDescendants: clientProfileEos.includeDescendants,
    })
    .from(clientProfileEos)
    .where(and(eq(clientProfileEos.profileId, activeProfileId), isNull(clientProfileEos.deletedAt)));

  // Group EO assignments (exclude inactive groups)
  const groupAssignments = await db
    .select({ groupId: clientProfileEoGroups.groupId })
    .from(clientProfileEoGroups)
    .innerJoin(eoGroups, eq(clientProfileEoGroups.groupId, eoGroups.id))
    .where(and(
      eq(clientProfileEoGroups.profileId, activeProfileId),
      isNull(clientProfileEoGroups.deletedAt),
      eq(eoGroups.isActive, true)
    ));

  const groupIds = groupAssignments.map((g) => g.groupId);
  let groupMembersList: { eoId: string; includeDescendants: boolean }[] = [];
  if (groupIds.length > 0) {
    groupMembersList = await db
      .select({
        eoId: eoGroupMembers.eoId,
        includeDescendants: eoGroupMembers.includeDescendants,
      })
      .from(eoGroupMembers)
      .where(and(inArray(eoGroupMembers.groupId, groupIds), isNull(eoGroupMembers.deletedAt)));
  }

  // Combine all EO entries
  const allEoEntries = [
    ...directEos.map((e) => ({ eoId: e.eoId, includeDescendants: e.includeDescendants })),
    ...groupMembersList,
  ];

  // Resolve each EO (exclude archived and inactive)
  for (const entry of allEoEntries) {
    const [eo] = await db
      .select({ id: eoEntities.id, path: eoEntities.path, isActive: eoEntities.isActive, isArchived: eoEntities.isArchived })
      .from(eoEntities)
      .where(eq(eoEntities.id, entry.eoId))
      .limit(1);

    if (!eo || eo.isArchived || !eo.isActive) continue;

    eoIds.add(entry.eoId);

    if (entry.includeDescendants) {
      const prefix = eo.path ? `${eo.path}/${eo.id}` : eo.id;
      const descendants = await db
        .select({ id: eoEntities.id })
        .from(eoEntities)
        .where(
          and(
            eq(eoEntities.clientId, profile.clientId),
            like(eoEntities.path, `${prefix}%`),
            eq(eoEntities.isActive, true),
            eq(eoEntities.isArchived, false)
          )
        );

      for (const d of descendants) {
        eoIds.add(d.id);
      }
    }
  }

  const result: CachedPermissions = {
    clientIds,
    activeProfileId,
    activeProfileClientId: profile.clientId,
    moduleRoles: moduleRolesList,
    permissionsByModule,
    eoIds,
    loadedAt: Date.now(),
  };

  cache.set(cacheKey, result);
  return result;
}

export function hasClientAccess(permissions: CachedPermissions, clientId: string, persona: string): boolean {
  if (persona === 'admin_delta') return true;
  return permissions.clientIds.includes(clientId);
}

export function hasModuleRole(permissions: CachedPermissions, moduleId: string): boolean {
  return permissions.moduleRoles.some((r) => r.moduleId === moduleId);
}

export function hasModulePermission(permissions: CachedPermissions, moduleId: string, permission: string): boolean {
  const modulePerms = permissions.permissionsByModule[moduleId];
  return modulePerms?.[permission] === true;
}

export function getModuleRoleIds(permissions: CachedPermissions, moduleId: string): string[] {
  return permissions.moduleRoles
    .filter((r) => r.moduleId === moduleId)
    .map((r) => r.roleId);
}

export function isInEoPerimeter(permissions: CachedPermissions, eoId: string): boolean {
  return permissions.eoIds.has(eoId);
}
