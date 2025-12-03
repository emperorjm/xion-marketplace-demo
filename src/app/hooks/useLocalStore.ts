import { useState, useEffect, useCallback } from 'react';
import {
  LocalStore,
  UserRole,
  ActivityItem,
  getStore,
  setStore,
  getCurrentRole,
  setCurrentRole as setRoleInStore,
  getRecentActivity,
  clearRecentActivity,
} from '../store/localStore';

export function useLocalStore() {
  const [store, setLocalStore] = useState<LocalStore>(getStore);

  // Sync with localStorage changes
  useEffect(() => {
    const handleStorageChange = () => {
      setLocalStore(getStore());
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const updateStore = useCallback((updates: Partial<LocalStore>) => {
    const next = setStore(updates);
    setLocalStore(next);
  }, []);

  return { store, updateStore };
}

export function useRole() {
  const [role, setRole] = useState<UserRole>(getCurrentRole);

  // Sync with localStorage/role changes from other components or tabs
  useEffect(() => {
    const handleRoleChange = () => {
      setRole(getCurrentRole());
    };

    // Listen for cross-tab localStorage changes
    window.addEventListener('storage', handleRoleChange);
    // Listen for same-tab role changes via custom event
    window.addEventListener('roleChange', handleRoleChange);

    return () => {
      window.removeEventListener('storage', handleRoleChange);
      window.removeEventListener('roleChange', handleRoleChange);
    };
  }, []);

  const updateRole = useCallback((newRole: UserRole) => {
    setRoleInStore(newRole);
    setRole(newRole);
    // Dispatch custom event so other components using useRole() get notified
    window.dispatchEvent(new Event('roleChange'));
  }, []);

  return { role, setRole: updateRole };
}

export function useActivity() {
  const [activities, setActivities] = useState<ActivityItem[]>(getRecentActivity);

  // Refresh activities when storage changes
  useEffect(() => {
    const handleStorageChange = () => {
      setActivities(getRecentActivity());
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Refresh on mount and periodically
  useEffect(() => {
    setActivities(getRecentActivity());
    const interval = setInterval(() => {
      setActivities(getRecentActivity());
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const clearActivities = useCallback(() => {
    clearRecentActivity();
    setActivities([]);
  }, []);

  return { activities, clearActivities };
}
