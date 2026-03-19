import { createContext, useContext, useState, useCallback, type ReactNode, useEffect, useRef } from 'react';
import { useIsAdminDelta } from '@/hooks/useAdminData';
import { useClients } from '@/hooks/useClients';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api-client';
import type { Client } from '@/hooks/useClients';

export type ViewMode = 'admin' | 'integrator' | 'user_final';

// Active profile for user_final mode
export interface ActiveProfile {
  id: string;
  name: string;
  eoIds: string[];
  roleIds: string[];
}

// Legacy simulation config interface (kept for backward compatibility)
export interface UserSimulationConfig {
  selectedEoIds: string[];
  roleAssignments: {
    moduleId: string;
    roleIds: string[];
  }[];
}

// Persistence keys (localStorage as fallback)
const STORAGE_KEYS = {
  MODE: 'olympe_view_mode',
  CLIENT_ID: 'olympe_selected_client_id',
  ACTIVE_PROFILE_ID: 'olympe_active_profile_id',
};

interface ViewModeContextType {
  mode: ViewMode;
  isAdmin: boolean;
  isAdminLoading: boolean;
  selectedClient: Client | null;
  availableClients: Client[];
  // Profile-based access (replaces simulation)
  activeProfile: ActiveProfile | null;
  isProfileConfigured: boolean;
  switchToIntegratorMode: (client: Client) => void;
  switchToAdminMode: () => void;
  switchToUserFinalMode: () => void;
  setSelectedClient: (client: Client | null) => void;
  setActiveProfile: (profile: ActiveProfile | null) => void;
  clearActiveProfile: () => void;
  // Legacy aliases for backward compatibility
  userSimulationConfig: UserSimulationConfig | null;
  isUserSimulationConfigured: boolean;
  setUserSimulationConfig: (config: UserSimulationConfig) => void;
  clearUserSimulation: () => void;
}

const ViewModeContext = createContext<ViewModeContextType | undefined>(undefined);

const FALLBACK_VIEWMODE_CONTEXT: ViewModeContextType = {
  mode: 'integrator',
  isAdmin: false,
  isAdminLoading: false,
  selectedClient: null,
  availableClients: [],
  activeProfile: null,
  isProfileConfigured: false,
  switchToIntegratorMode: () => {},
  switchToAdminMode: () => {},
  switchToUserFinalMode: () => {},
  setSelectedClient: () => {},
  setActiveProfile: () => {},
  clearActiveProfile: () => {},
  // Legacy
  userSimulationConfig: null,
  isUserSimulationConfigured: false,
  setUserSimulationConfig: () => {},
  clearUserSimulation: () => {},
};

// Helper to safely read string values from localStorage.
// Supports both legacy raw strings and JSON-stringified strings.
function getStoredStringCompat(key: string): string | null {
  const stored = localStorage.getItem(key);
  if (!stored) return null;

  try {
    const parsed = JSON.parse(stored);
    return typeof parsed === 'string' ? parsed : stored;
  } catch {
    return stored;
  }
}

// Persist view mode to localStorage only (no more Supabase metadata)
function persistViewModeToMetadata(mode: ViewMode): void {
  localStorage.setItem(STORAGE_KEYS.MODE, JSON.stringify(mode));
}

