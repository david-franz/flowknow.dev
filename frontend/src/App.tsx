import { useState } from 'react'
import { Route, Routes } from 'react-router-dom'
import { Footer } from './components/Footer'
import { Header } from './components/Header'
import Home from './pages/Home'
import Workbench from './pages/Workbench'
import Docs from './pages/Docs'

export default function App() {
  const [hfApiKey, setHfApiKey] = useState<string | null>(null)

  return (
    <div className="min-h-screen flex flex-col bg-slate-950">
      <Header />
      <main className="flex-1 py-12 md:py-16">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/workbench" element={<Workbench hfApiKey={hfApiKey} onApiKeyChange={setHfApiKey} />} />
          <Route path="/docs" element={<Docs />} />
        </Routes>
      </main>
      <Footer />
    </div>
  )
}