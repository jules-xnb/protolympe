export interface ModuleCatalogEntry {
  slug: string;
  label: string;
  icon: string;
  description: string;
  hasBo: boolean;
  hasWorkflows: boolean;
  hasRoles: boolean;
  permissions: { slug: string; label: string }[];
}

export const MODULE_CATALOG: Record<string, ModuleCatalogEntry> = {
  organisation: {
    slug: 'organisation',
    label: 'Organisation',
    icon: 'Building2',
    description: 'Affichage des entités organisationnelles',
    hasBo: false,
    hasWorkflows: false,
    hasRoles: true,
    permissions: [
      { slug: 'create_entity', label: 'Créer une entité' },
      { slug: 'archive_entity', label: 'Archiver une entité' },
      { slug: 'import', label: 'Importer' },
      { slug: 'export', label: 'Exporter' },
      { slug: 'view_history', label: 'Voir l\'historique' },
      { slug: 'reparent', label: 'Reparenter' },
      { slug: 'configure_columns', label: 'Configurer les colonnes' },
      { slug: 'manage_fields', label: 'Gérer les champs' },
      { slug: 'configure_drawer', label: 'Configurer le drawer' },
    ],
  },
  user: {
    slug: 'user',
    label: 'Utilisateurs',
    icon: 'Users',
    description: 'Gestion des utilisateurs',
    hasBo: false,
    hasWorkflows: false,
    hasRoles: true,
    permissions: [
      { slug: 'create_user', label: 'Créer un utilisateur' },
      { slug: 'edit_user', label: 'Modifier les utilisateurs' },
      { slug: 'edit_user_profile', label: 'Modifier les profils assignés' },
      { slug: 'activate_deactivate', label: 'Activer / désactiver' },
      { slug: 'archive_user', label: 'Archiver un utilisateur' },
      { slug: 'import', label: 'Importer (CSV)' },
      { slug: 'export', label: 'Exporter (CSV)' },
      { slug: 'view_history', label: 'Voir l\'historique' },
    ],
  },
  collecte_valeur: {
    slug: 'collecte_valeur',
    label: 'Collecte de valeur',
    icon: 'ClipboardList',
    description: 'Questionnaires et collecte de réponses',
    hasBo: true,
    hasWorkflows: true,
    hasRoles: true,
    permissions: [
      { slug: 'create_campaign', label: 'Créer une campagne' },
      { slug: 'edit_campaign', label: 'Modifier une campagne' },
      { slug: 'delete_campaign', label: 'Supprimer une campagne' },
      { slug: 'export', label: 'Exporter' },
      { slug: 'import', label: 'Importer' },
      { slug: 'edit_form', label: 'Modifier le formulaire' },
      { slug: 'respond', label: 'Répondant' },
      { slug: 'read_respondent', label: 'Lecture répondant' },
      { slug: 'read_validated', label: 'Lecture validé' },
    ],
  },
  assurance: {
    slug: 'assurance',
    label: 'Assurance',
    icon: 'Shield',
    description: 'Module assurance (à venir)',
    hasBo: true,
    hasWorkflows: false,
    hasRoles: true,
    permissions: [],
  },
  profils: {
    slug: 'profils',
    label: 'Profils',
    icon: 'UserCircle',
    description: 'Gestion des profils utilisateurs',
    hasBo: false,
    hasWorkflows: false,
    hasRoles: true,
    permissions: [
      { slug: 'create_profile', label: 'Créer un profil' },
      { slug: 'edit_profile', label: 'Modifier un profil' },
      { slug: 'duplicate_profile', label: 'Dupliquer un profil' },
      { slug: 'archive_profile', label: 'Archiver un profil' },
      { slug: 'import', label: 'Importer (CSV)' },
      { slug: 'export', label: 'Exporter (CSV)' },
    ],
  },
};
