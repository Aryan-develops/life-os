import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Moon, Heart, Dumbbell, Apple,
  Target, Briefcase, Wallet, Zap, Link2
} from 'lucide-react'

const nav = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', color: '#818cf8' },
  { to: '/sleep', icon: Moon, label: 'Sleep', color: '#a78bfa' },
  { to: '/heart', icon: Heart, label: 'Heart', color: '#f87171' },
  { to: '/fitness', icon: Dumbbell, label: 'Fitness', color: '#fbbf24' },
  { to: '/nutrition', icon: Apple, label: 'Nutrition', color: '#34d399' },
  { to: '/goals', icon: Target, label: 'Goals', color: '#60a5fa' },
  { to: '/business', icon: Briefcase, label: 'Business', color: '#c084fc' },
  { to: '/finances', icon: Wallet, label: 'Finances', color: '#4ade80' },
  { to: '/integrations', icon: Link2, label: 'Integrations', color: '#38bdf8' },
]

export default function Sidebar() {
  return (
    <aside style={{
      position: 'fixed', left: 0, top: 0, height: '100vh', width: 220,
      background: 'rgba(7,7,15,0.95)',
      borderRight: '1px solid rgba(255,255,255,0.06)',
      backdropFilter: 'blur(20px)',
      display: 'flex', flexDirection: 'column', padding: '20px 12px', zIndex: 50,
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 10px 20px' }}>
        <div style={{
          width: 32, height: 32, borderRadius: 10,
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(99,102,241,0.4)',
        }}>
          <Zap size={16} color="#fff" />
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>Life OS</div>
          <div style={{ fontSize: 10, color: '#4a5568', fontWeight: 500, letterSpacing: '0.05em' }}>ARYAN'S DASHBOARD</div>
        </div>
      </div>

      <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', marginBottom: 12 }} />

      {/* Nav */}
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: '#2d3748', padding: '4px 10px 6px', textTransform: 'uppercase' }}>Menu</div>
        {nav.map(({ to, icon: Icon, label, color }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 10px', borderRadius: 10,
              fontSize: 13, fontWeight: 500, textDecoration: 'none',
              transition: 'all 0.15s',
              background: isActive ? `linear-gradient(90deg, rgba(99,102,241,0.15), rgba(99,102,241,0.05))` : 'transparent',
              border: isActive ? '1px solid rgba(99,102,241,0.2)' : '1px solid transparent',
              color: isActive ? '#818cf8' : '#64748b',
            })}
          >
            {({ isActive }) => (
              <>
                <div style={{
                  width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: isActive ? `${color}20` : 'rgba(255,255,255,0.04)',
                  transition: 'all 0.15s',
                }}>
                  <Icon size={14} color={isActive ? color : '#475569'} />
                </div>
                <span>{label}</span>
                {isActive && <div style={{ marginLeft: 'auto', width: 4, height: 4, borderRadius: '50%', background: color }} />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div style={{ padding: '12px 10px 0', borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: 8 }}>
        <div style={{ fontSize: 11, color: '#2d3748', fontWeight: 500 }}>
          {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
        </div>
      </div>
    </aside>
  )
}
