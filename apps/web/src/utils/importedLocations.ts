import { openDB } from 'idb'
import type { GpsPoint } from './gpsParsers'

export interface ImportedLocation {
  id: string
  name: string
  latitude: number
  longitude: number
  description?: string
  color: string
  visible: boolean
  importedAt: number
}

const DB_NAME = 'curiocity-imported'
const DB_VERSION = 1
const STORE = 'locations'

async function getDb() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' })
        store.createIndex('importedAt', 'importedAt')
      }
    },
  })
}

const COLORS = ['#E24B4A', '#378ADD', '#BA7517', '#7B61FF', '#00B4D8', '#FF6B35', '#1D9E75', '#D4537E']

export async function importLocations(points: GpsPoint[], collectionName: string): Promise<ImportedLocation[]> {
  const db = await getDb()
  const color = COLORS[db.objectStoreNames.length % COLORS.length]
  const locations: ImportedLocation[] = points.map((p, i) => ({
    id: `imp-${Date.now()}-${i}`,
    name: p.name || `${collectionName} ${i + 1}`,
    latitude: p.latitude,
    longitude: p.longitude,
    description: p.description,
    color,
    visible: true,
    importedAt: Date.now(),
  }))
  const tx = db.transaction(STORE, 'readwrite')
  for (const loc of locations) {
    await tx.store.put(loc)
  }
  await tx.done
  return locations
}

export async function getAllImportedLocations(): Promise<ImportedLocation[]> {
  const db = await getDb()
  return db.getAll(STORE)
}

export async function toggleLocation(id: string): Promise<void> {
  const db = await getDb()
  const loc = await db.get(STORE, id)
  if (loc) {
    loc.visible = !loc.visible
    await db.put(STORE, loc)
  }
}

export async function setAllVisible(visible: boolean): Promise<void> {
  const db = await getDb()
  const all = await db.getAll(STORE)
  const tx = db.transaction(STORE, 'readwrite')
  for (const loc of all) {
    loc.visible = visible
    await tx.store.put(loc)
  }
  await tx.done
}

export async function deleteImportedLocation(id: string): Promise<void> {
  const db = await getDb()
  await db.delete(STORE, id)
}

export async function clearImportedLocations(): Promise<void> {
  const db = await getDb()
  await db.clear(STORE)
}

export async function getImportedLocationCount(): Promise<number> {
  const db = await getDb()
  return db.count(STORE)
}
