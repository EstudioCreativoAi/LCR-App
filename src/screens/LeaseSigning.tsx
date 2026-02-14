import React from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native'
import { COLORS, SPACING, FONTS } from '../theme/theme'

export const LeaseSigning = ({ navigation }: any) => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Review & Sign Lease</Text>
        <Text style={styles.headerSubtitle}>Modern Villa • 12 Month Term</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.documentCard}>
          <Text style={styles.docTitle}>Residential Lease Agreement</Text>
          <View style={styles.divider} />
          <Text style={styles.docText}>
            This lease is entered into between the Landlord and the Tenant...
            {'\n\n'}
            1. RENT: The monthly rent is $45,000 MXN.
            {'\n'}
            2. TERM: The term begins on March 1, 2026.
            {'\n'}
            3. DEPOSIT: A security deposit of $45,000 MXN is required.
            {'\n\n'}
            [Full legal text would be injected here from DocuSign/PDF API]
          </Text>
        </View>

        <Text style={styles.label}>Signature</Text>
        <View style={styles.signaturePad}>
          <Text style={styles.signaturePlaceholder}>Sign here with your finger</Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.signButton}>
          <Text style={styles.signButtonText}>Sign & Complete</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { padding: SPACING.lg, backgroundColor: COLORS.white },
  headerTitle: { fontFamily: FONTS.bold, fontSize: 24, color: COLORS.text },
  headerSubtitle: { fontFamily: FONTS.regular, fontSize: 14, color: COLORS.muted },
  scrollContent: { padding: SPACING.md },
  documentCard: {
    backgroundColor: COLORS.white,
    padding: SPACING.lg,
    borderRadius: 12,
    marginBottom: SPACING.lg,
    shadowColor: COLORS.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  docTitle: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  divider: { height: 1, backgroundColor: COLORS.background, marginVertical: SPACING.md },
  docText: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 20,
  },
  label: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  signaturePad: {
    height: 150,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: COLORS.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  signaturePlaceholder: { fontFamily: FONTS.regular, color: COLORS.muted, fontSize: 14 },
  footer: {
    flexDirection: 'row',
    padding: SPACING.md,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.background,
    gap: 12,
  },
  backButton: { flex: 1, height: 50, justifyContent: 'center', alignItems: 'center' },
  backText: { fontFamily: FONTS.semiBold, color: COLORS.muted },
  signButton: {
    flex: 2,
    height: 50,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  signButtonText: { fontFamily: FONTS.bold, color: COLORS.white, fontSize: 16 },
})
