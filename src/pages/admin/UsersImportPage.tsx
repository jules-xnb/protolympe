import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClientPath } from '@/hooks/useClientPath';
import { CLIENT_ROUTES } from '@/lib/routes';
import { api } from '@/lib/api-client';
import { EmptyState } from '@/components/ui/empty-state';
import { Users } from 'lucide-react';
import { useViewMode } from '@/contexts/ViewModeContext';
import { useProfileTemplates } from '@/hooks/useProfileTemplates';
import { ImportWizard } from '@/components/admin/import/ImportWizard';
import type {
  ImportWizardConfig,
  PreviewRow,
  FieldMapping,
  ParsedRow,
  ImportProgress,
} from '@/components/admin/import/types';
import { reverseMapping } from '@/components/admin/import/types';
import { UsersImportPreview, UsersUploadExtra, type MappedUser } from '@/pages/admin/UsersImportPreview';

// ---------------------------------------------------------------------------
// Constants & domain types
// ---------------------------------------------------------------------------

const CSV_COLUMNS = [
  { id: 'email', label: 'Email', required: true },
  { id: 'full_name', label: 'Nom complet', required: false },
  { id: 'profile_names', label: 'Profils (noms séparés par ;)', required: false },
] as const;

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function UsersImportPage() {
  const navigate = useNavigate();
  const cp = useClientPath();
  const { selectedClient } = useViewMode();
  const clientId = selectedClient?.id || '';

  const { data: templates = [] } = useProfileTemplates(clientId);

  // Cached domain data for use by renderPreview and onImport
  const [cachedUsers, setCachedUsers] = useState<MappedUser[]>([]);
  const [cachedErrors, setCachedErrors] = useState<string[]>([]);

  // Lookup map: template name (lowercased) → template
  const templatesMap = useMemo(() => {
    const map = new Map<string, (typeof templates)[0]>();
    templates.filter(t => t.is_active).forEach(t => {
      map.set(t.name.toLowerCase(), t);
    });
    return map;
  }, [templates]);

  // -- fields --
  const allFields = useMemo(() => {
    return CSV_COLUMNS.map(col => ({
      id: col.id,
      label: col.label,
      required: col.required,
    }));
  }, []);

  // -- autoMap --
  const autoMap = useCallback((headers: string[]): FieldMapping => {
    const m: FieldMapping = {};
    headers.forEach(header => {
      const normalized = header.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

      if (normalized.includes('email') || normalized.includes('mail')) {
        m[header] = 'email';
      } else if (normalized.includes('nom') || normalized.includes('name') || normalized.includes('full')) {
        m[header] = 'full_name';
      } else if (normalized.includes('profil')) {
        m[header] = 'profile_names';
      }
    });
    return m;
  }, []);

  // -- buildPreview --
  const buildPreview = useCallback((rows: ParsedRow[], mapping: FieldMapping): PreviewRow[] => {
    const errors: string[] = [];
    const users: MappedUser[] = [];
    const seenEmails = new Set<string>();
    const r = reverseMapping(mapping);

    rows.forEach((row, index) => {
      const emailCol = r['email'];
      const fullNameCol = r['full_name'];
      const profileNamesCol = r['profile_names'];

      const email = row[emailCol]?.trim().toLowerCase();
      const fullName = fullNameCol ? row[fullNameCol]?.trim() || null : null;
      const profileNamesRaw = profileNamesCol ? row[profileNamesCol]?.trim() || '' : '';

      const profileNames = profileNamesRaw.split(';').map(n => n.trim()).filter(Boolean);

      if (!email) {
        errors.push(`Ligne ${index + 2}: Email manquant`);
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        errors.push(`Ligne ${index + 2}: Email invalide "${email}"`);
        return;
      }

      if (seenEmails.has(email)) {
        errors.push(`Ligne ${index + 2}: Email en double "${email}"`);
        return;
      }
      seenEmails.add(email);

      // Resolve profile template names
      const templateIds: string[] = [];
      const missingProfiles: string[] = [];
      profileNames.forEach(name => {
        const tpl = templatesMap.get(name.toLowerCase());
        if (tpl) {
          templateIds.push(tpl.id);
        } else {
          missingProfiles.push(name);
        }
      });

      const hasError = missingProfiles.length > 0;
      const errorMessages: string[] = [];
      if (missingProfiles.length > 0) {
        errorMessages.push(`Profil(s)-type(s) non trouvé(s): ${missingProfiles.join(', ')}`);
      }

      if (hasError) {
        errors.push(`Ligne ${index + 2}: ${errorMessages.join('; ')}`);
      }

      users.push({
        email,
        fullName,
        profileNames,
        templateIds,
        missingProfiles,
        hasError,
        errorMessage: errorMessages.join('; ') || undefined,
      });
    });

    setCachedUsers(users);
    setCachedErrors(errors);

    return users.map(u => ({
      data: {
        email: u.email,
        fullName: u.fullName || '',
        profileNames: u.profileNames.join('; '),
      },
      hasError: u.hasError,
      errorMessage: u.errorMessage,
    }));
  }, [templatesMap]);

  // -- onImport --
  const onImport = useCallback(async (
    _rows: ParsedRow[],
    _mapping: FieldMapping,
    onProgress: (p: ImportProgress) => void,
  ) => {
    const validUsers = cachedUsers.filter(u => !u.hasError);
    onProgress({ current: 0, total: validUsers.length });

    let successCount = 0;
    let errorCount = 0;

    for (const user of validUsers) {
      try {
        // Import user via API (handles profile lookup, account creation, membership, templates)
        const result = await api.post<{ userId: string }>('/api/client-users/import', {
          email: user.email,
          fullName: user.fullName,
          clientId,
          templateIds: user.templateIds,
        });

        const _userId = result.userId;

        successCount++;
      } catch (error: unknown) {
        console.error(`Error importing user ${user.email}:`, error);
        errorCount++;
      }

      onProgress({ current: successCount + errorCount, total: validUsers.length });
    }

    return { successCount, errorCount };
  }, [cachedUsers, clientId]);

  // -- renderPreview --
  const renderPreview = useCallback((_rows: PreviewRow[], _previewErrors: string[], onCancel?: () => void) => {
    return (
      <UsersImportPreview
        cachedUsers={cachedUsers}
        cachedErrors={cachedErrors}
        onCancel={onCancel}
      />
    );
  }, [cachedUsers, cachedErrors]);

  // -- renderUploadExtra --
  const renderUploadExtra = useCallback(() => {
    return (
      <UsersUploadExtra
        templates={templates.filter(t => t.is_active)}
        clientSlug={selectedClient?.slug}
      />
    );
  }, [templates, selectedClient?.slug]);

  // -- no client fallback --
  if (!selectedClient) {
    return (
      <EmptyState icon={Users} title="Sélectionnez un client pour importer des utilisateurs" />
    );
  }

  const config: ImportWizardConfig = {
    title: "Import d'utilisateurs",
    backPath: cp(CLIENT_ROUTES.USERS),
    fields: allFields,
    autoMap,
    canProceed: (mapping) => new Set(Object.values(mapping)).has('email'),
    buildPreview,
    onImport,
    renderPreview,
    renderUploadExtra,
    hideDefaultStats: true,
    onImportComplete: (result) => {
      if (result.errorCount === 0) navigate(cp(CLIENT_ROUTES.USERS));
    },
  };

  return <ImportWizard config={config} />;
}
