import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { STALE_TIME_MS } from "@/lib/constants";
import { ErrorBoundary } from "./components/layout/ErrorBoundary";
import { DashboardLayout } from "./components/layout/DashboardLayout";
import { DashboardRedirect } from "./components/layout/DashboardRedirect";
import { AdminRouteGuard } from "./components/layout/AdminRouteGuard";
import { ClientRouteGuard } from "./components/layout/ClientRouteGuard";
import { LegacyRedirect } from "./components/layout/LegacyRedirect";
import { UserFinalThemeWrapper } from "./components/layout/UserFinalThemeWrapper";
import NotFound from "./pages/NotFound";

// Lazy-loaded pages — Auth
const Auth = lazy(() => import("./pages/Auth"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));

// Lazy-loaded pages — Admin platform
const AdminClientsPage = lazy(() => import("./pages/admin/AdminClientsPage"));
const AdminIntegratorsPage = lazy(() => import("./pages/admin/AdminIntegratorsPage"));

// Lazy-loaded pages — Entities
const EntitiesPage = lazy(() => import("./pages/admin/EntitiesPage"));
const EntitiesArchivedPage = lazy(() => import("./pages/admin/EntitiesArchivedPage"));
const EoImportPage = lazy(() => import("./pages/admin/EoImportPage"));
const EoFieldsPage = lazy(() => import("./pages/admin/EoFieldsPage"));
const EoFieldsImportPage = lazy(() => import("./pages/admin/EoFieldsImportPage"));
const EoFieldsArchivedPage = lazy(() => import("./pages/admin/EoFieldsArchivedPage"));
const EoHistoryPage = lazy(() => import("./pages/admin/EoHistoryPage"));
const EntityCreatePage = lazy(() => import("./pages/admin/EntityCreatePage"));

// Lazy-loaded pages — Users
const UsersPage = lazy(() => import("./pages/admin/UsersPage"));
const UsersImportPage = lazy(() => import("./pages/admin/UsersImportPage"));
const UserFieldsPage = lazy(() => import("./pages/admin/UserFieldsPage"));
const UserFieldsArchivedPage = lazy(() => import("./pages/admin/UserFieldsArchivedPage"));

// Lazy-loaded pages — Referentials
const ReferentialsPage = lazy(() => import("./pages/admin/ReferentialsPage"));
const ReferentialsImportPage = lazy(() => import("./pages/admin/ReferentialsImportPage"));
const ReferentialsArchivedPage = lazy(() => import("./pages/admin/ReferentialsArchivedPage"));

// Lazy-loaded pages — Roles
const RolesPage = lazy(() => import("./pages/admin/RolesPage"));
const RolesImportPage = lazy(() => import("./pages/admin/RolesImportPage"));
const RolesArchivedPage = lazy(() => import("./pages/admin/RolesArchivedPage"));

// Lazy-loaded pages — Profile Templates
const ProfileTemplatesPage = lazy(() => import("./pages/admin/ProfileTemplatesPage"));
const ProfileTemplatesArchivedPage = lazy(() => import("./pages/admin/ProfileTemplatesArchivedPage"));

// Lazy-loaded pages — Business Objects
const BusinessObjectsPage = lazy(() => import("./pages/admin/BusinessObjectsPage"));
const BusinessObjectsArchivedPage = lazy(() => import("./pages/admin/BusinessObjectsArchivedPage"));
const BusinessObjectDetailPage = lazy(() => import("./pages/admin/BusinessObjectDetailPage"));
const BusinessObjectStructurePage = lazy(() => import("./pages/admin/BusinessObjectStructurePage"));
const BusinessObjectArchivedFieldsPage = lazy(() => import("./pages/admin/BusinessObjectArchivedFieldsPage"));
const BusinessObjectArchivedInstancesPage = lazy(() => import("./pages/admin/BusinessObjectArchivedInstancesPage"));
const BusinessObjectsImportPage = lazy(() => import("./pages/admin/BusinessObjectsImportPage"));
const BusinessObjectInstancesImportPage = lazy(() => import("./pages/admin/BusinessObjectInstancesImportPage"));
const BusinessObjectHistoryPage = lazy(() => import("./pages/admin/BusinessObjectHistoryPage"));

