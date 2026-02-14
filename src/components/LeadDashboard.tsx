import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
  Alert,
  RefreshControl,
} from 'react-native'
import { supabase } from '../lib/supabase'
import { COLORS, SPACING, FONTS } from '../theme/theme'
import { Lead, LeadStatus, Property } from '../types/database'
import ChatThread from './ChatThread'
import { LeadListItem } from './LeadListItem'
import ReviewSystem from './ReviewSystem'
import { Session } from '@supabase/supabase-js'
import { isTablet } from '../utils/responsive'

const IS_WEB = Platform.OS === 'web'
const MAX_CONTENT_WIDTH = 800

interface LeadWithProperty extends Lead {
  properties: Property
  profiles: {
    id: string
    full_name: string | null
    avatar_url: string | null
  }
}

const STATUS_ORDER: LeadStatus[] = ['Interested', 'Contacted', 'Viewing Scheduled', 'Lease Sent']
const LEASE_STATUS_ORDER: string[] = ['pending', 'sent_for_signature', 'active', 'completed']

const MOCK_LEADS: any[] = [
  {
    id: 'lead-1',
    property_id: 'mock-1',
    renter_id: 'renter-1',
    status: 'Interested',
    message: 'Hello! I love this villa. Is it available for a tour on Friday?',
    created_at: new Date().toISOString(),
    properties: { id: 'mock-1', address: 'Villa del Mar #45', city: 'Cabo San Lucas', landlord_id: 'landlord-1' },
    profiles: { id: 'renter-1', full_name: 'John Renter', avatar_url: 'https://i.pravatar.cc/150?u=renter-1' }
  },
  {
    id: 'lead-2',
    property_id: 'mock-1',
    renter_id: 'renter-2',
    status: 'Contacted',
    message: 'Interested in a long-term lease. Can we discuss the price?',
    created_at: new Date().toISOString(),
    properties: { id: 'mock-1', address: 'Villa del Mar #45', city: 'Cabo San Lucas', landlord_id: 'landlord-1' },
    profiles: { id: 'renter-2', full_name: 'Alice Smith', avatar_url: 'https://i.pravatar.cc/150?u=renter-2' }
  },
  {
    id: 'lead-3',
    property_id: 'mock-2',
    renter_id: 'renter-3',
    status: 'Viewing Scheduled',
    message: 'Moving from Monterrey next month, looking for something central.',
    created_at: new Date().toISOString(),
    properties: { id: 'mock-2', address: 'Condo Pacifico Penthouse', city: 'San Jose del Cabo', landlord_id: 'landlord-2' },
    profiles: { id: 'renter-3', full_name: 'Bob Jones', avatar_url: 'https://i.pravatar.cc/150?u=renter-3' }
  },
  {
    id: 'lead-4',
    property_id: 'mock-3',
    renter_id: 'renter-4',
    status: 'Lease Sent',
    message: 'Perfect for my remote work setup!',
    created_at: new Date().toISOString(),
    properties: { id: 'mock-3', address: 'Baja Sands Loft', city: 'Cabo San Lucas', landlord_id: 'landlord-1' },
    profiles: { id: 'renter-4', full_name: 'Charlie Brown', avatar_url: 'https://i.pravatar.cc/150?u=renter-4' }
  }
]

