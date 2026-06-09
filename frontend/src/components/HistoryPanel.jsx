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
              >
              </button>
            </div>
          ))}
        </div>
      </aside>
    </>
  )
}
