import { Link } from 'react-router-dom'
import { FeatureCard } from '../components/FeatureCard'
import { SectionHeading } from '../components/SectionHeading'

export default function Home() {
  const features = [
    {
      title: 'Unified ingestion',
      description:
        'Drag in PDFs, CSVs, and rich media or paste transcripts straight into Flowknow. We normalise, chunk, and store everything with a single workflow.',
    },
    {
      title: 'Automatic RAG databases',
      description:
        'Provide structured knowledge entries and Flowknow generates production-ready vector stores that Flowport can query instantly.',
    },
    {
      title: 'Flowtomic-native',
      description:
        'Flowknow shares the same design language and primitives as Flowgraph, Flowform, and Flowport so every team can collaborate on the same knowledge fabric.',
    },
  ]

  return (
    <div className="flex flex-col gap-24">
      <section className="container-page px-4">
        <div className="grid gap-12 md:grid-cols-2 md:items-center">
          <div className="flex flex-col gap-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-400/40 bg-brand-400/10 px-4 py-1 text-sm font-semibold uppercase text-brand-200">
              Flowtomic • Flowknow
            </span>
            <h1 className="text-4xl md:text-5xl font-semibold text-white leading-tight">
              Curate, enrich, and deploy knowledge bases for every Flowtomic experience.
            </h1>
            <p className="text-lg text-slate-300 leading-relaxed">
              Flowknow is the knowledge studio for Flowtomic teams. Compose RAG databases from files, datasets, and human-written briefs, then push them straight into Flowport-powered inference gateways.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Link to="/workbench" className="rounded-lg bg-brand-500 px-6 py-3 text-sm font-semibold text-slate-950 hover:bg-brand-400">
                Launch the workbench
              </Link>
              <a href="https://flowport.dev" className="text-sm font-medium text-brand-200 hover:text-brand-100" target="_blank" rel="noreferrer">
                Explore Flowport →
              </a>
            </div>
          </div>
          <div className="relative">
            <div className="absolute -top-6 -left-6 h-24 w-24 rounded-full bg-brand-400/20 blur-3xl" aria-hidden />
            <div className="relative rounded-3xl border border-white/10 bg-slate-900/60 p-6 shadow-soft">
              <h3 className="text-lg font-semibold text-white">Production-ready knowledge</h3>
              <p className="mt-3 text-sm text-slate-300 leading-relaxed">
                POST <code className="rounded bg-white/10 px-1">/knowledge-bases/auto-build</code> with structured entries or use the Flowknow UI to seed a workspace. Flowport can reference the resulting knowledge base immediately via <code className="rounded bg-white/10 px-1">knowledge_base_id</code>.
              </p>
              <pre className="mt-5 overflow-x-auto rounded-2xl bg-slate-950/70 p-4 text-xs text-brand-100 border border-white/10">
{`curl https://your-flowport-url/api/knowledge-bases/auto-build \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "flowknow-demo",
    "knowledge_items": [
      { "title": "Playbook", "content": "Focus on model reliability, governance, and traceability." }
    ]
  }'`}
              </pre>
            </div>
          </div>
        </div>
      </section>

      <section className="container-page px-4 flex flex-col items-center gap-12">
        <SectionHeading
          eyebrow="Why Flowknow"
          title="Build a shared knowledge fabric for Flowtomic apps"
          description="Flowknow gives product, support, and enablement teams a single place to assemble the context that powers Flowport, Flowgraph, Flowform, and Flowlang experiences."
        />
        <div className="grid gap-6 md:grid-cols-3">
          {features.map((feature) => (
            <FeatureCard key={feature.title} title={feature.title} description={feature.description} />
          ))}
        </div>
      </section>

      <section className="container-page px-4 flex flex-col items-center gap-10">
        <SectionHeading
          eyebrow="Integrations"
          title="Deliver better answers across Flowtomic"
          description="Once a knowledge pack is published in Flowknow it becomes instantly accessible to other Flow* experiences through Flowport’s inference gateway."
        />
        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              title: 'Flowport gateway',
              description: 'Attach Flowknow databases to Hugging Face models with a single identifier for grounded inference outputs.',
            },
            {
              title: 'Flowgraph automations',
              description: 'Feed orchestrated workflows with curated snippets and retrieval results to keep every branch on-message.',
            },
            {
              title: 'Flowform journeys',
              description: 'Power conversational forms, guided workflows, and support surfaces with the latest institutional knowledge.',
            },
          ].map((integration) => (
            <FeatureCard key={integration.title} title={integration.title} description={integration.description} />
          ))}
        </div>
      </section>
    </div>
  )
}