export default function LeadDashboard({ onClose, isDemo, session }: { onClose?: () => void; isDemo?: boolean; session: Session }) {
  const [leads, setLeads] = useState<LeadWithProperty[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [activeChatLeadId, setActiveChatLeadId] = useState<string | null>(null)
  const [expandedLeadId, setExpandedLeadId] = useState<string | null>(null)
  const [ratingTarget, setRatingTarget] = useState<{ propertyId?: string, renterId: string, leadId: string } | null>(null)

  const formatLeadDate = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })

  const fetchLeads = useCallback(async () => {
    try {
      if (isDemo) {
        setLeads(MOCK_LEADS as any)
        setLoading(false)
        return
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Fetch leads for properties owned by this user
      const { data, error } = await supabase
        .from('leads')
        .select(`
          *,
          properties!inner(*),
          profiles(*)
        `)
        .or(`landlord_id.eq.${user.id},agent_id.eq.${user.id}`, { foreignTable: 'properties' })
        .order('created_at', { ascending: false })

      if (error) throw error
      setLeads(data as any || [])
    } catch (error: any) {
      console.error('Error fetching leads:', error)
      if (!IS_WEB) Alert.alert('Error', 'Failed to load leads')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchLeads()
  }, [fetchLeads])

  const onRefresh = () => {
    setRefreshing(true)
    fetchLeads()
  }

  const executeLease = async (propertyId: string, renterId: string) => {
    try {
      if (isDemo) {
        console.log('Demo Mode: Simulating lease execution for', renterId)
        return { data: { message: 'Demo: Lease sent' }, error: null }
      }

      const { data, error } = await supabase.functions.invoke('lease-execution', {
        body: { property_id: propertyId, renter_id: renterId }
      })

      if (error) throw error
      return { data, error: null }
    } catch (error: any) {
      console.error('Lease execution error:', error)
      return { data: null, error }
    }
  }

  const updateLeadStatus = async (leadId: string, newStatus: LeadStatus) => {
    try {
      setUpdatingId(leadId)
      
      const lead = leads.find(l => l.id === leadId)
      if (!lead) return

      // 1. Update the Lead status in Supabase first
      if (!isDemo) {
        const { error } = await (supabase
          .from('leads') as any)
          .update({ status: newStatus, updated_at: new Date().toISOString() })
          .eq('id', leadId)

        if (error) throw error
      }

      // 2. If moving to 'Lease Sent', trigger the edge function (side effect)
      if (newStatus === 'Lease Sent') {
        const { error: leaseError } = await executeLease(lead.property_id, lead.renter_id)
        if (leaseError && !isDemo) {
          // If the function fails (e.g. not deployed), we still updated the status
          console.warn('Lease execution failed but status was updated:', leaseError)
          Alert.alert(
            'Note', 
            'Lead status updated to "Lease Sent", but the lease document creation failed. Make sure the edge function is deployed.'
          )
        }
      }

      // 3. Optimistic local state update
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus } : l))
      
      if (IS_WEB) {
        console.log(`Status updated to ${newStatus}. Notification sent to renter.`)
      } else {
        const msg = newStatus === 'Lease Sent' 
          ? 'Lease has been generated and sent for signature!' 
          : `The renter has been notified of the change to ${newStatus}.`
        Alert.alert('Status Updated', msg)
      }
    } catch (error: any) {
      console.error('Error updating status:', error)
      Alert.alert('Error', error.message || 'Failed to update status')
    } finally {
      setUpdatingId(null)
    }
  }

  const renderLeadCard = (lead: LeadWithProperty) => {
    const isExpanded = expandedLeadId === lead.id
    const renterName = lead.profiles?.full_name || lead.renter_id.slice(0, 8)
    const propertyTitle = `${lead.properties.address}${lead.properties.city ? `, ${lead.properties.city}` : ''}`

    return (
      <View key={lead.id} style={styles.leadCard}>
        <LeadListItem
          renterName={renterName}
          propertyTitle={propertyTitle}
          status={lead.status}
          date={formatLeadDate(lead.created_at)}
          onPress={() => setExpandedLeadId(isExpanded ? null : lead.id)}
          embedded
        />

        {isExpanded && (
          <View style={styles.expandedContent}>
            {lead.message && (
              <Text style={styles.leadMessage} numberOfLines={3}>
                "{lead.message}"
              </Text>
            )}

            <View style={styles.actionRow}>
              <Text style={styles.updateLabel}>Update Lead Status:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statusStepper}>
                {STATUS_ORDER.map(status => (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.statusOption,
                      lead.status === status && styles.statusOptionActive,
                      updatingId === lead.id && { opacity: 0.5 }
                    ]}
                    onPress={() => updateLeadStatus(lead.id, status)}
                    disabled={updatingId === lead.id}
                  >
                    <Text style={[
                      styles.statusOptionText,
                      lead.status === status && styles.statusOptionTextActive
                    ]}>
                      {status}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.chatButton}
                onPress={() => {
                  setExpandedLeadId(null)
                  setActiveChatLeadId(lead.id)
                }}
              >
                <Text style={styles.chatButtonText}>💬 Chat</Text>
              </TouchableOpacity>
            </View>

            {lead.status === 'Lease Sent' && (
              <View style={[styles.actionRow, { borderTopWidth: 0, paddingTop: 8 }]}>
                <TouchableOpacity
                  style={[styles.completeButton, updatingId === lead.id && { opacity: 0.5 }]}
                  onPress={() => {
                    setRatingTarget({
                      propertyId: lead.property_id,
                      renterId: lead.renter_id,
                      leadId: lead.id
                    })
                  }}
                >
                  <Text style={styles.completeButtonText}>✅ Complete Lease & Rate Renter</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </View>
    )
  }

  const getStatusColor = (status: LeadStatus) => {
    switch (status) {
      case 'Interested': return COLORS.primary
      case 'Contacted': return COLORS.secondary
      case 'Viewing Scheduled': return COLORS.accent
      case 'Lease Sent': return COLORS.accent
      default: return COLORS.muted
    }
  }

  const activeLeads = leads.filter(l => l.status !== 'Lease Sent')

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {onClose && (
        <View style={styles.header}>
          <Text style={styles.title}>Lead Management</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Active Leads</Text>
            <View style={[styles.countBadge, { backgroundColor: COLORS.primary }]}>
              <Text style={styles.countText}>{activeLeads.length}</Text>
            </View>
          </View>

          {activeLeads.length === 0 ? (
            <Text style={styles.emptyActiveLeadsText}>No active leads right now.</Text>
          ) : (
            <View style={[styles.activeLeadsGrid, isTablet && styles.activeLeadsGridTablet]}>
              {activeLeads.map(lead => (
                <View
                  key={lead.id}
                  style={[styles.activeLeadCard, isTablet && styles.activeLeadCardTablet]}
                >
                  <LeadListItem
                    renterName={lead.profiles?.full_name || lead.renter_id.slice(0, 8)}
                    propertyTitle={`${lead.properties.address}${lead.properties.city ? `, ${lead.properties.city}` : ''}`}
                    status={lead.status}
                    date={formatLeadDate(lead.created_at)}
                    onPress={() => setExpandedLeadId(expandedLeadId === lead.id ? null : lead.id)}
                    embedded
                  />

                  {expandedLeadId === lead.id && (
                    <View style={styles.expandedContent}>
                      {lead.message && (
                        <Text style={styles.leadMessage} numberOfLines={3}>
                          "{lead.message}"
                        </Text>
                      )}

                      <View style={styles.actionRow}>
                        <Text style={styles.updateLabel}>Update Lead Status:</Text>
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          style={styles.statusStepper}
                        >
                          {STATUS_ORDER.map(status => (
                            <TouchableOpacity
                              key={status}
                              style={[
                                styles.statusOption,
                                lead.status === status && styles.statusOptionActive,
                                updatingId === lead.id && { opacity: 0.5 }
                              ]}
                              onPress={() => updateLeadStatus(lead.id, status)}
                              disabled={updatingId === lead.id}
                            >
                              <Text style={[
                                styles.statusOptionText,
                                lead.status === status && styles.statusOptionTextActive
                              ]}>
                                {status}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>

                      <View style={styles.actionRow}>
                        <TouchableOpacity
                          style={styles.chatButton}
                          onPress={() => {
                            setExpandedLeadId(null)
                            setActiveChatLeadId(lead.id)
                          }}
                        >
                          <Text style={styles.chatButtonText}>💬 Chat</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>

        {STATUS_ORDER.map(status => {
          const statusLeads = leads.filter(l => l.status === status)
          if (statusLeads.length === 0) return null

          return (
            <View key={status} style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{status}</Text>
                <View style={[styles.countBadge, { backgroundColor: getStatusColor(status) }]}>
                  <Text style={styles.countText}>{statusLeads.length}</Text>
                </View>
              </View>
              {statusLeads.map(renderLeadCard)}
            </View>
          )
        })}

        {leads.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📈</Text>
            <Text style={styles.emptyTitle}>No leads yet</Text>
            <Text style={styles.emptyText}>When renters are interested in your properties, they'll appear here.</Text>
          </View>
        )}
      </ScrollView>

      {ratingTarget && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ReviewSystem 
              raterId={session.user.id}
              renterId={ratingTarget.renterId}
              category="renter"
              onSubmitSuccess={() => {
                updateLeadStatus(ratingTarget.leadId, 'Lease Sent') // Keep status or add 'Archived'
                setRatingTarget(null)
                Alert.alert('Success', 'Lease completed and renter rated!')
              }}
              onCancel={() => setRatingTarget(null)}
            />
          </View>
        </View>
      )}

      {activeChatLeadId && (
        <ChatThread
          leadId={activeChatLeadId}
          currentUserId={session.user.id}
          onClose={() => setActiveChatLeadId(null)}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.muted,
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.background,
  },
  title: {
    fontSize: 20,
    fontFamily: FONTS.bold,
    color: COLORS.text,
  },
  closeButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.cardBackground,
    borderRadius: 16,
  },
  closeButtonText: {
    fontSize: 14,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: 40,
  },
  activeLeadsGrid: {
    width: '100%',
  },
  activeLeadsGridTablet: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  activeLeadCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.background,
    shadowColor: COLORS.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  activeLeadCardTablet: {
    width: '48%',
  },
  emptyActiveLeadsText: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.muted,
  },
  section: {
    marginBottom: SPACING.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: FONTS.bold,
    color: COLORS.text,
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  countText: {
    fontSize: 12,
    color: COLORS.white,
    fontFamily: FONTS.bold,
  },
  leadCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.background,
    shadowColor: COLORS.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  expandedContent: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.background,
  },
  leadMessage: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.text,
    lineHeight: 20,
    fontStyle: 'italic',
    marginBottom: SPACING.md,
    backgroundColor: COLORS.cardBackground,
    padding: SPACING.sm,
    borderRadius: 8,
  },
  actionRow: {
    borderTopWidth: 1,
    borderTopColor: COLORS.background,
    paddingTop: 12,
  },
  updateLabel: {
    fontSize: 12,
    fontFamily: FONTS.semiBold,
    color: COLORS.muted,
    marginBottom: SPACING.sm,
  },
  statusStepper: {
    flexDirection: 'row',
  },
  statusOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: COLORS.cardBackground,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  statusOptionActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  statusOptionText: {
    fontSize: 12,
    fontFamily: FONTS.semiBold,
    color: COLORS.muted,
  },
  statusOptionTextActive: {
    color: COLORS.white,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 20,
    opacity: 0.5,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  emptyText: {
    fontSize: 15,
    fontFamily: FONTS.regular,
    color: COLORS.muted,
    textAlign: 'center',
    lineHeight: 22,
  },
  chatButton: {
    marginTop: SPACING.sm,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.primary,
    alignItems: 'center',
  },
  chatButtonText: {
    fontSize: 12,
    fontFamily: FONTS.bold,
    color: COLORS.white,
  },
  completeButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: 16,
    alignItems: 'center',
  },
  completeButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontFamily: FONTS.bold,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
    zIndex: 2000,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
})
