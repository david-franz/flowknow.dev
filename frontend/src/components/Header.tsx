import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useDark } from '../lib/useDark'

const navItems = [
  { to: '/', label: 'Home' },
  { to: '/docs', label: 'Docs' },
  { to: '/workbench', label: 'Workbench' },
]

export function Header() {
  const [dark, toggleDark] = useDark()
  const [open, setOpen] = useState(false)

  const itemClass = ({ isActive }: { isActive: boolean }) =>
    `block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
      isActive
        ? 'bg-brand-500/10 text-brand-700 dark:bg-white/10 dark:text-white'
        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60 dark:text-slate-200 dark:hover:text-white dark:hover:bg-white/10'
    }`

  const closeMenu = () => setOpen(false)

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/40 bg-white/80 backdrop-blur dark:border-slate-800/60 dark:bg-slate-950/80">
      <div className="container-page px-4 flex h-16 items-center justify-between">
        <Link to="/" onClick={closeMenu} className="flex items-center gap-2 font-semibold tracking-wide uppercase text-brand-600 dark:text-brand-300">
          <img src="/logo.ico" alt="Flowknow" className="h-7 w-7 rounded" />
          Flowknow
        </Link>
        <nav className="hidden md:flex items-center gap-1 text-sm text-slate-600 dark:text-slate-200">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'} className={itemClass} onClick={closeMenu}>
              {item.label}
            </NavLink>
          ))}
          <a
            href="https://flowtomic.ai"
            target="_blank"
            rel="noreferrer"
            className="ml-3 inline-flex items-center gap-2 rounded-md border border-slate-300/40 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100/60 dark:border-white/10 dark:text-slate-100 dark:hover:bg-white/10"
          >
            Flowtomic.ai
          </a>
          <button
            type="button"
            onClick={toggleDark}
            className="ml-2 px-3 py-2 text-sm rounded-md border border-slate-300/60 text-slate-600 hover:bg-slate-100/60 dark:border-white/20 dark:text-slate-100 dark:hover:bg-white/10"
          >
            {dark ? 'Light' : 'Dark'}
          </button>
        </nav>
        <div className="md:hidden flex items-center gap-2">
          <button
            type="button"
            onClick={toggleDark}
            className="px-3 py-2 text-sm rounded-md border border-slate-300/60 text-slate-600 hover:bg-slate-100/60 dark:border-white/20 dark:text-slate-100 dark:hover:bg-white/10"
          >
            {dark ? 'Light' : 'Dark'}
          </button>
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="p-2 rounded-md border border-slate-300/60 text-slate-600 dark:border-white/20 dark:text-slate-100"
            aria-expanded={open}
            aria-label="Toggle navigation menu"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M3 5h14a1 1 0 010 2H3a1 1 0 110-2zm0 4h14a1 1 0 010 2H3a1 1 0 110-2zm0 4h14a1 1 0 010 2H3a1 1 0 110-2z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
      {open && (
        <div className="md:hidden border-b border-slate-200/60 bg-white/95 backdrop-blur dark:border-white/10 dark:bg-slate-950/95">
          <nav className="px-4 py-3 flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-200">
            {navItems.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.to === '/'} className={itemClass} onClick={() => setOpen(false)}>
                {item.label}
              </NavLink>
            ))}
            <a
              href="https://flowtomic.ai"
              target="_blank"
              rel="noreferrer"
              className="block px-3 py-2 rounded-md text-sm text-slate-600 hover:bg-slate-100/60 dark:text-slate-200 dark:hover:text-white dark:hover:bg-white/10"
            >
              Flowtomic.ai
            </a>
          </nav>
        </div>
      )}
    </header>
  )
}