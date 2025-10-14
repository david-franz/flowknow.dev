import { ChangeEvent } from 'react'
import { FlowFormFieldDefinition, FlowFormInstance } from 'flowform'

interface FlowFormRendererProps {
  form: FlowFormInstance
  onChange: (fieldId: string, value: unknown) => void
  renderFieldDescription?: (field: FlowFormFieldDefinition) => string | undefined
}

function renderInputType(kind: FlowFormFieldDefinition['kind']): string {
  switch (kind) {
    case 'email':
    case 'url':
    case 'password':
    case 'number':
    case 'date':
    case 'time':
    case 'color':
      return kind
    default:
      return 'text'
  }
}

function fieldWidthClass(width?: FlowFormFieldDefinition['width']): string {
  switch (width) {
    case 'half':
      return 'md:col-span-1'
    case 'third':
      return 'md:col-span-1'
    default:
      return 'md:col-span-2'
  }
}

export function FlowFormRenderer({ form, onChange, renderFieldDescription }: FlowFormRendererProps) {
  return (
    <div className="flex flex-col gap-8">
      {form.definition.sections.map((section) => (
        <div key={section.id} className="flex flex-col gap-4">
          {(section.title || section.description) && (
            <header className="flex flex-col gap-2">
              {section.title && <h3 className="text-lg font-semibold text-white">{section.title}</h3>}
              {section.description && <p className="text-sm text-slate-300">{section.description}</p>}
            </header>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            {section.fields.map((field) => {
              const value = form.values[field.id] ?? ''
              const description = renderFieldDescription?.(field) ?? field.description

              if (field.kind === 'textarea') {
                return (
                  <label key={field.id} className={`flex flex-col gap-2 ${fieldWidthClass(field.width)}`}>
                    <span className="text-sm text-slate-300">
                      {field.label}
                      {field.required && <span className="ml-1 text-red-300">*</span>}
                    </span>
                    <textarea
                      value={String(value ?? '')}
                      onChange={(event) => onChange(field.id, event.target.value)}
                      placeholder={field.placeholder}
                      rows={field.rows ?? 4}
                      className="min-h-[120px] rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white focus:border-brand-400 focus:outline-none"
                    />
                    {description && <span className="text-xs text-slate-400">{description}</span>}
                  </label>
                )
              }

              if (field.kind === 'select' || field.kind === 'multiselect') {
                return (
                  <label key={field.id} className={`flex flex-col gap-2 ${fieldWidthClass(field.width)}`}>
                    <span className="text-sm text-slate-300">
                      {field.label}
                      {field.required && <span className="ml-1 text-red-300">*</span>}
                    </span>
                    <select
                      multiple={field.kind === 'multiselect'}
                      value={
                        field.kind === 'multiselect'
                          ? ((value as string[] | undefined) ?? [])
                          : String(value ?? '')
                      }
                      onChange={(event) => {
                        if (field.kind === 'multiselect') {
                          const options = Array.from(event.target.selectedOptions).map((opt) => opt.value)
                          onChange(field.id, options)
                        } else {
                          onChange(field.id, event.target.value)
                        }
                      }}
                      className="rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white focus:border-brand-400 focus:outline-none"
                    >
                      {field.kind === 'select' && !field.required && field.options?.every((option) => option.value !== '') && (
                        <option value="">Select an option</option>
                      )}
                      {field.options?.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    {description && <span className="text-xs text-slate-400">{description}</span>}
                  </label>
                )
              }

              if (field.kind === 'checkbox' || field.kind === 'switch') {
                return (
                  <label key={field.id} className={`flex items-center gap-3 ${fieldWidthClass(field.width)}`}>
                    <input
                      type="checkbox"
                      checked={Boolean(value)}
                      onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(field.id, event.target.checked)}
                      className="h-4 w-4 rounded border-white/30 bg-slate-950"
                    />
                    <span className="text-sm text-slate-300">
                      {field.label}
                      {description && <span className="block text-xs text-slate-400">{description}</span>}
                    </span>
                  </label>
                )
              }

              if (field.kind === 'slider') {
                return (
                  <label key={field.id} className={`flex flex-col gap-2 ${fieldWidthClass(field.width)}`}>
                    <span className="text-sm text-slate-300">{field.label}</span>
                    <input
                      type="range"
                      value={Number(value ?? field.min ?? 0)}
                      min={field.min}
                      max={field.max}
                      step={field.step ?? 1}
                      onChange={(event) => onChange(field.id, Number(event.target.value))}
                    />
                    <span className="text-xs text-slate-400">{String(value)}</span>
                  </label>
                )
              }

              return (
                <label key={field.id} className={`flex flex-col gap-2 ${fieldWidthClass(field.width)}`}>
                  <span className="text-sm text-slate-300">
                    {field.label}
                    {field.required && <span className="ml-1 text-red-300">*</span>}
                  </span>
                  <input
                    type={renderInputType(field.kind)}
                    value={
                      field.kind === 'number'
                        ? value === undefined || value === null
                          ? ''
                          : String(value)
                        : String(value ?? '')
                    }
                    onChange={(event) =>
                      onChange(field.id, field.kind === 'number' ? Number(event.target.value) : event.target.value)
                    }
                    placeholder={field.placeholder}
                    min={field.kind === 'number' ? field.min : undefined}
                    max={field.kind === 'number' ? field.max : undefined}
                    step={field.kind === 'number' ? field.step : undefined}
                    className="rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white focus:border-brand-400 focus:outline-none"
                  />
                  {description && <span className="text-xs text-slate-400">{description}</span>}
                </label>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}