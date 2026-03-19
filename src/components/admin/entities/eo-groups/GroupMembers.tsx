import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { useEoGroupMembers, useRemoveEoGroupMember } from '@/hooks/useEoGroupMembers';
import { Building2, GitBranch, X } from 'lucide-react';
import type { EoEntity } from './types';

/** Inline sub-component that fetches and renders members for an expanded group.
 *  Only shows the actual members — if some members are ancestors of others,
 *  they are displayed hierarchically (indented). */
export function GroupMembers({ groupId, allEntities }: { groupId: string; allEntities: EoEntity[] }) {
  const { data: members = [], isLoading } = useEoGroupMembers(groupId);
  const removeMember = useRemoveEoGroupMember();

  if (isLoading) {
    return (
      <div className="py-2 px-3" style={{ paddingLeft: '44px' }}>
        <span className="text-xs text-muted-foreground">Chargement...</span>
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className="py-2 px-3" style={{ paddingLeft: '44px' }}>
        <span className="text-xs text-muted-foreground">Aucun membre</span>
      </div>
    );
  }

  // Build a set of member eo_ids and a map eo_id -> entity for fast lookup
  const memberEoIds = new Set(members.map(m => m.eo_id));
  const entityMap = new Map(allEntities.map(e => [e.id, e]));

  // For each member, find its nearest ancestor that is also a member
  const findMemberParent = (eoId: string): string | null => {
    let current = entityMap.get(eoId);
    while (current?.parent_id) {
      if (memberEoIds.has(current.parent_id)) return current.parent_id;
      current = entityMap.get(current.parent_id);
    }
    return null;
  };

  // Group members: parent_eo_id -> child members
  const childrenOf = new Map<string, typeof members>();
  const roots: typeof members = [];

  for (const member of members) {
    const parentEoId = findMemberParent(member.eo_id);
    if (parentEoId) {
      const list = childrenOf.get(parentEoId) || [];
      list.push(member);
      childrenOf.set(parentEoId, list);
    } else {
      roots.push(member);
    }
  }

  // Sort by name
  roots.sort((a, b) => a.eo_name.localeCompare(b.eo_name));
  for (const [, children] of childrenOf) {
    children.sort((a, b) => a.eo_name.localeCompare(b.eo_name));
  }

  // For members with include_descendants, find their descendant entities (not already members)
  const getDescendantEntities = (memberPath: string) => {
    return allEntities
      .filter(e => e.path?.startsWith(memberPath + '.') && !memberEoIds.has(e.id))
      .sort((a, b) => (a.path ?? '').localeCompare(b.path ?? ''));
  };

  const renderDescendant = (entity: EoEntity, baseDepth: number, basePath: string) => {
    // Calculate relative depth from the member
    const segments = entity.path?.replace(basePath + '.', '').split('.') ?? [];
    const relativeDepth = segments.length;
    return (
      <div
        key={`desc-${entity.id}`}
        className="flex items-center gap-2 py-1.5 px-3 opacity-40"
        style={{ paddingLeft: `${44 + (baseDepth + relativeDepth) * 24}px` }}
      >
        <span className="text-muted-foreground shrink-0 text-xs">└</span>
        <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <span className="text-sm truncate text-muted-foreground">{entity.name}</span>
        {entity.code && (
          <span className="text-xs text-muted-foreground shrink-0">{entity.code}</span>
        )}
      </div>
    );
  };

  const renderMember = (member: typeof members[number], depth: number) => {
    const children = childrenOf.get(member.eo_id) ?? [];
    const descendants = member.include_descendants ? getDescendantEntities(member.eo_path) : [];
    return (
      <div key={member.id}>
        <div
          className="group/member flex items-center gap-2 py-2 px-3 hover:bg-muted/50 transition-colors"
          style={{ paddingLeft: `${44 + depth * 24}px` }}
        >
          {depth > 0 && (
            <span className="text-muted-foreground shrink-0 text-xs">└</span>
          )}
          <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-sm truncate">{member.eo_name}</span>
          {member.eo_code && (
            <span className="text-xs text-muted-foreground shrink-0">{member.eo_code}</span>
          )}
          <Chip variant="default" className="text-xs shrink-0">
            Niv. {member.eo_level}
          </Chip>
          {member.include_descendants && (
            <GitBranch className="h-3.5 w-3.5 text-primary shrink-0" />
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0 ml-auto opacity-0 group-hover/member:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              removeMember.mutate(member.id);
            }}
          >
            <X className="h-3.5 w-3.5 text-destructive" />
          </Button>
        </div>
        {descendants.map(d => renderDescendant(d, depth, member.eo_path))}
        {children.map(child => renderMember(child, depth + 1))}
      </div>
    );
  };

  return <>{roots.map(m => renderMember(m, 0))}</>;
}
