import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useDark } from '../lib/useDark'

const navItems = [
  { to: '/', label: 'Home' },
  { to: '/workbench', label: 'Workbench' },
  { to: '/docs', label: 'Docs' },
]

export function Header() {
  const [dark, toggleDark] = useDark()
  const [open, setOpen] = useState(false)

  const itemClass = ({ isActive }: { isActive: boolean }) =>
    `block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
      isActive ? 'bg-white/10 text-white' : 'text-slate-200 hover:text-white hover:bg-white/10'
    }`

  const closeMenu = () => setOpen(false)

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/60 bg-slate-950/80 backdrop-blur">
      <div className="container-page px-4 flex h-16 items-center justify-between">
        <Link to="/" onClick={closeMenu} className="flex items-center gap-2 font-semibold tracking-wide uppercase text-brand-300">
          <img src="/logo.ico" alt="Flowknow" className="h-7 w-7 rounded" />
          Flowknow
        </Link>
        <nav className="hidden md:flex items-center gap-1 text-sm text-slate-200">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'} className={itemClass} onClick={closeMenu}>
              {item.label}
            </NavLink>
          ))}
          <a
            href="https://flowtomic.com"
            target="_blank"
            rel="noreferrer"
            className="ml-3 px-3 py-2 rounded-md border border-white/10 text-slate-100 hover:bg-white/10 text-sm"
          >
            Flowtomic
          </a>
          <button
            type="button"
            onClick={toggleDark}
            className="ml-2 px-3 py-2 text-sm rounded-md border border-white/20 text-slate-100 hover:bg-white/10"
          >
            {dark ? 'Light' : 'Dark'}
          </button>
        </nav>
        <div className="md:hidden flex items-center gap-2">
          <button
            type="button"
            onClick={toggleDark}
            className="px-3 py-2 text-sm rounded-md border border-white/20 text-slate-100 hover:bg-white/10"
          >
            {dark ? 'Light' : 'Dark'}
          </button>
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="p-2 rounded-md border border-white/20 text-slate-100"
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
        <div className="md:hidden border-b border-white/10 bg-slate-950/95 backdrop-blur">
          <nav className="px-4 py-3 flex flex-col gap-1 text-sm text-slate-200">
            {navItems.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.to === '/'} className={itemClass} onClick={() => setOpen(false)}>
                {item.label}
              </NavLink>
            ))}
            <a
              href="https://flowtomic.com"
              target="_blank"
              rel="noreferrer"
              className="block px-3 py-2 rounded-md text-sm text-slate-200 hover:text-white hover:bg-white/10"
            >
              Flowtomic
            </a>
          </nav>
        </div>
      )}
    </header>
  )
}