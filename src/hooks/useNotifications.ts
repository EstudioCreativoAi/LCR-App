import { useState, useEffect, useCallback, useRef } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import * as notificationService from '../services/notificationService'
import type { Notification } from '../services/notificationService'

export interface UseNotificationsReturn {
  notifications: Notification[]
  unreadCount: number
  isLoading: boolean
  error: string | null
  markAsRead: (notificationId: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  refetch: () => Promise<void>
}

export function useNotifications(userId: string | null): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const channelRef = useRef<RealtimeChannel | null>(null)

  const unreadCount = notifications.filter((n) => !n.is_read).length

  const fetchNotifications = useCallback(async () => {
    if (!userId) {
      setNotifications([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    const result = await notificationService.fetchNotifications(userId)

    if (result.success && result.data) {
      setNotifications(result.data)
    } else {
      setError(result.error ?? 'Failed to fetch notifications')
    }

    setIsLoading(false)
  }, [userId])

  useEffect(() => {
    fetchNotifications()

    if (userId) {
      channelRef.current = notificationService.subscribeToNotifications(userId, (newNotification) => {
        setNotifications((prev) => [newNotification, ...prev])
      })
    }

    return () => {
      if (channelRef.current) {
        notificationService.unsubscribeFromNotifications(channelRef.current)
        channelRef.current = null
      }
    }
  }, [userId, fetchNotifications])

  const markAsRead = useCallback(async (notificationId: string): Promise<void> => {
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === notificationId ? { ...n, is_read: true } : n
      )
    )

    const result = await notificationService.markAsRead(notificationId)

    if (!result.success) {
      await fetchNotifications()
    }
  }, [fetchNotifications])

  const markAllAsRead = useCallback(async (): Promise<void> => {
    if (!userId) return

    setNotifications((prev) =>
      prev.map((n) => ({ ...n, is_read: true }))
    )

    const result = await notificationService.markAllAsRead(userId)

    if (!result.success) {
      await fetchNotifications()
    }
  }, [userId, fetchNotifications])

  const refetch = useCallback(async () => {
    await fetchNotifications()
  }, [fetchNotifications])

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    refetch,
  }
}
