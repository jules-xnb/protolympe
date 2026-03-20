import { db } from '../db/index.js';
import {
  accounts,
  integratorClientAssignments,
  userClientMemberships,
  clientProfileUsers,
  clientProfiles,
  clientProfileModuleRoles,
  clientProfileEos,
  clientProfileEoGroups,
  eoGroupMembers,
  eoEntities,
  modulePermissions,
  moduleRoles,
} from '../db/schema.js';
import { eq, and, inArray, like, isNull } from 'drizzle-orm';

const CACHE_TTL_MS = 60_000; // 1 minute

export interface CachedPermissions {
  clientIds: string[];
  moduleRolesByClient: Record<string, { moduleId: string; roleId: string; roleName: string }[]>;
  permissionsByModule: Record<string, Record<string, boolean>>;
  eoIdsByClient: Record<string, Set<string>>;
  loadedAt: number;
}

const cache = new Map<string, CachedPermissions>();

function isExpired(entry: CachedPermissions): boolean {
  return Date.now() - entry.loadedAt > CACHE_TTL_MS;
}

export function invalidateUserCache(userId: string): void {
  cache.delete(userId);
}

export async function getUserPermissions(userId: string): Promise<CachedPermissions> {
  const existing = cache.get(userId);
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
    // Admin sees all clients — clientIds not restricted
    clientIds = [];
  } else if (persona === 'integrator_delta' || persona === 'integrator_external') {
    const assignments = await db
      .select({ clientId: integratorClientAssignments.clientId })
      .from(integratorClientAssignments)
      .where(eq(integratorClientAssignments.userId, userId));
    clientIds = assignments.map((a) => a.clientId);
  } else {
    const memberships = await db
      .select({ clientId: userClientMemberships.clientId })
      .from(userClientMemberships)
      .where(and(eq(userClientMemberships.userId, userId), eq(userClientMemberships.isActive, true)));
    clientIds = memberships.map((m) => m.clientId);
  }

  // Load module roles via profiles (exclude archived profiles)
  const profileAssignments = await db
    .select({
      profileId: clientProfileUsers.profileId,
    })
    .from(clientProfileUsers)
    .innerJoin(clientProfiles, eq(clientProfileUsers.profileId, clientProfiles.id))
    .where(and(
      eq(clientProfileUsers.userId, userId),
      isNull(clientProfileUsers.deletedAt),
      eq(clientProfiles.isArchived, false)
    ));

  const profileIds = profileAssignments.map((p) => p.profileId);

  const moduleRolesByClient: Record<string, { moduleId: string; roleId: string; roleName: string }[]> = {};
  const permissionsByModule: Record<string, Record<string, boolean>> = {};

  if (profileIds.length > 0) {
    const profileRoles = await db
      .select({
        profileId: clientProfileModuleRoles.profileId,
        moduleRoleId: clientProfileModuleRoles.moduleRoleId,
        roleName: moduleRoles.name,
        clientModuleId: moduleRoles.clientModuleId,
      })
      .from(clientProfileModuleRoles)
      .innerJoin(moduleRoles, eq(clientProfileModuleRoles.moduleRoleId, moduleRoles.id))
      .where(and(
        inArray(clientProfileModuleRoles.profileId, profileIds),
        isNull(clientProfileModuleRoles.deletedAt),
        eq(moduleRoles.isActive, true)
      ));

    // Get client_id for each profile to group by client (already filtered by isArchived in profileAssignments join)
    const profileDetails = await db
      .select({ id: clientProfiles.id, clientId: clientProfiles.clientId })
      .from(clientProfiles)
      .where(and(inArray(clientProfiles.id, profileIds), eq(clientProfiles.isArchived, false)));

    const profileClientMap = new Map(profileDetails.map((p) => [p.id, p.clientId]));

    for (const pr of profileRoles) {
      const clientId = profileClientMap.get(pr.profileId);
      if (!clientId) continue;
      if (!moduleRolesByClient[clientId]) moduleRolesByClient[clientId] = [];
      moduleRolesByClient[clientId].push({
        moduleId: pr.clientModuleId,
        roleId: pr.moduleRoleId,
        roleName: pr.roleName,
      });
    }

    // Load permissions for all role IDs
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
  }

  // Load EO perimeter
  const eoIdsByClient: Record<string, Set<string>> = {};

  if (profileIds.length > 0) {
    // Direct EO assignments
    const directEos = await db
      .select({
        profileId: clientProfileEos.profileId,
        eoId: clientProfileEos.eoId,
        includeDescendants: clientProfileEos.includeDescendants,
      })
      .from(clientProfileEos)
      .where(and(inArray(clientProfileEos.profileId, profileIds), isNull(clientProfileEos.deletedAt)));

    // Group EO assignments
    const groupAssignments = await db
      .select({
        profileId: clientProfileEoGroups.profileId,
        groupId: clientProfileEoGroups.groupId,
      })
      .from(clientProfileEoGroups)
      .where(and(inArray(clientProfileEoGroups.profileId, profileIds), isNull(clientProfileEoGroups.deletedAt)));

    const groupIds = groupAssignments.map((g) => g.groupId);
    let groupMembers: { groupId: string; eoId: string; includeDescendants: boolean }[] = [];
    if (groupIds.length > 0) {
      groupMembers = await db
        .select({
          groupId: eoGroupMembers.groupId,
          eoId: eoGroupMembers.eoId,
          includeDescendants: eoGroupMembers.includeDescendants,
        })
        .from(eoGroupMembers)
        .where(and(inArray(eoGroupMembers.groupId, groupIds), isNull(eoGroupMembers.deletedAt)));
    }

    // Collect all EO IDs with their include_descendants flag
    const eoWithDescendants: { eoId: string; includeDescendants: boolean; clientId: string }[] = [];

    // Get profile → client mapping (non-archived profiles only)
    const profileDetails2 = await db
      .select({ id: clientProfiles.id, clientId: clientProfiles.clientId })
      .from(clientProfiles)
      .where(and(inArray(clientProfiles.id, profileIds), eq(clientProfiles.isArchived, false)));
    const profileClientMap2 = new Map(profileDetails2.map((p) => [p.id, p.clientId]));

    for (const de of directEos) {
      const clientId = profileClientMap2.get(de.profileId);
      if (clientId) {
        eoWithDescendants.push({ eoId: de.eoId, includeDescendants: de.includeDescendants, clientId });
      }
    }

    for (const ga of groupAssignments) {
      const clientId = profileClientMap2.get(ga.profileId);
      if (!clientId) continue;
      const members = groupMembers.filter((gm) => gm.groupId === ga.groupId);
      for (const m of members) {
        eoWithDescendants.push({ eoId: m.eoId, includeDescendants: m.includeDescendants, clientId });
      }
    }

    // Resolve descendants (exclude archived and inactive EOs)
    for (const entry of eoWithDescendants) {
      if (!eoIdsByClient[entry.clientId]) eoIdsByClient[entry.clientId] = new Set();

      // Check if the EO itself is active and not archived
      const [eo] = await db
        .select({ id: eoEntities.id, path: eoEntities.path, isActive: eoEntities.isActive, isArchived: eoEntities.isArchived })
        .from(eoEntities)
        .where(eq(eoEntities.id, entry.eoId))
        .limit(1);

      if (!eo || eo.isArchived || !eo.isActive) continue;

      eoIdsByClient[entry.clientId].add(entry.eoId);

      if (entry.includeDescendants) {
        const prefix = eo.path ? `${eo.path}/${eo.id}` : eo.id;
        const descendants = await db
          .select({ id: eoEntities.id })
          .from(eoEntities)
          .where(
            and(
              eq(eoEntities.clientId, entry.clientId),
              like(eoEntities.path, `${prefix}%`),
              eq(eoEntities.isActive, true),
              eq(eoEntities.isArchived, false)
            )
          );

        for (const d of descendants) {
          eoIdsByClient[entry.clientId].add(d.id);
        }
      }
    }
  }

  const result: CachedPermissions = {
    clientIds,
    moduleRolesByClient,
    permissionsByModule,
    eoIdsByClient,
    loadedAt: Date.now(),
  };

  cache.set(userId, result);
  return result;
}

export function hasClientAccess(permissions: CachedPermissions, clientId: string, persona: string): boolean {
  if (persona === 'admin_delta') return true;
  return permissions.clientIds.includes(clientId);
}

export function hasModuleRole(permissions: CachedPermissions, moduleId: string): boolean {
  for (const roles of Object.values(permissions.moduleRolesByClient)) {
    if (roles.some((r) => r.moduleId === moduleId)) return true;
  }
  return false;
}

export function hasModulePermission(permissions: CachedPermissions, moduleId: string, permission: string): boolean {
  const modulePerms = permissions.permissionsByModule[moduleId];
  return modulePerms?.[permission] === true;
}

export function getModuleRoleIds(permissions: CachedPermissions, moduleId: string): string[] {
  const roleIds: string[] = [];
  for (const roles of Object.values(permissions.moduleRolesByClient)) {
    for (const r of roles) {
      if (r.moduleId === moduleId) roleIds.push(r.roleId);
    }
  }
  return roleIds;
}

export function isInEoPerimeter(permissions: CachedPermissions, clientId: string, eoId: string): boolean {
  const eoIds = permissions.eoIdsByClient[clientId];
  if (!eoIds) return false;
  return eoIds.has(eoId);
}
