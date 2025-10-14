export type KnowledgeBaseSource = 'user' | 'prebuilt'

export interface KnowledgeDocument {
  id: string
  title: string
  original_filename?: string | null
  media_type: string
  size_bytes: number
  chunk_count: number
  created_at: string
  metadata: Record<string, unknown>
  file_available: boolean
}

export interface KnowledgeDocumentChunk {
  id: string
  content: string
}

export interface KnowledgeDocumentDetail extends KnowledgeDocument {
  chunks: KnowledgeDocumentChunk[]
}

export interface KnowledgeBaseSummary {
  id: string
  name: string
  description?: string | null
  source: KnowledgeBaseSource
  document_count: number
  chunk_count: number
  created_at: string
  updated_at: string
  ready: boolean
}

export interface KnowledgeBaseDetail extends KnowledgeBaseSummary {
  documents: KnowledgeDocument[]
}

export interface KnowledgeChunkMatch {
  chunk_id: string
  score: number
  content: string
  document_id: string
  document_title?: string | null
}

export interface KnowledgeBaseQueryResponse {
  knowledge_base_id: string
  query: string
  matches: KnowledgeChunkMatch[]
}

const KNOWLEDGE_STORAGE_KEY = 'flowknowledge:store'
const DEFAULT_CHUNK_SIZE = 750
const DEFAULT_CHUNK_OVERLAP = 50

interface StoredKnowledgeDocument {
  id: string
  title: string
  original_filename?: string | null
  media_type: string
  size_bytes: number
  created_at: string
  metadata: Record<string, unknown>
  raw_content: string
  chunk_size: number
  chunk_overlap: number
  chunks: KnowledgeDocumentChunk[]
}

interface StoredKnowledgeBase {
  id: string
  name: string
  description?: string | null
  source: KnowledgeBaseSource
  created_at: string
  updated_at: string
  ready: boolean
  documents: StoredKnowledgeDocument[]
}

const documentUrlCache = new Map<string, string>()

