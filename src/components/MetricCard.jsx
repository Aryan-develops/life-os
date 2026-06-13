export default function MetricCard({ label, value, unit, icon: Icon, color = '#6366f1', sub, trend }) {
  return (
    <div className="card card-hover" style={{ padding: '20px 22px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <span className="section-title">{label}</span>
        {Icon && (
          <div style={{
            width: 32, height: 32, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: `${color}18`,
          }}>
            <Icon size={15} color={color} />
          </div>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, marginBottom: 6 }}>
        <span className="stat-value" style={{ color: value != null ? '#fff' : '#2d3748' }}>
          {value ?? '—'}
        </span>
        {unit && value != null && (
          <span style={{ fontSize: 12, color: '#475569', marginBottom: 3 }}>{unit}</span>
        )}
      </div>
      {sub && <div style={{ fontSize: 12, color: '#475569' }}>{sub}</div>}
      {trend != null && (
        <div style={{ fontSize: 11, color: trend >= 0 ? '#22c55e' : '#ef4444', marginTop: 4, fontWeight: 600 }}>
          {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}% vs last week
        </div>
      )}
    </div>
  )
}
