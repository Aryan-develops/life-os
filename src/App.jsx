import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import Sleep from './pages/Sleep'
import Heart from './pages/Heart'
import Fitness from './pages/Fitness'
import Nutrition from './pages/Nutrition'
import Goals from './pages/Goals'
import Business from './pages/Business'
import Finances from './pages/Finances'
import Integrations from './pages/Integrations'

export default function App() {
  return (
    <BrowserRouter>
      <div style={{ display: 'flex', minHeight: '100vh', background: '#07070f' }}>
        <Sidebar />
        <main style={{ flex: 1, marginLeft: 220, padding: '36px 40px', maxWidth: 1100, minHeight: '100vh' }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/sleep" element={<Sleep />} />
            <Route path="/heart" element={<Heart />} />
            <Route path="/fitness" element={<Fitness />} />
            <Route path="/nutrition" element={<Nutrition />} />
            <Route path="/goals" element={<Goals />} />
            <Route path="/business" element={<Business />} />
            <Route path="/finances" element={<Finances />} />
            <Route path="/integrations" element={<Integrations />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