// Lazy-loaded pages — Modules
const ModulesPage = lazy(() => import("./pages/admin/ModulesPage"));

const ModuleRolesPage = lazy(() => import("./pages/admin/module-config/ModuleRolesPage"));
const ModuleConfigPermissionsPage = lazy(() => import("./pages/admin/module-config/ModulePermissionsPage"));
const ModuleWorkflowsPage = lazy(() => import("./pages/admin/module-config/ModuleWorkflowsPage"));
const ModuleBoPage = lazy(() => import("./pages/admin/module-config/ModuleBoPage"));
const ModuleDisplayPage = lazy(() => import("./pages/admin/module-config/ModuleDisplayPage"));
const ModuleDisplayConfigEditPage = lazy(() => import("./pages/admin/module-config/ModuleDisplayConfigEditPage"));
// Lazy-loaded pages — Workflows
const WorkflowsPage = lazy(() => import("./pages/admin/WorkflowsPage"));
const WorkflowDetailPage = lazy(() => import("./pages/admin/WorkflowDetailPage"));

// Lazy-loaded pages — User Final
const ModulePage = lazy(() => import("./pages/user/ModulePage"));
const DynamicViewPage = lazy(() => import("./pages/user/DynamicViewPage"));
const SurveyEditorPage = lazy(() => import("./pages/user/SurveyEditorPage"));
const ProfileManagementPage = lazy(() => import("./pages/user/ProfileManagementPage"));
const UserProfilesArchivedPage = lazy(() => import("./pages/user/ProfilesArchivedPage"));
const SettingsPage = lazy(() => import("./pages/user/SettingsPage"));
const CampaignDetailPage = lazy(() => import("./pages/user/CampaignDetailPage"));
const CampaignImportPage = lazy(() => import("./pages/user/CampaignImportPage"));
const WorkflowFormsPage = lazy(() => import("./pages/user/WorkflowFormsPage"));

// Lazy-loaded pages — Integrator
const ClientDesignPage = lazy(() => import("./pages/admin/ClientDesignPage"));
const TranslationsPage = lazy(() => import("./pages/admin/TranslationsPage"));

