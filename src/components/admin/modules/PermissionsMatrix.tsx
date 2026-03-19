import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface PermissionsMatrixProps {
  permissions: { slug: string; label: string }[];
  roles: { id: string; name: string; color: string | null }[];
  grants: Record<string, Record<string, boolean>>;
  onToggle: (permissionSlug: string, roleId: string, granted: boolean) => void;
  disabled?: boolean;
}

export function PermissionsMatrix({
  permissions,
  roles,
  grants,
  onToggle,
  disabled = false,
}: PermissionsMatrixProps) {
  if (permissions.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Ce module n'a pas de permissions configurables.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Permission</TableHead>
          {roles.map((role) => (
            <TableHead key={role.id} className="text-center">
              <div className="flex items-center justify-center gap-2">
                {role.color && (
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: role.color }}
                  />
                )}
                <span>{role.name}</span>
              </div>
            </TableHead>
          ))}
          {roles.length === 0 && (
            <TableHead className="text-center text-muted-foreground">
              Aucun rôle créé
            </TableHead>
          )}
        </TableRow>
      </TableHeader>
      <TableBody>
        {permissions.map((perm) => (
          <TableRow key={perm.slug}>
            <TableCell className="font-medium">{perm.label}</TableCell>
            {roles.map((role) => (
              <TableCell key={role.id} className="text-center">
                <div className="flex justify-center">
                  <Checkbox
                    checked={grants[perm.slug]?.[role.id] ?? false}
                    onCheckedChange={(checked) =>
                      onToggle(perm.slug, role.id, checked === true)
                    }
                    disabled={disabled}
                  />
                </div>
              </TableCell>
            ))}
            {roles.length === 0 && (
              <TableCell className="text-center text-muted-foreground">—</TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
