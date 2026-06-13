export default function MetricCard({ label, value, unit, icon: Icon, color = '#6366f1', sub }) {
  return (
    <div className="card p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</span>
        {Icon && <Icon size={16} style={{ color }} />}
      </div>
      <div className="flex items-end gap-1.5">
        <span className="text-3xl font-bold text-white leading-none">{value ?? '—'}</span>
        {unit && <span className="text-sm text-slate-500 mb-0.5">{unit}</span>}
      </div>
      {sub && <span className="text-xs text-slate-600">{sub}</span>}
    </div>
  )
}
