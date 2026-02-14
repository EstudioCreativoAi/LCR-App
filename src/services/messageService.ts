import { supabase } from '../lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

export interface Message {
  id: string
  lead_id: string
  sender_id: string
  content: string
  created_at: string
  sender?: {
    id: string
    full_name: string
    avatar_url: string | null
  }
}

export interface MessageResult<T> {
  success: boolean
  data?: T
  error?: string
}

export async function fetchMessages(
  leadId: string
): Promise<MessageResult<Message[]>> {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:profiles!messages_sender_id_fkey (
          id,
          full_name,
          avatar_url
        )
      `)
      .eq('lead_id', leadId)
      .order('created_at', { ascending: true })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data: data as Message[] }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to fetch messages',
    }
  }
}

export async function sendMessage(
  leadId: string,
  senderId: string,
  content: string
): Promise<MessageResult<Message>> {
  try {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        lead_id: leadId,
        sender_id: senderId,
        content,
      })
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data: data as Message }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to send message',
    }
  }
}

export function subscribeToMessages(
  leadId: string,
  onNewMessage: (message: Message) => void
): RealtimeChannel {
  const channel = supabase
    .channel(`messages:${leadId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `lead_id=eq.${leadId}`,
      },
      (payload) => {
        onNewMessage(payload.new as Message)
      }
    )
    .subscribe()

  return channel
}

export function unsubscribeFromMessages(channel: RealtimeChannel): void {
  supabase.removeChannel(channel)
}
