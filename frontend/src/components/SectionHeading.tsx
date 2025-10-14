import { ReactNode } from 'react'

interface SectionHeadingProps {
  eyebrow?: string
  title: string
  description?: ReactNode
  align?: 'left' | 'center'
}

export function SectionHeading({ eyebrow, title, description, align = 'center' }: SectionHeadingProps) {
  const alignClass = align === 'center' ? 'text-center mx-auto' : 'text-left'

  return (
    <div className={`max-w-3xl ${alignClass} flex flex-col gap-3`}>
      {eyebrow && <span className="text-sm font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-300/80">{eyebrow}</span>}
      <h2 className="text-3xl md:text-4xl font-semibold text-slate-900 dark:text-white">{title}</h2>
      {description && <p className="text-base md:text-lg text-slate-600 leading-relaxed dark:text-slate-300">{description}</p>}
    </div>
  )
}