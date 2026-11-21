import type { Page } from '@playwright/test';

import {
  expect,
  mockJson,
  mockSupabaseFunction,
  mockSupabaseTable,
  test,
  waitForApp
} from './fixtures';
import { mockPackages, mockUser } from './mocks';

test.beforeEach(async ({ page }) => {
  await mockPackages(page, {
    speccer: { description: 'Annotate your designs' },
    '@phun-ky/speccer': {}
  });
  await mockUser(page, 'phun-ky', ['speccer', '@phun-ky/speccer']);
});

/**
 * Marks the current document, so a test can check that a link was followed
 * by the app, not by loading a new page.
 */
const markDocument = (page: Page) =>
  page.evaluate(() => {
    (window as { __sameDocument?: boolean }).__sameDocument = true;
  });
const isSameDocument = (page: Page) =>
  page.evaluate(
    () => (window as { __sameDocument?: boolean }).__sameDocument === true
  );

test.describe('search on the start page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForApp(page);
  });

  test('opens the page for a package', async ({ page }) => {
    await page
      .getByRole('searchbox', { name: 'Package or npm username' })
      .fill('speccer');
    await page.getByRole('button', { name: 'Show me' }).click();

    await expect(page).toHaveURL('/packages/speccer');
    await expect(
      page.getByRole('heading', { level: 1, name: /speccer/ })
    ).toBeVisible();
  });

  test('opens the page for a scoped package with Enter', async ({ page }) => {
    const search = page.getByRole('searchbox', {
      name: 'Package or npm username'
    });

    await search.fill('@phun-ky/speccer');
    await search.press('Enter');

    await expect(page).toHaveURL('/packages/@phun-ky/speccer');
    await expect(
      page.getByRole('heading', { level: 1, name: /@phun-ky\/speccer/ })
    ).toBeVisible();
  });

  test('opens the page for a user', async ({ page }) => {
    const search = page.getByRole('searchbox', {
      name: 'Package or npm username'
    });

    await search.fill('phun-ky');
    await search.press('Enter');

    await expect(page).toHaveURL('/users/phun-ky');
    await expect(
      page.getByRole('heading', { level: 1, name: 'phun-ky' })
    ).toBeVisible();
  });
});

test('follows a search from the start page statistics', async ({ page }) => {
  await mockSupabaseTable(page, 'latest_unique_lookups', [
    { kind: 'package', package_name: 'speccer' }
  ]);
  await page.goto('/');
  await waitForApp(page);
  await markDocument(page);

  await page
    .locator('#latest-searches')
    .getByRole('link', { name: 'speccer' })
    .click();

  await expect(page).toHaveURL('/packages/speccer');
  await expect(
    page.getByRole('heading', { level: 1, name: /speccer/ })
  ).toBeVisible();
  expect(await isSameDocument(page)).toBe(true);
});

test.describe('package page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/packages/speccer');
    await waitForApp(page);
  });

  test('shows the package from npm', async ({ page }) => {
    await expect(
      page.getByRole('heading', { level: 1, name: 'speccer' })
    ).toBeVisible();
    await expect(
      page.getByRole('list', { name: 'About this package' })
    ).toContainText('v1.0.0');
    await expect(page.locator('.description')).toHaveText(
      'Annotate your designs'
    );
    await expect(
      page.locator('#keywords').getByRole('link', { name: 'testing' })
    ).toHaveAttribute(
      'href',
      'https://www.npmjs.com/search?q=keywords:testing'
    );
    await expect(
      page.getByRole('link', { name: 'Repository' })
    ).toHaveAttribute('href', 'https://github.com/example/speccer');
    // Maintainers link to their page on the site, with initials, see #37
    await expect(
      page.locator('.report-people').getByRole('link', { name: 'example' })
    ).toHaveAttribute('href', '/users/example');
  });

  test('gives a verdict and the reason for every signal', async ({ page }) => {
    const verdict = page.getByRole('region', { name: /./ }).filter({
      has: page.locator('#verdict-title')
    });

    await expect(verdict.locator('.score-ring')).toHaveAttribute(
      'aria-label',
      /Package health/
    );
    // Not only "OK", in a list of headings
    await expect(
      verdict.getByRole('heading', { name: /^Package health: \w+/ })
    ).toBeVisible();
    await expect(
      page
        .getByRole('list', { name: 'What the score is made of' })
        .locator('li')
    ).toHaveCount(5);
    await expect(page.locator('.signal-reason').first()).not.toBeEmpty();
  });

  test('switches the downloads chart between months and weeks', async ({
    page
  }) => {
    const month = page.getByRole('button', { name: 'Month' });
    const week = page.getByRole('button', { name: 'Week' });

    await expect(page.locator('#chart-months svg')).toBeVisible();
    await expect(month).toHaveAttribute('aria-pressed', 'true');

    await week.click();

    await expect(page.locator('#chart-weeks svg')).toBeVisible();
    await expect(page.locator('#chart-months')).toBeHidden();
    await expect(week).toHaveAttribute('aria-pressed', 'true');
    await expect(month).toHaveAttribute('aria-pressed', 'false');
  });

  test('says the monthly downloads, not only that there is a chart', async ({
    page
  }) => {
    await expect(
      page.locator('#chart-months').getByRole('img', {
        name: /^Downloads per month, the last 12 complete months: \w+ [\d.]+/
      })
    ).toBeAttached();
  });

  // A pressed toggle was marked only by its background, which forced
  // colours, like Windows' contrast themes, drop
  test('marks the pressed toggle in forced colours', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });

    const outline = (name: string) =>
      page
        .getByRole('button', { name })
        .evaluate((el) => getComputedStyle(el).outlineStyle);

    expect(await outline('Month')).toBe('solid');
    expect(await outline('Week')).toBe('none');
  });

  test('copies the install command', async ({ page }) => {
    // Firefox can't be granted clipboard access, so record what's written
    await page.evaluate(() => {
      Object.defineProperty(navigator, 'clipboard', {
        value: {
          writeText: async (text: string) => {
            (window as unknown as { copied: string }).copied = text;
          }
        }
      });
    });
    await page
      .getByRole('button', { name: 'Copy the install command' })
      .click();

    await expect(
      page.getByRole('button', { name: 'Copied the install command' })
    ).toBeVisible();
    // Said in a status too: a changed label isn't always read out
    await expect(page.locator('#copy-status')).toHaveText(
      'Copied the install command'
    );
    expect(
      await page.evaluate(
        () => (window as unknown as { copied: string }).copied
      )
    ).toBe('npm i speccer');
  });

  test('fits a phone without scrolling sideways', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth
      )
    ).toBe(true);
  });
});

