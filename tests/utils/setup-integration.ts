import dotenv from 'dotenv';
import request from 'supertest';
import app from '../../src/app';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Export configured app and request agent
export const testApp = app;
export const agent = request(app);

// Helper function to create authenticated agent with specified role
export const createAuthAgent = (token: string, role = 'user', userId = '1') => {
  return {
    get: (url: string) =>
      agent
        .get(url)
        .set('Authorization', `Bearer ${token}`)
        .set('x-role', role)
        .set('x-user-id', userId),
    post: (url: string) =>
      agent
        .post(url)
        .set('Authorization', `Bearer ${token}`)
        .set('x-role', role)
        .set('x-user-id', userId),
    put: (url: string) =>
      agent
        .put(url)
        .set('Authorization', `Bearer ${token}`)
        .set('x-role', role)
        .set('x-user-id', userId),
    delete: (url: string) =>
      agent
        .delete(url)
        .set('Authorization', `Bearer ${token}`)
        .set('x-role', role)
        .set('x-user-id', userId),
  };
};
