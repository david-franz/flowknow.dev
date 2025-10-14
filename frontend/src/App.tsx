import { Route, Routes, useLocation } from 'react-router-dom'
import { Footer } from './components/Footer'
import { Header } from './components/Header'
import Home from './pages/Home'
import Docs from './pages/Docs'
import Playground from './pages/Playground'

export default function App() {
  const location = useLocation()
  const isPlaygroundRoute = location.pathname.startsWith('/playground') || location.pathname.startsWith('/workbench')

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 transition-colors duration-200 dark:bg-slate-950 dark:text-slate-100">
      <Header />
      <main className={`flex-1 ${isPlaygroundRoute ? 'py-0 overflow-hidden' : 'py-12 md:py-16'}`}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/playground" element={<Playground />} />
          <Route path="/workbench" element={<Playground />} />
          <Route path="/docs" element={<Docs />} />
        </Routes>
      </main>
      <Footer />
    </div>
  )
}