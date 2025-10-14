import { Link } from 'react-router-dom'

export function Footer() {
  return (
    <footer className="mt-24 border-t border-slate-200/60 bg-slate-100/40 dark:border-white/10 dark:bg-transparent">
      <div className="container-page px-4 py-8 text-sm text-slate-500 flex flex-col md:flex-row items-center justify-between gap-3 dark:text-slate-400">
        <div>© {new Date().getFullYear()} Flowknow. Crafted by Flowtomic.</div>
        <div className="flex gap-4">
          <a className="hover:text-slate-900 dark:hover:text-white" href="https://github.com/flowtomic" target="_blank" rel="noreferrer">
            GitHub
          </a>
          <Link className="hover:text-slate-900 dark:hover:text-white" to="/docs">
            Docs
          </Link>
          <a className="hover:text-slate-900 dark:hover:text-white" href="https://flowport.dev" target="_blank" rel="noreferrer">
            Flowport.dev
          </a>
        </div>
      </div>
    </footer>
  )
}