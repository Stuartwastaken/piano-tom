import { expect, test } from '@playwright/test'
import path from 'node:path'

test('imports MusicXML and renders a nonblank practice score', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => indexedDB.deleteDatabase('piano-tom'))

  await page.getByTestId('musicxml-input').setInputFiles(path.resolve('tests/fixtures/simple.musicxml'))
  await expect(page.getByTestId('import-preview')).toContainText('4 playable events')
  await page.getByRole('button', { name: 'Save piece' }).click()

  await expect(page.getByRole('heading', { name: 'Simple Scale' })).toBeVisible()
  await expect(page.getByTestId('score-host').locator('svg')).toHaveCount(1, { timeout: 15_000 })

  const box = await page.getByTestId('score-host').locator('svg').boundingBox()
  expect(box?.width).toBeGreaterThan(100)
  expect(box?.height).toBeGreaterThan(100)
})
