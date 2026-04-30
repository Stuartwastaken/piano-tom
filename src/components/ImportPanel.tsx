import { FileCheck2, FileMusic, FileText, Save, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { readMusicXmlFile, type ParsedMusicXml } from '../domain/musicxml'
import { renderPdfThumbnail } from '../domain/pdf'
import { DEFAULT_PRACTICE_SETTINGS, type ImportedPiece } from '../domain/types'
import { savePiece } from '../storage/db'

interface ImportPanelProps {
  onSaved: (piece: ImportedPiece) => void
}

export function ImportPanel({ onSaved }: ImportPanelProps) {
  const [musicFile, setMusicFile] = useState<File | null>(null)
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [parsed, setParsed] = useState<ParsedMusicXml | null>(null)
  const [thumbnail, setThumbnail] = useState<string | undefined>()
  const [title, setTitle] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false

    if (!musicFile) {
      setParsed(null)
      setError(null)
      return undefined
    }

    setError(null)
    readMusicXmlFile(musicFile)
      .then((nextParsed) => {
        if (cancelled) {
          return
        }

        setParsed(nextParsed)
        setTitle(nextParsed.title)
      })
      .catch((caughtError: Error) => {
        if (!cancelled) {
          setParsed(null)
          setError(caughtError.message)
        }
      })

    return () => {
      cancelled = true
    }
  }, [musicFile])

  useEffect(() => {
    let cancelled = false

    if (!pdfFile) {
      setThumbnail(undefined)
      return undefined
    }

    renderPdfThumbnail(pdfFile)
      .then((nextThumbnail) => {
        if (!cancelled) {
          setThumbnail(nextThumbnail)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setThumbnail(undefined)
        }
      })

    return () => {
      cancelled = true
    }
  }, [pdfFile])

  const canSave = useMemo(
    () => Boolean(title.trim() && !saving && (parsed || pdfFile)),
    [parsed, pdfFile, saving, title],
  )

  const handleSave = async () => {
    if (!canSave) {
      return
    }

    const piece: ImportedPiece = {
      id: crypto.randomUUID(),
      title: title.trim(),
      createdAt: new Date().toISOString(),
      musicXml: parsed?.xml,
      musicXmlFileName: musicFile?.name,
      pdf: pdfFile ?? undefined,
      pdfFileName: pdfFile?.name,
      pdfThumbnail: thumbnail,
      settings: DEFAULT_PRACTICE_SETTINGS,
      eventCount: parsed?.events.length ?? 0,
    }

    setSaving(true)
    await savePiece(piece)
    onSaved(piece)
    setSaving(false)
    setMusicFile(null)
    setPdfFile(null)
    setParsed(null)
    setTitle('')
    setThumbnail(undefined)
  }

  const handleMusicFile = (file: File | null) => {
    setMusicFile(file)
  }

  const handlePdfFile = (file: File | null) => {
    setPdfFile(file)
    if (file && !title.trim()) {
      setTitle(stripExtension(file.name))
    }
  }

  const clearImport = () => {
    setMusicFile(null)
    setPdfFile(null)
    setParsed(null)
    setTitle('')
    setThumbnail(undefined)
    setError(null)
  }

  const hasPreview = Boolean(parsed || pdfFile)
  const eventLabel = parsed ? `${parsed.events.length} playable events` : 'Reference-only PDF'

  return (
    <section className="tool-panel import-panel" aria-labelledby="import-title">
      <div className="panel-heading">
        <div>
          <h2 id="import-title">Import Score</h2>
          <p>PDF first, MusicXML for scoring</p>
        </div>
      </div>

      <div className="file-grid">
        <label className="file-drop">
          <FileText aria-hidden="true" />
          <span>Sheet music PDF</span>
          <input
            type="file"
            accept=".pdf,application/pdf"
            onChange={(event) => handlePdfFile(event.currentTarget.files?.[0] ?? null)}
            data-testid="pdf-input"
          />
        </label>

        <label className="file-drop secondary">
          <FileMusic aria-hidden="true" />
          <span>MusicXML / MXL</span>
          <input
            type="file"
            accept=".musicxml,.xml,.mxl,application/vnd.recordare.musicxml+xml,application/vnd.recordare.musicxml"
            onChange={(event) => handleMusicFile(event.currentTarget.files?.[0] ?? null)}
            data-testid="musicxml-input"
          />
        </label>
      </div>

      {error && <div className="notice error">{error}</div>}

      {hasPreview && (
        <div className="import-preview" data-testid="import-preview">
          {thumbnail ? (
            <img src={thumbnail} alt="" />
          ) : (
            <div className="pdf-placeholder">
              <FileText aria-hidden="true" />
            </div>
          )}
          <div className="preview-body">
            <label>
              Title
              <input value={title} onChange={(event) => setTitle(event.currentTarget.value)} />
            </label>
            <div className="preview-meta">
              <span className={parsed ? 'status-pill interactive' : 'status-pill reference'}>
                <FileCheck2 aria-hidden="true" />
                {eventLabel}
              </span>
              {pdfFile && <span>{pdfFile.name}</span>}
              {musicFile && <span>{musicFile.name}</span>}
            </div>
            <div className="preview-actions">
              <button type="button" className="primary-action" onClick={handleSave} disabled={!canSave}>
                <Save aria-hidden="true" />
                Save piece
              </button>
              <button
                type="button"
                className="icon-button"
                aria-label="Clear import"
                onClick={clearImport}
              >
                <X aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

function stripExtension(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, '')
}
