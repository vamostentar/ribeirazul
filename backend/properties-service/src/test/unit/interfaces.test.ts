import { beforeEach, describe, expect, it } from 'vitest';
import { ServiceFactory } from '../../factories/service.factory';

describe('ServiceFactory - Testes Unitários', () => {
  let serviceFactory: ServiceFactory;

  beforeEach(async () => {
    serviceFactory = ServiceFactory.getInstance();
    await serviceFactory.initialize();
  });

  describe('createPropertyService', () => {
    it('deve criar um serviço de propriedades válido', () => {
      const propertyService = serviceFactory.createPropertyService();
      
      expect(propertyService).toBeDefined();
      expect(typeof propertyService.createProperty).toBe('function');
      expect(typeof propertyService.getPropertyById).toBe('function');
      expect(typeof propertyService.getProperties).toBe('function');
    });

    it('deve implementar a interface IPropertyService', () => {
      const propertyService = serviceFactory.createPropertyService();
      
      // Verificar se implementa todos os métodos da interface
      expect(propertyService).toHaveProperty('createProperty');
      expect(propertyService).toHaveProperty('getPropertyById');
      expect(propertyService).toHaveProperty('getProperties');
      expect(propertyService).toHaveProperty('updateProperty');
      expect(propertyService).toHaveProperty('deleteProperty');
      expect(propertyService).toHaveProperty('getPropertiesStats');
      expect(propertyService).toHaveProperty('searchProperties');
      expect(propertyService).toHaveProperty('getNearbyProperties');
    });
  });

  describe('createMediaService', () => {
    it('deve criar um serviço de media válido', () => {
      const mediaService = serviceFactory.createMediaService();
      
      expect(mediaService).toBeDefined();
      expect(typeof mediaService.uploadImage).toBe('function');
      expect(typeof mediaService.deleteImage).toBe('function');
      expect(typeof mediaService.getImageUrl).toBe('function');
    });

    it('deve implementar a interface IMediaService', () => {
      const mediaService = serviceFactory.createMediaService();
      
      expect(mediaService).toHaveProperty('uploadImage');
      expect(mediaService).toHaveProperty('deleteImage');
      expect(mediaService).toHaveProperty('getImageUrl');
    });
  });

  describe('createEventBus', () => {
    it('deve criar um event bus válido', () => {
      const eventBus = serviceFactory.createEventBus();
      
      expect(eventBus).toBeDefined();
      expect(typeof eventBus.publish).toBe('function');
      expect(typeof eventBus.subscribe).toBe('function');
    });

    it('deve implementar a interface IEventBus', () => {
      const eventBus = serviceFactory.createEventBus();
      
      expect(eventBus).toHaveProperty('publish');
      expect(eventBus).toHaveProperty('subscribe');
    });
  });

  describe('createCompletePropertyService', () => {
    it('deve criar um serviço completo com todas as dependências', () => {
      const completeService = serviceFactory.createCompletePropertyService();
      
      expect(completeService).toBeDefined();
      expect(typeof completeService.createProperty).toBe('function');
      expect(typeof completeService.getPropertyById).toBe('function');
    });
  });
});
