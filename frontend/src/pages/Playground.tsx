import { ChangeEvent, FormEvent, ReactNode, useEffect, useMemo, useState } from 'react'
import {
  KnowledgeBaseDetail,
  KnowledgeBaseSummary,
  KnowledgeDocumentDetail,
  createKnowledgeBase,
  getKnowledgeBase,
  getKnowledgeDocument,
  getKnowledgeDocumentUrl,
  ingestFile,
  listKnowledgeBases,
} from '../lib/api'

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

export default function Playground() {
  useLockedViewport()

  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBaseSummary[]>([])
  const [loadingList, setLoadingList] = useState<boolean>(true)
  const [listError, setListError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<KnowledgeBaseDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState<boolean>(false)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null)
  const [documentDetail, setDocumentDetail] = useState<KnowledgeDocumentDetail | null>(null)
  const [documentLoading, setDocumentLoading] = useState<boolean>(false)
  const [documentError, setDocumentError] = useState<string | null>(null)

  const [createName, setCreateName] = useState('')
  const [createDescription, setCreateDescription] = useState('')
  const [createStatus, setCreateStatus] = useState<{ text: string; kind: MessageKind } | null>(null)
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
      setSelectedDocumentId(null)
      setDocumentDetail(null)
      setDocumentError(null)
      setDocumentLoading(false)
      return
    }

    let ignore = false

    setSelectedDocumentId(null)
    setDocumentDetail(null)
    setDocumentError(null)
    setDocumentLoading(false)

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

  useEffect(() => {
    if (!selectedId || !selectedDocumentId) {
      return
    }

    let ignore = false

    async function fetchDocument() {
      setDocumentLoading(true)
      setDocumentError(null)
      try {
        const data = await getKnowledgeDocument(selectedId, selectedDocumentId)
        if (!ignore) {
          setDocumentDetail(data)
        }
      } catch (error) {
        if (!ignore) {
          setDocumentError(error instanceof Error ? error.message : 'Unable to load document')
        }
      } finally {
        if (!ignore) {
          setDocumentLoading(false)
        }
      }
    }

    fetchDocument()

    return () => {
      ignore = true
    }
  }, [selectedId, selectedDocumentId])

  useEffect(() => {
    if (!detail || detail.documents.length === 0) {
      return
    }

    setSelectedDocumentId((previous) => {
      if (previous && detail.documents.some((doc) => doc.id === previous)) {
        return previous
      }
      return detail.documents[0].id
    })
  }, [detail])

  const totalDocuments = useMemo(() => knowledgeBases.reduce((acc, kb) => acc + kb.document_count, 0), [knowledgeBases])
  const totalChunks = useMemo(() => knowledgeBases.reduce((acc, kb) => acc + kb.chunk_count, 0), [knowledgeBases])
  const previewUrl = useMemo(() => {
    if (!selectedId || !documentDetail?.file_available) {
      return null
    }
    return getKnowledgeDocumentUrl(selectedId, documentDetail.id)
  }, [selectedId, documentDetail])

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

  const handleDocumentSelect = (docId: string) => {
    if (!selectedId) {
      return
    }
    setSelectedDocumentId(docId)
    setDocumentLoading(true)
    setDocumentDetail(null)
    setDocumentError(null)
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
    const fileList = Array.from(files)

    setUploading(true)
    setUploadStatus({
      text: `Uploading ${fileList.length} file${fileList.length === 1 ? '' : 's'}…`,
      kind: 'neutral',
    })

    try {
      for (const file of fileList) {
        await ingestFile(selectedId, file, {
          chunk_size: DEFAULT_CHUNK_SIZE,
          chunk_overlap: DEFAULT_CHUNK_OVERLAP,
        })
      }
      setUploadStatus({
        text: `Uploaded ${fileList.length} file${fileList.length === 1 ? '' : 's'}. Vector database refreshed.`,
        kind: 'success',
      })
      await refreshKnowledgeBases(selectedId)
      await getKnowledgeBase(selectedId).then(setDetail).catch(() => undefined)
    } catch (error) {
      setUploadStatus({ text: error instanceof Error ? error.message : 'Unable to upload files', kind: 'error' })
    } finally {
      setUploading(false)
      event.target.value = ''
    }
  }

  return (
    <div className="flex h-full w-full overflow-hidden bg-slate-100/70 text-slate-900 transition dark:bg-slate-950 dark:text-white">
      <aside
        className={`relative hidden h-full min-h-0 flex-none overflow-hidden border-r border-slate-200/60 bg-white/70 p-4 transition-all duration-300 dark:border-white/10 dark:bg-slate-950/60 xl:flex xl:flex-col ${leftCollapsed ? 'w-16' : 'w-[22rem]'}`}
      >
        <button
          type="button"
          onClick={() => setLeftCollapsed((value) => !value)}
          className="absolute -right-3 top-6 flex h-7 w-7 items-center justify-center rounded-full border border-slate-300/80 bg-white text-slate-500 shadow-sm transition hover:bg-slate-100 dark:border-white/20 dark:bg-slate-900 dark:text-slate-200"
          aria-label={leftCollapsed ? 'Expand workspaces panel' : 'Collapse workspaces panel'}
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
            <span className="rotate-90 whitespace-nowrap tracking-widest">Workspaces</span>
            <span className="rotate-90 whitespace-nowrap tracking-widest">Flowknow</span>
          </div>
        ) : (
          <div className="flex h-full min-h-0 flex-col gap-4 overflow-hidden">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-brand-600 dark:text-brand-300">Playground</h2>
              <p className="mt-1 text-xs text-slate-500 leading-relaxed dark:text-slate-300">
                Browse Flowknow knowledge bases, create new workspaces, and keep default Flowport and Flowknow packs handy for testing.
              </p>
            </div>
            <div className="flex-1 min-h-0 space-y-4 overflow-y-auto pr-1">
              <SidebarSection
                title="Knowledge bases"
                description="Select a workspace to browse documents."
              >
                <div className="space-y-3 text-xs">
                  {loadingList && <p className="text-slate-500 dark:text-slate-300">Loading knowledge bases…</p>}
                  {listError && <p className="text-red-500 dark:text-red-400">{listError}</p>}
                  {!loadingList && !listError && knowledgeBases.length === 0 && (
                    <p className="text-slate-500 dark:text-slate-300">No knowledge bases yet. Create one below.</p>
                  )}
                  <ul className="space-y-2">
                    {knowledgeBases.map((kb) => {
                      const selected = kb.id === selectedId
                      return (
                        <li key={kb.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedId(kb.id)
                              setSelectedDocumentId(null)
                            }}
                            className={`flex w-full flex-col gap-2 rounded-xl border px-3 py-3 text-left text-xs shadow-sm transition ${
                              selected
                                ? 'border-brand-400 bg-brand-500/10 text-brand-800 dark:border-brand-200/40 dark:bg-brand-300/10 dark:text-brand-50'
                                : 'border-slate-200/60 bg-white/70 text-slate-600 hover:border-brand-300 hover:text-brand-700 dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-200'
                            }`}
                          >
                            <span className="text-sm font-semibold text-slate-900 dark:text-white">{kb.name}</span>
                            {kb.description && <span className="text-[11px] text-slate-500 dark:text-slate-300">{kb.description}</span>}
                            <span className="text-[10px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
                              {kb.document_count} docs • {kb.chunk_count} chunks {kb.ready ? '' : '• rebuilding'}
                            </span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              </SidebarSection>

              <SidebarSection title="Create knowledge base" description="Set up a new workspace with a name and optional description.">
                <form onSubmit={handleCreateKnowledgeBase} className="space-y-3 text-xs">
                  <label className="block font-semibold text-slate-600 dark:text-slate-300">
                    Name
                    <input
                      type="text"
                      value={createName}
                      onChange={(event) => setCreateName(event.target.value)}
                      placeholder="Support library"
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
            </div>
          </div>
        )}
      </aside>

      <section className="flex flex-1 min-h-0 flex-col gap-4 overflow-hidden px-4 py-6">
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

        <div className="flex flex-1 min-h-0 gap-4 overflow-hidden">
          <div className="flex w-72 flex-col overflow-hidden rounded-3xl border border-slate-200/60 bg-white/90 shadow-sm dark:border-white/10 dark:bg-slate-950/60">
            <div className="border-b border-slate-200/60 px-5 py-4 dark:border-white/10">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Documents</h2>
              <p className="text-xs text-slate-500 dark:text-slate-300">
                {selectedId
                  ? 'Select a document to preview it and inspect extracted chunks.'
                  : 'Choose a knowledge base to browse its documents.'}
              </p>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4">
              {!selectedId && <p className="text-xs text-slate-500 dark:text-slate-300">No workspace selected yet.</p>}
              {selectedId && detailLoading && <p className="text-xs text-slate-500 dark:text-slate-300">Refreshing documents…</p>}
              {selectedId && detailError && <p className="text-xs text-red-500 dark:text-red-400">{detailError}</p>}
              {selectedId && detail && !detailLoading && !detailError && detail.documents.length === 0 && (
                <p className="text-xs text-slate-500 dark:text-slate-300">No documents uploaded yet. Use the upload tools on the right.</p>
              )}
              {selectedId && detail && detail.documents.length > 0 && (
                <ul className="space-y-3 text-xs">
                  {detail.documents.map((doc) => {
                    const active = doc.id === selectedDocumentId
                    return (
                      <li key={doc.id}>
                        <button
                          type="button"
                          onClick={() => handleDocumentSelect(doc.id)}
                          className={`w-full rounded-2xl border px-4 py-3 text-left shadow-sm transition ${
                            active
                              ? 'border-brand-400 bg-brand-100/50 text-brand-800 dark:border-brand-200/40 dark:bg-brand-300/10 dark:text-brand-50'
                              : 'border-slate-200/60 bg-white/80 text-slate-700 hover:border-brand-300 hover:text-brand-700 dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-200'
                          }`}
                        >
                          <div className="flex flex-col gap-1">
                            <span className="text-sm font-semibold text-slate-900 dark:text-white">{doc.title}</span>
                            {doc.original_filename && (
                              <span className="text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-400">
                                {doc.original_filename}
                              </span>
                            )}
                            <span className="text-[11px] text-slate-500 dark:text-slate-300">
                              {doc.chunk_count} chunks • {(doc.size_bytes / 1024).toFixed(1)} KB
                            </span>
                          </div>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </div>

          <div className="flex flex-1 min-h-0 flex-col overflow-hidden rounded-3xl border border-slate-200/60 bg-white/90 shadow-sm dark:border-white/10 dark:bg-slate-950/60">
            <div className="border-b border-slate-200/60 px-6 py-4 dark:border-white/10">
              {detail && selectedId ? (
                <div className="flex flex-col gap-1 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{detail.name}</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-300">
                      {detail.description || 'Browse documents and preview extracted content.'}
                    </p>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-300">
                    {detail.document_count} docs • {detail.chunk_count} chunks
                  </div>
                </div>
              ) : (
                <div>
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Document preview</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-300">Select a knowledge base to start exploring its files.</p>
                </div>
              )}
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 text-xs text-slate-600 dark:text-slate-300">
              {!selectedId && <p>Choose a workspace on the left to inspect its contents.</p>}
              {selectedId && documentLoading && <p>Loading document…</p>}
              {selectedId && !documentLoading && documentError && (
                <p className="text-red-500 dark:text-red-400">{documentError}</p>
              )}
              {selectedId && !documentLoading && !documentError && documentDetail && (
                <div className="space-y-4">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{documentDetail.title}</h3>
                      {documentDetail.original_filename && (
                        <p className="text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-400">
                          {documentDetail.original_filename}
                        </p>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-300">
                      {documentDetail.chunk_count} chunks • Created {formatDate(documentDetail.created_at)}
                    </span>
                  </div>
                  {documentDetail.file_available && previewUrl ? (
                    <div className="space-y-3">
                      <div className="overflow-hidden rounded-xl border border-slate-200/60 bg-white/90 dark:border-white/10 dark:bg-slate-950/50">
                        {documentDetail.media_type?.startsWith('image/') ? (
                          <img
                            src={previewUrl}
                            alt={documentDetail.title}
                            className="h-80 w-full object-contain bg-slate-200 dark:bg-slate-900"
                          />
                        ) : (
                          <iframe
                            src={previewUrl}
                            title={documentDetail.title}
                            className="h-80 w-full bg-white dark:bg-slate-950"
                          />
                        )}
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                        <span>{documentDetail.media_type}</span>
                        <a
                          href={previewUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="font-semibold text-brand-600 hover:text-brand-500 dark:text-brand-200 dark:hover:text-brand-100"
                        >
                          Open original
                        </a>
                      </div>
                    </div>
                  ) : null}
                  {documentDetail.chunks.length > 0 ? (
                    <div className="space-y-3">
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
                        Extracted chunks
                      </h4>
                      <div className="max-h-64 space-y-3 overflow-y-auto pr-1">
                        {documentDetail.chunks.map((chunk) => (
                          <article key={chunk.id} className="rounded-xl border border-slate-200/60 bg-slate-100/70 p-3 shadow-sm dark:border-white/10 dark:bg-slate-900/60">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                              Chunk {chunk.id.slice(0, 8)}…
                            </p>
                            <pre className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-slate-700 dark:text-slate-200">
                              {chunk.content}
                            </pre>
                          </article>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 dark:text-slate-300">No chunk data is available for this document yet.</p>
                  )}
                </div>
              )}
              {selectedId && !documentLoading && !documentError && !documentDetail && detail && detail.documents.length > 0 && (
                <p>Select a document from the list to preview its content.</p>
              )}
            </div>
          </div>
        </div>
      </section>

      <aside
        className={`relative hidden h-full min-h-0 flex-none overflow-hidden border-l border-slate-200/60 bg-white/70 p-4 transition-all duration-300 dark:border-white/10 dark:bg-slate-950/60 xl:flex xl:flex-col ${rightCollapsed ? 'w-16' : 'w-[22rem]'}`}
      >
        <button
          type="button"
          onClick={() => setRightCollapsed((value) => !value)}
          className="absolute -left-3 top-6 flex h-7 w-7 items-center justify-center rounded-full border border-slate-300/80 bg-white text-slate-500 shadow-sm transition hover:bg-slate-100 dark:border-white/20 dark:bg-slate-900 dark:text-slate-200"
          aria-label={rightCollapsed ? 'Expand upload panel' : 'Collapse upload panel'}
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
            <span className="rotate-90 whitespace-nowrap tracking-widest">Uploads</span>
            <span className="rotate-90 whitespace-nowrap tracking-widest">Flowknow</span>
          </div>
        ) : (
          <div className="flex h-full min-h-0 flex-col gap-4 overflow-hidden">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-brand-600 dark:text-brand-300">Upload files</h2>
              <p className="mt-1 text-xs text-slate-500 leading-relaxed dark:text-slate-300">
                Drop in documents to automatically build a RAG-ready vector database for the selected workspace. Side panels scroll while the playground stays fixed.
              </p>
            </div>
            <div className="flex-1 min-h-0 space-y-4 overflow-y-auto pr-1">
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

              <SidebarSection
                title="Upload documents"
                description="Attach PDFs, spreadsheets, presentations, or images. Each file is vectorised automatically."
              >
                <form className="space-y-3 text-xs" onSubmit={(event) => event.preventDefault()}>
                  <input
                    type="file"
                    accept=".txt,.md,.csv,.pdf,.png,.jpg,.jpeg,.pptx,.docx"
                    onChange={handleFileSelection}
                    multiple
                    disabled={uploading}
                    className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-500 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-slate-950 hover:file:bg-brand-400 disabled:file:opacity-60 dark:text-slate-300"
                  />
                  <p className="text-[11px] text-slate-400 dark:text-slate-400">
                    Add one or many files at once—the RAG database refreshes automatically so Flowport models can start chatting immediately.
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