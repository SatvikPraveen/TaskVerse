// apps/web/src/tests/setup.ts
import { test as base, expect } from '@playwright/test';

// Extend the basic test with custom fixtures
export const test = base.extend<{
  authenticatedPage: any;
}>({
  authenticatedPage: async ({ page }, use) => {
    // Mock authentication for tests
    await page.goto('/login');
    
    // Fill in test credentials
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'testpass123');
    
    // Click login button
    await page.click('button[type="submit"]');
    
    // Wait for dashboard to load
    await page.waitForURL('/dashboard');
    
    await use(page);
  },
});

export { expect };

// Global test configuration
export const API_BASE_URL = 'http://localhost:3001';
export const APP_BASE_URL = 'http://localhost:5173';

// Test user credentials
export const TEST_USER = {
  email: 'test@example.com',
  password: 'testpass123',
  username: 'testuser',
  firstName: 'Test',
  lastName: 'User',
};

// Helper functions for tests
export const createTestTask = async (page: any, taskData: any = {}) => {
  const defaultTask = {
    title: 'Test Task',
    description: 'Test task description',
    priority: 'medium',
    ...taskData,
  };

  await page.click('button:has-text("New Task")');
  await page.fill('input[placeholder*="title"]', defaultTask.title);
  
  if (defaultTask.description) {
    await page.fill('textarea[placeholder*="description"]', defaultTask.description);
  }
  
  await page.selectOption('select', defaultTask.priority);
  await page.click('button[type="submit"]');
  
  // Wait for task to be created
  await page.waitForSelector(`text=${defaultTask.title}`);
  
  return defaultTask;
};

export const createTestCategory = async (page: any, categoryData: any = {}) => {
  const defaultCategory = {
    name: 'Test Category',
    description: 'Test category description',
    color: '#6366f1',
    ...categoryData,
  };

  await page.click('button:has-text("New Category")');
  await page.fill('input[placeholder*="name"]', defaultCategory.name);
  
  if (defaultCategory.description) {
    await page.fill('textarea[placeholder*="description"]', defaultCategory.description);
  }
  
  await page.click('button[type="submit"]');
  
  // Wait for category to be created
  await page.waitForSelector(`text=${defaultCategory.name}`);
  
  return defaultCategory;
};