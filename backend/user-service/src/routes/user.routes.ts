import { FastifyInstance } from 'fastify';
import {
    NotificationController,
    PropertyInterestController,
    SavedPropertyController,
    SearchHistoryController,
    UserPreferencesController,
    UserProfileController
} from '../controllers/user.controller.js';

export async function userRoutes(fastify: FastifyInstance) {
  if (process.env.ENABLE_DETAILED_LOGGING === 'true' || process.env.NODE_ENV !== 'production') {
    console.log('🔧 Registrando rotas do User Service...');
  }

  const userProfileController = new UserProfileController();
  const userPreferencesController = new UserPreferencesController();
  const propertyInterestController = new PropertyInterestController();
  const savedPropertyController = new SavedPropertyController();
  const searchHistoryController = new SearchHistoryController();
  const notificationController = new NotificationController();

  // User Profile Routes
  fastify.post('/api/v1/user-profiles', userProfileController.createUserProfile.bind(userProfileController));
  fastify.get('/api/v1/user-profiles/me', userProfileController.getUserProfile.bind(userProfileController));
  fastify.put('/api/v1/user-profiles/me', userProfileController.updateUserProfile.bind(userProfileController));
  fastify.get('/api/v1/user-profiles/:userId', userProfileController.getUserProfile.bind(userProfileController));
  fastify.put('/api/v1/user-profiles/:userId', userProfileController.updateUserProfile.bind(userProfileController));

  // User Preferences Routes
  fastify.get('/api/v1/user-preferences/me', userPreferencesController.getUserPreferences.bind(userPreferencesController));
  fastify.put('/api/v1/user-preferences/me', userPreferencesController.updateUserPreferences.bind(userPreferencesController));
  fastify.get('/api/v1/user-preferences/:userId', userPreferencesController.getUserPreferences.bind(userPreferencesController));
  fastify.put('/api/v1/user-preferences/:userId', userPreferencesController.updateUserPreferences.bind(userPreferencesController));

  // Property Interest Routes
  fastify.get('/api/v1/property-interests/me', propertyInterestController.getUserPropertyInterests.bind(propertyInterestController));
  fastify.post('/api/v1/property-interests', propertyInterestController.addPropertyInterest.bind(propertyInterestController));
  fastify.get('/api/v1/property-interests/:userId', propertyInterestController.getUserPropertyInterests.bind(propertyInterestController));

  // Saved Properties Routes
  fastify.get('/api/v1/saved-properties/me', savedPropertyController.getUserSavedProperties.bind(savedPropertyController));
  fastify.post('/api/v1/saved-properties', savedPropertyController.saveProperty.bind(savedPropertyController));
  fastify.delete('/api/v1/saved-properties/:propertyId', savedPropertyController.removeSavedProperty.bind(savedPropertyController));
  fastify.get('/api/v1/saved-properties/:userId', savedPropertyController.getUserSavedProperties.bind(savedPropertyController));

  // Search History Routes
  fastify.get('/api/v1/search-history/me', searchHistoryController.getUserSearchHistory.bind(searchHistoryController));
  fastify.post('/api/v1/search-history', searchHistoryController.addSearchHistory.bind(searchHistoryController));
  fastify.get('/api/v1/search-history/:userId', searchHistoryController.getUserSearchHistory.bind(searchHistoryController));

  // Notifications Routes
  fastify.get('/api/v1/notifications/me', notificationController.getUserNotifications.bind(notificationController));
  fastify.put('/api/v1/notifications/:notificationId/read', notificationController.markNotificationAsRead.bind(notificationController));
  fastify.get('/api/v1/notifications/:userId', notificationController.getUserNotifications.bind(notificationController));

  // Admin routes
  fastify.get('/api/v1/admin/pending-approvals', userProfileController.getPendingApprovals.bind(userProfileController));
  
  // Users CRUD - for admin management
  fastify.get('/api/v1/users', userProfileController.listUsers.bind(userProfileController));
  fastify.get('/api/v1/users/me', userProfileController.getCurrentUser.bind(userProfileController));
  fastify.post('/api/v1/users', userProfileController.createUserProfile.bind(userProfileController));
  fastify.get('/api/v1/users/:userId', userProfileController.getUserProfile.bind(userProfileController));
  fastify.put('/api/v1/users/:userId', userProfileController.updateUserProfile.bind(userProfileController));
  fastify.put('/api/v1/users/:userId/permissions', userProfileController.updateUserPermissions.bind(userProfileController));
  fastify.delete('/api/v1/users/:userId', userProfileController.deleteUserProfile.bind(userProfileController));
  
  // Users statistics
  fastify.get('/api/v1/users/statistics', userProfileController.getUserStatistics.bind(userProfileController));
  
  // Roles - for admin interface
  fastify.get('/api/v1/roles', userProfileController.getRoles.bind(userProfileController));

  if (process.env.ENABLE_DETAILED_LOGGING === 'true' || process.env.NODE_ENV !== 'production') {
    console.log('✅ Rotas do User Service registradas com sucesso');
  }
}




