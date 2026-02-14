import { supabase } from '../lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

export interface Notification {
  id: string
  user_id: string
  type: string
  title: string
  body: string
  data: Record<string, unknown> | null
  is_read: boolean
  created_at: string
}

export interface NotificationResult<T> {
  success: boolean
  data?: T
  error?: string
}

export async function fetchNotifications(
  userId: string
): Promise<NotificationResult<Notification[]>> {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data: data as Notification[] }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to fetch notifications',
    }
  }
}

export async function fetchUnreadCount(
  userId: string
): Promise<NotificationResult<number>> {
  try {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data: count ?? 0 }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to fetch count',
    }
  }
}

export async function markAsRead(
  notificationId: string
): Promise<NotificationResult<Notification>> {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data: data as Notification }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to mark as read',
    }
  }
}

export async function markAllAsRead(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to mark all as read',
    }
  }
}

export function subscribeToNotifications(
  userId: string,
  onNewNotification: (notification: Notification) => void
): RealtimeChannel {
  const channel = supabase
    .channel(`notifications:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        onNewNotification(payload.new as Notification)
      }
    )
    .subscribe()

  return channel
}

export function unsubscribeFromNotifications(channel: RealtimeChannel): void {
  supabase.removeChannel(channel)
}
