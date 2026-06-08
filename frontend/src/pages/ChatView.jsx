import { useEffect, useRef, useState } from 'react'
import Waveform from '../components/Waveform'
import SignalLab from '../components/SignalLab'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'

const MAX_BYTES = 20 * 1024 * 1024 // 20 MB per file

function Paperclip() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5l-8.5 8.5a5 5 0 0 1-7-7l8.5-8.5a3.3 3.3 0 0 1 4.7 4.7l-8.5 8.5a1.7 1.7 0 0 1-2.4-2.4l7.8-7.8" />
    </svg>
  )
}

//helper to fix formulas and expressions in markdown
const fixMath = (t) =>
  (t || '')
    .replace(/\\\[(.+?)\\\]/gs, (_, e) => `$$${e}$$`)
    .replace(/\\\((.+?)\\\)/gs, (_, e) => `$${e}$`)

export default function ChatView({ messages, sending, onSend, name }) {
  const [input, setInput] = useState('')
  const [attachments, setAttachments] = useState([])
  const [dragging, setDragging] = useState(false)
  const [status, setStatus] = useState('connecting')
  const threadRef = useRef(null)
  const fileRef = useRef(null)

  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then((d) => {
        if (d.status !== 'ok') return setStatus('error')
        setStatus(d.llm_configured ? 'online' : 'online · mock mode')
      })
      .catch(() => setStatus('offline'))
  }, [])

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, sending])

  function addFiles(list) {
    const incoming = Array.from(list).filter((f) => f.size <= MAX_BYTES)
    if (incoming.length) setAttachments((a) => [...a, ...incoming])
  }

  function onDrop(e) {
    e.preventDefault()
    setDragging(false)
    if (e.dataTransfer?.files?.length) addFiles(e.dataTransfer.files)
  }

  function onPick(e) {
    addFiles(e.target.files)
    e.target.value = '' // allow re-picking the same file
  }

  function removeAt(i) {
    setAttachments((a) => a.filter((_, idx) => idx !== i))
  }

  function doSend() {
    const text = input.trim()
    if ((!text && attachments.length === 0) || sending) return
    onSend(text, attachments)
    setInput('')
    setAttachments([])
  }

  const empty = messages.length === 0

  return (
    <div className={`chat-root ${empty ? 'is-empty' : 'is-active'}`}>
      <div className="bg-field" aria-hidden="true">
        <Waveform variant="sine" color="#ffd23f" dur="24s" height={200} glow={false} className="bg-wave bg-wave-1" />
        <Waveform variant="square" color="#6b4bd6" dur="29s" height={200} glow={false} className="bg-wave bg-wave-2" />
      </div>

      <SignalLab />

      <section className="hero">
        <p className="eyebrow">Embedded automotive assistant</p>
        <h1 className="greeting">
          Hello, <span>{name || 'there'}</span>.
        </h1>
      </section>

      <div className="thread" ref={threadRef}>
        {messages.map((m, i) => (
          <div key={i} className={`bubble ${m.role}`}>
            <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{fixMath(m.text)}</ReactMarkdown>
            {m.attachments?.length > 0 && (
              <div className="bubble-files">
                {m.attachments.map((a, j) => (
                  <span key={j} className="bubble-file">{a.name}</span>
                ))}
              </div>
            )}
          </div>
        ))}
        {sending && (
          <div className="bubble assistant typing">
            <span></span>
            <span></span>
            <span></span>
          </div>
        )}
      </div>

      <div className="composer">
        <div
          className={`composer-inner ${dragging ? 'dragging' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
        >
          {attachments.length > 0 && (
            <div className="chips">
              {attachments.map((f, i) => (
                <span key={i} className="chip">
                  <span className="chip-name">{f.name}</span>
                  <button onClick={() => removeAt(i)} aria-label="Remove attachment">×</button>
                </span>
              ))}
            </div>
          )}

          <div className="composer-row">
            <button className="attach-btn" onClick={() => fileRef.current?.click()} aria-label="Attach file" title="Attach txt, pdf or image">
              <Paperclip />
            </button>
            <input
              ref={fileRef}
              type="file"
              multiple
              accept=".txt,.md,.csv,.pdf,image/*"
              hidden
              onChange={onPick}
            />
            <input
              className="composer-text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && doSend()}
              placeholder={dragging ? 'Drop files to attach…' : 'Ask about CAN, PWM, ISO 26262…'}
            />
            <button className="send-btn" onClick={doSend} disabled={sending || (!input.trim() && attachments.length === 0)} aria-label="Send message">
              ↑
            </button>
          </div>
        </div>
        <p className="composer-hint">
          <span className={`status-dot ${status.startsWith('online') ? 'ok' : 'bad'}`}></span>
          {status}
        </p>
      </div>
    </div>
  )
}