function generateId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `kb-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function nowIso(): string {
  return new Date().toISOString()
}

function estimateSize(value: string): number {
  try {
    if (typeof TextEncoder !== 'undefined') {
      return new TextEncoder().encode(value).length
    }
  } catch (error) {
    console.warn('Unable to estimate text size accurately', error)
  }
  return value.length
}

function normaliseNewlines(value: string): string {
  return value.replace(/\r\n?/g, '\n').trim()
}

function chunkText(content: string, chunkSize: number, chunkOverlap: number): KnowledgeDocumentChunk[] {
  const sanitised = normaliseNewlines(content)
  if (!sanitised) {
    return []
  }

  const safeChunkSize = Math.max(chunkSize, 100)
  const safeOverlap = Math.min(Math.max(chunkOverlap, 0), safeChunkSize - 1)
  const step = Math.max(1, safeChunkSize - safeOverlap)

  const chunks: KnowledgeDocumentChunk[] = []
  let index = 0
  let counter = 0
  while (index < sanitised.length) {
    const slice = sanitised.slice(index, index + safeChunkSize)
    const trimmed = slice.trim()
    if (trimmed.length > 0) {
      chunks.push({ id: `${generateId()}-${counter}`, content: trimmed })
      counter += 1
    }
    if (index + safeChunkSize >= sanitised.length) {
      break
    }
    index += step
  }

  if (chunks.length === 0) {
    chunks.push({ id: `${generateId()}-0`, content: sanitised })
  }

  return chunks
}

function loadStore(): StoredKnowledgeBase[] {
  if (typeof window === 'undefined') {
    return []
  }
  try {
    const raw = window.localStorage.getItem(KNOWLEDGE_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .map((item) => {
        if (!item || typeof item !== 'object') return null
        const base = item as StoredKnowledgeBase
        if (!Array.isArray(base.documents)) {
          base.documents = []
        }
        base.documents = base.documents.map((doc) => ({
          ...doc,
          metadata: typeof doc.metadata === 'object' && doc.metadata !== null ? doc.metadata : {},
          chunks: Array.isArray(doc.chunks) ? doc.chunks.filter((chunk): chunk is KnowledgeDocumentChunk => !!chunk && typeof chunk.id === 'string' && typeof chunk.content === 'string') : [],
        }))
        return base
      })
      .filter((item): item is StoredKnowledgeBase => item !== null)
  } catch (error) {
    console.warn('Unable to load knowledge store', error)
    return []
  }
}

function saveStore(store: StoredKnowledgeBase[]) {
  if (typeof window === 'undefined') {
    return
  }
  try {
    window.localStorage.setItem(KNOWLEDGE_STORAGE_KEY, JSON.stringify(store))
  } catch (error) {
    console.warn('Unable to persist knowledge store', error)
  }
}

function findBase(store: StoredKnowledgeBase[], id: string): StoredKnowledgeBase | undefined {
  return store.find((base) => base.id === id)
}

function toDocumentSummary(document: StoredKnowledgeDocument): KnowledgeDocument {
  return {
    id: document.id,
    title: document.title,
    original_filename: document.original_filename,
    media_type: document.media_type,
    size_bytes: document.size_bytes,
    chunk_count: document.chunks.length,
    created_at: document.created_at,
    metadata: document.metadata,
    file_available: Boolean(document.raw_content),
  }
}

function toDocumentDetail(document: StoredKnowledgeDocument): KnowledgeDocumentDetail {
  return {
    ...toDocumentSummary(document),
    chunks: document.chunks,
  }
}

function toSummary(base: StoredKnowledgeBase): KnowledgeBaseSummary {
  const documentCount = base.documents.length
  const chunkCount = base.documents.reduce((total, doc) => total + doc.chunks.length, 0)
  return {
    id: base.id,
    name: base.name,
    description: base.description,
    source: base.source,
    document_count: documentCount,
    chunk_count: chunkCount,
    created_at: base.created_at,
    updated_at: base.updated_at,
    ready: base.ready,
  }
}

function toDetail(base: StoredKnowledgeBase): KnowledgeBaseDetail {
  return {
    ...toSummary(base),
    documents: base.documents.map(toDocumentSummary),
  }
}

function tokenize(value: string): string[] {
  const matches = value.toLowerCase().match(/[a-z0-9]+/g)
  return matches ? matches.filter(Boolean) : []
}

function scoreChunk(query: string, content: string): number {
  const queryText = query.toLowerCase().trim()
  const chunkText = content.toLowerCase().trim()
  if (!queryText || !chunkText) {
    return 0
  }

  const queryTokens = tokenize(queryText)
  const chunkTokens = tokenize(chunkText)
  if (queryTokens.length === 0 || chunkTokens.length === 0) {
    return 0
  }

  const querySet = new Set(queryTokens)
  const chunkSet = new Set(chunkTokens)
  let shared = 0
  querySet.forEach((token) => {
    if (chunkSet.has(token)) {
      shared += 1
    }
  })

  const tokenCoverage = shared / querySet.size
  const chunkCoverage = shared / chunkSet.size
  const substringBonus = chunkText.includes(queryText) ? 1 : 0

  return substringBonus * 0.6 + tokenCoverage * 0.3 + chunkCoverage * 0.1
}

export function listKnowledgeBases(): Promise<KnowledgeBaseSummary[]> {
  const store = loadStore()
  const summaries = store
    .map(toSummary)
    .sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1))
  return Promise.resolve(summaries)
}

export function getKnowledgeBase(id: string): Promise<KnowledgeBaseDetail> {
  const store = loadStore()
  const base = findBase(store, id)
  if (!base) {
    return Promise.reject(new Error('Knowledge base not found'))
  }
  return Promise.resolve(toDetail(base))
}

export function getKnowledgeDocument(kbId: string, docId: string): Promise<KnowledgeDocumentDetail> {
  const store = loadStore()
  const base = findBase(store, kbId)
  if (!base) {
    return Promise.reject(new Error('Knowledge base not found'))
  }
  const document = base.documents.find((doc) => doc.id === docId)
  if (!document) {
    return Promise.reject(new Error('Document not found'))
  }
  return Promise.resolve(toDocumentDetail(document))
}

export function getKnowledgeDocumentUrl(kbId: string, docId: string): string {
  if (typeof window === 'undefined') {
    return ''
  }
  const cacheKey = `${kbId}:${docId}`
  const cached = documentUrlCache.get(cacheKey)
  if (cached) {
    return cached
  }

  const store = loadStore()
  const base = findBase(store, kbId)
  if (!base) {
    return ''
  }
  const document = base.documents.find((doc) => doc.id === docId)
  if (!document || !document.raw_content) {
    return ''
  }

  const blob = new Blob([document.raw_content], { type: document.media_type || 'text/plain' })
  const url = URL.createObjectURL(blob)
  documentUrlCache.set(cacheKey, url)
  return url
}

export function createKnowledgeBase(body: { name: string; description?: string | null }): Promise<KnowledgeBaseDetail> {
  const name = body.name.trim()
  if (!name) {
    return Promise.reject(new Error('Name is required'))
  }

  const store = loadStore()
  const now = nowIso()
  const base: StoredKnowledgeBase = {
    id: generateId(),
    name,
    description: body.description?.trim() || null,
    source: 'user',
    created_at: now,
    updated_at: now,
    ready: false,
    documents: [],
  }
  store.push(base)
  saveStore(store)
  return Promise.resolve(toDetail(base))
}

export function ingestText(
  id: string,
  body: { title: string; content: string; chunk_size?: number; chunk_overlap?: number }
): Promise<KnowledgeDocument> {
  const store = loadStore()
  const base = findBase(store, id)
  if (!base) {
    return Promise.reject(new Error('Knowledge base not found'))
  }

  const title = body.title.trim() || 'Untitled'
  const content = body.content ?? ''
  if (!content.trim()) {
    return Promise.reject(new Error('Content is required'))
  }

  const chunkSize = Math.max(body.chunk_size ?? DEFAULT_CHUNK_SIZE, 100)
  const chunkOverlap = Math.min(body.chunk_overlap ?? DEFAULT_CHUNK_OVERLAP, chunkSize - 1)
  const chunks = chunkText(content, chunkSize, chunkOverlap)
  const now = nowIso()
  const document: StoredKnowledgeDocument = {
    id: generateId(),
    title,
    original_filename: null,
    media_type: 'text/plain',
    size_bytes: estimateSize(content),
    created_at: now,
    metadata: { chunk_size: chunkSize, chunk_overlap: chunkOverlap },
    raw_content: content,
    chunk_size: chunkSize,
    chunk_overlap: chunkOverlap,
    chunks,
  }
  base.documents.push(document)
  base.updated_at = now
  base.ready = true
  saveStore(store)
  return Promise.resolve(toDocumentSummary(document))
}

export async function ingestFile(
  id: string,
  file: File,
  options: { chunk_size?: number; chunk_overlap?: number; hf_api_key?: string | null } = {}
): Promise<KnowledgeDocument> {
  const store = loadStore()
  const base = findBase(store, id)
  if (!base) {
    throw new Error('Knowledge base not found')
  }

  const chunkSize = Math.max(options.chunk_size ?? DEFAULT_CHUNK_SIZE, 100)
  const chunkOverlap = Math.min(options.chunk_overlap ?? DEFAULT_CHUNK_OVERLAP, chunkSize - 1)

  let content = ''
  try {
    content = await file.text()
  } catch (error) {
    console.warn('Unable to read file as text, storing placeholder content instead', error)
    content = `[Binary file: ${file.name}]`
  }

  if (!content.trim()) {
    content = `[Empty file: ${file.name}]`
  }

  const chunks = chunkText(content, chunkSize, chunkOverlap)
  const now = nowIso()
  const document: StoredKnowledgeDocument = {
    id: generateId(),
    title: file.name.replace(/\.[^/.]+$/, '') || file.name || 'Untitled',
    original_filename: file.name,
    media_type: file.type || 'text/plain',
    size_bytes: file.size || estimateSize(content),
    created_at: now,
    metadata: {
      chunk_size: chunkSize,
      chunk_overlap: chunkOverlap,
      source: 'file-upload',
    },
    raw_content: content,
    chunk_size: chunkSize,
    chunk_overlap: chunkOverlap,
    chunks,
  }
  base.documents.push(document)
  base.updated_at = now
  base.ready = true
  saveStore(store)
  return toDocumentSummary(document)
}

export async function autoBuildKnowledgeBase(body: {
  name: string
  description?: string | null
  knowledge_items: { title: string; content: string; chunk_size?: number; chunk_overlap?: number }[]
  chunk_size?: number
  chunk_overlap?: number
}): Promise<KnowledgeBaseDetail> {
  const created = await createKnowledgeBase({ name: body.name, description: body.description })
  for (const item of body.knowledge_items ?? []) {
    await ingestText(created.id, {
      title: item.title,
      content: item.content,
      chunk_size: item.chunk_size ?? body.chunk_size,
      chunk_overlap: item.chunk_overlap ?? body.chunk_overlap,
    })
  }
  return getKnowledgeBase(created.id)
}

export function queryKnowledgeBase(
  id: string,
  body: { query: string; top_k?: number }
): Promise<KnowledgeBaseQueryResponse> {
  const store = loadStore()
  const base = findBase(store, id)
  if (!base) {
    return Promise.reject(new Error('Knowledge base not found'))
  }

  const topK = Math.max(1, Math.min(body.top_k ?? 4, 20))
  const query = body.query.trim()
  if (!query) {
    return Promise.resolve({ knowledge_base_id: id, query, matches: [] })
  }

  const scored = base.documents
    .flatMap((document) =>
      document.chunks.map((chunk) => ({
        document,
        chunk,
        score: scoreChunk(query, chunk.content),
      }))
    )
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)

  const matches: KnowledgeChunkMatch[] = scored.slice(0, topK).map((entry) => ({
    chunk_id: entry.chunk.id,
    score: entry.score,
    content: entry.chunk.content,
    document_id: entry.document.id,
    document_title: entry.document.title,
  }))

  return Promise.resolve({ knowledge_base_id: id, query, matches })
}

export function getKnowledgeBaseAttachments(ids: string[]) {
  if (!ids || ids.length === 0) {
    return Promise.resolve([])
  }
  const store = loadStore()
  const attachments = ids
    .map((id) => findBase(store, id))
    .filter((base): base is StoredKnowledgeBase => Boolean(base))
    .map((base) => ({
      id: base.id,
      name: base.name,
      description: base.description,
      documents: base.documents.map((document) => ({
        id: document.id,
        title: document.title,
        original_filename: document.original_filename,
        media_type: document.media_type,
        chunks: document.chunks,
      })),
    }))
  return Promise.resolve(attachments)
}