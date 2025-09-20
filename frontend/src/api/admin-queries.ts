import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';

// Types for admin data
interface UserStatistics {
  total: number;
  active: number;
  inactive: number;
  verified: number;
  unverified: number;
  withTwoFactor: number;
  recentLogins: number;
}

interface PropertyStatistics {
  total: number;
  active: number;
  pending: number;
  inactive: number;
  totalValue: number;
  averagePrice: number;
  monthlyViews: number;
}

interface DashboardStats {
  users: UserStatistics;
  properties: PropertyStatistics;
  pendingApprovals: number;
}

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  isActive: boolean;
  isVerified: boolean;
  role: string;
  roleId: string;
  createdAt: string;
  updatedAt: string;
}

// Dashboard Statistics
export function useDashboardStats() {
  return useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      try {
        // Fetch user statistics from auth service
        const userStatsResponse = await api.get('/api/v1/users/statistics');
        const userStats = userStatsResponse.data?.data || {
          total: 0,
          active: 0,
          inactive: 0,
          verified: 0,
          unverified: 0,
          withTwoFactor: 0,
          recentLogins: 0,
        };

        // Fetch property statistics from properties service
        let propertyStats = {
          total: 0,
          active: 0,
          pending: 0,
          inactive: 0,
          totalValue: 0,
          averagePrice: 0,
          monthlyViews: 0,
        };

        try {
          const propertyStatsResponse = await api.get('/api/v1/properties-stats');
          propertyStats = propertyStatsResponse.data?.data || propertyStats;
        } catch (error) {
          console.warn('Property stats not available:', error);
        }

        // Buscar aprovações pendentes do user-service
        let pendingApprovals = 0;
        try {
          const approvalsResponse = await api.get('/api/v1/admin/pending-approvals');
          pendingApprovals = approvalsResponse.data?.data?.count || 0;
        } catch (error) {
          console.warn('Erro ao buscar aprovações pendentes:', error);
          // Manter 0 como fallback
        }

        return {
          users: userStats,
          properties: propertyStats,
          pendingApprovals,
        };
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        throw error; // Re-throw para que o React Query trate o erro
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1,
  });
}

