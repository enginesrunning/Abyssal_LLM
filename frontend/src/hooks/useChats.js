import { useState, useEffect, useCallback } from 'react'

const KEY = 'constella.chats.v1'
const uid = () => Math.random().toString(36).slice(2)

function blankChat() {
  return { id: uid(), title: 'New chat', messages: [], createdAt: Date.now(), updatedAt: Date.now() }
}

function loadInitial() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed?.conversations?.length) return parsed
    }
  } catch {
    /* ignore corrupt storage */
  }
  const c = blankChat()
  return { conversations: [c], currentId: c.id }
}

export function useChats() {
  const [state, setState] = useState(loadInitial)

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state))
    } catch {
      /* storage full / disabled — non-fatal */
    }
  }, [state])

  const current = state.conversations.find((c) => c.id === state.currentId) || state.conversations[0]

  const newChat = useCallback(() => {
    setState((s) => {
      // reuse an existing empty chat instead of stacking blanks
      const existingEmpty = s.conversations.find((c) => c.messages.length === 0)
      if (existingEmpty) return { ...s, currentId: existingEmpty.id }
      const c = blankChat()
      return { conversations: [c, ...s.conversations], currentId: c.id }
    })
  }, [])

  const selectChat = useCallback((id) => setState((s) => ({ ...s, currentId: id })), [])

  const deleteChat = useCallback((id) => {
    setState((s) => {
      const rest = s.conversations.filter((c) => c.id !== id)
      if (rest.length === 0) {
        const c = blankChat()
        return { conversations: [c], currentId: c.id }
      }
      return { conversations: rest, currentId: s.currentId === id ? rest[0].id : s.currentId }
    })
  }, [])

  const addMessage = useCallback((msg) => {
    setState((s) => ({
      ...s,
      conversations: s.conversations.map((c) =>
        c.id === s.currentId
          ? {
              ...c,
              messages: [...c.messages, msg],
              title:
                c.messages.length === 0 && msg.role === 'user' && msg.text
                  ? msg.text.slice(0, 42)
                  : c.title,
              updatedAt: Date.now(),
            }
          : c
      ),
    }))
  }, [])

  return {
    conversations: state.conversations,
    current,
    currentId: state.currentId,
    newChat,
    selectChat,
    deleteChat,
    addMessage,
  }
}
