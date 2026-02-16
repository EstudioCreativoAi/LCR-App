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
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import SignatureCanvas from 'react-signature-canvas'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withSpring,
  Easing,
} from 'react-native-reanimated'
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
import { PenLine, X, Check } from 'lucide-react-native'
import { COLORS, SPACING, FONTS } from '../../src/theme/theme'
import type { LeaseTemplateData } from '../../src/templates/leaseTemplate'

type Phase = 'preview' | 'signing' | 'processing'

const INK_BLUE = '#000080'
const PARCHMENT = '#F5F0E8'
const PARCHMENT_DARK = '#E8E0D0'
const SEAL_RED = '#8B0000'

// Dimensions are now read reactively inside components via useWindowDimensions()

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

function ProcessingScreen({ text }: { text: string }) {
  const penX = useSharedValue(0)
  const penRotate = useSharedValue(-15)
  const dotOpacity1 = useSharedValue(0)
  const dotOpacity2 = useSharedValue(0)
  const dotOpacity3 = useSharedValue(0)

  useEffect(() => {
    penX.value = withRepeat(
      withSequence(
        withTiming(60, { duration: 1200, easing: Easing.bezier(0.4, 0, 0.6, 1) }),
        withTiming(0, { duration: 1200, easing: Easing.bezier(0.4, 0, 0.6, 1) })
      ),
      -1,
      false
    )
    penRotate.value = withRepeat(
      withSequence(
        withTiming(-5, { duration: 1200 }),
        withTiming(-15, { duration: 1200 })
      ),
      -1,
      false
    )
    dotOpacity1.value = withRepeat(
      withSequence(withTiming(1, { duration: 400 }), withTiming(0.3, { duration: 400 })),
      -1, true
    )
    dotOpacity2.value = withRepeat(
      withSequence(withTiming(0.3, { duration: 200 }), withTiming(1, { duration: 400 }), withTiming(0.3, { duration: 400 })),
      -1, true
    )
    dotOpacity3.value = withRepeat(
      withSequence(withTiming(0.3, { duration: 400 }), withTiming(0.3, { duration: 200 }), withTiming(1, { duration: 400 })),
      -1, true
    )
  }, [])

  const penStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: penX.value },
      { rotate: `${penRotate.value}deg` },
    ],
  }))

  const dot1 = useAnimatedStyle(() => ({ opacity: dotOpacity1.value }))
  const dot2 = useAnimatedStyle(() => ({ opacity: dotOpacity2.value }))
  const dot3 = useAnimatedStyle(() => ({ opacity: dotOpacity3.value }))

  return (
    <View style={styles.processingContainer}>
      <View style={styles.processingCard}>
        <Animated.View style={[styles.processingPen, penStyle]}>
          <PenLine size={40} color={COLORS.primary} strokeWidth={2} />
        </Animated.View>
        <View style={styles.processingLine} />
        <Text style={styles.processingText}>{text}</Text>
        <View style={styles.processingDots}>
          <Animated.View style={[styles.dot, dot1]} />
          <Animated.View style={[styles.dot, dot2]} />
          <Animated.View style={[styles.dot, dot3]} />
        </View>
      </View>
    </View>
  )
}

