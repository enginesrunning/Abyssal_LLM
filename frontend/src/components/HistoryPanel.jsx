function fmt(t) {
  return new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function HistoryPanel({ chats, onClose }) {
  const { conversations, currentId, selectChat, deleteChat, newChat } = chats

  return (
    <>
      <div className="history-backdrop" onClick={onClose} />
      <aside className="history-panel">
        <div className="history-head">
          <span>History</span>
          <button className="icon-btn" onClick={onClose} aria-label="Close history">×</button>
        </div>

        <button className="history-new" onClick={() => { newChat(); onClose() }}>
          + New chat
        </button>

        <div className="history-list">
          {conversations.map((c) => (
            <div
              key={c.id}
              className={`history-item ${c.id === currentId ? 'active' : ''}`}
              onClick={() => { selectChat(c.id); onClose() }}
            >
              <div className="history-item-main">
                <span className="history-title">{c.title || 'New chat'}</span>
                <span className="history-meta">
                  {c.messages.length} {c.messages.length === 1 ? 'msg' : 'msgs'} · {fmt(c.updatedAt)}
                </span>
              </div>
              <button
                className="history-del"
                onClick={(e) => { e.stopPropagation(); deleteChat(c.id) }}
                aria-label="Delete chat"
                title="Delete chat"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                     stroke="currentColor" strokeWidth="2"
                     strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                  <path d="M10 11v6" /><path d="M14 11v6" />
                  <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </aside>
    </>
  )
}
