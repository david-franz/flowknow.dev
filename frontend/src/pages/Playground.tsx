import { ChangeEvent, FormEvent, ReactNode, useEffect, useMemo, useState } from 'react'
import {
  KnowledgeBaseDetail,
  KnowledgeBaseSummary,
  autoBuildKnowledgeBase,
  createKnowledgeBase,
  getKnowledgeBase,
  ingestFile,
  ingestText,
  listKnowledgeBases,
} from '../lib/api'

const HF_STORAGE_KEY = 'flowknow:hf-api-key'
const DEFAULT_CHUNK_SIZE = 750
const DEFAULT_CHUNK_OVERLAP = 50

type MessageKind = 'neutral' | 'success' | 'error'

function useLockedViewport() {
  useEffect(() => {
    const html = document.documentElement
    const body = document.body
    const mainElement = document.querySelector('main') as HTMLElement | null
    const headerElement = document.querySelector('header') as HTMLElement | null
    const footerElement = document.querySelector('footer') as HTMLElement | null

    const previousHtmlOverflow = html.style.overflow
    const previousBodyOverflow = body.style.overflow
    const previousMainPadding = mainElement?.style.padding ?? ''
    const previousMainHeight = mainElement?.style.height ?? ''
    const previousMainOverflow = mainElement?.style.overflow ?? ''

    const applySizing = () => {
      if (!mainElement) return
      const headerHeight = headerElement?.offsetHeight ?? 0
      const footerHeight = footerElement?.offsetHeight ?? 0
      mainElement.style.padding = '0'
      mainElement.style.height = `${window.innerHeight - headerHeight - footerHeight}px`
      mainElement.style.overflow = 'hidden'
    }

    html.style.overflow = 'hidden'
    body.style.overflow = 'hidden'
    applySizing()
    window.addEventListener('resize', applySizing)

    return () => {
      html.style.overflow = previousHtmlOverflow
      body.style.overflow = previousBodyOverflow
      window.removeEventListener('resize', applySizing)
      if (mainElement) {
        mainElement.style.padding = previousMainPadding
        mainElement.style.height = previousMainHeight
        mainElement.style.overflow = previousMainOverflow
      }
    }
  }, [])
}

function useStoredApiKey(): [string, (value: string) => void] {
  const [key, setKey] = useState<string>(() => {
    if (typeof window === 'undefined') return ''
    return window.localStorage.getItem(HF_STORAGE_KEY) ?? ''
  })

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (key) {
      window.localStorage.setItem(HF_STORAGE_KEY, key)
    } else {
      window.localStorage.removeItem(HF_STORAGE_KEY)
    }
  }, [key])

  return [key, setKey]
}

function SidebarSection({
  title,
  description,
  children,
  defaultOpen = true,
}: {
  title: string
  description?: string
  children: ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <section className="rounded-2xl border border-slate-200/60 bg-white/80 shadow-sm transition dark:border-white/10 dark:bg-slate-950/50">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-start justify-between gap-3 rounded-2xl px-4 py-3 text-left"
      >
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h3>
          {description && <p className="mt-1 text-xs text-slate-500 leading-relaxed dark:text-slate-300">{description}</p>}
        </div>
        <span className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-200/80 text-slate-500 transition dark:border-white/20 dark:text-slate-200">
          <svg className={`h-3 w-3 transition-transform ${open ? '' : 'rotate-180'}`} viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 10.585l3.71-3.354a.75.75 0 111.02 1.1l-4.229 3.827a.75.75 0 01-1.02 0L5.21 8.33a.75.75 0 01.02-1.12z"
              clipRule="evenodd"
            />
          </svg>
        </span>
      </button>
      {open && <div className="border-t border-slate-200/60 px-4 py-4 text-sm dark:border-white/10">{children}</div>}
    </section>
  )
}

