import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Moon, Heart, Dumbbell, Apple,
  Target, Briefcase, Wallet, Zap
} from 'lucide-react'

const nav = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/sleep', icon: Moon, label: 'Sleep' },
  { to: '/heart', icon: Heart, label: 'Heart' },
  { to: '/fitness', icon: Dumbbell, label: 'Fitness' },
  { to: '/nutrition', icon: Apple, label: 'Nutrition' },
  { to: '/goals', icon: Target, label: 'Goals' },
  { to: '/business', icon: Briefcase, label: 'Business' },
  { to: '/finances', icon: Wallet, label: 'Finances' },
]

export default function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 h-screen w-56 flex flex-col py-6 px-3" style={{ background: '#0d0d15', borderRight: '1px solid #1e1e2e' }}>
      <div className="flex items-center gap-2 px-3 mb-8">
        <Zap size={20} className="text-indigo-400" />
        <span className="font-semibold text-white text-lg tracking-tight">Life OS</span>
      </div>
      <nav className="flex flex-col gap-1 flex-1">
        {nav.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-indigo-500/15 text-indigo-300'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="px-3 py-2 text-xs text-slate-600">
        Aryan's OS · {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
      </div>
    </aside>
  )
}
