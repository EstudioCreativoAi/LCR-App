import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  RefreshControl,
} from 'react-native'
import { useRouter } from 'expo-router'
import { MessageSquare, MapPin } from 'lucide-react-native'
import { useSession } from '../../src/providers/SessionProvider'
import { supabase } from '../../src/lib/supabase'
import { COLORS, FONTS, SPACING } from '../../src/theme/theme'
import ChatThread from '../../src/components/ChatThread'

interface LeadThread {
  id: string
  property_id: string
  status: string
  created_at: string
  property: {
    id: string
    address: string
    city: string
  }
  lastMessage?: string
  lastMessageAt?: string
}

const IS_WEB = Platform.OS === 'web'
const MAX_CONTENT_WIDTH = 800

function EmptyState() {
  return (
    <View style={styles.emptyContainer}>
      <MessageSquare size={64} color={COLORS.muted} strokeWidth={1.5} />
      <Text style={styles.emptyTitle}>No conversations yet</Text>
      <Text style={styles.emptySubtitle}>
        Express interest in a property to start a conversation with the landlord
      </Text>
    </View>
  )
}

export default function MessagesScreen() {
  const router = useRouter()
  const { session, role, isDemo } = useSession()
  const [threads, setThreads] = useState<LeadThread[]>([])
  const [loading, setLoading] = useState(true)
  const [activeLead, setActiveLead] = useState<LeadThread | null>(null)

  const fetchThreads = useCallback(async () => {
    if (!session?.user.id || isDemo) {
      setLoading(false)
      return
    }

    setLoading(true)
    const { data, error } = await supabase
      .from('leads')
      .select(`
        id,
        property_id,
        status,
        created_at,
        property:properties (id, address, city)
      `)
      .eq('renter_id', session.user.id)
      .order('created_at', { ascending: false })

    if (!error && data) {
      const leadsWithProp = data.filter((l: any) => l.property) as LeadThread[]

      // Fetch last message for each lead
      const leadIds = leadsWithProp.map((l) => l.id)
      if (leadIds.length > 0) {
        const { data: messages } = await supabase
          .from('messages')
          .select('lead_id, content, created_at')
          .in('lead_id', leadIds)
          .order('created_at', { ascending: false })

        const lastMsgByLead: Record<string, { content: string; created_at: string }> = {}
        messages?.forEach((m: any) => {
          if (!lastMsgByLead[m.lead_id]) {
            lastMsgByLead[m.lead_id] = { content: m.content, created_at: m.created_at }
          }
        })

        setThreads(
          leadsWithProp.map((l) => ({
            ...l,
            lastMessage: lastMsgByLead[l.id]?.content,
            lastMessageAt: lastMsgByLead[l.id]?.created_at,
          }))
        )
      } else {
        setThreads(leadsWithProp)
      }
    }
    setLoading(false)
  }, [session?.user.id, isDemo])

  useEffect(() => {
    fetchThreads()
  }, [fetchThreads])

  if (!role || role !== 'renter') return null

  if (activeLead && session) {
    return (
      <View style={{ flex: 1 }}>
        <TouchableOpacity style={styles.backButton} onPress={() => setActiveLead(null)}>
          <Text style={styles.backButtonText}>{'← Back'}</Text>
        </TouchableOpacity>
        <Text style={styles.chatHeader} numberOfLines={1}>
          {activeLead.property?.address}
        </Text>
        <ChatThread
          leadId={activeLead.id}
          currentUserId={session.user.id}
          onClose={() => setActiveLead(null)}
        />
      </View>
    )
  }

  if (isDemo) {
    return (
      <View style={styles.centered}>
        <MessageSquare size={64} color={COLORS.muted} strokeWidth={1.5} />
        <Text style={styles.emptyTitle}>Messages</Text>
        <Text style={styles.emptySubtitle}>
          Sign in to view your conversations with landlords
        </Text>
      </View>
    )
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    )
  }

  return (
    <View style={styles.mainWrapper}>
      <View style={styles.container}>
        <Text style={styles.screenTitle}>Messages</Text>
        <FlatList
          data={threads}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={EmptyState}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={fetchThreads}
              tintColor={COLORS.primary}
              colors={[COLORS.primary]}
            />
          }
          contentContainerStyle={[
            styles.listContent,
            threads.length === 0 && styles.listEmpty,
          ]}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.threadCard}
              onPress={() => setActiveLead(item)}
              activeOpacity={0.75}
            >
              <View style={styles.threadIconWrap}>
                <MessageSquare size={22} color={COLORS.primary} strokeWidth={2} />
              </View>
              <View style={styles.threadBody}>
                <Text style={styles.threadAddress} numberOfLines={1}>
                  {item.property?.address}
                </Text>
                <View style={styles.threadMeta}>
                  <MapPin size={12} color={COLORS.muted} strokeWidth={2} />
                  <Text style={styles.threadCity}>{item.property?.city}</Text>
                </View>
                {item.lastMessage ? (
                  <Text style={styles.threadPreview} numberOfLines={1}>
                    {item.lastMessage}
                  </Text>
                ) : (
                  <Text style={styles.threadNoMessage}>No messages yet — tap to start</Text>
                )}
              </View>
              <View style={styles.threadRight}>
                <View style={[styles.statusPill, { backgroundColor: statusColor(item.status) }]}>
                  <Text style={styles.statusText}>{item.status}</Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      </View>
    </View>
  )
}

function statusColor(status: string): string {
  switch (status) {
    case 'Interested': return COLORS.cardBackground
    case 'Contacted': return '#FFF3CD'
    case 'Viewing Scheduled': return '#D4EDDA'
    case 'Lease Sent': return '#CCE5FF'
    case 'Deposit Paid': return '#D4EDDA'
    default: return COLORS.cardBackground
  }
}

const styles = StyleSheet.create({
  mainWrapper: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    backgroundColor: COLORS.white,
    ...(IS_WEB
      ? {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
        }
      : {}),
  },
  screenTitle: {
    fontSize: 24,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.sm,
    backgroundColor: COLORS.white,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: SPACING.xl,
  },
  listContent: {
    padding: SPACING.md,
  },
  listEmpty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xl * 2,
    paddingHorizontal: SPACING.lg,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: FONTS.semiBold,
    color: COLORS.text,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.muted,
    textAlign: 'center',
    maxWidth: 260,
  },
  threadCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.cardBackground,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  threadIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  threadBody: {
    flex: 1,
  },
  threadAddress: {
    fontSize: 15,
    fontFamily: FONTS.semiBold,
    color: COLORS.text,
    marginBottom: 2,
  },
  threadMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginBottom: 4,
  },
  threadCity: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: COLORS.muted,
  },
  threadPreview: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: COLORS.muted,
  },
  threadNoMessage: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: COLORS.secondary,
    fontStyle: 'italic',
  },
  threadRight: {
    marginLeft: SPACING.sm,
    alignItems: 'flex-end',
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 10,
    fontFamily: FONTS.semiBold,
    color: COLORS.text,
  },
  backButton: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBackground,
  },
  backButtonText: {
    fontSize: 15,
    fontFamily: FONTS.semiBold,
    color: COLORS.primary,
  },
  chatHeader: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBackground,
  },
})
