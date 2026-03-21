import { db } from '../db/index.js';
import {
  clientProfiles,
  clientProfileEos,
  clientProfileEoGroups,
  clientProfileModuleRoles,
} from '../db/schema.js';
import { eq, and, isNull, ne } from 'drizzle-orm';

interface ProfileFingerprint {
  eos: string; // sorted JSON of [{eoId, includeDescendants}]
  groups: string; // sorted JSON of [groupId]
  roles: string; // sorted JSON of [moduleRoleId]
}

async function getProfileFingerprint(profileId: string): Promise<ProfileFingerprint> {
  const [eos, groups, roles] = await Promise.all([
    db.select({ eoId: clientProfileEos.eoId, includeDescendants: clientProfileEos.includeDescendants })
      .from(clientProfileEos)
      .where(and(eq(clientProfileEos.profileId, profileId), isNull(clientProfileEos.deletedAt)))
      .orderBy(clientProfileEos.eoId),

    db.select({ groupId: clientProfileEoGroups.groupId })
      .from(clientProfileEoGroups)
      .where(and(eq(clientProfileEoGroups.profileId, profileId), isNull(clientProfileEoGroups.deletedAt)))
      .orderBy(clientProfileEoGroups.groupId),

    db.select({ moduleRoleId: clientProfileModuleRoles.moduleRoleId })
      .from(clientProfileModuleRoles)
      .where(and(eq(clientProfileModuleRoles.profileId, profileId), isNull(clientProfileModuleRoles.deletedAt)))
      .orderBy(clientProfileModuleRoles.moduleRoleId),
  ]);

  return {
    eos: JSON.stringify(eos.map((e) => ({ eoId: e.eoId, includeDescendants: e.includeDescendants }))),
    groups: JSON.stringify(groups.map((g) => g.groupId)),
    roles: JSON.stringify(roles.map((r) => r.moduleRoleId)),
  };
}

/**
 * Vérifie si un profil est un doublon d'un autre profil dans le même client.
 * Deux profils sont identiques s'ils ont exactement les mêmes :
 * - EO(s) avec le même flag include_descendants
 * - Regroupement(s)
 * - Rôle(s) module
 *
 * @returns Le nom du profil dupliqué, ou null si pas de doublon.
 */
export async function findDuplicateProfile(clientId: string, profileId: string): Promise<string | null> {
  // Get the fingerprint of the profile being checked
  const currentFingerprint = await getProfileFingerprint(profileId);

  // Empty profiles can't be duplicates (no EOs, no groups, no roles)
  if (currentFingerprint.eos === '[]' && currentFingerprint.groups === '[]' && currentFingerprint.roles === '[]') {
    return null;
  }

  // Get all other non-archived profiles for this client
  const otherProfiles = await db
    .select({ id: clientProfiles.id, name: clientProfiles.name })
    .from(clientProfiles)
    .where(and(
      eq(clientProfiles.clientId, clientId),
      eq(clientProfiles.isArchived, false),
      ne(clientProfiles.id, profileId)
    ));

  // Compare with each other profile
  for (const other of otherProfiles) {
    const otherFingerprint = await getProfileFingerprint(other.id);

    if (
      currentFingerprint.eos === otherFingerprint.eos &&
      currentFingerprint.groups === otherFingerprint.groups &&
      currentFingerprint.roles === otherFingerprint.roles
    ) {
      return other.name;
    }
  }

  return null;
}
