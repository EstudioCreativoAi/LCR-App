import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { COLORS, SPACING, FONTS } from '../theme/theme'
import type { LeadStatus } from '../types/database'

type LeadListItemProps = {
  renterName: string
  propertyTitle: string
  status: LeadStatus
  date: string
  onPress?: () => void
  embedded?: boolean
}

export const LeadListItem = ({
  renterName,
  propertyTitle,
  status,
  date,
  onPress,
  embedded = false,
}: LeadListItemProps) => {
  const cardStyle = embedded ? styles.cardEmbedded : styles.card

  return (
    <TouchableOpacity style={cardStyle} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.renterName}>{renterName}</Text>
          <Text style={styles.date}>{date}</Text>
        </View>
        <Text style={styles.propertyTitle}>{propertyTitle}</Text>

        <View style={[styles.statusBadge, status === 'Interested' && styles.urgentBadge]}>
          <Text style={styles.statusText}>{status}</Text>
        </View>
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.background,
  },
  cardEmbedded: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  content: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  renterName: { fontFamily: FONTS.bold, fontSize: 16, color: COLORS.text },
  date: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.muted },
  propertyTitle: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: COLORS.muted,
    marginBottom: SPACING.sm,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: COLORS.cardBackground,
  },
  urgentBadge: { backgroundColor: '#FDECEA' },
  statusText: { fontFamily: FONTS.semiBold, fontSize: 12, color: COLORS.primary },
  chevron: { fontSize: 24, color: COLORS.secondary, marginLeft: SPACING.sm },
})
