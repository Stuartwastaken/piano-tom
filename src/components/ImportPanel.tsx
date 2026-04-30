import { FileMusic, FileText, Save, X } from 'lucide-react'
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
      setTitle('')
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
    () => Boolean(parsed && title.trim() && musicFile && !saving),
    [musicFile, parsed, saving, title],
  )

  const handleSave = async () => {
    if (!parsed || !musicFile || !canSave) {
      return
    }

    const piece: ImportedPiece = {
      id: crypto.randomUUID(),
      title: title.trim(),
      createdAt: new Date().toISOString(),
      musicXml: parsed.xml,
      musicXmlFileName: musicFile.name,
      pdf: pdfFile ?? undefined,
      pdfFileName: pdfFile?.name,
      pdfThumbnail: thumbnail,
      settings: DEFAULT_PRACTICE_SETTINGS,
      eventCount: parsed.events.length,
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

  return (
    <section className="tool-panel import-panel" aria-labelledby="import-title">
      <div className="panel-heading">
        <div>
          <h2 id="import-title">Import Score</h2>
          <p>PDF + MusicXML</p>
        </div>
      </div>

      <div className="file-grid">
        <label className="file-drop">
          <FileMusic aria-hidden="true" />
          <span>MusicXML / MXL</span>
          <input
            type="file"
            accept=".musicxml,.xml,.mxl,application/vnd.recordare.musicxml+xml,application/vnd.recordare.musicxml"
            onChange={(event) => setMusicFile(event.currentTarget.files?.[0] ?? null)}
            data-testid="musicxml-input"
          />
        </label>

        <label className="file-drop secondary">
          <FileText aria-hidden="true" />
          <span>PDF reference</span>
          <input
            type="file"
            accept=".pdf,application/pdf"
            onChange={(event) => setPdfFile(event.currentTarget.files?.[0] ?? null)}
          />
        </label>
      </div>

      {error && <div className="notice error">{error}</div>}

      {parsed && (
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
              <span>{parsed.events.length} playable events</span>
              <span>{musicFile?.name}</span>
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
                onClick={() => {
                  setMusicFile(null)
                  setPdfFile(null)
                  setParsed(null)
                  setTitle('')
                  setThumbnail(undefined)
                }}
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
