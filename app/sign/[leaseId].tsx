import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  Dimensions,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import SignatureCanvas from 'react-signature-canvas'
import { useSession } from '../../src/providers/SessionProvider'
import { supabase } from '../../src/lib/supabase'
import { generateLeasePreviewHtml } from '../../src/templates/leaseTemplate'
import {
  generateLeasePdf,
  uploadSignature,
  uploadLeasePdf,
  finalizeLease,
} from '../../src/services/leaseDocumentService'
import { formatPrice } from '../../src/utils/currency'
import { COLORS, SPACING, FONTS } from '../../src/theme/theme'
import type { Lease, Property, Profile } from '../../src/types/database'
import type { LeaseTemplateData } from '../../src/templates/leaseTemplate'

type Phase = 'preview' | 'signing' | 'processing'

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window')

const DEMO_LEASE_DATA = {
  id: 'demo-lease-1',
  property_id: 'demo-prop-1',
  renter_id: 'demo-renter',
  start_date: new Date().toISOString().split('T')[0],
  end_date: new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
  status: 'sent_for_signature',
  monthly_rent: 25000,
  deposit_amount: 25000,
}

export default function SignLeaseScreen() {
  const { leaseId } = useLocalSearchParams<{ leaseId: string }>()
  const { session, isDemo } = useSession()
  const router = useRouter()
  const sigCanvasRef = useRef<SignatureCanvas>(null)

  const [phase, setPhase] = useState<Phase>('preview')
  const [lease, setLease] = useState<any>(null)
  const [property, setProperty] = useState<any>(null)
  const [landlordName, setLandlordName] = useState('')
  const [renterName, setRenterName] = useState('')
  const [loading, setLoading] = useState(true)
  const [agreed, setAgreed] = useState(false)
  const [previewHtml, setPreviewHtml] = useState('')
  const [processingText, setProcessingText] = useState('Generating your lease document...')

  const fetchLeaseData = useCallback(async () => {
    try {
      if (isDemo) {
        setLease(DEMO_LEASE_DATA)
        setProperty({ address: '123 Calle Marina', city: 'Cabo San Lucas' })
        setLandlordName('Carlos Rodriguez')
        setRenterName('Demo User')
        setLoading(false)
        return
      }

      const { data: leaseData, error } = await (supabase.from('leases') as any)
        .select(`
          *,
          properties:property_id(id, address, city, landlord_id)
        `)
        .eq('id', leaseId)
        .single()

      if (error || !leaseData) throw new Error('Lease not found')

      setLease(leaseData)
      setProperty(leaseData.properties)

      if (leaseData.properties?.landlord_id) {
        const { data: ll } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', leaseData.properties.landlord_id)
          .single()
        setLandlordName(ll?.full_name || 'Landlord')
      }

      if (session?.user?.id) {
        const { data: renter } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', session.user.id)
          .single()
        setRenterName(renter?.full_name || 'Tenant')
      }
    } catch (err: any) {
      console.error('Error fetching lease:', err)
      Alert.alert('Error', 'Failed to load lease details.')
      router.back()
    } finally {
      setLoading(false)
    }
  }, [leaseId, isDemo, session])

  useEffect(() => {
    fetchLeaseData()
  }, [fetchLeaseData])

  useEffect(() => {
    if (!lease || !property) return

    const months = Math.round(
      (new Date(lease.end_date).getTime() - new Date(lease.start_date).getTime()) / (30.44 * 86400000)
    )

    const html = generateLeasePreviewHtml({
      landlordName,
      renterName,
      propertyAddress: property.address || '',
      propertyCity: property.city || '',
      monthlyRent: lease.monthly_rent || 0,
      depositAmount: lease.deposit_amount || 0,
      startDate: lease.start_date,
      endDate: lease.end_date,
      leaseMonths: months,
    })
    setPreviewHtml(html)
  }, [lease, property, landlordName, renterName])

  const handleSign = () => {
    if (!agreed) {
      Alert.alert('Agreement Required', 'Please check the box to confirm you have read the lease terms.')
      return
    }
    setPhase('signing')
  }

  const handleClearSignature = () => {
    sigCanvasRef.current?.clear()
  }

  const handleDoneSignature = async () => {
    if (!sigCanvasRef.current || sigCanvasRef.current.isEmpty()) {
      Alert.alert('Signature Required', 'Please sign before continuing.')
      return
    }

    const signatureBase64 = sigCanvasRef.current.getTrimmedCanvas().toDataURL('image/png')
    setPhase('processing')

    try {
      const months = Math.round(
        (new Date(lease.end_date).getTime() - new Date(lease.start_date).getTime()) / (30.44 * 86400000)
      )

      const templateData: LeaseTemplateData = {
        landlordName,
        renterName,
        propertyAddress: property.address || '',
        propertyCity: property.city || '',
        monthlyRent: lease.monthly_rent || 0,
        depositAmount: lease.deposit_amount || 0,
        startDate: lease.start_date,
        endDate: lease.end_date,
        leaseMonths: months,
        signatureBase64,
        signedDate: new Date().toISOString(),
      }

      if (isDemo) {
        setProcessingText('Generating PDF...')
        await new Promise(r => setTimeout(r, 800))
        setProcessingText('Uploading documents...')
        await new Promise(r => setTimeout(r, 700))
        setProcessingText('Finalizing lease...')
        await new Promise(r => setTimeout(r, 500))
        router.replace(`/pay/${leaseId}`)
        return
      }

      // 1. Generate PDF
      setProcessingText('Generating your lease document...')
      const pdfBlob = await generateLeasePdf(templateData)

      // 2. Upload signature
      setProcessingText('Uploading signature...')
      const signatureUrl = await uploadSignature(lease.id, signatureBase64)

      // 3. Upload PDF
      setProcessingText('Uploading lease document...')
      const documentUrl = await uploadLeasePdf(lease.id, pdfBlob)

      // 4. Finalize lease
      setProcessingText('Finalizing lease...')
      await finalizeLease(lease.id, signatureUrl, documentUrl)

      // 5. Navigate to payment
      router.replace(`/pay/${leaseId}`)
    } catch (err: any) {
      console.error('Signing error:', err)
      Alert.alert('Error', err.message || 'Failed to process signature. Please try again.')
      setPhase('signing')
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    )
  }

  // Phase 3: Processing overlay
  if (phase === 'processing') {
    return (
      <View style={styles.processingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.processingText}>{processingText}</Text>
      </View>
    )
  }

  // Phase 2: Signature pad (landscape)
  if (phase === 'signing') {
    const isSmallScreen = SCREEN_WIDTH < 768
    const canvasWidth = isSmallScreen ? Math.max(SCREEN_WIDTH, SCREEN_HEIGHT) - 40 : SCREEN_WIDTH - 80
    const canvasHeight = isSmallScreen ? Math.min(SCREEN_WIDTH, SCREEN_HEIGHT) - 120 : 400

    return (
      <View style={[
        styles.sigContainer,
        isSmallScreen && styles.sigContainerLandscape,
      ]}>
        <View style={[
          styles.sigInner,
          isSmallScreen && {
            transform: [{ rotate: '90deg' }],
            width: SCREEN_HEIGHT,
            height: SCREEN_WIDTH,
          },
        ]}>
          <View style={styles.sigHeader}>
            <Text style={styles.sigTitle}>Sign below</Text>
            <View style={styles.sigActions}>
              <TouchableOpacity style={styles.sigClearBtn} onPress={handleClearSignature}>
                <Text style={styles.sigClearText}>Clear</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.sigDoneBtn} onPress={handleDoneSignature}>
                <Text style={styles.sigDoneText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.sigCanvasWrapper}>
            <SignatureCanvas
              ref={sigCanvasRef}
              penColor="#000000"
              minWidth={1.5}
              maxWidth={3}
              canvasProps={{
                width: canvasWidth,
                height: canvasHeight,
                style: {
                  backgroundColor: '#fff',
                  borderRadius: 12,
                  border: '2px solid #ddd',
                },
              }}
            />
          </View>
          <TouchableOpacity
            style={styles.sigCancelBtn}
            onPress={() => setPhase('preview')}
          >
            <Text style={styles.sigCancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  // Phase 1: Lease preview
  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Back button */}
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Your Lease Agreement</Text>
        <Text style={styles.subtitle}>
          {property?.address}, {property?.city}
        </Text>

        {/* Lease document preview */}
        <View style={styles.leasePreviewCard}>
          {Platform.OS === 'web' ? (
            <div
              style={{
                fontSize: '12px',
                lineHeight: '1.5',
                maxHeight: 500,
                overflowY: 'auto' as any,
                padding: '16px',
              }}
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          ) : (
            <Text style={styles.leasePreviewFallback}>
              Lease preview is available on web. Please review and sign.
            </Text>
          )}
        </View>

        {/* Agreement checkbox */}
        <TouchableOpacity
          style={styles.checkboxRow}
          onPress={() => setAgreed(!agreed)}
          activeOpacity={0.7}
        >
          <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
            {agreed && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={styles.checkboxLabel}>
            I have read and agree to the terms of this lease agreement
          </Text>
        </TouchableOpacity>

        {/* Sign button */}
        <TouchableOpacity
          style={[styles.signButton, !agreed && styles.signButtonDisabled]}
          onPress={handleSign}
          disabled={!agreed}
          activeOpacity={0.8}
        >
          <Text style={styles.signButtonText}>Sign Lease</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingTop: Platform.OS === 'web' ? 20 : 50,
    paddingBottom: 60,
  },
  backButton: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: SPACING.lg,
  },
  backText: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: COLORS.text,
  },
  title: {
    fontFamily: FONTS.bold,
    fontSize: 24,
    color: COLORS.text,
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.muted,
    marginBottom: SPACING.lg,
  },
  leasePreviewCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: SPACING.lg,
    shadowColor: COLORS.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  leasePreviewFallback: {
    padding: SPACING.lg,
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.muted,
    textAlign: 'center',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xl,
    paddingHorizontal: 4,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.muted,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  checkmark: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
  signButton: {
    backgroundColor: COLORS.primary,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  signButtonDisabled: {
    opacity: 0.4,
  },
  signButtonText: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: COLORS.white,
  },
  // Signature pad styles
  sigContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sigContainerLandscape: {
    overflow: 'hidden',
  },
  sigInner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  sigHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
  },
  sigTitle: {
    fontFamily: FONTS.bold,
    fontSize: 20,
    color: COLORS.text,
  },
  sigActions: {
    flexDirection: 'row',
    gap: 12,
  },
  sigClearBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.muted,
  },
  sigClearText: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: COLORS.text,
  },
  sigDoneBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
  },
  sigDoneText: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: COLORS.white,
  },
  sigCanvasWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  sigCancelBtn: {
    marginTop: 16,
    paddingVertical: 10,
  },
  sigCancelText: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: COLORS.muted,
  },
  // Processing
  processingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: SPACING.xl,
  },
  processingText: {
    fontFamily: FONTS.semiBold,
    fontSize: 16,
    color: COLORS.text,
    marginTop: SPACING.lg,
    textAlign: 'center',
  },
})
