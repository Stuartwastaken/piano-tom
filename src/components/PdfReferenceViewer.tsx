import { FileText, ZoomIn, ZoomOut } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import { loadPdfDocument, renderPdfPageToCanvas } from '../domain/pdf'

interface PdfReferenceViewerProps {
  pdf?: Blob
  title: string
}

export function PdfReferenceViewer({ pdf, title }: PdfReferenceViewerProps) {
  const [document, setDocument] = useState<PDFDocumentProxy | null>(null)
  const [pageCount, setPageCount] = useState(0)
  const [zoom, setZoom] = useState(0.95)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setDocument(null)
    setPageCount(0)
    setError(null)

    if (!pdf) {
      return undefined
    }

    loadPdfDocument(pdf)
      .then((nextDocument) => {
        if (cancelled) {
          void nextDocument.destroy()
          return
        }

        setDocument(nextDocument)
        setPageCount(nextDocument.numPages)
      })
      .catch(() => {
        if (!cancelled) {
          setError('Unable to render this PDF.')
        }
      })

    return () => {
      cancelled = true
      setDocument((current) => {
        if (current) {
          void current.destroy()
        }
        return null
      })
    }
  }, [pdf])

  const pages = useMemo(
    () => Array.from({ length: pageCount }, (_, index) => index + 1),
    [pageCount],
  )

  if (!pdf) {
    return (
      <div className="pdf-empty">
        <FileText aria-hidden="true" />
        <span>No PDF reference attached</span>
      </div>
    )
  }

  return (
    <section className="pdf-reference" aria-label={`${title} PDF reference`}>
      <div className="pdf-toolbar">
        <div>
          <strong>{title}</strong>
          <span>{pageCount ? `${pageCount} pages` : 'Loading PDF'}</span>
        </div>
        <div className="toolbar-actions">
          <button
            type="button"
            className="icon-button"
            aria-label="Zoom out"
            onClick={() => setZoom((current) => Math.max(0.6, current - 0.1))}
          >
            <ZoomOut aria-hidden="true" />
          </button>
          <button
            type="button"
            className="icon-button"
            aria-label="Zoom in"
            onClick={() => setZoom((current) => Math.min(1.4, current + 0.1))}
          >
            <ZoomIn aria-hidden="true" />
          </button>
        </div>
      </div>

      {error && <div className="notice error">{error}</div>}

      <div className="pdf-scroll" data-testid="pdf-viewer">
        {document
          ? pages.map((pageNumber) => (
              <PdfPage key={pageNumber} document={document} pageNumber={pageNumber} scale={zoom} />
            ))
          : <div className="score-state">Rendering PDF</div>}
      </div>
    </section>
  )
}

function PdfPage({
  document,
  pageNumber,
  scale,
}: {
  document: PDFDocumentProxy
  pageNumber: number
  scale: number
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current

    if (!canvas) {
      return undefined
    }

    if (canvas.dataset.rendering === 'true') {
      return undefined
    }

    canvas.dataset.rendered = 'false'
    canvas.dataset.failed = 'false'
    canvas.dataset.rendering = 'true'

    renderPdfPageToCanvas(document, pageNumber, canvas, scale)
      .then(() => {
        canvas.dataset.rendered = 'true'
      })
      .catch((error: unknown) => {
        if (error instanceof Error && error.name === 'RenderingCancelledException') {
          return
        }
        canvas.dataset.failed = 'true'
      })
      .finally(() => {
        canvas.dataset.rendering = 'false'
      })

    return undefined
  }, [document, pageNumber, scale])

  return (
    <figure className="pdf-page">
      <canvas ref={canvasRef} data-testid={`pdf-page-${pageNumber}`} />
      <figcaption>Page {pageNumber}</figcaption>
    </figure>
  )
}
