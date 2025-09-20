import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';

// Types para o User Service
export interface UserProfile {
  id: string;
  userId: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatar?: string;
  bio?: string;
  dateOfBirth?: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  address?: {
    street?: string;
    city?: string;
    postalCode?: string;
    country?: string;
  };
  preferences?: {
    contactMethod?: 'EMAIL' | 'PHONE' | 'SMS';
    language?: string;
    timezone?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface UserPreferences {
  id: string;
  userId: string;
  propertyTypes?: string[];
  priceRange?: {
    min?: number;
    max?: number;
  };
  location?: {
    city?: string;
    district?: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
    radius?: number;
  };
  bedrooms?: {
    min?: number;
    max?: number;
  };
  bathrooms?: {
    min?: number;
    max?: number;
  };
  features?: string[];
  notifications?: {
    email?: boolean;
    sms?: boolean;
    push?: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface PropertyInterest {
  id: string;
  userId: string;
  propertyId: string;
  interestType: 'VIEWED' | 'FAVORITED' | 'CONTACTED' | 'SCHEDULED_VISIT';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SavedProperty {
  id: string;
  userId: string;
  propertyId: string;
  folder?: string;
  tags?: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SearchHistory {
  id: string;
  userId: string;
  query?: string;
  location?: string;
  propertyType?: string[];
  minPrice?: number;
  maxPrice?: number;
  minBedrooms?: number;
  maxBedrooms?: number;
  resultsCount?: number;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'PROPERTY_ALERT' | 'PRICE_DROP' | 'NEW_MATCH' | 'SYSTEM' | 'MARKETING';
  title: string;
  message: string;
  isRead: boolean;
  isArchived: boolean;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
}

// User Profile APIs
export function useUserProfile(userId?: string) {
  return useQuery<UserProfile>({
    queryKey: ['user-profile', userId],
    queryFn: async () => {
      const endpoint = userId ? `/api/v1/user-profiles/${userId}` : '/api/v1/user-profiles/me';
      const { data } = await api.get(endpoint);
      return data.data;
    },
    enabled: !!userId || true, // Sempre habilitado para buscar o próprio perfil
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
}

export function useUpdateUserProfile() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (updateData: Partial<UserProfile>) => {
      const { data } = await api.put('/api/v1/user-profiles/me', updateData);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
    },
  });
}

// User Preferences APIs
export function useUserPreferences(userId?: string) {
  return useQuery<UserPreferences>({
    queryKey: ['user-preferences', userId],
    queryFn: async () => {
      const endpoint = userId ? `/api/v1/user-preferences/${userId}` : '/api/v1/user-preferences/me';
      const { data } = await api.get(endpoint);
      return data.data || {};
    },
    enabled: !!userId || true,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
}

export function useUpdateUserPreferences() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (updateData: Partial<UserPreferences>) => {
      const { data } = await api.put('/api/v1/user-preferences/me', updateData);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-preferences'] });
    },
  });
}

// Property Interests APIs
export function useUserPropertyInterests(userId?: string) {
  return useQuery<PropertyInterest[]>({
    queryKey: ['property-interests', userId],
    queryFn: async () => {
      const endpoint = userId ? `/api/v1/property-interests/${userId}` : '/api/v1/property-interests/me';
      const { data } = await api.get(endpoint);
      return data.data || [];
    },
    enabled: !!userId || true,
    staleTime: 1000 * 60 * 2, // 2 minutos
  });
}

export function useAddPropertyInterest() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ propertyId, interestType }: { propertyId: string; interestType?: string }) => {
      const { data } = await api.post('/api/v1/property-interests', {
        propertyId,
        interestType: interestType || 'VIEWED'
      });
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['property-interests'] });
    },
  });
}

// Saved Properties APIs
export function useUserSavedProperties(userId?: string) {
  return useQuery<SavedProperty[]>({
    queryKey: ['saved-properties', userId],
    queryFn: async () => {
      const endpoint = userId ? `/api/v1/saved-properties/${userId}` : '/api/v1/saved-properties/me';
      const { data } = await api.get(endpoint);
      return data.data || [];
    },
    enabled: !!userId || true,
    staleTime: 1000 * 60 * 2, // 2 minutos
  });
}

export function useSaveProperty() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ propertyId, notes }: { propertyId: string; notes?: string }) => {
      const { data } = await api.post('/api/v1/saved-properties', {
        propertyId,
        notes: notes || ''
      });
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-properties'] });
    },
  });
}

export function useRemoveSavedProperty() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (propertyId: string) => {
      await api.delete(`/api/v1/saved-properties/${propertyId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-properties'] });
    },
  });
}

// Search History APIs
export function useUserSearchHistory(userId?: string) {
  return useQuery<SearchHistory[]>({
    queryKey: ['search-history', userId],
    queryFn: async () => {
      const endpoint = userId ? `/api/v1/search-history/${userId}` : '/api/v1/search-history/me';
      const { data } = await api.get(endpoint);
      return data.data || [];
    },
    enabled: !!userId || true,
    staleTime: 1000 * 60 * 2, // 2 minutos
  });
}

export function useAddSearchHistory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ searchQuery, resultsCount }: { searchQuery: string; resultsCount?: number }) => {
      const { data } = await api.post('/api/v1/search-history', {
        searchQuery,
        resultsCount: resultsCount || 0
      });
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['search-history'] });
    },
  });
}

// Notifications APIs
export function useUserNotifications(userId?: string) {
  return useQuery<Notification[]>({
    queryKey: ['notifications', userId],
    queryFn: async () => {
      const endpoint = userId ? `/api/v1/notifications/${userId}` : '/api/v1/notifications/me';
      const { data } = await api.get(endpoint);
      return data.data || [];
    },
    enabled: !!userId || true,
    staleTime: 1000 * 30, // 30 segundos
    refetchInterval: 1000 * 60, // Refetch a cada minuto
  });
}

export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (notificationId: string) => {
      await api.put(`/api/v1/notifications/${notificationId}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

// Utility functions
export async function trackPropertyView(propertyId: string) {
  try {
    await api.post('/api/v1/property-interests', {
      propertyId,
      interestType: 'VIEWED'
    });
  } catch (error) {
    console.warn('Failed to track property view:', error);
  }
}

export async function trackSearch(searchQuery: string, resultsCount: number) {
  try {
    await api.post('/api/v1/search-history', {
      searchQuery,
      resultsCount
    });
  } catch (error) {
    console.warn('Failed to track search:', error);
  }
}
