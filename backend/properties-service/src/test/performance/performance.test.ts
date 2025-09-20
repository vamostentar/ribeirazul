import type { FastifyInstance } from 'fastify';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanDatabase, createTestProperty, testPrisma, waitForDatabase } from '../setup-ephemeral';

describe('Performance Tests', () => {
  let app: FastifyInstance;
  
  beforeEach(async () => {
    await cleanDatabase();
    await waitForDatabase();
    await vi.resetModules();
    vi.doMock('../../config/database', () => ({
      prisma: testPrisma,
      connectDatabase: async () => { await testPrisma.$connect(); },
      setupDatabaseShutdown: () => {},
    }));
    const { buildApp } = await import('../../app');
    app = await buildApp();
  });
  
  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('Database Performance', () => {
    it('should handle bulk property creation efficiently', async () => {
      const startTime = Date.now();
      
      // Create 100 properties in parallel
      const properties = Array.from({ length: 100 }, (_, i) =>
        createTestProperty({
          title: `Property ${i + 1}`,
          price: 200000 + (i * 10000),
          location: `Location ${i + 1}`,
        })
      );
      
      const createPromises = properties.map(property =>
        app.inject({
          method: 'POST',
          url: '/api/v1/properties',
          payload: property,
        })
      );
      
      const responses: any[] = await Promise.all(createPromises);
      const endTime = Date.now();
      
      // All should succeed
      responses.forEach(response => {
        expect(response.statusCode).toBe(201);
      });
      
      // Should complete within reasonable time
      const totalTime = endTime - startTime;
      expect(totalTime).toBeLessThan(10000); // 10 seconds
      
      console.log(`Bulk creation of 100 properties took: ${totalTime}ms`);
      console.log(`Average time per property: ${totalTime / 100}ms`);
    });

    it('should handle large dataset queries efficiently', async () => {
      // Create 500 properties
      const properties = Array.from({ length: 500 }, (_, i) =>
        createTestProperty({
          title: `Property ${i + 1}`,
          price: 200000 + (i * 5000),
          status: i % 3 === 0 ? 'for_sale' : i % 3 === 1 ? 'for_rent' : 'sold',
        })
      );
      
      for (const property of properties) {
        await app.inject({
          method: 'POST',
          url: '/api/v1/properties',
          payload: property,
        });
      }
      
      await waitForDatabase();
      
      // Test different query patterns
      const queryTests = [
        { name: 'All properties', url: '/api/v1/properties?limit=100' },
        { name: 'Filtered by status', url: '/api/v1/properties?status=for_sale&limit=100' },
        { name: 'Price range filter', url: '/api/v1/properties?minPrice=200000&maxPrice=400000&limit=100' },
        { name: 'Text search', url: '/api/v1/properties?q=Property&limit=100' },
        { name: 'Location filter', url: '/api/v1/properties?location=Location&limit=100' },
      ];
      
      for (const test of queryTests) {
        const startTime = Date.now();
        const response = await app.inject({
          method: 'GET',
          url: test.url,
        });
        const endTime = Date.now();
        
        expect(response.statusCode).toBe(200);
        
        const queryTime = endTime - startTime;
        console.log(`${test.name} query took: ${queryTime}ms`);
        
        // Queries should complete within reasonable time
        expect(queryTime).toBeLessThan(2000); // 2 seconds
      }
    });

    it('should handle complex filtering efficiently', async () => {
      // Create properties with various characteristics
      const properties: any[] = [];
      for (let i = 0; i < 200; i++) {
        properties.push(createTestProperty({
          title: `Property ${i + 1}`,
          price: 150000 + (i * 10000),
          bedrooms: (i % 5) + 1,
          bathrooms: (i % 3) + 1,
          area: 50 + (i % 100),
          yearBuilt: 1990 + (i % 30),
          features: i % 2 === 0 ? ['ELEVATOR', 'BALCONY'] : ['GARAGE'],
          coordinates: {
            latitude: 38.7 + (i * 0.01),
            longitude: -9.1 + (i * 0.01),
          },
        }));
      }
      
      for (const property of properties) {
        await app.inject({
          method: 'POST',
          url: '/api/v1/properties',
          payload: property,
        });
      }
      
      await waitForDatabase();
      
      // Test complex filtering
      const complexQueries = [
        {
          name: 'Multi-criteria filter',
          url: '/api/v1/properties?minPrice=200000&maxPrice=500000&minBedrooms=2&maxBedrooms=4&minArea=60&maxArea=150&limit=50',
        },
        {
          name: 'Feature-based filter',
          url: '/api/v1/properties?features=ELEVATOR&features=BALCONY&limit=50',
        },
        {
          name: 'Year range filter',
          url: '/api/v1/properties?minYearBuilt=2000&maxYearBuilt=2010&limit=50',
        },
        {
          name: 'Nearby search',
          url: '/api/v1/properties/nearby?lat=38.7&lng=-9.1&radius=2&limit=50',
        },
      ];
      
      for (const query of complexQueries) {
        const startTime = Date.now();
        const response = await app.inject({
          method: 'GET',
          url: query.url,
        });
        const endTime = Date.now();
        
        expect(response.statusCode).toBe(200);
        
        const queryTime = endTime - startTime;
        console.log(`${query.name} took: ${queryTime}ms`);
        
        // Complex queries should complete within reasonable time
        expect(queryTime).toBeLessThan(3000); // 3 seconds
      }
    });
  });

  describe('API Performance', () => {
    beforeEach(async () => {
      // Create test data
      const properties = Array.from({ length: 50 }, (_, i) =>
        createTestProperty({
          title: `Property ${i + 1}`,
          price: 200000 + (i * 10000),
        })
      );
      
      for (const property of properties) {
        await app.inject({
          method: 'POST',
          url: '/api/v1/properties',
          payload: property,
        });
      }
      
      await waitForDatabase();
    });

    it('should handle high concurrent read requests', async () => {
      const concurrentRequests = 50;
      const startTime = Date.now();
      
      const promises = Array.from({ length: concurrentRequests }, () =>
        app.inject({
          method: 'GET',
          url: '/api/v1/properties?limit=20',
        })
      );
      
      const responses = await Promise.all(promises);
      const endTime = Date.now();
      
      // All should succeed
      responses.forEach(response => {
        expect(response.statusCode).toBe(200);
      });
      
      const totalTime = endTime - startTime;
      const avgTime = totalTime / concurrentRequests;
      
      console.log(`50 concurrent read requests took: ${totalTime}ms`);
      console.log(`Average time per request: ${avgTime}ms`);
      
      // Should handle concurrent requests efficiently
      expect(totalTime).toBeLessThan(5000); // 5 seconds
      expect(avgTime).toBeLessThan(200); // 200ms average
    });

    it('should handle mixed read/write operations efficiently', async () => {
      const operations: Promise<any>[] = [];
      
      // Mix of read and write operations
      for (let i = 0; i < 20; i++) {
        if (i % 3 === 0) {
          // Write operation
          operations.push(
            app.inject({
              method: 'POST',
              url: '/api/v1/properties',
              payload: createTestProperty({ title: `New Property ${i}` }),
            })
          );
        } else {
          // Read operation
          operations.push(
            app.inject({
              method: 'GET',
              url: `/api/v1/properties?limit=${5 + (i % 10)}`,
            })
          );
        }
      }
      
      const startTime = Date.now();
      const responses: any[] = await Promise.all(operations);
      const endTime = Date.now();
      
      // All should succeed
      responses.forEach(response => {
        expect(response.statusCode).toBeGreaterThanOrEqual(200);
        expect(response.statusCode).toBeLessThan(300);
      });
      
      const totalTime = endTime - startTime;
      console.log(`20 mixed operations took: ${totalTime}ms`);
      
      // Should complete within reasonable time
      expect(totalTime).toBeLessThan(8000); // 8 seconds
    });

    it('should maintain consistent response times under load', async () => {
      const responseTimes: number[] = [];
      const numRequests = 30;
      
      for (let i = 0; i < numRequests; i++) {
        const startTime = Date.now();
        
        const response = await app.inject({
          method: 'GET',
          url: '/api/v1/properties?limit=10',
        });
        
        const endTime = Date.now();
        
        expect(response.statusCode).toBe(200);
        responseTimes.push(endTime - startTime);
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const maxResponseTime = Math.max(...responseTimes);
      const minResponseTime = Math.min(...responseTimes);
      const variance = responseTimes.reduce((acc, time) => acc + Math.pow(time - avgResponseTime, 2), 0) / responseTimes.length;
      const stdDev = Math.sqrt(variance);
      
      console.log(`Response time statistics:`);
      console.log(`  Average: ${avgResponseTime.toFixed(2)}ms`);
      console.log(`  Min: ${minResponseTime}ms`);
      console.log(`  Max: ${maxResponseTime}ms`);
      console.log(`  Standard Deviation: ${stdDev.toFixed(2)}ms`);
      
      // Response times should be consistent
      expect(maxResponseTime - minResponseTime).toBeLessThan(500); // Max 500ms difference
      expect(stdDev).toBeLessThan(100); // Low standard deviation
    });
  });

  describe('Memory and Resource Usage', () => {
    it('should handle large payloads efficiently', async () => {
      // Create property with large description
      const largeProperty = createTestProperty({
        title: 'Large Property',
        description: 'A'.repeat(1000), // Large description
        features: Array.from({ length: 20 }, (_, i) => `FEATURE_${i}`), // Max features
      });
      
      const startTime = Date.now();
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/properties',
        payload: largeProperty,
      });
      const endTime = Date.now();
      
      expect(response.statusCode).toBe(201);
      
      const processingTime = endTime - startTime;
      console.log(`Large payload processing took: ${processingTime}ms`);
      
      // Should handle large payloads efficiently
      expect(processingTime).toBeLessThan(1000); // 1 second
    });

    it('should handle pagination with large datasets efficiently', async () => {
      // Create many properties
      const properties = Array.from({ length: 1000 }, (_, i) =>
        createTestProperty({
          title: `Property ${i + 1}`,
          price: 200000 + (i * 1000),
        })
      );
      
      // Create in batches to avoid overwhelming the database
      const batchSize = 50;
      for (let i = 0; i < properties.length; i += batchSize) {
        const batch = properties.slice(i, i + batchSize);
        const promises = batch.map(property =>
          app.inject({
            method: 'POST',
            url: '/api/v1/properties',
            payload: property,
          })
        );
        await Promise.all(promises);
        await waitForDatabase(100); // Small delay between batches
      }
      
      await waitForDatabase();
      
      // Test pagination performance
      const pageSizes = [10, 25, 50, 100];
      
      for (const pageSize of pageSizes) {
        const startTime = Date.now();
        
        const response = await app.inject({
          method: 'GET',
          url: `/api/v1/properties?limit=${pageSize}`,
        });
        
        const endTime = Date.now();
        
        expect(response.statusCode).toBe(200);
        
        const processingTime = endTime - startTime;
        console.log(`Pagination with ${pageSize} items took: ${processingTime}ms`);
        
        // Pagination should scale reasonably
        const expectedTime = pageSize * 2; // 2ms per item as baseline
        expect(processingTime).toBeLessThan(expectedTime);
      }
    });
  });

  describe('Stress Testing', () => {
    it('should handle rapid successive requests', async () => {
      const numRequests = 100;
      const startTime = Date.now();
      
      // Make requests as fast as possible
      const promises = Array.from({ length: numRequests }, (_, i) =>
        app.inject({
          method: 'GET',
          url: `/api/v1/properties?limit=${(i % 20) + 1}`,
        })
      );
      
      const responses = await Promise.all(promises);
      const endTime = Date.now();
      
      // All should succeed
      responses.forEach(response => {
        expect(response.statusCode).toBe(200);
      });
      
      const totalTime = endTime - startTime;
      const requestsPerSecond = numRequests / (totalTime / 1000);
      
      console.log(`100 rapid requests took: ${totalTime}ms`);
      console.log(`Throughput: ${requestsPerSecond.toFixed(2)} requests/second`);
      
      // Should maintain good throughput
      expect(requestsPerSecond).toBeGreaterThan(50); // At least 50 req/s
    });

    it('should handle database connection pressure', async () => {
      // Create many properties to increase database load
      const properties = Array.from({ length: 200 }, (_, i) =>
        createTestProperty({
          title: `Stress Property ${i + 1}`,
          price: 200000 + (i * 1000),
        })
      );
      
      // Create properties in parallel to stress the database
      const startTime = Date.now();
      const promises = properties.map(property =>
        app.inject({
          method: 'POST',
          url: '/api/v1/properties',
          payload: property,
        })
      );
      
      const responses = await Promise.all(promises);
      const endTime = Date.now();
      
      // All should succeed
      responses.forEach(response => {
        expect(response.statusCode).toBe(201);
      });
      
      const totalTime = endTime - startTime;
      console.log(`200 parallel property creations took: ${totalTime}ms`);
      
      // Should handle database pressure
      expect(totalTime).toBeLessThan(15000); // 15 seconds
    });

    it('should recover gracefully from high load', async () => {
      // First, create a baseline
      const baselineResponse = await app.inject({
        method: 'GET',
        url: '/api/v1/properties?limit=10',
      });
      expect(baselineResponse.statusCode).toBe(200);
      
      // Apply high load
      const loadPromises = Array.from({ length: 100 }, () =>
        app.inject({
          method: 'GET',
          url: '/api/v1/properties?limit=20',
        })
      );
      
      await Promise.all(loadPromises);
      
      // Wait a moment for system to stabilize
      await waitForDatabase(500);
      
      // Test that system still responds normally
      const recoveryResponse = await app.inject({
        method: 'GET',
        url: '/api/v1/properties?limit=10',
      });
      
      expect(recoveryResponse.statusCode).toBe(200);
      
      // Response should be consistent
      const baselineData = JSON.parse(baselineResponse.body);
      const recoveryData = JSON.parse(recoveryResponse.body);
      
      expect(recoveryData.data.length).toBe(baselineData.data.length);
    });
  });

  describe('Performance Benchmarks', () => {
    it('should meet performance requirements for real estate applications', async () => {
      // Create realistic dataset
      const properties = Array.from({ length: 100 }, (_, i) =>
        createTestProperty({
          title: `Real Estate Property ${i + 1}`,
          price: 150000 + (i * 25000),
          status: i % 4 === 0 ? 'for_sale' : i % 4 === 1 ? 'for_rent' : i % 4 === 2 ? 'sold' : 'under_contract',
          bedrooms: (i % 5) + 1,
          bathrooms: (i % 3) + 1,
          area: 60 + (i % 120),
          yearBuilt: 1980 + (i % 40),
        })
      );
      
      for (const property of properties) {
        await app.inject({
          method: 'POST',
          url: '/api/v1/properties',
          payload: property,
        });
      }
      
      await waitForDatabase();
      
      // Performance benchmarks
      const benchmarks = [
        {
          name: 'Property creation',
          operation: () => app.inject({
            method: 'POST',
            url: '/api/v1/properties',
            payload: createTestProperty({ title: 'Benchmark Property' }),
          }),
          maxTime: 500, // 500ms
        },
        {
          name: 'Property retrieval by ID',
          operation: async () => {
            const createResponse = await app.inject({
              method: 'POST',
              url: '/api/v1/properties',
              payload: createTestProperty({ title: 'Benchmark Property' }),
            });
            const property = JSON.parse(createResponse.body).data;
            
            return app.inject({
              method: 'GET',
              url: `/api/v1/properties/${property.id}`,
            });
          },
          maxTime: 200, // 200ms
        },
        {
          name: 'Property listing with filters',
          operation: () => app.inject({
            method: 'GET',
            url: '/api/v1/properties?status=for_sale&minPrice=200000&maxPrice=500000&limit=50',
          }),
          maxTime: 1000, // 1 second
        },
        {
          name: 'Text search',
          operation: () => app.inject({
            method: 'GET',
            url: '/api/v1/properties/search?q=Property&limit=20',
          }),
          maxTime: 800, // 800ms
        },
        {
          name: 'Nearby search',
          operation: () => app.inject({
            method: 'GET',
            url: '/api/v1/properties/nearby?lat=38.7&lng=-9.1&radius=5&limit=20',
          }),
          maxTime: 1200, // 1.2 seconds
        },
        {
          name: 'Statistics calculation',
          operation: () => app.inject({
            method: 'GET',
            url: '/api/v1/properties-stats',
          }),
          maxTime: 1500, // 1.5 seconds
        },
      ];
      
      console.log('\n=== Performance Benchmarks ===');
      
      for (const benchmark of benchmarks) {
        const startTime = Date.now();
        const response = await benchmark.operation();
        const endTime = Date.now();
        
        const executionTime = endTime - startTime;
        
        expect(response.statusCode).toBeGreaterThanOrEqual(200);
        expect(response.statusCode).toBeLessThan(300);
        expect(executionTime).toBeLessThan(benchmark.maxTime);
        
        console.log(`${benchmark.name}: ${executionTime}ms (max: ${benchmark.maxTime}ms) ✅`);
      }
      
      console.log('=== All benchmarks passed ===\n');
    });
  });
});