function StatusMessage({ message, kind = 'neutral' }: { message: string | null; kind?: MessageKind }) {
  if (!message) return null
  const palette: Record<MessageKind, string> = {
    neutral: 'text-slate-500 dark:text-slate-300',
    success: 'text-emerald-600 dark:text-emerald-300',
    error: 'text-red-500 dark:text-red-400',
  }
  return <p className={`text-xs ${palette[kind]}`}>{message}</p>
}

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat('en', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value))
  } catch (error) {
    return value
  }
}

function parseNumber(value: string, fallback: number): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback
  }
  return parsed
}

export default function Playground() {
  useLockedViewport()

  const [hfKey, setHfKey] = useStoredApiKey()
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBaseSummary[]>([])
  const [loadingList, setLoadingList] = useState<boolean>(true)
  const [listError, setListError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<KnowledgeBaseDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState<boolean>(false)
  const [detailError, setDetailError] = useState<string | null>(null)

  const [createName, setCreateName] = useState('')
  const [createDescription, setCreateDescription] = useState('')
  const [createStatus, setCreateStatus] = useState<{ text: string; kind: MessageKind } | null>(null)

  const [autoName, setAutoName] = useState('')
  const [autoDescription, setAutoDescription] = useState('')
  const [autoEntries, setAutoEntries] = useState('')
  const [autoChunkSize, setAutoChunkSize] = useState(String(DEFAULT_CHUNK_SIZE))
  const [autoChunkOverlap, setAutoChunkOverlap] = useState(String(DEFAULT_CHUNK_OVERLAP))
  const [autoStatus, setAutoStatus] = useState<{ text: string; kind: MessageKind } | null>(null)

  const [textTitle, setTextTitle] = useState('')
  const [textContent, setTextContent] = useState('')
  const [textChunkSize, setTextChunkSize] = useState(String(DEFAULT_CHUNK_SIZE))
  const [textChunkOverlap, setTextChunkOverlap] = useState(String(DEFAULT_CHUNK_OVERLAP))
  const [textStatus, setTextStatus] = useState<{ text: string; kind: MessageKind } | null>(null)

  const [uploadChunkSize, setUploadChunkSize] = useState(String(DEFAULT_CHUNK_SIZE))
  const [uploadChunkOverlap, setUploadChunkOverlap] = useState(String(DEFAULT_CHUNK_OVERLAP))
  const [uploadStatus, setUploadStatus] = useState<{ text: string; kind: MessageKind } | null>(null)
  const [uploading, setUploading] = useState(false)

  const [leftCollapsed, setLeftCollapsed] = useState<boolean>(false)
  const [rightCollapsed, setRightCollapsed] = useState<boolean>(false)

  useEffect(() => {
    let ignore = false

    async function fetchKnowledgeBases() {
      setLoadingList(true)
      setListError(null)
      try {
        const data = await listKnowledgeBases()
        if (!ignore) {
          setKnowledgeBases(data)
          setSelectedId((previous) => {
            if (previous && data.some((item) => item.id === previous)) {
              return previous
            }
            return data.length > 0 ? data[0].id : null
          })
        }
      } catch (error) {
        if (!ignore) {
          setListError(error instanceof Error ? error.message : 'Unable to load knowledge bases')
        }
      } finally {
        if (!ignore) {
          setLoadingList(false)
        }
      }
    }

    fetchKnowledgeBases()

    return () => {
      ignore = true
    }
  }, [])

  useEffect(() => {
    if (!selectedId) {
      setDetail(null)
      setDetailError(null)
      return
    }

    let ignore = false

    async function fetchDetail() {
      setDetailLoading(true)
      setDetailError(null)
      try {
        const data = await getKnowledgeBase(selectedId)
        if (!ignore) {
          setDetail(data)
        }
      } catch (error) {
        if (!ignore) {
          setDetailError(error instanceof Error ? error.message : 'Unable to load knowledge base detail')
        }
      } finally {
        if (!ignore) {
          setDetailLoading(false)
        }
      }
    }

    fetchDetail()

    return () => {
      ignore = true
    }
  }, [selectedId])

  const totalDocuments = useMemo(() => knowledgeBases.reduce((acc, kb) => acc + kb.document_count, 0), [knowledgeBases])
  const totalChunks = useMemo(() => knowledgeBases.reduce((acc, kb) => acc + kb.chunk_count, 0), [knowledgeBases])

  const refreshKnowledgeBases = async (targetId?: string | null) => {
    setLoadingList(true)
    setListError(null)
    try {
      const data = await listKnowledgeBases()
      setKnowledgeBases(data)
      let nextId = targetId ?? selectedId
      if (!nextId || !data.some((item) => item.id === nextId)) {
        nextId = data.length > 0 ? data[0].id : null
      }
      setSelectedId(nextId)
    } catch (error) {
      setListError(error instanceof Error ? error.message : 'Unable to refresh knowledge bases')
    } finally {
      setLoadingList(false)
    }
  }

  const handleCreateKnowledgeBase = async (event: FormEvent) => {
    event.preventDefault()
    const trimmedName = createName.trim()
    if (!trimmedName) {
      setCreateStatus({ text: 'Name is required', kind: 'error' })
      return
    }

    setCreateStatus({ text: 'Creating knowledge base…', kind: 'neutral' })
    try {
      const created = await createKnowledgeBase({ name: trimmedName, description: createDescription.trim() || undefined })
      setCreateStatus({ text: 'Knowledge base created successfully', kind: 'success' })
      setCreateName('')
      setCreateDescription('')
      await refreshKnowledgeBases(created.id)
    } catch (error) {
      setCreateStatus({ text: error instanceof Error ? error.message : 'Unable to create knowledge base', kind: 'error' })
    }
  }

  const handleAutoBuild = async (event: FormEvent) => {
    event.preventDefault()
    const trimmedName = autoName.trim()
    const trimmedEntries = autoEntries.trim()
    if (!trimmedName || !trimmedEntries) {
      setAutoStatus({ text: 'Provide a name and at least one entry', kind: 'error' })
      return
    }

    const chunkSize = parseNumber(autoChunkSize, DEFAULT_CHUNK_SIZE)
    const chunkOverlap = parseNumber(autoChunkOverlap, DEFAULT_CHUNK_OVERLAP)
    const blocks = trimmedEntries.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean)
    if (blocks.length === 0) {
      setAutoStatus({ text: 'Unable to parse knowledge entries', kind: 'error' })
      return
    }

    const knowledgeItems = blocks.map((block) => {
      const [firstLine, ...rest] = block.split('\n')
      const title = (firstLine ?? 'Entry').trim() || 'Entry'
      const content = rest.join('\n').trim() || title
      return {
        title,
        content,
        chunk_size: chunkSize,
        chunk_overlap: chunkOverlap,
      }
    })

    setAutoStatus({ text: 'Building knowledge base…', kind: 'neutral' })
    try {
      const created = await autoBuildKnowledgeBase({
        name: trimmedName,
        description: autoDescription.trim() || undefined,
        knowledge_items: knowledgeItems,
        chunk_size: chunkSize,
        chunk_overlap: chunkOverlap,
      })
      setAutoStatus({ text: 'Knowledge base generated successfully', kind: 'success' })
      setAutoName('')
      setAutoDescription('')
      setAutoEntries('')
      await refreshKnowledgeBases(created.id)
    } catch (error) {
      setAutoStatus({ text: error instanceof Error ? error.message : 'Unable to auto-build knowledge base', kind: 'error' })
    }
  }

  const handleTextIngestion = async (event: FormEvent) => {
    event.preventDefault()
    if (!selectedId) {
      setTextStatus({ text: 'Select a knowledge base before ingesting text', kind: 'error' })
      return
    }
    const content = textContent.trim()
    if (!content) {
      setTextStatus({ text: 'Content is required', kind: 'error' })
      return
    }

    const chunkSize = parseNumber(textChunkSize, DEFAULT_CHUNK_SIZE)
    const chunkOverlap = parseNumber(textChunkOverlap, DEFAULT_CHUNK_OVERLAP)
    setTextStatus({ text: 'Ingesting text…', kind: 'neutral' })
    try {
      await ingestText(selectedId, {
        title: textTitle.trim() || 'Untitled',
        content,
        chunk_size: chunkSize,
        chunk_overlap: chunkOverlap,
      })
      setTextStatus({ text: 'Text ingested successfully', kind: 'success' })
      setTextTitle('')
      setTextContent('')
      await refreshKnowledgeBases(selectedId)
      await getKnowledgeBase(selectedId).then(setDetail).catch(() => undefined)
    } catch (error) {
      setTextStatus({ text: error instanceof Error ? error.message : 'Unable to ingest text', kind: 'error' })
    }
  }

  const handleFileSelection = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!selectedId) {
      setUploadStatus({ text: 'Select a knowledge base before uploading files', kind: 'error' })
      event.target.value = ''
      return
    }

    const files = event.target.files
    if (!files || files.length === 0) {
      return
    }
    const file = files[0]
    const chunkSize = parseNumber(uploadChunkSize, DEFAULT_CHUNK_SIZE)
    const chunkOverlap = parseNumber(uploadChunkOverlap, DEFAULT_CHUNK_OVERLAP)

    setUploading(true)
    setUploadStatus({ text: `Uploading ${file.name}…`, kind: 'neutral' })
    try {
      await ingestFile(selectedId, file, {
        chunk_size: chunkSize,
        chunk_overlap: chunkOverlap,
        hf_api_key: hfKey || undefined,
      })
      setUploadStatus({ text: `${file.name} ingested successfully`, kind: 'success' })
      await refreshKnowledgeBases(selectedId)
      await getKnowledgeBase(selectedId).then(setDetail).catch(() => undefined)
    } catch (error) {
      setUploadStatus({ text: error instanceof Error ? error.message : 'Unable to upload file', kind: 'error' })
    } finally {
      setUploading(false)
      event.target.value = ''
    }
  }

  return (
    <div className="flex h-full w-full overflow-hidden bg-slate-100/70 text-slate-900 transition dark:bg-slate-950 dark:text-white">
      <aside
        className={`relative hidden h-full flex-none flex-col border-r border-slate-200/60 bg-white/70 p-4 transition-all duration-300 dark:border-white/10 dark:bg-slate-950/60 xl:flex ${leftCollapsed ? 'w-16' : 'w-[22rem]'}`}
      >
        <button
          type="button"
          onClick={() => setLeftCollapsed((value) => !value)}
          className="absolute -right-3 top-6 flex h-7 w-7 items-center justify-center rounded-full border border-slate-300/80 bg-white text-slate-500 shadow-sm transition hover:bg-slate-100 dark:border-white/20 dark:bg-slate-900 dark:text-slate-200"
          aria-label={leftCollapsed ? 'Expand creation panel' : 'Collapse creation panel'}
        >
          <svg className={`h-3.5 w-3.5 transition-transform ${leftCollapsed ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M12.293 15.707a1 1 0 010-1.414L14.586 12H5a1 1 0 110-2h9.586l-2.293-2.293a1 1 0 111.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
              clipRule="evenodd"
            />
          </svg>
        </button>

        {leftCollapsed ? (
          <div className="flex h-full flex-col items-center justify-between py-8 text-xs text-slate-500 dark:text-slate-300">
            <span className="rotate-90 whitespace-nowrap tracking-widest">Builder</span>
            <span className="rotate-90 whitespace-nowrap tracking-widest">Flowknow</span>
          </div>
        ) : (
          <div className="flex h-full flex-col gap-4 overflow-hidden">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-brand-600 dark:text-brand-300">Playground</h2>
              <p className="mt-1 text-xs text-slate-500 leading-relaxed dark:text-slate-300">
                Create and generate knowledge bases that power Flowport retrieval. Configure chunking and structure before ingesting content.
              </p>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto pr-1">
              <SidebarSection title="Create knowledge base" description="Set up a fresh workspace with a name and optional description.">
                <form onSubmit={handleCreateKnowledgeBase} className="space-y-3 text-xs">
                  <label className="block font-semibold text-slate-600 dark:text-slate-300">
                    Name
                    <input
                      type="text"
                      value={createName}
                      onChange={(event) => setCreateName(event.target.value)}
                      placeholder="Support knowledge base"
                      className="mt-1 w-full rounded-lg border border-slate-200/60 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200/60 dark:border-white/10 dark:bg-slate-900/80 dark:text-white"
                    />
                  </label>
                  <label className="block font-semibold text-slate-600 dark:text-slate-300">
                    Description
                    <textarea
                      value={createDescription}
                      onChange={(event) => setCreateDescription(event.target.value)}
                      rows={3}
                      placeholder="Optional summary"
                      className="mt-1 w-full rounded-lg border border-slate-200/60 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200/60 dark:border-white/10 dark:bg-slate-900/80 dark:text-white"
                    />
                  </label>
                  <button
                    type="submit"
                    className="w-full rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-sm transition hover:bg-brand-400"
                  >
                    Create workspace
                  </button>
                  <StatusMessage message={createStatus?.text ?? null} kind={createStatus?.kind ?? 'neutral'} />
                </form>
              </SidebarSection>

              <SidebarSection
                title="Auto-build from notes"
                description="Paste structured entries separated by blank lines to generate a knowledge base automatically."
              >
                <form onSubmit={handleAutoBuild} className="space-y-3 text-xs">
                  <label className="block font-semibold text-slate-600 dark:text-slate-300">
                    Name
                    <input
                      type="text"
                      value={autoName}
                      onChange={(event) => setAutoName(event.target.value)}
                      placeholder="Onboarding guide"
                      className="mt-1 w-full rounded-lg border border-slate-200/60 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200/60 dark:border-white/10 dark:bg-slate-900/80 dark:text-white"
                    />
                  </label>
                  <label className="block font-semibold text-slate-600 dark:text-slate-300">
                    Description
                    <input
                      type="text"
                      value={autoDescription}
                      onChange={(event) => setAutoDescription(event.target.value)}
                      placeholder="Optional description"
                      className="mt-1 w-full rounded-lg border border-slate-200/60 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200/60 dark:border-white/10 dark:bg-slate-900/80 dark:text-white"
                    />
                  </label>
                  <label className="block font-semibold text-slate-600 dark:text-slate-300">
                    Knowledge entries
                    <textarea
                      value={autoEntries}
                      onChange={(event) => setAutoEntries(event.target.value)}
                      rows={6}
                      placeholder={`Title one\nBody text...\n\nTitle two\nMore details...`}
                      className="mt-1 w-full rounded-lg border border-slate-200/60 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200/60 dark:border-white/10 dark:bg-slate-900/80 dark:text-white"
                    />
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block font-semibold text-slate-600 dark:text-slate-300">
                      Chunk size
                      <input
                        type="number"
                        min={100}
                        max={4000}
                        step={50}
                        value={autoChunkSize}
                        onChange={(event) => setAutoChunkSize(event.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-200/60 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200/60 dark:border-white/10 dark:bg-slate-900/80 dark:text-white"
                      />
                    </label>
                    <label className="block font-semibold text-slate-600 dark:text-slate-300">
                      Overlap
                      <input
                        type="number"
                        min={0}
                        max={500}
                        step={10}
                        value={autoChunkOverlap}
                        onChange={(event) => setAutoChunkOverlap(event.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-200/60 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200/60 dark:border-white/10 dark:bg-slate-900/80 dark:text-white"
                      />
                    </label>
                  </div>
                  <button
                    type="submit"
                    className="w-full rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-sm transition hover:bg-brand-400"
                  >
                    Generate workspace
                  </button>
                  <StatusMessage message={autoStatus?.text ?? null} kind={autoStatus?.kind ?? 'neutral'} />
                </form>
              </SidebarSection>
            </div>
          </div>
        )}
      </aside>

      <section className="flex flex-1 flex-col overflow-hidden px-4 py-6">
        <header className="rounded-3xl border border-slate-200/60 bg-white/80 px-6 py-4 shadow-sm dark:border-white/10 dark:bg-slate-950/50">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-lg font-semibold text-slate-900 dark:text-white">Flowknow Playground</h1>
              <p className="text-sm text-slate-500 dark:text-slate-300">
                {knowledgeBases.length} knowledge bases • {totalDocuments} documents • {totalChunks} chunks indexed
              </p>
            </div>
            <button
              type="button"
              onClick={() => refreshKnowledgeBases().catch(() => undefined)}
              className="self-start rounded-lg border border-slate-200/60 px-3 py-2 text-xs font-semibold text-slate-500 transition hover:border-brand-300 hover:text-brand-700 dark:border-white/20 dark:text-slate-200"
            >
              Refresh workspaces
            </button>
          </div>
        </header>

        <div className="mt-4 flex flex-1 flex-col gap-4 overflow-hidden">
          <div className="flex-[1.2] overflow-hidden rounded-3xl border border-slate-200/60 bg-white/90 shadow-sm dark:border-white/10 dark:bg-slate-950/60">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200/60 px-6 py-4 dark:border-white/10">
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Knowledge bases</h2>
                <p className="text-xs text-slate-500 dark:text-slate-300">Select a workspace to view documents and ingest new material.</p>
              </div>
            </div>
            <div className="h-full overflow-y-auto px-6 py-4">
              {loadingList && <p className="text-xs text-slate-500 dark:text-slate-300">Loading knowledge bases…</p>}
              {listError && <p className="text-xs text-red-500 dark:text-red-400">{listError}</p>}
              {!loadingList && !listError && knowledgeBases.length === 0 && (
                <p className="text-xs text-slate-500 dark:text-slate-300">No knowledge bases yet—create one using the forms on the left.</p>
              )}
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {knowledgeBases.map((kb) => {
                  const selected = kb.id === selectedId
                  return (
                    <button
                      key={kb.id}
                      type="button"
                      onClick={() => setSelectedId(kb.id)}
                      className={`flex flex-col gap-2 rounded-2xl border px-4 py-3 text-left text-sm transition shadow-sm ${
                        selected
                          ? 'border-brand-400 bg-brand-100/60 text-brand-800 dark:border-brand-200/40 dark:bg-brand-300/10 dark:text-brand-50'
                          : 'border-slate-200/60 bg-white/80 text-slate-700 hover:border-brand-300 hover:text-brand-700 dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-400 dark:text-slate-400">
                        <span>{kb.source === 'prebuilt' ? 'Prebuilt' : 'User'}</span>
                        <span>{selected ? 'Selected' : kb.ready ? 'Ready' : 'Rebuilding'}</span>
                      </div>
                      <h3 className="text-base font-semibold text-slate-900 dark:text-white">{kb.name}</h3>
                      {kb.description && <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-300">{kb.description}</p>}
                      <p className="text-xs text-slate-400 dark:text-slate-400">
                        {kb.document_count} documents • {kb.chunk_count} chunks
                      </p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500">
                        Updated {formatDate(kb.updated_at)}
                      </p>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="flex-[1.4] overflow-hidden rounded-3xl border border-slate-200/60 bg-white/90 shadow-sm dark:border-white/10 dark:bg-slate-950/60">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200/60 px-6 py-4 dark:border-white/10">
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Documents</h2>
                <p className="text-xs text-slate-500 dark:text-slate-300">
                  {selectedId ? 'Review ingested documents for the selected workspace.' : 'Select a knowledge base to inspect documents.'}
                </p>
              </div>
            </div>
            <div className="h-full overflow-y-auto px-6 py-4">
              {!selectedId && <p className="text-xs text-slate-500 dark:text-slate-300">Choose a knowledge base to view its documents.</p>}
              {selectedId && detailLoading && <p className="text-xs text-slate-500 dark:text-slate-300">Refreshing documents…</p>}
              {selectedId && detailError && <p className="text-xs text-red-500 dark:text-red-400">{detailError}</p>}
              {selectedId && detail && !detailLoading && !detailError && detail.documents.length === 0 && (
                <p className="text-xs text-slate-500 dark:text-slate-300">No documents yet—use the ingestion tools on the right.</p>
              )}
              {selectedId && detail && detail.documents.length > 0 && (
                <ul className="space-y-3 text-xs">
                  {detail.documents.map((doc) => (
                    <li
                      key={doc.id}
                      className="rounded-2xl border border-slate-200/60 bg-white/80 px-4 py-3 shadow-sm dark:border-white/10 dark:bg-slate-900/60"
                    >
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">{doc.title}</p>
                          {doc.original_filename && (
                            <p className="text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-400">{doc.original_filename}</p>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-500 dark:text-slate-300">
                          {doc.chunk_count} chunks • {(doc.size_bytes / 1024).toFixed(1)} KB
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </section>

      <aside
        className={`relative hidden h-full flex-none flex-col border-l border-slate-200/60 bg-white/70 p-4 transition-all duration-300 dark:border-white/10 dark:bg-slate-950/60 xl:flex ${rightCollapsed ? 'w-16' : 'w-[22rem]'}`}
      >
        <button
          type="button"
          onClick={() => setRightCollapsed((value) => !value)}
          className="absolute -left-3 top-6 flex h-7 w-7 items-center justify-center rounded-full border border-slate-300/80 bg-white text-slate-500 shadow-sm transition hover:bg-slate-100 dark:border-white/20 dark:bg-slate-900 dark:text-slate-200"
          aria-label={rightCollapsed ? 'Expand ingestion panel' : 'Collapse ingestion panel'}
        >
          <svg className={`h-3.5 w-3.5 transition-transform ${rightCollapsed ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M7.707 4.293a1 1 0 010 1.414L5.414 8H15a1 1 0 110 2H5.414l2.293 2.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        </button>

        {rightCollapsed ? (
          <div className="flex h-full flex-col items-center justify-between py-8 text-xs text-slate-500 dark:text-slate-300">
            <span className="rotate-90 whitespace-nowrap tracking-widest">Ingest</span>
            <span className="rotate-90 whitespace-nowrap tracking-widest">Flowknow</span>
          </div>
        ) : (
          <div className="flex h-full flex-col gap-4 overflow-hidden">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-brand-600 dark:text-brand-300">Ingestion</h2>
              <p className="mt-1 text-xs text-slate-500 leading-relaxed dark:text-slate-300">
                Add documents, paste transcripts, and upload files to the selected workspace. Configurable chunking keeps retrieval precise.
              </p>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto pr-1">
              <SidebarSection title="Selected workspace" description="Key metrics for the active knowledge base.">
                {selectedId && detail ? (
                  <ul className="text-xs text-slate-600 leading-relaxed dark:text-slate-300">
                    <li>
                      <span className="font-semibold text-slate-500 dark:text-slate-200">Name:</span> {detail.name}
                    </li>
                    {detail.description && (
                      <li>
                        <span className="font-semibold text-slate-500 dark:text-slate-200">Description:</span> {detail.description}
                      </li>
                    )}
                    <li>
                      <span className="font-semibold text-slate-500 dark:text-slate-200">Documents:</span> {detail.document_count}
                    </li>
                    <li>
                      <span className="font-semibold text-slate-500 dark:text-slate-200">Chunks:</span> {detail.chunk_count}
                    </li>
                    <li>
                      <span className="font-semibold text-slate-500 dark:text-slate-200">Updated:</span> {formatDate(detail.updated_at)}
                    </li>
                  </ul>
                ) : (
                  <p className="text-xs text-slate-500 dark:text-slate-300">Select a knowledge base to view its summary.</p>
                )}
              </SidebarSection>

              <SidebarSection title="Hugging Face key" description="Optional key used for image captioning during file uploads.">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Hugging Face API key
                  <input
                    type="password"
                    value={hfKey}
                    onChange={(event) => setHfKey(event.target.value)}
                    placeholder="hf_xxxxx"
                    className="mt-1 w-full rounded-lg border border-slate-200/60 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200/60 dark:border-white/10 dark:bg-slate-900/80 dark:text-white"
                  />
                </label>
                <p className="mt-2 text-[11px] text-slate-400 dark:text-slate-400">Stored locally in your browser.</p>
              </SidebarSection>

              <SidebarSection title="Ingest text" description="Paste free-form content. Ideal for transcripts, FAQs, and SOPs.">
                <form onSubmit={handleTextIngestion} className="space-y-3 text-xs">
                  <label className="block font-semibold text-slate-600 dark:text-slate-300">
                    Title
                    <input
                      type="text"
                      value={textTitle}
                      onChange={(event) => setTextTitle(event.target.value)}
                      placeholder="Content title"
                      className="mt-1 w-full rounded-lg border border-slate-200/60 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200/60 dark:border-white/10 dark:bg-slate-900/80 dark:text-white"
                    />
                  </label>
                  <label className="block font-semibold text-slate-600 dark:text-slate-300">
                    Content
                    <textarea
                      value={textContent}
                      onChange={(event) => setTextContent(event.target.value)}
                      rows={5}
                      placeholder="Paste relevant text, transcripts, or instructions…"
                      className="mt-1 w-full rounded-lg border border-slate-200/60 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200/60 dark:border-white/10 dark:bg-slate-900/80 dark:text-white"
                    />
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block font-semibold text-slate-600 dark:text-slate-300">
                      Chunk size
                      <input
                        type="number"
                        min={100}
                        max={4000}
                        step={50}
                        value={textChunkSize}
                        onChange={(event) => setTextChunkSize(event.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-200/60 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200/60 dark:border-white/10 dark:bg-slate-900/80 dark:text-white"
                      />
                    </label>
                    <label className="block font-semibold text-slate-600 dark:text-slate-300">
                      Overlap
                      <input
                        type="number"
                        min={0}
                        max={500}
                        step={10}
                        value={textChunkOverlap}
                        onChange={(event) => setTextChunkOverlap(event.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-200/60 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200/60 dark:border-white/10 dark:bg-slate-900/80 dark:text-white"
                      />
                    </label>
                  </div>
                  <button
                    type="submit"
                    className="w-full rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-sm transition hover:bg-brand-400"
                  >
                    Ingest text
                  </button>
                  <StatusMessage message={textStatus?.text ?? null} kind={textStatus?.kind ?? 'neutral'} />
                </form>
              </SidebarSection>

              <SidebarSection title="Upload file" description="Attach PDFs, spreadsheets, or images. Images use Hugging Face for captioning.">
                <form className="space-y-3 text-xs" onSubmit={(event) => event.preventDefault()}>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block font-semibold text-slate-600 dark:text-slate-300">
                      Chunk size
                      <input
                        type="number"
                        min={100}
                        max={4000}
                        step={50}
                        value={uploadChunkSize}
                        onChange={(event) => setUploadChunkSize(event.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-200/60 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200/60 dark:border-white/10 dark:bg-slate-900/80 dark:text-white"
                      />
                    </label>
                    <label className="block font-semibold text-slate-600 dark:text-slate-300">
                      Overlap
                      <input
                        type="number"
                        min={0}
                        max={500}
                        step={10}
                        value={uploadChunkOverlap}
                        onChange={(event) => setUploadChunkOverlap(event.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-200/60 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200/60 dark:border-white/10 dark:bg-slate-900/80 dark:text-white"
                      />
                    </label>
                  </div>
                  <input
                    type="file"
                    accept=".txt,.md,.csv,.pdf,.png,.jpg,.jpeg"
                    onChange={handleFileSelection}
                    disabled={uploading}
                    className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-500 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-slate-950 hover:file:bg-brand-400 disabled:file:opacity-60 dark:text-slate-300"
                  />
                  <p className="text-[11px] text-slate-400 dark:text-slate-400">
                    Supports TXT, Markdown, CSV, PDF, PNG, and JPEG. Provide a Hugging Face key for automatic image captioning.
                  </p>
                  <StatusMessage message={uploadStatus?.text ?? null} kind={uploadStatus?.kind ?? 'neutral'} />
                </form>
              </SidebarSection>
            </div>
          </div>
        )}
      </aside>
    </div>
  )
}
