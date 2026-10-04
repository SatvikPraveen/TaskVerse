// apps/web/src/tests/setup.ts
import { test as base, expect, type APIRequestContext, type Page } from '@playwright/test';

export const API_URL = process.env.API_URL ?? 'http://localhost:3001';

export interface TestUser {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

let counter = 0;

/** A unique user per call so specs never collide on the unique email/username indexes. */
export const makeUser = (): TestUser => {
  counter += 1;
  const stamp = `${Date.now().toString(36)}${counter}`;
  return {
    username: `e2e_${stamp}`.slice(0, 20),
    email: `e2e_${stamp}@example.com`,
    password: 'Str0ngPassw0rd!',
    firstName: 'Test',
    lastName: 'User',
  };
};

/** Registers the user through the API and returns its tokens. */
export const registerViaApi = async (request: APIRequestContext, user: TestUser) => {
  const res = await request.post(`${API_URL}/api/auth/register`, { data: user });
  if (!res.ok()) throw new Error(`register failed: ${res.status()} ${await res.text()}`);
  const body = await res.json();
  return body.data.tokens as { accessToken: string; refreshToken: string };
};

export const loginThroughUi = async (page: Page, user: TestUser) => {
  await page.goto('/login');
  await page.getByLabel('Email address').fill(user.email);
  await page.getByLabel('Password', { exact: true }).fill(user.password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
};

export const test = base.extend<{ user: TestUser; authenticatedPage: Page }>({
  user: async ({ request }, use) => {
    const user = makeUser();
    await registerViaApi(request, user);
    await use(user);
  },
  authenticatedPage: async ({ page, user }, use) => {
    await loginThroughUi(page, user);
    await use(page);
  },
});

export { expect };
