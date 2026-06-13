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

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex min-h-screen" style={{ background: '#0a0a0f' }}>
        <Sidebar />
        <main className="flex-1 ml-56 p-8 max-w-5xl">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/sleep" element={<Sleep />} />
            <Route path="/heart" element={<Heart />} />
            <Route path="/fitness" element={<Fitness />} />
            <Route path="/nutrition" element={<Nutrition />} />
            <Route path="/goals" element={<Goals />} />
            <Route path="/business" element={<Business />} />
            <Route path="/finances" element={<Finances />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
