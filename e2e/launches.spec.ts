import { expect, test } from '@playwright/test'

test('shows the newest launches three at a time', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Launches' })).toBeVisible()

  for (const name of ['Mission Name', 'Rocket Name', 'Launch Date', 'Details', 'Patch']) {
    await expect(page.getByRole('columnheader', { name })).toBeVisible()
  }

  const rows = page.locator('tbody tr')
  await expect(rows).toHaveCount(3)
  await expect(rows.first().locator('img')).toHaveAttribute('src', /^https?:\/\//)

  const dates = await rows.evaluateAll((elements) => elements.map((element) => element.getAttribute('data-date') ?? ''))
  expect(dates[0] >= dates[1]).toBe(true)
  expect(dates[1] >= dates[2]).toBe(true)
})

test('loads ten pages with the button, then more by scrolling', async ({ page }) => {
  await page.goto('/')
  const rows = page.locator('tbody tr')
  await expect(rows).toHaveCount(3)

  for (let count = 6; count <= 27; count += 3) {
    await page.getByRole('button', { name: 'Load more' }).click()
    await expect(rows).toHaveCount(count)
  }

  await page.evaluate(() => window.scrollTo(0, 0))
  await page.getByRole('button', { name: 'Load more' }).click({ force: true })
  await expect(rows).toHaveCount(30)
  await expect(page.getByRole('button', { name: 'Load more' })).toHaveCount(0)

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await expect.poll(async () => rows.count()).toBeGreaterThan(30)
})

test('filters to Falcon 1 and stops when the records run out', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Rocket').selectOption({ label: 'Falcon 1' })

  const rows = page.locator('tbody tr')
  await expect(rows).toHaveCount(3)
  await expect(rows.locator('td:nth-child(2)')).toHaveText(['Falcon 1', 'Falcon 1', 'Falcon 1'])

  await page.getByRole('button', { name: 'Load more' }).click()
  await expect(rows).toHaveCount(5)
  await expect(page.getByRole('button', { name: 'Load more' })).toHaveCount(0)
  await expect(page.getByText('Showing 5 of 5')).toBeVisible()
  await expect(page.getByText('All launches loaded')).toBeVisible()
})
