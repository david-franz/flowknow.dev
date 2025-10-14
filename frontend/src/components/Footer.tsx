import { Link } from 'react-router-dom'

export function Footer() {
  return (
    <footer className="mt-24 border-t border-white/10">
      <div className="container-page px-4 py-8 text-sm text-slate-400 flex flex-col md:flex-row items-center justify-between gap-3">
        <div>© {new Date().getFullYear()} Flowknow. Crafted by Flowtomic.</div>
        <div className="flex gap-4">
          <a className="hover:text-white" href="https://github.com/flowtomic" target="_blank" rel="noreferrer">
            GitHub
          </a>
          <Link className="hover:text-white" to="/docs">
            Docs
          </Link>
          <a className="hover:text-white" href="https://flowport.dev" target="_blank" rel="noreferrer">
            Flowport.dev
          </a>
        </div>
      </div>
    </footer>
  )
}