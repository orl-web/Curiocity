import { openDB, type IDBPDatabase } from 'idb'

// Drafts a signed-out visitor builds on /create. They live on the device until
// the visitor creates an account, at which point useAuth uploads them.
export interface GuestDraft {
  id: string
  title: string
  city: string
  category: string
  description?: string
  duration?: string
  distance?: string
  priceModel: string
  // Background photos. A guest holds a local data URL until signup, when
  // useAuth uploads it and swaps in the /uploads URL.
  coverImageUrl?: string
  stubImageUrl?: string
  timeSlots?: string[]
  validFrom?: string
  validUntil?: string
  recurrence?: { daysOfWeek: number[]; slots: string[] }
  stops: { name: string; description?: string; stopOrder: number; latitude?: number | null; longitude?: number | null }[]
  costs?: { tickets?: number; meals?: number; transport?: number }
  savedAt: number
}

const DB_NAME = 'curiocity-guest'
const DB_VERSION = 1
const DRAFTS_STORE = 'drafts'

let dbPromise: Promise<IDBPDatabase> | null = null

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(DRAFTS_STORE)) {
          db.createObjectStore(DRAFTS_STORE, { keyPath: 'id' })
        }
      },
    })
  }
  return dbPromise
}

export async function saveGuestDraft(draft: Omit<GuestDraft, 'id' | 'savedAt'>): Promise<GuestDraft> {
  const db = await getDb()
  const stored: GuestDraft = { ...draft, id: crypto.randomUUID(), savedAt: Date.now() }
  await db.put(DRAFTS_STORE, stored)
  return stored
}

// A visitor only ever has one draft in progress; keep the newest on return.
export async function getLatestGuestDraft(): Promise<GuestDraft | null> {
  const db = await getDb()
  const all = await db.getAll(DRAFTS_STORE)
  if (all.length === 0) return null
  return all.sort((a, b) => b.savedAt - a.savedAt)[0]
}

export async function deleteGuestDraft(id: string): Promise<void> {
  const db = await getDb()
  await db.delete(DRAFTS_STORE, id)
}

export async function getGuestDraftCount(): Promise<number> {
  const db = await getDb()
  return db.count(DRAFTS_STORE)
}
