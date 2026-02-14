import { useState, useEffect, useCallback, useRef } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import * as messageService from '../services/messageService'
import type { Message } from '../services/messageService'

export interface UseChatReturn {
  messages: Message[]
  isLoading: boolean
  error: string | null
  sendMessage: (content: string) => Promise<boolean>
  refetch: () => Promise<void>
}

export function useChat(leadId: string | null, senderId: string | null): UseChatReturn {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const channelRef = useRef<RealtimeChannel | null>(null)

  const fetchMessages = useCallback(async () => {
    if (!leadId) {
      setMessages([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    const result = await messageService.fetchMessages(leadId)

    if (result.success && result.data) {
      setMessages(result.data)
    } else {
      setError(result.error ?? 'Failed to fetch messages')
    }

    setIsLoading(false)
  }, [leadId])

  useEffect(() => {
    fetchMessages()

    if (leadId) {
      channelRef.current = messageService.subscribeToMessages(leadId, (newMessage) => {
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMessage.id)) {
            return prev
          }
          return [...prev, newMessage]
        })
      })
    }

    return () => {
      if (channelRef.current) {
        messageService.unsubscribeFromMessages(channelRef.current)
        channelRef.current = null
      }
    }
  }, [leadId, fetchMessages])

  const sendMessage = useCallback(async (content: string): Promise<boolean> => {
    if (!leadId || !senderId) return false

    const trimmedContent = content.trim()
    if (!trimmedContent) return false

    const result = await messageService.sendMessage(leadId, senderId, trimmedContent)

    if (!result.success) {
      setError(result.error ?? 'Failed to send message')
      return false
    }

    return true
  }, [leadId, senderId])

  const refetch = useCallback(async () => {
    await fetchMessages()
  }, [fetchMessages])

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    refetch,
  }
}
