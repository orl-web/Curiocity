import { openDB, type IDBPDatabase } from 'idb'
import type { Guide } from '../types'

const DB_NAME = 'curiocity-offline'
const DB_VERSION = 1
const GUIDES_STORE = 'guides'

let dbPromise: Promise<IDBPDatabase> | null = null

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(GUIDES_STORE)) {
          db.createObjectStore(GUIDES_STORE, { keyPath: 'id' })
        }
      },
    })
  }
  return dbPromise
}

export async function saveGuideOffline(guide: Guide): Promise<void> {
  const db = await getDb()
  const data = {
    ...guide,
    _cachedAt: Date.now(),
  }
  await db.put(GUIDES_STORE, data)
}

export async function getGuideOffline(id: string): Promise<Guide | null> {
  const db = await getDb()
  const result = await db.get(GUIDES_STORE, id)
  return result || null
}

export async function getAllOfflineGuides(): Promise<Guide[]> {
  const db = await getDb()
  const all = await db.getAll(GUIDES_STORE)
  return all.sort((a: any, b: any) => (b._cachedAt || 0) - (a._cachedAt || 0))
}

export async function deleteOfflineGuide(id: string): Promise<void> {
  const db = await getDb()
  await db.delete(GUIDES_STORE, id)
}

export async function isGuideOffline(id: string): Promise<boolean> {
  const db = await getDb()
  const result = await db.get(GUIDES_STORE, id)
  return !!result
}

export async function getOfflineGuideCount(): Promise<number> {
  const db = await getDb()
  return db.count(GUIDES_STORE)
}