// Users Management
export function useUsers(params?: {
  query?: string;
  limit?: number;
  cursor?: string;
}) {
  return useQuery<{ data: User[]; pagination?: any }>({
    queryKey: ['users', params],
    queryFn: async () => {
      try {
        const { data } = await api.get('/api/v1/users', { params });
        return data;
      } catch (error) {
        console.error('Error fetching users:', error);
        throw error;
      }
    },
    staleTime: 1000 * 60, // 1 minute
    retry: 1,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userData: Partial<User>) => {
      const { data } = await api.post('/api/v1/users', userData);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, userData }: { id: string; userData: Partial<User> }) => {
      const { data } = await api.put(`/api/v1/users/${id}`, userData);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/v1/users/${id}`);
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });
}

// Analytics data
export function useAnalyticsData() {
  return useQuery({
    queryKey: ['analytics'],
    queryFn: async () => {
      try {
        // TODO: Implementar endpoints reais de analytics
        // Por enquanto retorna dados vazios
        return {
          propertyTypes: [],
          topRegions: [],
          monthlyStats: []
        };
      } catch (error) {
        console.error('Error fetching analytics data:', error);
        throw error;
      }
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}

import type {
  CreateModuleSettingRequest,
  ModuleSettingsList,
  SettingsOperationResult,
  SystemSettings,
  UpdateModuleSettingRequest,
  UpdateSystemSettingsRequest
} from '@/types';

// System Settings
export function useSystemSettings() {
  return useQuery<SettingsOperationResult<SystemSettings>>({
    queryKey: ['system-settings'],
    queryFn: async () => {
      try {
        const { data } = await api.get('/api/v1/settings');
        return data;
      } catch (error) {
        console.error('Error fetching system settings:', error);
        throw error;
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2,
  });
}

export function useUpdateSystemSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (settings: UpdateSystemSettingsRequest) => {
      const { data } = await api.put('/api/v1/settings', settings);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });
}

export function useResetSystemSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/api/v1/settings/reset');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });
}

export function useSettingsField(fieldName: string) {
  return useQuery<SettingsOperationResult<{ field: string; value: any }>>({
    queryKey: ['settings-field', fieldName],
    queryFn: async () => {
      const { data } = await api.get(`/api/v1/settings/field/${fieldName}`);
      return data;
    },
    enabled: !!fieldName,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

export function useUpdateSettingsField() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ fieldName, value }: { fieldName: string; value: any }) => {
      const { data } = await api.put(`/api/v1/settings/field/${fieldName}`, { value });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      queryClient.invalidateQueries({ queryKey: ['settings-field'] });
    },
  });
}

export function useValidateSettings() {
  return useMutation({
    mutationFn: async (settings: UpdateSystemSettingsRequest) => {
      const { data } = await api.post('/api/v1/settings/validate', settings);
      return data;
    },
  });
}

export function useSettingsStats() {
  return useQuery<SettingsOperationResult<any>>({
    queryKey: ['settings-stats'],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/settings/stats');
      return data;
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}

// Backup & Restore APIs
export interface BackupItem {
  id: string;
  name: string;
  size: string;
  createdAt: string;
  type: 'full' | 'incremental' | 'settings';
  description?: string;
}

export interface CreateBackupRequest {
  type: 'full' | 'incremental' | 'settings';
  description?: string;
}

export interface RestoreBackupRequest {
  backupId: string;
  confirmRestore: boolean;
}

export function useBackups() {
  return useQuery<BackupItem[]>({
    queryKey: ['backups'],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/backup');
      return data.data;
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

export function useCreateBackup() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (request: CreateBackupRequest) => {
      const { data } = await api.post('/api/v1/backup', request);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backups'] });
    },
  });
}

export function useRestoreBackup() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (request: RestoreBackupRequest) => {
      const { data } = await api.post('/api/v1/backup/restore', request);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backups'] });
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
    },
  });
}

export function useDeleteBackup() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (backupId: string) => {
      const { data } = await api.delete(`/api/v1/backup/${backupId}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backups'] });
    },
  });
}

export function useDownloadBackup() {
  return useMutation({
    mutationFn: async (backupId: string) => {
      const response = await api.get(`/api/v1/backup/${backupId}/download`, {
        responseType: 'blob'
      });
      return response.data;
    },
  });
}

// SEO Validation
export interface SEOValidationResult {
  title: {
    score: number;
    status: 'success' | 'warning' | 'error';
    message: string;
    length: number;
    maxLength: number;
  };
  description: {
    score: number;
    status: 'success' | 'warning' | 'error';
    message: string;
    length: number;
    maxLength: number;
  };
  keywords: {
    score: number;
    status: 'success' | 'warning' | 'error';
    message: string;
    count: number;
  };
  overallScore: number;
}

export function useValidateSEO() {
  return useMutation({
    mutationFn: async (settings: UpdateSystemSettingsRequest) => {
      const { data } = await api.post('/api/v1/settings/validate/seo', settings);
      return data.data;
    },
  });
}

// Module Settings
export function useModuleSettings(moduleName: string) {
  return useQuery<SettingsOperationResult<any>>({
    queryKey: ['module-settings', moduleName],
    queryFn: async () => {
      const { data } = await api.get(`/api/v1/module-settings/${moduleName}`);
      return data;
    },
    enabled: !!moduleName,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useUpdateModuleSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ moduleName, settings }: { moduleName: string; settings: Record<string, any> }) => {
      const { data } = await api.put(`/api/v1/module-settings/${moduleName}`, settings);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['module-settings', variables.moduleName] });
      queryClient.invalidateQueries({ queryKey: ['module-settings-list'] });
    },
  });
}

