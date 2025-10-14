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

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  })
  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || `Request failed with status ${response.status}`)
  }
  if (response.status === 204) {
    return undefined as T
  }
  return (await response.json()) as T
}

export function listKnowledgeBases(): Promise<KnowledgeBaseSummary[]> {
  return request('/knowledge-bases')
}

export function getKnowledgeBase(id: string): Promise<KnowledgeBaseDetail> {
  return request(`/knowledge-bases/${id}`)
}

export function createKnowledgeBase(body: { name: string; description?: string | null }): Promise<KnowledgeBaseDetail> {
  return request('/knowledge-bases', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function ingestText(
  id: string,
  body: { title: string; content: string; chunk_size?: number; chunk_overlap?: number }
): Promise<KnowledgeDocument> {
  return request(`/knowledge-bases/${id}/ingest/text`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function ingestFile(
  id: string,
  file: File,
  options: { chunk_size?: number; chunk_overlap?: number; hf_api_key?: string | null } = {}
): Promise<KnowledgeDocument> {
  const form = new FormData()
  form.append('file', file)
  if (options.chunk_size) form.append('chunk_size', String(options.chunk_size))
  if (options.chunk_overlap) form.append('chunk_overlap', String(options.chunk_overlap))
  if (options.hf_api_key) form.append('hf_api_key', options.hf_api_key)

  const response = await fetch(`${API_BASE}/knowledge-bases/${id}/ingest/file`, {
    method: 'POST',
    body: form,
  })
  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || `File upload failed with status ${response.status}`)
  }
  return (await response.json()) as KnowledgeDocument
}

export function autoBuildKnowledgeBase(body: {
  name: string
  description?: string | null
  knowledge_items: { title: string; content: string; chunk_size?: number; chunk_overlap?: number }[]
  chunk_size?: number
  chunk_overlap?: number
}): Promise<KnowledgeBaseDetail> {
  return request('/knowledge-bases/auto-build', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function queryKnowledgeBase(
  id: string,
  body: { query: string; top_k?: number }
): Promise<KnowledgeBaseQueryResponse> {
  return request(`/knowledge-bases/${id}/query`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}