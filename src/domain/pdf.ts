import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url'

GlobalWorkerOptions.workerSrc = pdfWorkerUrl

export async function renderPdfThumbnail(file: File | Blob): Promise<string> {
  const buffer = await file.arrayBuffer()
  const pdf = await getDocument({ data: buffer }).promise
  const page = await pdf.getPage(1)
  const viewport = page.getViewport({ scale: 0.5 })
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')

  if (!context) {
    throw new Error('Canvas is unavailable for PDF preview rendering.')
  }

  canvas.width = viewport.width
  canvas.height = viewport.height
  await page.render({ canvas, canvasContext: context, viewport }).promise
  return canvas.toDataURL('image/png')
}
