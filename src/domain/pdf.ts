import { GlobalWorkerOptions, getDocument, type PDFDocumentProxy } from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url'

GlobalWorkerOptions.workerSrc = pdfWorkerUrl

export async function renderPdfThumbnail(file: File | Blob): Promise<string> {
  const pdf = await loadPdfDocument(file)
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
  await pdf.destroy()
  return canvas.toDataURL('image/png')
}

export async function loadPdfDocument(file: File | Blob): Promise<PDFDocumentProxy> {
  const buffer = await file.arrayBuffer()
  return getDocument({ data: new Uint8Array(buffer) }).promise
}

export async function renderPdfPageToCanvas(
  pdf: PDFDocumentProxy,
  pageNumber: number,
  canvas: HTMLCanvasElement,
  scale: number,
): Promise<void> {
  const page = await pdf.getPage(pageNumber)
  const viewport = page.getViewport({ scale })
  const context = canvas.getContext('2d')

  if (!context) {
    throw new Error('Canvas is unavailable for PDF rendering.')
  }

  canvas.width = Math.floor(viewport.width)
  canvas.height = Math.floor(viewport.height)
  await page.render({ canvas, canvasContext: context, viewport }).promise
}
