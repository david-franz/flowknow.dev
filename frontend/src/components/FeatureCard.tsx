import { ReactNode } from 'react'

interface FeatureCardProps {
  title: string
  description: ReactNode
  icon?: ReactNode
}

export function FeatureCard({ title, description, icon }: FeatureCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200/60 bg-white/80 p-6 shadow-soft flex flex-col gap-4 dark:border-white/10 dark:bg-slate-900/50">
      {icon && <div className="text-brand-500 dark:text-brand-400">{icon}</div>}
      <h3 className="text-xl font-semibold text-slate-900 dark:text-white">{title}</h3>
      <div className="text-sm md:text-base text-slate-600 leading-relaxed dark:text-slate-300">{description}</div>
    </div>
  )
}