function SigningPhase({
  sigCanvasRef,
  renterName,
  onCancel,
  onClear,
  onDone,
}: {
  sigCanvasRef: React.RefObject<SignatureCanvas>
  renterName: string
  onCancel: () => void
  onClear: () => void
  onDone: () => void
}) {
  const insets = useSafeAreaInsets()
  const bottomPad = Math.max(insets.bottom, 16)
  const [canvasSize, setCanvasSize] = useState({ width: 400, height: 300 })

  const handleCanvasLayout = useCallback(
    (e: { nativeEvent: { layout: { width: number; height: number } } }) => {
      const { width, height } = e.nativeEvent.layout
      if (width > 0 && height > 0) {
        setCanvasSize({ width: Math.floor(width), height: Math.floor(height) })
      }
    },
    []
  )

  return (
    <SafeAreaView style={styles.sigContainer} edges={['top', 'left', 'right']}>
      {/* Top bar: Cancel (X) + Title */}
      <View style={styles.sigHeader}>
        <TouchableOpacity
          onPress={onCancel}
          style={styles.sigCancelBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <X size={18} color={COLORS.white} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.sigTitle}>Your Signature</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* Parchment signature area — flex: 1 fills available space */}
      <View style={styles.parchmentFrame}>
        <Text style={styles.parchmentLabel}>
          I, {renterName}, hereby sign this lease agreement
        </Text>

        <View style={styles.parchmentRule} />

        {/* Canvas container: parchment background, touch-action: none */}
        <View
          style={styles.sigCanvasOuter}
          onLayout={handleCanvasLayout}
        >
          <SignatureCanvas
            key={`${canvasSize.width}x${canvasSize.height}`}
            ref={sigCanvasRef}
            penColor={INK_BLUE}
            minWidth={1.5}
            maxWidth={3.5}
            velocityFilterWeight={0.7}
            canvasProps={{
              width: canvasSize.width,
              height: canvasSize.height,
              style: {
                backgroundColor: 'transparent',
                touchAction: 'none',
                width: '100%',
                height: '100%',
              },
            }}
          />
        </View>

        <View style={styles.signatureXRow}>
          <Text style={styles.signatureX}>X</Text>
          <View style={styles.signatureBaseline} />
        </View>
      </View>

      {/* Ink color indicator */}
      <View style={styles.inkIndicator}>
        <View style={[styles.inkDot, { backgroundColor: INK_BLUE }]} />
        <Text style={styles.inkLabel}>Ink Blue</Text>
      </View>

      {/* Sticky bottom control bar */}
      <View style={[styles.sigBottomBar, { paddingBottom: bottomPad }]}>
        <TouchableOpacity style={styles.sigClearBtn} onPress={onClear}>
          <Text style={styles.sigClearText}>Clear</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.sigDoneBtn} onPress={onDone}>
          <Text style={styles.sigDoneText}>Complete</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const FLOATING_BAR_HEIGHT = 120