test.describe('OpenSSF Best Practices', () => {
  const chips = (page: Page) =>
    page.getByRole('list', { name: 'About this package' });

  test('shows the badge of a registered repository', async ({ page }) => {
    await page.route(
      'https://www.bestpractices.dev/projects.json*',
      (route) => {
        expect(new URL(route.request().url()).searchParams.get('url')).toBe(
          'https://github.com/example/speccer'
        );

        return route.fulfill({
          headers: { 'Access-Control-Allow-Origin': '*' },
          json: [
            {
              id: 1234,
              badge_level: 'silver',
              tiered_percentage: 200,
              baseline_tiered_percentage: 0
            }
          ]
        });
      }
    );
    await page.goto('/packages/speccer');
    await waitForApp(page);

    await expect(
      chips(page).getByRole('link', { name: 'OpenSSF Silver' })
    ).toHaveAttribute('href', 'https://www.bestpractices.dev/projects/1234');
  });

  test("shows nothing for a repository that isn't registered", async ({
    page
  }) => {
    await page.goto('/packages/speccer');
    await waitForApp(page);

    await expect(chips(page)).toContainText('v1.0.0');
    await expect(chips(page)).not.toContainText('OpenSSF');
  });
});

test.describe('used by', () => {
  const section = (page: Page) => page.getByRole('region', { name: 'Used by' });

  test('lists the most downloaded dependents, linked to their reports', async ({
    page
  }) => {
    const api =
      'https://packages.ecosyste.ms/api/v1/registries/npmjs.org/packages';

    await mockJson(page, `${api}/*`, {
      dependent_packages_count: 1200,
      dependent_repos_count: 1
    });
    await mockJson(page, `${api}/*/dependent_packages*`, [
      { name: '@phun-ky/speccer' },
      { name: '@everything-registry/sub-chunk-1' }
    ]);
    await page.goto('/packages/speccer');
    await waitForApp(page);

    await expect(section(page)).toContainText(
      '1.2K packages on npm depend on it, and 1 repository.'
    );
    await expect(section(page).getByRole('listitem')).toHaveCount(1);
    await expect(
      section(page).getByRole('link', { name: '@phun-ky/speccer' })
    ).toHaveAttribute('href', '/packages/@phun-ky/speccer');
    await expect(
      section(page).getByRole('link', { name: 'All of them on npm' })
    ).toHaveAttribute(
      'href',
      'https://www.npmjs.com/package/speccer?activeTab=dependents'
    );
  });

  // ecosyste.ms hadn't counted @phun-ky/typeof's 4 dependents
  test("uses npm's count when ecosyste.ms has fewer", async ({ page }) => {
    await mockSupabaseFunction(page, 'npm-dependents', {
      ok: true,
      dependents: 4
    });
    await page.goto('/packages/speccer');
    await waitForApp(page);

    await expect(section(page)).toContainText(
      '4 packages on npm depend on it.'
    );
    await expect(
      section(page).getByRole('link', { name: 'All of them on npm' })
    ).toBeVisible();
  });

  test('says when no packages depend on it', async ({ page }) => {
    await page.goto('/packages/speccer');
    await waitForApp(page);

    await expect(section(page)).toContainText(
      'No packages on npm depend on it yet.'
    );
    await expect(section(page).getByRole('link')).toHaveCount(0);
  });
});

test('goes from a user to one of their packages', async ({ page }) => {
  await page.goto('/users/phun-ky');
  await waitForApp(page);
  await markDocument(page);

  await page
    .getByRole('link', { name: /^@phun-ky\/speccer/ })
    .first()
    .click();

  await expect(page).toHaveURL('/packages/@phun-ky/speccer');
  await expect(
    page.getByRole('heading', { level: 1, name: /@phun-ky\/speccer/ })
  ).toBeVisible();
  expect(await isSameDocument(page)).toBe(true);
});

// A typed or shared address for a package npm doesn't have showed a report,
// with a score, for nothing
test("says a package npm doesn't have isn't there", async ({ page }) => {
  await page.goto('/packages/not-on-npm');
  await waitForApp(page);

  await expect(
    page.getByRole('heading', { level: 1, name: 'Page not found' })
  ).toBeVisible();
  await expect(page.locator('.score-ring')).toHaveCount(0);
});
