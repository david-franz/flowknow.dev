import { SectionHeading } from '../components/SectionHeading'

export default function Docs() {
  return (
    <div className="container-page px-4 flex flex-col gap-14">
      <SectionHeading
        eyebrow="Documentation"
        title="Flowknow API overview"
        description="Flowknow exposes endpoints for creating, enriching, and packaging knowledge bases that Flowport can query."
        align="left"
      />

      <article className="grid gap-12">
        <section className="rounded-3xl border border-slate-200/60 bg-white/80 p-6 md:p-8 dark:border-white/10 dark:bg-slate-900/40">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Authentication</h3>
          <p className="mt-3 text-sm text-slate-600 leading-relaxed dark:text-slate-300">
            Flowknow shares the same FastAPI backend as Flowport. Supply your <code className="rounded bg-slate-200/70 px-1 text-slate-700 dark:bg-white/10 dark:text-brand-100">hf_xxx</code> key when
            uploading images so we can caption them with a Hugging Face model. Other ingestion routes do not require the key.
          </p>
        </section>

        <section className="rounded-3xl border border-slate-200/60 bg-white/80 p-6 md:p-8 dark:border-white/10 dark:bg-slate-900/40">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Endpoints</h3>
          <ul className="mt-4 space-y-4 text-sm text-slate-600 leading-relaxed dark:text-slate-300">
            <li>
              <code className="rounded bg-slate-200/70 px-2 py-1 text-xs text-slate-700 dark:bg-white/10 dark:text-brand-100">POST /api/knowledge-bases</code> — create a new workspace.
            </li>
            <li>
              <code className="rounded bg-slate-200/70 px-2 py-1 text-xs text-slate-700 dark:bg-white/10 dark:text-brand-100">POST /api/knowledge-bases/auto-build</code> — generate a
              knowledge base automatically from structured entries.
            </li>
            <li>
              <code className="rounded bg-slate-200/70 px-2 py-1 text-xs text-slate-700 dark:bg-white/10 dark:text-brand-100">POST /api/knowledge-bases/{'{id}'}/ingest/text</code> — ingest
              pasted text with configurable chunking parameters.
            </li>
            <li>
              <code className="rounded bg-slate-200/70 px-2 py-1 text-xs text-slate-700 dark:bg-white/10 dark:text-brand-100">POST /api/knowledge-bases/{'{id}'}/ingest/file</code> — upload files
              (TXT, CSV, PDF, PNG, JPEG). Provide a Hugging Face key in the form data to enable automatic captioning for images.
            </li>
            <li>
              <code className="rounded bg-slate-200/70 px-2 py-1 text-xs text-slate-700 dark:bg-white/10 dark:text-brand-100">GET /api/knowledge-bases</code> — list all knowledge bases, ready to
              be referenced from Flowport.
            </li>
          </ul>
        </section>

        <section className="rounded-3xl border border-slate-200/60 bg-white/80 p-6 md:p-8 dark:border-white/10 dark:bg-slate-900/40">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Quick start</h3>
          <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm text-slate-600 leading-relaxed dark:text-slate-300">
            <li>Create a knowledge base using the Flowknow workbench.</li>
            <li>Upload files or paste text to enrich the workspace. Use auto-build when you have structured content.</li>
            <li>Head to Flowport.dev, choose a Hugging Face model, and reference the Flowknow knowledge base via its identifier.</li>
            <li>Iterate as your content grows—Flowknow rebuilds the vector index automatically on each ingest.</li>
          </ol>
        </section>
      </article>
    </div>
  )
}