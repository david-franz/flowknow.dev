import { ReactNode } from 'react'

interface FeatureCardProps {
  title: string
  description: ReactNode
  icon?: ReactNode
}

export function FeatureCard({ title, description, icon }: FeatureCardProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-6 shadow-soft flex flex-col gap-4">
      {icon && <div className="text-brand-400">{icon}</div>}
      <h3 className="text-xl font-semibold text-white">{title}</h3>
      <div className="text-sm md:text-base text-slate-300 leading-relaxed">{description}</div>
    </div>
  )
}