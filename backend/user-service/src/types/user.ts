import {
    ContactMethod,
    DeliveryMethod,
    Gender,
    InterestType,
    NotificationType,
    Priority,
    ProfileVisibility,
    PropertyType,
    SortBy,
    UserRole,
    ViewMode
} from '@prisma/client';

// Re-export enums for easier access
export {
    ContactMethod, DeliveryMethod, Gender, InterestType, NotificationType, Priority, ProfileVisibility,
    PropertyType, SortBy, UserRole,
    ViewMode
};

/**
 * Tipos principais do sistema de gestão de utilizadores
 */

// User Profile
export interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  avatar?: string;
  bio?: string;
  dateOfBirth?: Date;
  gender?: Gender;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  preferredContactMethod: ContactMethod;
  language: string;
  timezone: string;
  role: UserRole;
  isActive: boolean;
  isEmailVerified: boolean;
  emailVerifiedAt?: Date;
  isPhoneVerified: boolean;
  phoneVerifiedAt?: Date;
  profileVisibility: ProfileVisibility;
  allowMarketing: boolean;
  allowNotifications: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// User Preferences
export interface UserPreferences {
  id: string;
  userId: string;
  user?: UserProfile;
  propertyTypes: PropertyType[];
  minPrice?: number;
  maxPrice?: number;
  minBedrooms?: number;
  maxBedrooms?: number;
  minBathrooms?: number;
  maxBathrooms?: number;
  minArea?: number;
  maxArea?: number;
  preferredLocation?: string;
  searchRadius?: number;
  sortBy: SortBy;
  viewMode: ViewMode;
  emailNotifications: boolean;
  smsNotifications: boolean;
  pushNotifications: boolean;
  priceDropAlerts: boolean;
  newPropertyAlerts: boolean;
  marketUpdateAlerts: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Property Interest
export interface PropertyInterest {
  id: string;
  userId: string;
  user?: UserProfile;
  propertyId: string;
  interestType: InterestType;
  notes?: string;
  priority: Priority;
  isActive: boolean;
  contacted: boolean;
  contactedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Saved Property
export interface SavedProperty {
  id: string;
  userId: string;
  user?: UserProfile;
  propertyId: string;
  folder?: string;
  notes?: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

// Search History
export interface SearchHistory {
  id: string;
  userId: string;
  user?: UserProfile;
  query?: string;
  location?: string;
  propertyType: PropertyType[];
  minPrice?: number;
  maxPrice?: number;
  minBedrooms?: number;
  maxBedrooms?: number;
  minBathrooms?: number;
  maxBathrooms?: number;
  minArea?: number;
  maxArea?: number;
  resultsCount?: number;
  searchTime?: number;
  createdAt: Date;
}

// Notification
export interface Notification {
  id: string;
  userId: string;
  user?: UserProfile;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  isRead: boolean;
  readAt?: Date;
  isArchived: boolean;
  archivedAt?: Date;
  deliveryMethod: DeliveryMethod;
  sentAt?: Date;
  deliveredAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Request/Response DTOs
export interface CreateUserProfileRequest {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  avatar?: string;
  bio?: string;
  dateOfBirth?: string;
  gender?: Gender;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  preferredContactMethod?: ContactMethod;
  language?: string;
  timezone?: string;
  profileVisibility?: ProfileVisibility;
  allowMarketing?: boolean;
  allowNotifications?: boolean;
}

export interface UpdateUserProfileRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  avatar?: string;
  bio?: string;
  dateOfBirth?: string;
  gender?: Gender;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  preferredContactMethod?: ContactMethod;
  language?: string;
  timezone?: string;
  profileVisibility?: ProfileVisibility;
  allowMarketing?: boolean;
  allowNotifications?: boolean;
}

export interface UserProfileResponse {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  avatar?: string;
  bio?: string;
  dateOfBirth?: string;
  gender?: Gender;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  preferredContactMethod: ContactMethod;
  language: string;
  timezone: string;
  role: UserRole;
  isActive: boolean;
  isEmailVerified: boolean;
  emailVerifiedAt?: string;
  isPhoneVerified: boolean;
  phoneVerifiedAt?: string;
  profileVisibility: ProfileVisibility;
  allowMarketing: boolean;
  allowNotifications: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserPreferencesRequest {
  propertyTypes?: PropertyType[];
  minPrice?: number;
  maxPrice?: number;
  minBedrooms?: number;
  maxBedrooms?: number;
  minBathrooms?: number;
  maxBathrooms?: number;
  minArea?: number;
  maxArea?: number;
  preferredLocation?: string;
  searchRadius?: number;
  sortBy?: SortBy;
  viewMode?: ViewMode;
  emailNotifications?: boolean;
  smsNotifications?: boolean;
  pushNotifications?: boolean;
  priceDropAlerts?: boolean;
  newPropertyAlerts?: boolean;
  marketUpdateAlerts?: boolean;
}

export interface UserPreferencesResponse {
  id: string;
  userId: string;
  propertyTypes: PropertyType[];
  minPrice?: number;
  maxPrice?: number;
  minBedrooms?: number;
  maxBedrooms?: number;
  minBathrooms?: number;
  maxBathrooms?: number;
  minArea?: number;
  maxArea?: number;
  preferredLocation?: string;
  searchRadius?: number;
  sortBy: SortBy;
  viewMode: ViewMode;
  emailNotifications: boolean;
  smsNotifications: boolean;
  pushNotifications: boolean;
  priceDropAlerts: boolean;
  newPropertyAlerts: boolean;
  marketUpdateAlerts: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePropertyInterestRequest {
  propertyId: string;
  interestType: InterestType;
  notes?: string;
  priority?: Priority;
}

export interface PropertyInterestResponse {
  id: string;
  userId: string;
  propertyId: string;
  interestType: InterestType;
  notes?: string;
  priority: Priority;
  isActive: boolean;
  contacted: boolean;
  contactedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSavedPropertyRequest {
  propertyId: string;
  folder?: string;
  notes?: string;
  tags?: string[];
}

export interface SavedPropertyResponse {
  id: string;
  userId: string;
  propertyId: string;
  folder?: string;
  notes?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateNotificationRequest {
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  deliveryMethod?: DeliveryMethod;
}

export interface NotificationResponse {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  isRead: boolean;
  readAt?: string;
  isArchived: boolean;
  archivedAt?: string;
  deliveryMethod: DeliveryMethod;
  sentAt?: string;
  deliveredAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Query parameters
export interface UserProfileQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  city?: string;
  state?: string;
  country?: string;
  isActive?: boolean;
  isEmailVerified?: boolean;
  sortBy?: 'createdAt' | 'updatedAt' | 'firstName' | 'lastName' | 'email';
  sortOrder?: 'asc' | 'desc';
}

export interface NotificationQueryParams {
  page?: number;
  limit?: number;
  type?: NotificationType;
  isRead?: boolean;
  isArchived?: boolean;
  sortBy?: 'createdAt' | 'updatedAt' | 'readAt';
  sortOrder?: 'asc' | 'desc';
}

// API Response wrappers
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
  meta?: {
    timestamp: string;
    requestId?: string;
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}
