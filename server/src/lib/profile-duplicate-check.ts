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

export interface ProfileConfig {
  eos: { eo_id: string; include_descendants: boolean }[];
  eo_groups: string[];
  module_roles: string[];
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

function configToFingerprint(config: ProfileConfig): ProfileFingerprint {
  const sortedEos = [...config.eos]
    .sort((a, b) => a.eo_id.localeCompare(b.eo_id))
    .map((e) => ({ eoId: e.eo_id, includeDescendants: e.include_descendants }));
  const sortedGroups = [...config.eo_groups].sort();
  const sortedRoles = [...config.module_roles].sort();

  return {
    eos: JSON.stringify(sortedEos),
    groups: JSON.stringify(sortedGroups),
    roles: JSON.stringify(sortedRoles),
  };
}

/**
 * Vérifie si un profil est un doublon d'un autre profil dans le même client.
 * @returns Le nom du profil dupliqué, ou null si pas de doublon.
 */
export async function findDuplicateProfile(clientId: string, profileId: string): Promise<string | null> {
  const currentFingerprint = await getProfileFingerprint(profileId);

  if (currentFingerprint.eos === '[]' && currentFingerprint.groups === '[]' && currentFingerprint.roles === '[]') {
    return null;
  }

  const otherProfiles = await db
    .select({ id: clientProfiles.id, name: clientProfiles.name })
    .from(clientProfiles)
    .where(and(
      eq(clientProfiles.clientId, clientId),
      eq(clientProfiles.isArchived, false),
      ne(clientProfiles.id, profileId)
    ));

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

/**
 * Cherche des profils existants qui correspondent exactement à une configuration donnée.
 * Utilisé depuis l'UX pour proposer l'association au lieu de la création.
 * @returns Liste des profils correspondants (id + name).
 */
export async function findMatchingProfiles(
  clientId: string,
  config: ProfileConfig
): Promise<{ id: string; name: string }[]> {
  if (config.eos.length === 0 && config.eo_groups.length === 0 && config.module_roles.length === 0) {
    return [];
  }

  const targetFingerprint = configToFingerprint(config);

  const allProfiles = await db
    .select({ id: clientProfiles.id, name: clientProfiles.name })
    .from(clientProfiles)
    .where(and(
      eq(clientProfiles.clientId, clientId),
      eq(clientProfiles.isArchived, false)
    ));

  const matches: { id: string; name: string }[] = [];

  for (const profile of allProfiles) {
    const fingerprint = await getProfileFingerprint(profile.id);

    if (
      targetFingerprint.eos === fingerprint.eos &&
      targetFingerprint.groups === fingerprint.groups &&
      targetFingerprint.roles === fingerprint.roles
    ) {
      matches.push({ id: profile.id, name: profile.name });
    }
  }

  return matches;
}

/**
 * Vérifie qu'un profil n'est pas vide.
 * Un profil doit avoir au moins 1 EO ou 1 groupe ET au moins 1 rôle module.
 */
export async function isProfileEmpty(profileId: string): Promise<boolean> {
  const fingerprint = await getProfileFingerprint(profileId);
  const hasEosOrGroups = fingerprint.eos !== '[]' || fingerprint.groups !== '[]';
  const hasRoles = fingerprint.roles !== '[]';
  return !hasEosOrGroups || !hasRoles;
}

/**
 * Valide qu'une configuration de profil n'est pas vide.
 */
export function isConfigEmpty(config: ProfileConfig): boolean {
  const hasEosOrGroups = config.eos.length > 0 || config.eo_groups.length > 0;
  const hasRoles = config.module_roles.length > 0;
  return !hasEosOrGroups || !hasRoles;
}
