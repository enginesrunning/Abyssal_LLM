import './styles/app.css'
import { useEffect, useState } from 'react'
import ChatView from './pages/ChatView'
import ConstellationView from './pages/ConstellationView'
import HistoryPanel from './components/HistoryPanel'
import LandingPage from './pages/LandingPage'
import AuthForm from './pages/AuthForm'
import { useChats } from './hooks/useChats'
import { useAuth } from './hooks/useAuth'

export default function App() {
  const auth = useAuth()
  const chats = useChats()
  const [view, setView] = useState('chat')
  const [historyOpen, setHistoryOpen] = useState(false)
  const [sending, setSending] = useState(false)
  const [authScreen, setAuthScreen] = useState('landing')
  const { current, addMessage } = chats

  const [graph, setGraph] = useState({ nodes: [], links: [] })

  useEffect(() => {
  const text = current.messages.map((m) => m.text).join('\n')
  if (!text.trim()) {
    setGraph({ nodes: [], links: [] })
    return
  }
  fetch('/api/graph', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  })
    .then((r) => r.json())
    .then(setGraph)
    .catch(() => {})
}, [current.id, current.messages])

  async function handleSend(text, files) {
    addMessage({ role: 'user', text, attachments: files.map((f) => ({ name: f.name, type: f.type })), ts: Date.now() })
    setSending(true)
    try {
      const fd = new FormData()
      fd.append('message', text)
      files.forEach((f) => fd.append('files', f))
      const res = await fetch('/api/chat', { method: 'POST', body: fd })
      const data = await res.json()
      addMessage({ role: 'assistant', text: data.reply, ts: Date.now() })
    } catch (e) {
      addMessage({ role: 'assistant', text: 'Connection failed: ' + e.message, ts: Date.now() })
    } finally {
      setSending(false)
    }
  }

  // ----- unauthenticated flow -----
  if (auth.loading) {
    return <div className="splash"><span className="logo">Text2Graph</span></div>
  }
  if (!auth.user) {
    if (authScreen === 'landing') {
      return <LandingPage onLogin={() => setAuthScreen('login')} onRegister={() => setAuthScreen('register')} />
    }
    return <AuthForm mode={authScreen} auth={auth} onBack={() => setAuthScreen('landing')} onSwitch={setAuthScreen} />
  }

  // ----- authenticated app -----
  return (
    <div className="app">
      <aside className="rail">
        <button className="rail-btn" title="New chat" aria-label="New chat" onClick={chats.newChat}>+</button>
        <button
          className={`rail-btn ${historyOpen ? 'active' : ''}`}
          title="History"
          aria-label="History"
          onClick={() => setHistoryOpen((o) => !o)}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M4 6h16M4 12h16M4 18h10" />
          </svg>
        </button>

        <div className="rail-spacer" />

        <span className="rail-avatar" title={`${auth.user.first_name} ${auth.user.last_name}`}>
          {auth.user.first_name?.[0]?.toUpperCase() || '?'}
        </span>
        <button className="rail-btn" title="Log out" aria-label="Log out" onClick={auth.logout}>
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
          </svg>
        </button>
      </aside>

      {historyOpen && <HistoryPanel chats={chats} onClose={() => setHistoryOpen(false)} />}

      <div className="main">
        <header className="topbar">
          <div className="brand">
            <span className="brand-mark">◇</span>
            <span className="brand-name">Text2Graph</span>
            <span className="brand-sub">embedded automotive</span>
          </div>
          <nav className="viewtabs">
            <button className={view === 'chat' ? 'active' : ''} onClick={() => setView('chat')}>Conversation</button>
            <button className={view === 'graph' ? 'active' : ''} onClick={() => setView('graph')}>Constellation</button>
          </nav>
        </header>

        <main className="stage">
          {view === 'chat' ? (
            <ChatView messages={current.messages} sending={sending} onSend={handleSend} name={auth.user.first_name} />
          ) : (
            <ConstellationView graphData={graph} />
          )}
        </main>
      </div>
    </div>
  )
}