const DesignSystemPage = lazy(() => import("./pages/DesignSystemPage"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: STALE_TIME_MS,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
        <ErrorBoundary>
          <Suspense fallback={<LoadingSpinner />}>
            <Routes>
              <Route path="/" element={<Auth />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/reset-password" element={<ResetPassword />} />

              {/* Full-screen workflow editor (outside layout) */}
              <Route path="/dashboard/:clientId/workflows/:id" element={<WorkflowDetailPage />} />

              {/* Dashboard routes with layout */}
              <Route path="/dashboard" element={<DashboardLayout />}>
                <Route index element={<DashboardRedirect />} />

                {/* Mode-agnostic routes */}
              <Route path="settings" element={<SettingsPage />} />
              <Route path="design-system" element={<DesignSystemPage />} />

                {/* Admin mode routes (no clientId prefix) */}
                <Route path="admin" element={<AdminRouteGuard />}>
                  <Route index element={<Navigate to="/dashboard/admin/clients" replace />} />
                  <Route path="clients" element={<AdminClientsPage />} />
                  <Route path="integrators" element={<AdminIntegratorsPage />} />
                </Route>

                {/* Legacy redirects for old URLs without clientId */}
                <Route path="business-objects/*" element={<LegacyRedirect base="business-objects" />} />
                <Route path="users/*" element={<LegacyRedirect base="users" />} />
                <Route path="entities/*" element={<LegacyRedirect base="entities" />} />
                <Route path="referentials/*" element={<LegacyRedirect base="referentials" />} />
                <Route path="roles/*" element={<LegacyRedirect base="roles" />} />
                <Route path="modules/*" element={<LegacyRedirect base="modules" />} />
                <Route path="workflows" element={<LegacyRedirect base="workflows" />} />
                <Route path="user/*" element={<LegacyRedirect base="user" />} />

                {/* Client-scoped routes (integrator + user_final) */}
                <Route path=":clientId" element={<ClientRouteGuard />}>
                  {/* Integrator mode routes */}
                  <Route path="users" element={<UsersPage />} />
                  <Route path="users/import" element={<UsersImportPage />} />
                  <Route path="users/fields" element={<UserFieldsPage />} />
                  <Route path="users/fields/archived" element={<UserFieldsArchivedPage />} />
                  <Route path="entities" element={<EntitiesPage />} />
                  <Route path="entities/archived" element={<EntitiesArchivedPage />} />
                  <Route path="entities/new" element={<EntityCreatePage />} />
                  <Route path="entities/import" element={<EoImportPage />} />
                  <Route path="entities/fields" element={<EoFieldsPage />} />
                  <Route path="entities/fields/import" element={<EoFieldsImportPage />} />
                  <Route path="entities/fields/archived" element={<EoFieldsArchivedPage />} />
                  <Route path="entities/history" element={<EoHistoryPage />} />
                  <Route path="entities/:entityId/history" element={<EoHistoryPage />} />
                  <Route path="referentials" element={<ReferentialsPage />} />
                  <Route path="referentials/import" element={<ReferentialsImportPage />} />
                  <Route path="referentials/archived" element={<ReferentialsArchivedPage />} />
                  <Route path="roles" element={<RolesPage />} />
                  <Route path="roles/import" element={<RolesImportPage />} />
                  <Route path="roles/archived" element={<RolesArchivedPage />} />
                  <Route path="profiles" element={<ProfileTemplatesPage />} />
                  <Route path="profiles/archived" element={<ProfileTemplatesArchivedPage />} />
                  <Route path="business-objects" element={<BusinessObjectsPage />} />
                  <Route path="business-objects/archived" element={<BusinessObjectsArchivedPage />} />
                  <Route path="business-objects/:id" element={<BusinessObjectDetailPage />} />
                  <Route path="business-objects/:id/structure" element={<BusinessObjectStructurePage />} />
                  <Route path="business-objects/:id/structure/archived" element={<BusinessObjectArchivedFieldsPage />} />
                  <Route path="business-objects/:id/instances/archived" element={<BusinessObjectArchivedInstancesPage />} />
                  <Route path="business-objects/:id/history" element={<BusinessObjectHistoryPage />} />
                  <Route path="business-objects/import" element={<BusinessObjectsImportPage />} />
                  <Route path="business-objects/:id/import" element={<BusinessObjectInstancesImportPage />} />
                  <Route path="modules" element={<ModulesPage />} />
                  <Route path="modules/:moduleId/roles" element={<ModuleRolesPage />} />
                  <Route path="modules/:moduleId/permissions" element={<ModuleConfigPermissionsPage />} />
                  <Route path="modules/:moduleId/workflows" element={<ModuleWorkflowsPage />} />
                  <Route path="modules/:moduleId/display" element={<ModuleDisplayPage />} />
                  <Route path="modules/:moduleId/display/:configId" element={<ModuleDisplayConfigEditPage />} />
                  <Route path="modules/:moduleId/bo" element={<ModuleBoPage />} />
                  <Route path="workflows" element={<WorkflowsPage />} />
                  <Route path="design" element={<ClientDesignPage />} />
                  <Route path="translations" element={<TranslationsPage />} />

                  {/* User Final mode routes — wrapped in theme provider */}
                  <Route path="user" element={<UserFinalThemeWrapper />}>
                    <Route path="simulation-config" element={<ProfileManagementPage />} />
                    <Route path="profiles" element={<ProfileManagementPage />} />
                    <Route path="profiles/archived" element={<UserProfilesArchivedPage />} />
                    <Route path="surveys/new" element={<SurveyEditorPage />} />
                    <Route path="surveys/:surveyId/edit" element={<SurveyEditorPage />} />
                    <Route path="campaigns/:campaignId" element={<CampaignDetailPage />} />
                    <Route path="campaigns/:campaignId/import" element={<CampaignImportPage />} />
                    <Route path="workflow-forms/:workflowId" element={<WorkflowFormsPage />} />
                    <Route path="modules/:moduleId" element={<ModulePage />} />
                    <Route path="views/:viewSlug" element={<DynamicViewPage />} />
                    <Route path="views/:viewSlug/eo/:eoId" element={<DynamicViewPage />} />
                  </Route>
                </Route>
              </Route>

              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