export function useModuleSetting(moduleName: string, settingsKey: string) {
  return useQuery<SettingsOperationResult<{ module: string; key: string; value: any }>>({
    queryKey: ['module-setting', moduleName, settingsKey],
    queryFn: async () => {
      const { data } = await api.get(`/api/v1/module-settings/${moduleName}/${settingsKey}`);
      return data;
    },
    enabled: !!moduleName && !!settingsKey,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useCreateModuleSetting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (setting: CreateModuleSettingRequest) => {
      const { data } = await api.post('/api/v1/module-settings', setting);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['module-settings-list'] });
    },
  });
}

export function useUpdateModuleSetting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateModuleSettingRequest }) => {
      const { data: response } = await api.put(`/api/v1/module-settings/setting/${id}`, data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['module-settings-list'] });
      queryClient.invalidateQueries({ queryKey: ['module-settings'] });
    },
  });
}

export function useDeleteModuleSetting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/v1/module-settings/setting/${id}`);
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['module-settings-list'] });
      queryClient.invalidateQueries({ queryKey: ['module-settings'] });
    },
  });
}

export function useDeleteModuleSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (moduleName: string) => {
      await api.delete(`/api/v1/module-settings/module/${moduleName}`);
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['module-settings-list'] });
      queryClient.invalidateQueries({ queryKey: ['module-settings'] });
    },
  });
}

export function useModuleSettingsList(params?: {
  page?: number;
  limit?: number;
  filters?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}) {
  return useQuery<ModuleSettingsList>({
    queryKey: ['module-settings-list', params],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/module-settings', { params });
      return data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// ===== NEW ADVANCED USER MANAGEMENT APIs =====

// Communication API
interface CommunicationData {
  type: 'email' | 'notification' | 'bulk_email';
  subject: string;
  message: string;
  userIds: string[];
  template?: string;
}

interface CommunicationResult {
  message: string;
  sentCount: number;
  errors?: string[];
}

export function useSendCommunication() {
  const queryClient = useQueryClient();
  return useMutation<CommunicationResult, Error, CommunicationData>({
    mutationFn: async (data: CommunicationData) => {
      const { data: result } = await api.post('/api/v1/users/communication/send', data);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

// Bulk Import API
interface ImportUserData {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: string;
  isActive: boolean;
  isVerified: boolean;
}

interface ImportResult {
  imported: number;
  failed: number;
  errors?: string[];
}

export function useBulkImportUsers() {
  const queryClient = useQueryClient();
  return useMutation<ImportResult, Error, { users: ImportUserData[] }>({
    mutationFn: async (data: { users: ImportUserData[] }) => {
      const { data: result } = await api.post('/api/v1/users/bulk-import', data);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });
}

// Audit API
interface AuditLog {
  id: string;
  action: string;
  description: string;
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

export function useUserAuditLogs(userId: string, period?: string, limit?: number) {
  return useQuery<AuditLog[]>({
    queryKey: ['user-audit-logs', userId, period, limit],
    queryFn: async () => {
      const { data } = await api.get(`/api/v1/users/${userId}/audit`, {
        params: { period, limit }
      });
      return data.data;
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

// Permissions API
interface UserPermissions {
  role: string;
  permissions: string[];
  customPermissions: string[];
}

export function useUserPermissions(userId: string) {
  return useQuery<UserPermissions>({
    queryKey: ['user-permissions', userId],
    queryFn: async () => {
      const { data } = await api.get(`/api/v1/users/${userId}/permissions`);
      return data.data;
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useUpdateUserPermissions() {
  const queryClient = useQueryClient();
  return useMutation<{ message: string; permissions: string[] }, Error, { userId: string; permissions: string[] }>({
    mutationFn: async ({ userId, permissions }) => {
      const { data } = await api.put(`/api/v1/users/${userId}/permissions`, { permissions });
      return data.data;
    },
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ['user-permissions', userId] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

// Roles API
interface Role {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  permissions: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export function useRoles() {
  return useQuery<Role[]>({
    queryKey: ['roles'],
    queryFn: async () => {
      const { data } = await api.get('/api/v1/roles');
      return data.data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}