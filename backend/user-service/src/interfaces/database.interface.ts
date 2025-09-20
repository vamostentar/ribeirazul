import { 
  UserProfile, 
  UserPreferences, 
  PropertyInterest, 
  SavedProperty, 
  SearchHistory, 
  Notification,
  Gender,
  ContactMethod,
  ProfileVisibility,
  PropertyType,
  InterestType,
  Priority,
  SortBy,
  ViewMode,
  NotificationType,
  DeliveryMethod
} from '@/types/user';

/**
 * Interface para abstração de banco de dados
 * Permite trocar implementações (Prisma, TypeORM, etc.) sem afetar o código de negócio
 */
export interface DatabaseConnection {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): Promise<boolean>;

  // Transaction support
  transaction<T>(callback: (tx: DatabaseTransaction) => Promise<T>): Promise<T>;

  // Repository interfaces
  userProfiles: UserProfileRepositoryInterface;
  userPreferences: UserPreferencesRepositoryInterface;
  propertyInterests: PropertyInterestRepositoryInterface;
  savedProperties: SavedPropertyRepositoryInterface;
  searchHistory: SearchHistoryRepositoryInterface;
  notifications: NotificationRepositoryInterface;
}

/**
 * Interface para transações de banco de dados
 */
export interface DatabaseTransaction {
  userProfiles: UserProfileRepositoryInterface;
  userPreferences: UserPreferencesRepositoryInterface;
  propertyInterests: PropertyInterestRepositoryInterface;
  savedProperties: SavedPropertyRepositoryInterface;
  searchHistory: SearchHistoryRepositoryInterface;
  notifications: NotificationRepositoryInterface;
}

/**
 * Interface para repositório de perfis de utilizadores
 */
export interface UserProfileRepositoryInterface {
  findById(id: string): Promise<UserProfile | null>;
  findByEmail(email: string): Promise<UserProfile | null>;
  create(data: CreateUserProfileData): Promise<UserProfile>;
  update(id: string, data: UpdateUserProfileData): Promise<UserProfile>;
  delete(id: string): Promise<void>;
  findMany(options: FindManyOptions): Promise<UserProfile[]>;
  count(where?: any): Promise<number>;
  emailExists(email: string, excludeUserId?: string): Promise<boolean>;
  verifyEmail(id: string): Promise<void>;
  verifyPhone(id: string): Promise<void>;
  updateLastActivity(id: string): Promise<void>;
}

/**
 * Interface para repositório de preferências de utilizadores
 */
export interface UserPreferencesRepositoryInterface {
  findByUserId(userId: string): Promise<UserPreferences | null>;
  create(data: CreateUserPreferencesData): Promise<UserPreferences>;
  update(userId: string, data: UpdateUserPreferencesData): Promise<UserPreferences>;
  delete(userId: string): Promise<void>;
}

/**
 * Interface para repositório de interesses em propriedades
 */
export interface PropertyInterestRepositoryInterface {
  findById(id: string): Promise<PropertyInterest | null>;
  findByUserId(userId: string, options?: FindManyOptions): Promise<PropertyInterest[]>;
  findByPropertyId(propertyId: string, options?: FindManyOptions): Promise<PropertyInterest[]>;
  create(data: CreatePropertyInterestData): Promise<PropertyInterest>;
  update(id: string, data: UpdatePropertyInterestData): Promise<PropertyInterest>;
  delete(id: string): Promise<void>;
  markAsContacted(id: string): Promise<void>;
  findByInterestType(type: InterestType, options?: FindManyOptions): Promise<PropertyInterest[]>;
}

/**
 * Interface para repositório de propriedades guardadas
 */
export interface SavedPropertyRepositoryInterface {
  findById(id: string): Promise<SavedProperty | null>;
  findByUserId(userId: string, options?: FindManyOptions): Promise<SavedProperty[]>;
  findByPropertyId(propertyId: string, options?: FindManyOptions): Promise<SavedProperty[]>;
  create(data: CreateSavedPropertyData): Promise<SavedProperty>;
  update(id: string, data: UpdateSavedPropertyData): Promise<SavedProperty>;
  delete(id: string): Promise<void>;
  findByFolder(userId: string, folder: string): Promise<SavedProperty[]>;
  findByTag(userId: string, tag: string): Promise<SavedProperty[]>;
}

/**
 * Interface para repositório de histórico de pesquisas
 */
export interface SearchHistoryRepositoryInterface {
  findById(id: string): Promise<SearchHistory | null>;
  findByUserId(userId: string, options?: FindManyOptions): Promise<SearchHistory[]>;
  create(data: CreateSearchHistoryData): Promise<SearchHistory>;
  delete(id: string): Promise<void>;
  deleteOldEntries(olderThan: Date): Promise<number>;
  getPopularSearches(limit?: number): Promise<SearchHistory[]>;
}

/**
 * Interface para repositório de notificações
 */
export interface NotificationRepositoryInterface {
  findById(id: string): Promise<Notification | null>;
  findByUserId(userId: string, options?: FindManyOptions): Promise<Notification[]>;
  create(data: CreateNotificationData): Promise<Notification>;
  update(id: string, data: UpdateNotificationData): Promise<Notification>;
  delete(id: string): Promise<void>;
  markAsRead(id: string): Promise<void>;
  markAsUnread(id: string): Promise<void>;
  markAsArchived(id: string): Promise<void>;
  markAsUnarchived(id: string): Promise<void>;
  getUnreadCount(userId: string): Promise<number>;
  deleteOldNotifications(olderThan: Date): Promise<number>;
}

/**
 * Interface para opções de busca
 */
export interface FindManyOptions {
  skip?: number;
  take?: number;
  where?: Record<string, any>;
  orderBy?: Record<string, 'asc' | 'desc'>;
  include?: Record<string, boolean>;
}

// Data transfer objects
export interface CreateUserProfileData {
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
  preferredContactMethod?: ContactMethod;
  language?: string;
  timezone?: string;
  profileVisibility?: ProfileVisibility;
  allowMarketing?: boolean;
  allowNotifications?: boolean;
}

export interface UpdateUserProfileData {
  firstName?: string;
  lastName?: string;
  email?: string;
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
  preferredContactMethod?: ContactMethod;
  language?: string;
  timezone?: string;
  profileVisibility?: ProfileVisibility;
  allowMarketing?: boolean;
  allowNotifications?: boolean;
  isActive?: boolean;
}

export interface CreateUserPreferencesData {
  userId: string;
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

export interface UpdateUserPreferencesData {
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

export interface CreatePropertyInterestData {
  userId: string;
  propertyId: string;
  interestType: InterestType;
  notes?: string;
  priority?: Priority;
}

export interface UpdatePropertyInterestData {
  interestType?: InterestType;
  notes?: string;
  priority?: Priority;
  isActive?: boolean;
  contacted?: boolean;
  contactedAt?: Date;
}

export interface CreateSavedPropertyData {
  userId: string;
  propertyId: string;
  folder?: string;
  notes?: string;
  tags?: string[];
}

export interface UpdateSavedPropertyData {
  folder?: string;
  notes?: string;
  tags?: string[];
}

export interface CreateSearchHistoryData {
  userId: string;
  query?: string;
  location?: string;
  propertyType?: PropertyType[];
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
}

export interface CreateNotificationData {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  deliveryMethod?: DeliveryMethod;
}

export interface UpdateNotificationData {
  isRead?: boolean;
  readAt?: Date;
  isArchived?: boolean;
  archivedAt?: Date;
  sentAt?: Date;
  deliveredAt?: Date;
}
