import { useEffect, useMemo, useState } from 'react'
import {
  FlowFormDefinition,
  FlowFormInstance,
  createFlowForm,
  reconcileFlowForm,
  updateFlowForm,
} from 'flowform'
import { FlowFormRenderer } from '../components/FlowFormRenderer'
import { SectionHeading } from '../components/SectionHeading'
import {
  KnowledgeBaseDetail,
  KnowledgeBaseSummary,
  createKnowledgeBase,
  autoBuildKnowledgeBase,
  ingestText,
  ingestFile,
  listKnowledgeBases,
  getKnowledgeBase,
} from '../lib/api'

interface WorkbenchProps {
  hfApiKey: string | null
  onApiKeyChange: (key: string | null) => void
}

const HF_STORAGE_KEY = 'flowknow:hf-api-key'

function useStoredApiKey(initial: string | null): [string, (key: string) => void] {
  const [key, setKey] = useState<string>(() => {
    if (initial) return initial
    if (typeof window === 'undefined') return ''
    return window.localStorage.getItem(HF_STORAGE_KEY) ?? ''
  })

  useEffect(() => {
    if (!initial) return
    setKey(initial)
  }, [initial])

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

function useFlowForm(definition: FlowFormDefinition, initial?: Record<string, unknown>) {
  const [form, setFormState] = useState<FlowFormInstance>(() => createFlowForm(definition, initial))

  useEffect(() => {
    setFormState((prev) => reconcileFlowForm(prev, definition, initial))
  }, [definition, initial])

  const handleChange = (fieldId: string, value: unknown) => {
    setFormState((prev) => updateFlowForm(prev, { [fieldId]: value }))
  }

  const reset = (nextInitial?: Record<string, unknown>) => {
    setFormState(createFlowForm(definition, nextInitial ?? initial))
  }

  return { form, handleChange, reset, setForm: setFormState }
}

export default function Workbench({ hfApiKey, onApiKeyChange }: WorkbenchProps) {
  const [storedKey, setStoredKey] = useStoredApiKey(hfApiKey)

  useEffect(() => {
    onApiKeyChange(storedKey || null)
  }, [storedKey, onApiKeyChange])

  const createDefinition = useMemo<FlowFormDefinition>(
    () => ({
      id: 'flowknow-create',
      sections: [
        {
          id: 'base',
          fields: [
            { id: 'name', label: 'Name', kind: 'text', required: true, placeholder: 'Support knowledge base' },
            { id: 'description', label: 'Description', kind: 'textarea', rows: 4, placeholder: 'Optional description' },
          ],
        },
      ],
    }),
    []
  )

  const autoDefinition = useMemo<FlowFormDefinition>(
    () => ({
      id: 'flowknow-auto',
      sections: [
        {
          id: 'meta',
          fields: [
            { id: 'name', label: 'Name', kind: 'text', required: true, placeholder: 'Flowknow starter pack' },
            { id: 'description', label: 'Description', kind: 'text', placeholder: 'Optional description' },
          ],
        },
        {
          id: 'content',
          title: 'Knowledge entries',
          description: 'Separate entries with a blank line. The first line becomes the title; the rest is treated as the body.',
          fields: [
            { id: 'entries', label: 'Entries', kind: 'textarea', rows: 8, required: true },
            { id: 'chunk_size', label: 'Chunk size', kind: 'number', defaultValue: 750, min: 100, max: 4000, step: 50, width: 'half' },
            { id: 'chunk_overlap', label: 'Overlap', kind: 'number', defaultValue: 50, min: 0, max: 500, step: 10, width: 'half' },
          ],
        },
      ],
    }),
    []
  )

  const textDefinition = useMemo<FlowFormDefinition>(
    () => ({
      id: 'flowknow-text',
      sections: [
        {
          id: 'text',
          fields: [
            { id: 'title', label: 'Title', kind: 'text', placeholder: 'Flowtomic FAQ' },
            {
              id: 'content',
              label: 'Content',
              kind: 'textarea',
              rows: 8,
              required: true,
              placeholder: 'Paste relevant text, transcripts, or SOPs here…',
            },
            { id: 'chunk_size', label: 'Chunk size', kind: 'number', defaultValue: 750, min: 100, max: 4000, step: 50, width: 'half' },
            { id: 'chunk_overlap', label: 'Overlap', kind: 'number', defaultValue: 50, min: 0, max: 500, step: 10, width: 'half' },
          ],
        },
      ],
    }),
    []
  )

  const uploadDefinition = useMemo<FlowFormDefinition>(
    () => ({
      id: 'flowknow-upload',
      sections: [
        {
          id: 'upload',
          fields: [
            { id: 'chunk_size', label: 'Chunk size', kind: 'number', defaultValue: 750, min: 100, max: 4000, step: 50, width: 'half' },
            { id: 'chunk_overlap', label: 'Overlap', kind: 'number', defaultValue: 50, min: 0, max: 500, step: 10, width: 'half' },
            {
              id: 'hf_api_key',
              label: 'Hugging Face API key',
              kind: 'password',
              placeholder: 'Optional key for image captioning',
            },
          ],
        },
      ],
    }),
    []
  )

  const createForm = useFlowForm(createDefinition)
  const autoForm = useFlowForm(autoDefinition)
  const textForm = useFlowForm(textDefinition)
  const uploadForm = useFlowForm(uploadDefinition, { chunk_size: 750, chunk_overlap: 50, hf_api_key: storedKey })
  const setUploadForm = uploadForm.setForm

  useEffect(() => {
    setUploadForm((prev) => reconcileFlowForm(prev, uploadDefinition, {
      chunk_size: prev.values.chunk_size ?? 750,
      chunk_overlap: prev.values.chunk_overlap ?? 50,
      hf_api_key: storedKey,
    }))
  }, [setUploadForm, storedKey, uploadDefinition])

  useEffect(() => {
    const currentKey = String(uploadForm.form.values.hf_api_key ?? '')
    if (currentKey !== storedKey) {
      setStoredKey(currentKey)
    }
  }, [uploadForm.form.values.hf_api_key, setStoredKey, storedKey])

  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBaseSummary[]>([])
  const [loadingList, setLoadingList] = useState<boolean>(true)
  const [listError, setListError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<KnowledgeBaseDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState<boolean>(false)
  const [detailError, setDetailError] = useState<string | null>(null)

  const [createMessage, setCreateMessage] = useState<string | null>(null)
  const [autoMessage, setAutoMessage] = useState<string | null>(null)
  const [textMessage, setTextMessage] = useState<string | null>(null)
  const [uploadMessage, setUploadMessage] = useState<string | null>(null)
  const [leftOpen, setLeftOpen] = useState(true)
  const [rightOpen, setRightOpen] = useState(true)

  async function refreshKnowledgeBases(targetId?: string, currentSelected?: string | null) {
    setLoadingList(true)
    setListError(null)
    try {
      const data = await listKnowledgeBases()
      setKnowledgeBases(data)
      if (data.length > 0) {
        const nextId = targetId ?? currentSelected ?? selectedId ?? data[0].id
        setSelectedId(nextId)
      } else {
        setSelectedId(null)
        setDetail(null)
      }
    } catch (err) {
      setListError(err instanceof Error ? err.message : 'Unable to load knowledge bases')
    } finally {
      setLoadingList(false)
    }
  }

  async function loadDetail(id: string) {
    setDetailLoading(true)
    setDetailError(null)
    try {
      const data = await getKnowledgeBase(id)
      setDetail(data)
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : 'Unable to load knowledge base detail')
    } finally {
      setDetailLoading(false)
    }
  }

  useEffect(() => {
    refreshKnowledgeBases(undefined, null).catch(() => undefined)
  }, [])

  useEffect(() => {
    if (!selectedId) return
    loadDetail(selectedId).catch(() => undefined)
  }, [selectedId])

  async function handleCreate() {
    setCreateMessage(null)
    const name = String(createForm.form.values.name ?? '').trim()
    const description = String(createForm.form.values.description ?? '').trim() || undefined
    if (!name) {
      setCreateMessage('Name is required')
      return
    }
    setCreateMessage('Creating knowledge base…')
    try {
      const created = await createKnowledgeBase({ name, description })
      setCreateMessage('Knowledge base created successfully')
      createForm.reset()
      await refreshKnowledgeBases(created.id, selectedId)
    } catch (err) {
      setCreateMessage(err instanceof Error ? err.message : 'Failed to create knowledge base')
    }
  }

  async function handleAutoBuild() {
    setAutoMessage(null)
    const name = String(autoForm.form.values.name ?? '').trim()
    const description = String(autoForm.form.values.description ?? '').trim() || undefined
    const entries = String(autoForm.form.values.entries ?? '').trim()
    if (!name || !entries) {
      setAutoMessage('Provide a name and at least one entry')
      return
    }
    const blocks = entries.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean)
    const knowledgeItems = blocks.map((block) => {
      const [first, ...rest] = block.split('\n')
      const title = (first ?? 'Entry').trim()
      const content = rest.join('\n').trim() || title
      return {
        title,
        content,
        chunk_size: Number(autoForm.form.values.chunk_size ?? 750),
        chunk_overlap: Number(autoForm.form.values.chunk_overlap ?? 50),
      }
    })
    if (knowledgeItems.length === 0) {
      setAutoMessage('Unable to parse knowledge entries')
      return
    }
    setAutoMessage('Building knowledge base…')
    try {
      const created = await autoBuildKnowledgeBase({
        name,
        description,
        knowledge_items: knowledgeItems,
        chunk_size: Number(autoForm.form.values.chunk_size ?? 750),
        chunk_overlap: Number(autoForm.form.values.chunk_overlap ?? 50),
      })
      setAutoMessage('Knowledge base generated successfully')
      autoForm.reset()
      await refreshKnowledgeBases(created.id, selectedId)
    } catch (err) {
      setAutoMessage(err instanceof Error ? err.message : 'Failed to auto-build knowledge base')
    }
  }

  async function handleTextIngest() {
    if (!selectedId) {
      setTextMessage('Select a knowledge base first')
      return
    }
    const title = String(textForm.form.values.title ?? '').trim() || 'Untitled'
    const content = String(textForm.form.values.content ?? '').trim()
    if (!content) {
      setTextMessage('Content is required')
      return
    }
    setTextMessage('Ingesting text…')
    try {
      await ingestText(selectedId, {
        title,
        content,
        chunk_size: Number(textForm.form.values.chunk_size ?? 750),
        chunk_overlap: Number(textForm.form.values.chunk_overlap ?? 50),
      })
      setTextMessage('Text ingested successfully')
      textForm.reset()
      await loadDetail(selectedId)
      await refreshKnowledgeBases(selectedId, selectedId)
    } catch (err) {
      setTextMessage(err instanceof Error ? err.message : 'Failed to ingest text')
    }
  }

  async function handleFileUpload(fileList: FileList | null) {
    if (!selectedId) {
      setUploadMessage('Select a knowledge base first')
      return
    }
    if (!fileList || fileList.length === 0) {
      return
    }
    const file = fileList[0]
    setUploadMessage(`Uploading ${file.name}…`)
    try {
      await ingestFile(selectedId, file, {
        chunk_size: Number(uploadForm.form.values.chunk_size ?? 750),
        chunk_overlap: Number(uploadForm.form.values.chunk_overlap ?? 50),
        hf_api_key: storedKey || undefined,
      })
      setUploadMessage(`${file.name} ingested successfully`)
      await loadDetail(selectedId)
      await refreshKnowledgeBases(selectedId, selectedId)
    } catch (err) {
      setUploadMessage(err instanceof Error ? err.message : 'File upload failed')
    }
  }

  return (
    <div className="container-page px-4 flex flex-col gap-10">
      <SectionHeading
        eyebrow="Knowledge workbench"
        title="Manage Flowknow knowledge bases"
        description="Curate datasets, ingest files, and auto-build retrieval-ready stores that Flowport can query in production."
        align="left"
      />

      <div className="flex flex-col gap-6 xl:flex-row">
        <aside
          className={`relative rounded-3xl border border-slate-200/60 bg-white/80 p-4 transition-all duration-200 dark:border-white/10 dark:bg-slate-900/40 ${
            leftOpen ? 'xl:w-72' : 'xl:w-14'
          }`}
        >
          <button
            type="button"
            onClick={() => setLeftOpen((value) => !value)}
            className="absolute -right-3 top-4 hidden xl:inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-300/60 bg-white text-slate-600 shadow-sm hover:bg-slate-100 dark:border-white/20 dark:bg-slate-800 dark:text-slate-200"
            aria-label={leftOpen ? 'Collapse left panel' : 'Expand left panel'}
          >
            <svg className={`h-3 w-3 transition-transform ${leftOpen ? '' : 'rotate-180'}`} viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M12.293 15.707a1 1 0 010-1.414L14.586 12H5a1 1 0 110-2h9.586l-2.293-2.293a1 1 0 111.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </button>
          <div className={`${leftOpen ? 'space-y-4' : 'hidden xl:block xl:h-full xl:w-full xl:opacity-0'}`}>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">Workspace tips</h3>
            <p className="text-sm text-slate-600 leading-relaxed dark:text-slate-300">
              Treat Flowknow workspaces like product playbooks. Upload assets, paste transcripts, and auto-build packs to keep Flowport responses
              grounded.
            </p>
            <div className="rounded-2xl border border-slate-200/60 bg-white/80 p-4 text-sm text-slate-600 dark:border-white/10 dark:bg-slate-950/40 dark:text-slate-300">
              Need a fresh knowledge base? Use the auto-build form to paste structured notes and generate a production-ready index instantly.
            </div>
          </div>
        </aside>

        <div className="flex-1 flex flex-col gap-16">
          <section className="rounded-3xl border border-slate-200/60 bg-white/80 p-6 md:p-8 flex flex-col gap-6 dark:border-white/10 dark:bg-slate-900/40">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white">Knowledge bases</h3>
            <p className="text-sm text-slate-600 dark:text-slate-300">Select a workspace to view its documents and ingest new material.</p>
          </div>
          <button
            type="button"
            onClick={() => refreshKnowledgeBases(undefined, selectedId).catch(() => undefined)}
            className="inline-flex items-center gap-2 rounded-md border border-slate-300/60 px-4 py-2 text-sm text-slate-600 hover:bg-slate-100/60 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/10"
          >
            Refresh
          </button>
        </header>
        {loadingList && <p className="text-sm text-slate-500 dark:text-slate-400">Loading knowledge bases…</p>}
        {listError && <p className="text-sm text-red-500 dark:text-red-400">{listError}</p>}
        {!loadingList && !listError && knowledgeBases.length === 0 && (
          <p className="text-sm text-slate-500 dark:text-slate-400">No knowledge bases yet—create one using the forms below.</p>
        )}
        <div className="grid gap-4 md:grid-cols-2">
          {knowledgeBases.map((kb) => {
            const isSelected = kb.id === selectedId
            return (
              <article
                key={kb.id}
                className={`rounded-2xl border p-5 transition ${
                  isSelected
                    ? 'border-brand-400 bg-brand-400/10 shadow-lg'
                    : 'border-slate-200/60 bg-white/80 dark:border-white/10 dark:bg-slate-950/40'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-lg font-semibold text-slate-900 dark:text-white">{kb.name}</h4>
                    {kb.description && <p className="text-sm text-slate-600 mt-1 dark:text-slate-300">{kb.description}</p>}
                    <p className="mt-3 text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      {kb.source === 'prebuilt' ? 'Prebuilt' : 'User'} • {kb.document_count} docs • {kb.chunk_count} chunks
                    </p>
                    {!kb.ready && <p className="mt-2 text-xs text-amber-500 dark:text-amber-300">Index rebuilding… new content will be searchable shortly.</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedId(kb.id)}
                    className={`rounded-md border px-3 py-1 text-xs font-semibold transition ${
                      isSelected
                        ? 'border-brand-400 text-brand-700 bg-brand-100 dark:text-brand-100 dark:bg-brand-500/20'
                        : 'border-slate-300/60 text-slate-600 hover:bg-slate-100/60 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/10'
                    }`}
                  >
                    {isSelected ? 'Selected' : 'Select'}
                  </button>
                </div>
              </article>
            )
          })}
        </div>
        {detail && (
          <div className="rounded-2xl border border-slate-200/60 bg-white/80 p-5 dark:border-white/10 dark:bg-slate-950/40">
            <h4 className="text-lg font-semibold text-slate-900 dark:text-white">Documents</h4>
            {detailLoading && <p className="text-sm text-slate-500 mt-3 dark:text-slate-400">Refreshing documents…</p>}
            {detailError && <p className="text-sm text-red-500 mt-3 dark:text-red-400">{detailError}</p>}
            {!detailLoading && !detailError && detail.documents.length === 0 && (
              <p className="text-sm text-slate-500 mt-3 dark:text-slate-400">No documents yet—ingest text or upload a file to get started.</p>
            )}
            <ul className="mt-4 space-y-3">
              {detail.documents.map((doc) => (
                <li key={doc.id} className="rounded-lg border border-slate-200/60 bg-white/80 p-4 text-sm text-slate-700 dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-200">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                    <span className="font-semibold text-slate-900 dark:text-white">{doc.title}</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">{doc.chunk_count} chunks · {(doc.size_bytes / 1024).toFixed(1)} KB</span>
                  </div>
                  {doc.original_filename && <p className="text-xs text-slate-500 mt-1 dark:text-slate-400">{doc.original_filename}</p>}
                </li>
              ))}
            </ul>
          </div>
        )}
          </section>

          <section className="grid gap-8 md:grid-cols-2">
            <div className="rounded-3xl border border-slate-200/60 bg-white/80 p-6 md:p-8 flex flex-col gap-5 dark:border-white/10 dark:bg-slate-900/40">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Create a knowledge base</h3>
          <FlowFormRenderer form={createForm.form} onChange={createForm.handleChange} />
          <button
            type="button"
            onClick={handleCreate}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-brand-400"
          >
            Create knowledge base
          </button>
          {createMessage && <p className="text-xs text-slate-600 dark:text-slate-300">{createMessage}</p>}
            </div>

            <div className="rounded-3xl border border-slate-200/60 bg-white/80 p-6 md:p-8 flex flex-col gap-5 dark:border-white/10 dark:bg-slate-900/40">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Auto-build from knowledge entries</h3>
          <FlowFormRenderer form={autoForm.form} onChange={autoForm.handleChange} />
          <button
            type="button"
            onClick={handleAutoBuild}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-brand-400"
          >
            Generate knowledge base
          </button>
          {autoMessage && <p className="text-xs text-slate-600 dark:text-slate-300">{autoMessage}</p>}
            </div>
          </section>

          <section className="grid gap-8 md:grid-cols-2">
            <div className="rounded-3xl border border-slate-200/60 bg-white/80 p-6 md:p-8 flex flex-col gap-5 dark:border-white/10 dark:bg-slate-900/40">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Ingest free-form text</h3>
          <FlowFormRenderer form={textForm.form} onChange={textForm.handleChange} />
          <button
            type="button"
            onClick={handleTextIngest}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-brand-400"
          >
            Add text to knowledge base
          </button>
          {textMessage && <p className="text-xs text-slate-600 dark:text-slate-300">{textMessage}</p>}
            </div>

            <div className="rounded-3xl border border-slate-200/60 bg-white/80 p-6 md:p-8 flex flex-col gap-5 dark:border-white/10 dark:bg-slate-900/40">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Upload a file</h3>
          <FlowFormRenderer
            form={uploadForm.form}
            onChange={uploadForm.handleChange}
            renderFieldDescription={(field) =>
              field.id === 'hf_api_key'
                ? 'Required only when captioning images via Hugging Face.'
                : undefined
            }
          />
          <div className="flex flex-col gap-2">
            <input
              type="file"
              accept=".txt,.md,.csv,.pdf,.png,.jpg,.jpeg"
              onChange={(event) => handleFileUpload(event.target.files)}
              className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-md file:border-0 file:bg-brand-500 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-slate-950 hover:file:bg-brand-400 dark:text-slate-300"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Supports TXT, CSV, PDF, PNG, and JPEG. Flowknow will caption images automatically when a Hugging Face key is provided.
            </p>
          </div>
          {uploadMessage && <p className="text-xs text-slate-600 dark:text-slate-300">{uploadMessage}</p>}
            </div>
          </section>
        </div>

        <aside
          className={`relative rounded-3xl border border-slate-200/60 bg-white/80 p-4 transition-all duration-200 dark:border-white/10 dark:bg-slate-900/40 ${
            rightOpen ? 'xl:w-72' : 'xl:w-14'
          }`}
        >
          <button
            type="button"
            onClick={() => setRightOpen((value) => !value)}
            className="absolute -left-3 top-4 hidden xl:inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-300/60 bg-white text-slate-600 shadow-sm hover:bg-slate-100 dark:border-white/20 dark:bg-slate-800 dark:text-slate-200"
            aria-label={rightOpen ? 'Collapse right panel' : 'Expand right panel'}
          >
            <svg className={`h-3 w-3 transition-transform ${rightOpen ? '' : 'rotate-180'}`} viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M7.707 4.293a1 1 0 010 1.414L5.414 8H15a1 1 0 110 2H5.414l2.293 2.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </button>
          <div className={`${rightOpen ? 'space-y-4' : 'hidden xl:block xl:h-full xl:w-full xl:opacity-0'}`}>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">Resources</h3>
            <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
              <li>
                <a className="text-brand-600 hover:text-brand-500 dark:text-brand-300 dark:hover:text-brand-200" href="https://flowport.dev" target="_blank" rel="noreferrer">
                  Test knowledge in Flowport
                </a>
              </li>
              <li>
                <a className="text-brand-600 hover:text-brand-500 dark:text-brand-300 dark:hover:text-brand-200" href="https://flowtomic.ai" target="_blank" rel="noreferrer">
                  Flowtomic roadmap
                </a>
              </li>
              <li>
                <a className="text-brand-600 hover:text-brand-500 dark:text-brand-300 dark:hover:text-brand-200" href="https://github.com/flowtomic" target="_blank" rel="noreferrer">
                  GitHub organisation
                </a>
              </li>
            </ul>
            <div className="rounded-2xl border border-slate-200/60 bg-white/80 p-4 text-sm text-slate-600 dark:border-white/10 dark:bg-slate-950/40 dark:text-slate-300">
              Capture captions for images by providing your Hugging Face key in the upload form—Flowknow handles inference automatically.
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}