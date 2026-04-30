import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { ImportedPiece } from '../domain/types'

interface PianoTomDb extends DBSchema {
  pieces: {
    key: string
    value: ImportedPiece
    indexes: {
      'by-created': string
    }
  }
}

const DB_NAME = 'piano-tom'
const DB_VERSION = 1

let dbPromise: Promise<IDBPDatabase<PianoTomDb>> | null = null

export async function listPieces(): Promise<ImportedPiece[]> {
  const db = await getDb()
  const pieces = await db.getAllFromIndex('pieces', 'by-created')
  return pieces.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
}

export async function savePiece(piece: ImportedPiece): Promise<void> {
  const db = await getDb()
  await db.put('pieces', piece)
}

export async function deletePiece(id: string): Promise<void> {
  const db = await getDb()
  await db.delete('pieces', id)
}

async function getDb(): Promise<IDBPDatabase<PianoTomDb>> {
  dbPromise ??= openDB<PianoTomDb>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      const pieces = db.createObjectStore('pieces', { keyPath: 'id' })
      pieces.createIndex('by-created', 'createdAt')
    },
  })

  return dbPromise
}
