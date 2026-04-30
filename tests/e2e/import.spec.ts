import { expect, test } from '@playwright/test'
import path from 'node:path'

test('imports MusicXML and renders a nonblank practice score', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => indexedDB.deleteDatabase('piano-tom'))
  await page.reload()

  await page.getByTestId('musicxml-input').setInputFiles(path.resolve('tests/fixtures/simple.musicxml'))
  await expect(page.getByTestId('import-preview')).toContainText('4 playable events')
  await page.getByRole('button', { name: 'Save piece' }).click()

  await expect(page.getByRole('heading', { name: 'Simple Scale' })).toBeVisible()
  await expect(page.getByTestId('score-host').locator('svg')).toHaveCount(1, { timeout: 15_000 })

  const box = await page.getByTestId('score-host').locator('svg').boundingBox()
  expect(box?.width).toBeGreaterThan(100)
  expect(box?.height).toBeGreaterThan(100)
})

test('imports the Bach PDF as a first-class reference score', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => indexedDB.deleteDatabase('piano-tom'))
  await page.reload()

  await page
    .getByTestId('pdf-input')
    .setInputFiles(path.resolve('Andante Organ Sonata no 4 BWV 528 Bach Vikungar.pdf'))
  await expect(page.getByTestId('import-preview')).toContainText('Reference-only PDF')
  await page.getByRole('button', { name: 'Save piece' }).click()

  await expect(page.getByRole('heading', { name: /Andante Organ Sonata no 4/ })).toBeVisible()
  await expect(page.getByTestId('pdf-viewer')).toBeVisible()
  await expect(page.getByTestId('pdf-page-1')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByTestId('pdf-page-1')).toHaveAttribute('data-rendered', 'true')

  const hasInk = await page.getByTestId('pdf-page-1').evaluate((canvas) => {
    const renderingCanvas = canvas as HTMLCanvasElement
    const context = renderingCanvas.getContext('2d')
    if (!context || renderingCanvas.width === 0 || renderingCanvas.height === 0) {
      return false
    }

    const sample = context.getImageData(0, 0, renderingCanvas.width, renderingCanvas.height).data
    for (let index = 0; index < sample.length; index += 16) {
      if (sample[index] < 245 || sample[index + 1] < 245 || sample[index + 2] < 245) {
        return true
      }
    }
    return false
  })

  expect(hasInk).toBe(true)
})
