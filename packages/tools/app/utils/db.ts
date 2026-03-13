import { openDB, type DBSchema, type IDBPDatabase } from 'idb'

export interface TranscriptionSegment {
  id: number
  start: number
  end: number
  text: string
  speaker?: string
}

export interface Project {
  id: string
  filename: string
  fileType: string
  audioData: ArrayBuffer
  length: number
  status: 'pending' | 'processing' | 'completed' | 'error' | 'cancelled'
  engine: string
  language: string
  lastModified: number
  progress: number
  segments?: TranscriptionSegment[]
  partialText?: string
  summary?: string
  summaryStatus?: 'pending' | 'processing' | 'completed' | 'error'
}

interface TranscriptionDB extends DBSchema {
  projects: {
    key: string
    value: Project
    indexes: { 'by-date': number }
  }
}

let dbPromise: Promise<IDBPDatabase<TranscriptionDB>>

export const initDB = (): Promise<IDBPDatabase<TranscriptionDB>> => {
  if (!dbPromise) {
    dbPromise = openDB<TranscriptionDB>('transcription-db', 1, {
      upgrade(db: IDBPDatabase<TranscriptionDB>) {
        const store = db.createObjectStore('projects', {
          keyPath: 'id',
        })
        store.createIndex('by-date', 'lastModified')
      },
    })
  }
  return dbPromise
}

export const saveProject = async (project: Project): Promise<void> => {
  const db = await initDB()
  await db.put('projects', project)
}

export const getProject = async (id: string): Promise<Project | undefined> => {
  const db = await initDB()
  return db.get('projects', id)
}

export const getAllProjects = async (): Promise<Project[]> => {
  const db = await initDB()
  return db.getAllFromIndex('projects', 'by-date')
}

export const deleteProject = async (id: string): Promise<void> => {
  const db = await initDB()
  await db.delete('projects', id)
}
