// apps/web/src/tests/tasks.e2e.spec.ts
import { expect, test } from './setup';

test.describe('Tasks, categories and planning', () => {
  test('creates a category and a task, then sees the task in the planner', async ({
    authenticatedPage: page,
  }) => {
    // Category
    await page.getByRole('link', { name: 'Categories', exact: true }).click();
    await expect(page).toHaveURL(/\/categories$/);
    await page.getByRole('button', { name: 'New Category' }).click();
    await page.getByLabel('Name').fill('Research');
    await page.getByRole('button', { name: 'Create category' }).click();
    await expect(page.getByText('Category created')).toBeVisible();
    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(page.getByRole('listitem').filter({ hasText: 'Research' })).toBeVisible();

    // Task
    await page.getByRole('link', { name: 'Tasks', exact: true }).click();
    await expect(page).toHaveURL(/\/tasks$/);
    await page.getByRole('button', { name: 'New Task' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Title').fill('Write the methodology section');
    await dialog.getByLabel('Priority').selectOption('high');
    await dialog.getByLabel('Category').selectOption({ label: 'Research' });
    await dialog.getByLabel('Estimated hours').fill('3');
    await dialog.getByRole('button', { name: 'Create task' }).click();
    await expect(page.getByText('Task created')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Write the methodology section' })).toBeVisible();

    // Planner ranks it
    await page.getByRole('link', { name: 'Planner', exact: true }).click();
    await expect(page).toHaveURL(/\/planner$/);
    const recommendations = page.getByRole('region', { name: 'Recommendations' });
    await expect(recommendations.getByText('Write the methodology section')).toBeVisible();
    await expect(recommendations.getByText(/CoD/)).toBeVisible();
  });

  test('changes a task status from the drawer and the dashboard reflects it', async ({
    authenticatedPage: page,
  }) => {
    await page.goto('/tasks');
    await page.getByRole('button', { name: 'New Task' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Title').fill('Finish benchmark run');
    await dialog.getByRole('button', { name: 'Create task' }).click();
    await expect(page.getByRole('heading', { name: 'Finish benchmark run' })).toBeVisible();

    await page.getByRole('heading', { name: 'Finish benchmark run' }).click();
    const drawer = page.getByRole('dialog');
    await expect(drawer.getByText('Task Details')).toBeVisible();
    await drawer.getByRole('button', { name: /To Do/ }).click();
    await drawer.getByRole('combobox').first().selectOption('completed');
    await expect(page.getByText('Task status updated')).toBeVisible();

    await page.goto('/dashboard');
    const completedTile = page.locator('dl').filter({ hasText: 'Completed' }).first();
    await expect(completedTile.locator('dd')).toHaveText('1');
  });

  test('analytics page renders stat tiles and chart cards', async ({ authenticatedPage: page }) => {
    await page.getByRole('link', { name: 'Analytics', exact: true }).click();
    await expect(page).toHaveURL(/\/analytics$/);
    await expect(page.getByRole('heading', { name: 'Flow analytics' })).toBeVisible();
    await expect(page.getByText('Cycle time (p85)')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Throughput' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Cumulative flow' })).toBeVisible();
    // Accessible table view toggles.
    await page.getByRole('region', { name: 'Throughput' }).getByRole('button', { name: 'Table' }).click();
    await expect(page.getByRole('region', { name: 'Throughput' }).getByRole('table')).toBeVisible();
  });
});