function PreviewPhase({
  property,
  lease,
  previewHtml,
  agreed,
  onToggleAgreed,
  onSign,
  onBack,
}: {
  property: any
  lease: any
  previewHtml: string
  agreed: boolean
  onToggleAgreed: () => void
  onSign: () => void
  onBack: () => void
}) {
  const insets = useSafeAreaInsets()
  const bottomPad = Math.max(insets.bottom, 16)

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: FLOATING_BAR_HEIGHT + bottomPad + 20 }]}>
        {/* Back button */}
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        {/* Document header */}
        <View style={styles.docHeader}>
          <View style={styles.sealBadge}>
            <Text style={styles.sealText}>LCR</Text>
          </View>
          <View style={styles.docHeaderText}>
            <Text style={styles.title}>Lease Agreement</Text>
            <Text style={styles.subtitle}>
              {property?.address}, {property?.city}
            </Text>
          </View>
        </View>

        {/* Quick terms summary */}
        <View style={styles.termsSummary}>
          <View style={styles.termItem}>
            <Text style={styles.termLabel}>Rent</Text>
            <Text style={styles.termValue}>{formatPrice(lease?.monthly_rent || 0)}</Text>
          </View>
          <View style={styles.termDivider} />
          <View style={styles.termItem}>
            <Text style={styles.termLabel}>Deposit</Text>
            <Text style={styles.termValue}>{formatPrice(lease?.deposit_amount || 0)}</Text>
          </View>
          <View style={styles.termDivider} />
          <View style={styles.termItem}>
            <Text style={styles.termLabel}>Term</Text>
            <Text style={styles.termValue}>
              {lease ? Math.round((new Date(lease.end_date).getTime() - new Date(lease.start_date).getTime()) / (30.44 * 86400000)) : 12} mo
            </Text>
          </View>
        </View>

        {/* Lease document preview */}
        <View style={styles.leasePreviewCard}>
          <View style={styles.previewHeader}>
            <Text style={styles.previewHeaderText}>FULL AGREEMENT</Text>
            <View style={styles.previewHeaderLine} />
          </View>
          {Platform.OS === 'web' ? (
            <div
              style={{
                fontSize: '12px',
                lineHeight: '1.6',
                maxHeight: 450,
                overflowY: 'auto' as any,
                padding: '20px 24px',
                fontFamily: 'Georgia, serif',
              }}
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          ) : (
            <Text style={styles.leasePreviewFallback}>
              Lease preview is available on web. Please review and sign.
            </Text>
          )}
        </View>

        {/* Agreement checkbox — stays inline so user scrolls to it */}
        <TouchableOpacity
          style={styles.checkboxRow}
          onPress={onToggleAgreed}
          activeOpacity={0.7}
        >
          <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
            {agreed && <Check size={16} color={COLORS.white} strokeWidth={2} />}
          </View>
          <Text style={styles.checkboxLabel}>
            I have read and agree to the terms of this lease agreement
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Floating Sign button with gradient fade */}
      <View style={[styles.floatingBar, { paddingBottom: bottomPad }]}>
        <LinearGradient
          colors={['rgba(229,220,205,0)', 'rgba(229,220,205,0.95)', COLORS.background]}
          style={styles.floatingBarGradient}
          pointerEvents="none"
        />
        <View style={styles.floatingBarContent}>
          <TouchableOpacity
            style={[styles.signButton, !agreed && styles.signButtonDisabled]}
            onPress={onSign}
            disabled={!agreed}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={agreed ? [INK_BLUE, '#000066'] : ['#999', '#888']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.signButtonGradient}
            >
              <PenLine size={20} color={COLORS.white} strokeWidth={2} />
              <Text style={styles.signButtonText}>Sign Lease Agreement</Text>
            </LinearGradient>
          </TouchableOpacity>
          <Text style={styles.legalNote}>
            By signing, you enter a binding residential lease under the laws of Baja California Sur, Mexico.
          </Text>
        </View>
      </View>
    </View>
  )
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
  const [processingText, setProcessingText] = useState('Preparing your lease...')

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

      setProcessingText('Generating your lease document...')
      const pdfBlob = await generateLeasePdf(templateData)

      setProcessingText('Uploading signature...')
      const signatureUrl = await uploadSignature(lease.id, signatureBase64)

      setProcessingText('Uploading lease document...')
      const documentUrl = await uploadLeasePdf(lease.id, pdfBlob)

      setProcessingText('Finalizing lease...')
      await finalizeLease(lease.id, signatureUrl, documentUrl)

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

  if (phase === 'processing') {
    return <ProcessingScreen text={processingText} />
  }

  // Phase 2: Signature pad — full-screen landscape parchment
  if (phase === 'signing') {
    return <SigningPhase
      sigCanvasRef={sigCanvasRef}
      renterName={renterName}
      onCancel={() => router.back()}
      onClear={handleClearSignature}
      onDone={handleDoneSignature}
    />
  }

  // Phase 1: Lease preview with document-style design
  return <PreviewPhase
    property={property}
    lease={lease}
    previewHtml={previewHtml}
    agreed={agreed}
    onToggleAgreed={() => setAgreed(!agreed)}
    onSign={handleSign}
    onBack={() => router.back()}
  />
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
    paddingTop: Platform.OS === 'web' ? 24 : 50,
    maxWidth: 680,
    alignSelf: 'center',
    width: '100%',
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
  // Document header with seal
  docHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  sealBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: SEAL_RED,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowColor: SEAL_RED,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  sealText: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: '#FFD700',
    letterSpacing: 2,
  },
  docHeaderText: {
    flex: 1,
  },
  title: {
    fontFamily: FONTS.bold,
    fontSize: 26,
    color: COLORS.text,
    marginBottom: 2,
  },
  subtitle: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.muted,
  },
  // Terms summary bar
  termsSummary: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    alignItems: 'center',
    shadowColor: COLORS.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  termItem: {
    flex: 1,
    alignItems: 'center',
  },
  termLabel: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: COLORS.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 2,
  },
  termValue: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: COLORS.text,
  },
  termDivider: {
    width: 1,
    height: 30,
    backgroundColor: COLORS.background,
  },
  // Lease preview
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
  previewHeader: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  previewHeaderText: {
    fontFamily: FONTS.semiBold,
    fontSize: 11,
    color: COLORS.muted,
    letterSpacing: 2,
    marginBottom: 8,
  },
  previewHeaderLine: {
    height: 1,
    backgroundColor: COLORS.background,
  },
  leasePreviewFallback: {
    padding: SPACING.lg,
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.muted,
    textAlign: 'center',
  },
  // Checkbox
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
    backgroundColor: INK_BLUE,
    borderColor: INK_BLUE,
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
  // Sign button
  signButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: INK_BLUE,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 5,
  },
  signButtonDisabled: {
    opacity: 0.4,
    shadowOpacity: 0,
  },
  signButtonGradient: {
    minHeight: 58,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  signButtonText: {
    fontFamily: FONTS.bold,
    fontSize: 17,
    color: COLORS.white,
    textAlign: 'center',
  },
  legalNote: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: COLORS.muted,
    textAlign: 'center',
    marginTop: SPACING.sm,
    lineHeight: 16,
  },
  // Floating bottom bar
  floatingBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  floatingBarGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: -32,
    height: 32,
  },
  floatingBarContent: {
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    maxWidth: 680,
    alignSelf: 'center',
    width: '100%',
  },
  // ── Signature pad (Phase 2) ──
  sigContainer: {
    flex: 1,
    backgroundColor: '#2C2C2E',
  },
  sigHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sigCancelBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sigTitle: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: COLORS.white,
  },
  // Parchment frame — flex: 1 fills available space between header and bottom bar
  parchmentFrame: {
    flex: 1,
    backgroundColor: PARCHMENT,
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 6,
  },
  parchmentRule: {
    height: 2,
    backgroundColor: PARCHMENT_DARK,
    marginVertical: 8,
  },
  parchmentLabel: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 8,
  },
  // Canvas outer: parchment ruled-line background, canvas transparent on top
  sigCanvasOuter: {
    flex: 1,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: PARCHMENT,
    backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 31px, ${PARCHMENT_DARK} 31px, ${PARCHMENT_DARK} 32px)`,
    backgroundPosition: '0 24px',
  } as any,
  signatureXRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: 8,
    paddingHorizontal: 4,
  },
  signatureX: {
    fontFamily: FONTS.bold,
    fontSize: 20,
    color: '#999',
    marginRight: 8,
  },
  signatureBaseline: {
    flex: 1,
    height: 1,
    backgroundColor: '#CCC',
    marginBottom: 4,
  },
  // Ink indicator
  inkIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 6,
  },
  inkDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  inkLabel: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
  },
  // Bottom control bar
  sigBottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 12,
  },
  sigClearBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
  },
  sigClearText: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: COLORS.white,
  },
  sigDoneBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: INK_BLUE,
    alignItems: 'center',
  },
  sigDoneText: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: COLORS.white,
  },
  // ── Processing (Phase 3) ──
  processingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: SPACING.xl,
  },
  processingCard: {
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 40,
    paddingHorizontal: 50,
    shadowColor: COLORS.text,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 4,
  },
  processingPen: {
    fontSize: 48,
    marginBottom: 8,
  },
  processingLine: {
    width: 120,
    height: 2,
    backgroundColor: INK_BLUE,
    borderRadius: 1,
    marginBottom: 20,
    opacity: 0.3,
  },
  processingText: {
    fontFamily: FONTS.semiBold,
    fontSize: 16,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 16,
  },
  processingDots: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: INK_BLUE,
  },
})