export function ViewModeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { data: isAdmin = false, isLoading: isAdminLoading } = useIsAdminDelta();
  const { data: clients = [] } = useClients();
  const hasRestoredContext = useRef(false);
  const hasRestoredProfile = useRef(false);

  // Initialize from user metadata first, then localStorage as fallback
  const [mode, setMode] = useState<ViewMode>(() => {
    const storedMode = getStoredStringCompat(STORAGE_KEYS.MODE);
    if (storedMode === 'admin' || storedMode === 'integrator' || storedMode === 'user_final') {
      return storedMode;
    }
    return 'admin';
  });

  const [selectedClientId, setSelectedClientId] = useState<string | null>(() => {
    return getStoredStringCompat(STORAGE_KEYS.CLIENT_ID);
  });

  const [selectedClient, setSelectedClientState] = useState<Client | null>(null);
  const [activeProfile, setActiveProfileState] = useState<ActiveProfile | null>(() => {
    // Restore full profile from localStorage for instant UI (avoids flash of empty state)
    const stored = localStorage.getItem(STORAGE_KEYS.ACTIVE_PROFILE_ID);
    if (!stored) return null;
    try {
      const parsed = JSON.parse(stored);
      // Support new format (full object) — fallback to null for old format (string ID only)
      if (parsed && typeof parsed === 'object' && parsed.id && parsed.name) {
        return parsed as ActiveProfile;
      }
    } catch { /* ignore */ }
    return null;
  });

  // Reset to admin mode when user changes (fresh login vs page refresh)
  const prevUserIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!user) {
      // Signed out — clear context
      if (prevUserIdRef.current) {
        setMode('admin');
        localStorage.setItem(STORAGE_KEYS.MODE, JSON.stringify('admin'));
        setSelectedClientState(null);
        setSelectedClientId(null);
        localStorage.removeItem(STORAGE_KEYS.CLIENT_ID);
        setActiveProfileState(null);
        localStorage.removeItem(STORAGE_KEYS.ACTIVE_PROFILE_ID);
      }
      prevUserIdRef.current = null;
      return;
    }

    if (prevUserIdRef.current === null && !getStoredStringCompat(STORAGE_KEYS.CLIENT_ID)) {
      // Fresh login (no stored client): reset to admin mode
      setMode('admin');
      localStorage.setItem(STORAGE_KEYS.MODE, JSON.stringify('admin'));
    }
    prevUserIdRef.current = user.id;
  }, [user]);

  // Restore selected client from stored ID once clients are loaded
  useEffect(() => {
    if (clients.length > 0 && selectedClientId && !selectedClient) {
      const client = clients.find(c => c.id === selectedClientId);
      if (client) {
        setSelectedClientState(client);
        hasRestoredContext.current = true;
      } else {
        setSelectedClientId(null);
        localStorage.removeItem(STORAGE_KEYS.CLIENT_ID);
        if (isAdmin && mode === 'integrator') {
          setMode('admin');
          localStorage.setItem(STORAGE_KEYS.MODE, JSON.stringify('admin'));
          persistViewModeToMetadata('admin');
        }
        hasRestoredContext.current = true;
      }
    }
  }, [clients, selectedClientId, selectedClient, isAdmin, mode]);

  // Restore active profile from stored template ID when client is available
  // Also re-runs when switching to user_final mode (to pick up integrator-side changes)
  useEffect(() => {
    const restoreActiveProfile = async () => {
      if (hasRestoredProfile.current || !selectedClient || !user) return;

      // Extract profile ID from localStorage (supports both full object and legacy string ID)
      let storedProfileId: string | null = null;
      const storedRaw = localStorage.getItem(STORAGE_KEYS.ACTIVE_PROFILE_ID);
      if (storedRaw) {
        try {
          const parsed = JSON.parse(storedRaw);
          if (typeof parsed === 'string') {
            storedProfileId = parsed; // legacy format: just the ID
          } else if (parsed && typeof parsed === 'object' && parsed.id) {
            storedProfileId = parsed.id; // new format: full ActiveProfile object
          }
        } catch {
          storedProfileId = storedRaw; // raw string fallback
        }
      }
      if (!storedProfileId) {
        hasRestoredProfile.current = true;
        return;
      }

      try {
        // Verify the user is still assigned to this template for this client and fetch profile data
        // All done via API calls instead of direct Supabase access
        const profileData = await api.get<{
          template: { id: string; name: string } | null;
          eoIds: string[];
          roleIds: string[];
        }>(`/api/profiles/restore?template_id=${storedProfileId}&client_id=${selectedClient.id}`);

        if (!profileData?.template) {
          localStorage.removeItem(STORAGE_KEYS.ACTIVE_PROFILE_ID);
          hasRestoredProfile.current = true;
          return;
        }

        // Set the active profile
        setActiveProfileState({
          id: profileData.template.id,
          name: profileData.template.name,
          eoIds: profileData.eoIds,
          roleIds: profileData.roleIds,
        });
      } catch {
        // Silently ignore profile restoration failures — user can re-select manually
        localStorage.removeItem(STORAGE_KEYS.ACTIVE_PROFILE_ID);
      }

      hasRestoredProfile.current = true;
    };

    restoreActiveProfile();
  }, [selectedClient, user, mode]);

  // Reset profile restoration flag when client changes
  useEffect(() => {
    hasRestoredProfile.current = false;
  }, [selectedClientId]);

  // Non-admins without a selected client default to admin mode (clients list)
  // This ensures they see the clients page on first login

  // Persist mode changes to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.MODE, JSON.stringify(mode));
  }, [mode]);

  // Persist full active profile to localStorage for instant restore on refresh.
  // Important: don't remove it when activeProfile is null on initial mount,
  // otherwise we wipe the stored selection before the restore effect runs.
  useEffect(() => {
    if (activeProfile) {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_PROFILE_ID, JSON.stringify(activeProfile));
    }
  }, [activeProfile]);

  const setSelectedClient = useCallback((client: Client | null) => {
    setSelectedClientState(prev => {
      // Clear profile only when genuinely switching to a different client,
      // not when restoring the same client from null (page refresh).
      const prevId = prev?.id ?? selectedClientId;
      if (prevId && client?.id && prevId !== client.id) {
        setActiveProfileState(null);
        localStorage.removeItem(STORAGE_KEYS.ACTIVE_PROFILE_ID);
      }
      return client;
    });
    if (client) {
      setSelectedClientId(client.id);
      localStorage.setItem(STORAGE_KEYS.CLIENT_ID, JSON.stringify(client.id));
    } else {
      setSelectedClientId(null);
      localStorage.removeItem(STORAGE_KEYS.CLIENT_ID);
    }
  }, [selectedClientId]);

  const switchToIntegratorMode = useCallback((client: Client) => {
    setSelectedClient(client);
    setMode('integrator');
    persistViewModeToMetadata('integrator');
  }, [setSelectedClient]);

  const switchToAdminMode = useCallback(() => {
    setSelectedClient(null);
    setMode('admin');
    persistViewModeToMetadata('admin');
  }, [setSelectedClient]);

  const switchToUserFinalMode = useCallback(() => {
    // Keep the selected client when switching to user final mode
    // The client context from integrator mode should be preserved
    setMode('user_final');
    persistViewModeToMetadata('user_final');
    // Force profile re-fetch so changes made in integrator mode are picked up
    hasRestoredProfile.current = false;
  }, []);

  const setActiveProfile = useCallback((profile: ActiveProfile | null) => {
    setActiveProfileState(profile);
  }, []);

  const clearActiveProfile = useCallback(() => {
    setActiveProfileState(null);
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_PROFILE_ID);
  }, []);

  // Legacy simulation config support - converted from active profile
  const userSimulationConfig: UserSimulationConfig | null = activeProfile
    ? {
        selectedEoIds: activeProfile.eoIds,
        roleAssignments: [{ moduleId: 'all', roleIds: activeProfile.roleIds }],
      }
    : null;

  const setUserSimulationConfig = useCallback((config: UserSimulationConfig) => {
    // Convert to profile format
    setActiveProfileState({
      id: 'simulation',
      name: 'Simulation',
      eoIds: config.selectedEoIds,
      roleIds: config.roleAssignments.flatMap(a => a.roleIds),
    });
  }, []);

  const clearUserSimulation = useCallback(() => {
    setActiveProfileState(null);
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_PROFILE_ID);
  }, []);

  // Profile is configured if it has at least one EO and one role
  const isProfileConfigured = activeProfile !== null &&
    activeProfile.eoIds.length > 0 &&
    activeProfile.roleIds.length > 0;

  // Legacy alias
  const isUserSimulationConfigured = isProfileConfigured;

  return (
    <ViewModeContext.Provider
      value={{
        mode,
        isAdmin,
        isAdminLoading,
        selectedClient,
        availableClients: clients,
        activeProfile,
        isProfileConfigured,
        switchToIntegratorMode,
        switchToAdminMode,
        switchToUserFinalMode,
        setSelectedClient,
        setActiveProfile,
        clearActiveProfile,
        // Legacy
        userSimulationConfig,
        isUserSimulationConfigured,
        setUserSimulationConfig,
        clearUserSimulation,
      }}
    >
      {children}
    </ViewModeContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useViewMode() {
  const context = useContext(ViewModeContext);
  if (context === undefined) {
    // Avoid blank screens caused by provider mounting glitches (e.g. HMR/module duplication).
    // Falls back to default context silently.
    return FALLBACK_VIEWMODE_CONTEXT;
  }
  return context;
}
