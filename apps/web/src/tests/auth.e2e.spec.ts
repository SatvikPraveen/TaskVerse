// apps/web/src/tests/auth.e2e.spec.ts
import { expect, loginThroughUi, makeUser, registerViaApi, test } from './setup';

test.describe('Authentication', () => {
  test('redirects anonymous visitors to the login page', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: 'Sign in to your account' })).toBeVisible();
  });

  test('shows validation messages for an empty login form', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByText('Email is required')).toBeVisible();
    await expect(page.getByText('Password is required')).toBeVisible();
  });

  test('rejects a malformed email client-side', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email address').fill('not-an-email');
    await page.getByLabel('Password', { exact: true }).fill('whatever123');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByText('Invalid email address')).toBeVisible();
  });

  test('navigates between login and registration', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('link', { name: 'create a new account' }).click();
    await expect(page).toHaveURL(/\/register$/);
    await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible();
    await page.getByRole('link', { name: 'sign in to your existing account' }).click();
    await expect(page).toHaveURL(/\/login$/);
  });

  test('registers a new account through the form', async ({ page }) => {
    const user = makeUser();
    await page.goto('/register');
    await page.getByLabel('First name').fill(user.firstName);
    await page.getByLabel('Last name').fill(user.lastName);
    await page.getByLabel('Username').fill(user.username);
    await page.getByLabel('Email address').fill(user.email);
    await page.getByLabel('Password', { exact: true }).fill(user.password);
    await page.getByRole('textbox', { name: 'Confirm password' }).fill(user.password);
    await page.getByLabel(/I agree to the/).check();
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(`Welcome back, ${user.firstName}`);
  });

  test('requires matching passwords on registration', async ({ page }) => {
    const user = makeUser();
    await page.goto('/register');
    await page.getByLabel('First name').fill(user.firstName);
    await page.getByLabel('Last name').fill(user.lastName);
    await page.getByLabel('Username').fill(user.username);
    await page.getByLabel('Email address').fill(user.email);
    await page.getByLabel('Password', { exact: true }).fill(user.password);
    await page.getByRole('textbox', { name: 'Confirm password' }).fill('something-else');
    await page.getByLabel(/I agree to the/).check();
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.getByText('Passwords do not match')).toBeVisible();
    await expect(page).toHaveURL(/\/register$/);
  });

  test('logs in with valid credentials and shows the dashboard', async ({ page, request }) => {
    const user = makeUser();
    await registerViaApi(request, user);
    await loginThroughUi(page, user);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Welcome back');
  });

  test('shows an error toast for wrong credentials', async ({ page, request }) => {
    const user = makeUser();
    await registerViaApi(request, user);
    await page.goto('/login');
    await page.getByLabel('Email address').fill(user.email);
    await page.getByLabel('Password', { exact: true }).fill('wrong-password');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Invalid credentials' })).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test('toggles password visibility', async ({ page }) => {
    await page.goto('/login');
    const password = page.getByLabel('Password', { exact: true });
    await expect(password).toHaveAttribute('type', 'password');
    await page.getByRole('button', { name: 'Show password' }).click();
    await expect(password).toHaveAttribute('type', 'text');
    await page.getByRole('button', { name: 'Hide password' }).click();
    await expect(password).toHaveAttribute('type', 'password');
  });

  test('keeps the session across a reload', async ({ authenticatedPage: page }) => {
    await page.reload();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Welcome back');
  });

  test('bounces signed-in users away from auth pages', async ({ authenticatedPage: page }) => {
    await page.goto('/login');
    await expect(page).toHaveURL(/\/dashboard$/);
    await page.goto('/register');
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test('logs out', async ({ authenticatedPage: page }) => {
    await page.getByRole('button', { name: 'Logout' }).click();
    await expect(page).toHaveURL(/\/login$/);
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login$/);
  });
});
