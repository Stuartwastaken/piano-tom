import { FileText, Music, Play, Sparkles, Trash2 } from 'lucide-react'
import type { ImportedPiece } from '../domain/types'

interface LibraryPanelProps {
  pieces: ImportedPiece[]
  selectedPieceId: string | null
  onSelect: (piece: ImportedPiece) => void
  onDelete: (pieceId: string) => void
}

export function LibraryPanel({ pieces, selectedPieceId, onSelect, onDelete }: LibraryPanelProps) {
  return (
    <section className="tool-panel library-panel" aria-labelledby="library-title">
      <div className="panel-heading">
        <div>
          <h2 id="library-title">Library</h2>
          <p>{pieces.length} saved pieces</p>
        </div>
      </div>

      <div className="piece-list">
        {pieces.map((piece) => {
          const interactive = Boolean(piece.musicXml)

          return (
            <article
              key={piece.id}
              className={`piece-card ${selectedPieceId === piece.id ? 'selected' : ''}`}
              data-testid="piece-card"
            >
              {piece.pdfThumbnail ? (
                <img src={piece.pdfThumbnail} alt="" />
              ) : (
                <div className="piece-thumb">
                  <Music aria-hidden="true" />
                </div>
              )}
              <div className="piece-body">
                <div>
                  <div className="piece-title-row">
                    <h3>{piece.title}</h3>
                    <span className={interactive ? 'status-pill interactive' : 'status-pill reference'}>
                      {interactive ? <Sparkles aria-hidden="true" /> : <FileText aria-hidden="true" />}
                      {interactive ? 'Interactive' : 'Reference'}
                    </span>
                  </div>
                  <p>
                    {interactive ? `${piece.eventCount} events` : 'MusicXML needed'} ·{' '}
                    {new Date(piece.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="piece-actions">
                  <button type="button" className="primary-action" onClick={() => onSelect(piece)}>
                    <Play aria-hidden="true" />
                    {interactive ? 'Start practice' : 'Prepare'}
                  </button>
                  <button
                    type="button"
                    className="icon-button danger"
                    aria-label={`Delete ${piece.title}`}
                    onClick={() => onDelete(piece.id)}
                  >
                    <Trash2 aria-hidden="true" />
                  </button>
                </div>
              </div>
            </article>
          )
        })}

        {pieces.length === 0 && (
          <div className="empty-state">
            <Music aria-hidden="true" />
            <span>No saved pieces</span>
          </div>
        )}
      </div>
    </section>
  )
}
