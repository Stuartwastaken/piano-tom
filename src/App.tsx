import { BookOpen, Library, Music2, Piano } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { ImportPanel } from './components/ImportPanel'
import { LibraryPanel } from './components/LibraryPanel'
import { MidiPanel } from './components/MidiPanel'
import { PracticeView } from './features/PracticeView'
import { ReadingPractice } from './features/ReadingPractice'
import { ScalePractice } from './features/ScalePractice'
import { useMidi } from './hooks/useMidi'
import { deletePiece, listPieces, savePiece } from './storage/db'
import type { ImportedPiece } from './domain/types'

type AppView = 'library' | 'practice' | 'scales' | 'reading'

const NAV_ITEMS: Array<{ id: AppView; label: string; icon: typeof Library }> = [
  { id: 'library', label: 'Library', icon: Library },
  { id: 'practice', label: 'Practice', icon: Piano },
  { id: 'scales', label: 'Scales', icon: Music2 },
  { id: 'reading', label: 'Reading', icon: BookOpen },
]

function App() {
  const midi = useMidi()
  const [pieces, setPieces] = useState<ImportedPiece[]>([])
  const [selectedPieceId, setSelectedPieceId] = useState<string | null>(null)
  const [view, setView] = useState<AppView>('library')

  useEffect(() => {
    listPieces().then((storedPieces) => {
      setPieces(storedPieces)
      setSelectedPieceId((current) => current ?? storedPieces[0]?.id ?? null)
    })
  }, [])

  const selectedPiece = useMemo(
    () => pieces.find((piece) => piece.id === selectedPieceId) ?? null,
    [pieces, selectedPieceId],
  )

  const handleSaved = (piece: ImportedPiece) => {
    setPieces((current) => [piece, ...current.filter((candidate) => candidate.id !== piece.id)])
    setSelectedPieceId(piece.id)
    setView('practice')
  }

  const handleSelectPiece = (piece: ImportedPiece) => {
    setSelectedPieceId(piece.id)
    setView('practice')
  }

  const handleDeletePiece = async (pieceId: string) => {
    await deletePiece(pieceId)
    setPieces((current) => current.filter((piece) => piece.id !== pieceId))
    setSelectedPieceId((current) => (current === pieceId ? null : current))
  }

  const handleUpdatePiece = async (piece: ImportedPiece) => {
    await savePiece(piece)
    setPieces((current) =>
      current.map((candidate) => (candidate.id === piece.id ? piece : candidate)),
    )
    setSelectedPieceId(piece.id)
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <Piano aria-hidden="true" />
          </div>
          <div>
            <h1>Piano Tom</h1>
            <span>Practice desk</span>
          </div>
        </div>

        <nav aria-label="Primary">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                type="button"
                className={view === item.id ? 'active' : ''}
                onClick={() => setView(item.id)}
              >
                <Icon aria-hidden="true" />
                {item.label}
              </button>
            )
          })}
        </nav>
      </aside>

      <main className="main-workspace">
        <header className="topbar">
          <div>
            <span className="eyebrow">{view}</span>
            <strong>{selectedPiece?.title ?? 'No piece selected'}</strong>
          </div>
          <MidiPanel midi={midi} />
        </header>

        {view === 'library' && (
          <div className="workspace-grid">
            <ImportPanel onSaved={handleSaved} />
            <LibraryPanel
              pieces={pieces}
              selectedPieceId={selectedPieceId}
              onSelect={handleSelectPiece}
              onDelete={handleDeletePiece}
            />
          </div>
        )}

        {view === 'practice' && (
          <PracticeView piece={selectedPiece} midi={midi} onUpdatePiece={handleUpdatePiece} />
        )}
        {view === 'scales' && <ScalePractice midi={midi} />}
        {view === 'reading' && <ReadingPractice midi={midi} />}
      </main>
    </div>
  )
}

export default App
