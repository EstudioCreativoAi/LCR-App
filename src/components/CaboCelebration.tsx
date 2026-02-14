import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  withTiming,
  withSequence,
  Easing,
  runOnJS,
} from 'react-native-reanimated'
import { FONTS } from '../theme/theme'

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window')
const CONFETTI_COUNT = 30
const CONFETTI_COLORS = ['#FFD700', '#FF6B6B', '#4ECDC4', '#FF8C00', '#FF0080', '#FFFFFF', '#45B7D1']

function ConfettiPiece({ index }: { index: number }) {
  const translateY = useSharedValue(-50)
  const translateX = useSharedValue(0)
  const rotate = useSharedValue(0)
  const opacity = useSharedValue(1)

  const startX = Math.random() * SCREEN_WIDTH
  const size = 6 + Math.random() * 8
  const color = CONFETTI_COLORS[index % CONFETTI_COLORS.length]
  const drift = (Math.random() - 0.5) * 200

  useEffect(() => {
    const delay = index * 60

    translateY.value = withDelay(
      delay,
      withTiming(SCREEN_HEIGHT + 100, { duration: 2500 + Math.random() * 1500, easing: Easing.out(Easing.quad) })
    )

    translateX.value = withDelay(
      delay,
      withTiming(drift, { duration: 2500 + Math.random() * 1500 })
    )

    rotate.value = withDelay(
      delay,
      withTiming(360 * (2 + Math.random() * 3), { duration: 3000 })
    )

    opacity.value = withDelay(
      delay + 2000,
      withTiming(0, { duration: 1000 })
    )
  }, [])

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { translateX: translateX.value },
      { rotate: `${rotate.value}deg` },
    ],
    opacity: opacity.value,
  }))

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: startX,
          top: -20,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        },
        animatedStyle,
      ]}
    />
  )
}

type CaboCelebrationProps = {
  firstName: string
  onDismiss: () => void
}

export default function CaboCelebration({ firstName, onDismiss }: CaboCelebrationProps) {
  const [showContinue, setShowContinue] = useState(false)

  const keyScale = useSharedValue(0)
  const keyOpacity = useSharedValue(0)
  const houseScale = useSharedValue(0)
  const houseOpacity = useSharedValue(0)
  const textOpacity = useSharedValue(0)

  useEffect(() => {
    // Phase 1: Key icon springs in
    keyScale.value = withSpring(1, { damping: 8, stiffness: 100 })
    keyOpacity.value = withTiming(1, { duration: 400 })

    // Phase 2: Key fades out, house scales in
    keyOpacity.value = withDelay(1200, withTiming(0, { duration: 400 }))
    keyScale.value = withDelay(1200, withTiming(0.5, { duration: 400 }))

    houseScale.value = withDelay(1400, withSpring(1, { damping: 8, stiffness: 100 }))
    houseOpacity.value = withDelay(1400, withTiming(1, { duration: 400 }))

    // Phase 3: Text fades in
    textOpacity.value = withDelay(2000, withTiming(1, { duration: 600 }))

    // Show continue button after 4s
    const timer = setTimeout(() => setShowContinue(true), 4000)
    return () => clearTimeout(timer)
  }, [])

  const keyAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: keyScale.value }],
    opacity: keyOpacity.value,
  }))

  const houseAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: houseScale.value }],
    opacity: houseOpacity.value,
  }))

  const textAnimatedStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }))

  const continueScale = useSharedValue(0)
  useEffect(() => {
    if (showContinue) {
      continueScale.value = withSpring(1, { damping: 10, stiffness: 120 })
    }
  }, [showContinue])

  const continueAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: continueScale.value }],
    opacity: continueScale.value,
  }))

  return (
    <TouchableOpacity
      style={StyleSheet.absoluteFill}
      activeOpacity={1}
      onPress={onDismiss}
    >
      <LinearGradient
        colors={['#FF8C00', '#FF4500', '#FF0080']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.container}
      >
        {/* Confetti */}
        {Array.from({ length: CONFETTI_COUNT }).map((_, i) => (
          <ConfettiPiece key={i} index={i} />
        ))}

        {/* Key Icon */}
        <Animated.View style={[styles.iconContainer, keyAnimatedStyle]}>
          <Text style={styles.icon}>🔑</Text>
        </Animated.View>

        {/* House Icon */}
        <Animated.View style={[styles.iconContainer, houseAnimatedStyle]}>
          <Text style={styles.icon}>🏠</Text>
        </Animated.View>

        {/* Welcome Text */}
        <Animated.View style={[styles.textContainer, textAnimatedStyle]}>
          <Text style={styles.welcomeText}>
            Welcome Home, {firstName}.
          </Text>
          <Text style={styles.subtitleText}>
            Your Cabo adventure begins.
          </Text>
        </Animated.View>

        {/* Continue Button */}
        {showContinue && (
          <Animated.View style={[styles.continueContainer, continueAnimatedStyle]}>
            <TouchableOpacity style={styles.continueButton} onPress={onDismiss}>
              <Text style={styles.continueText}>Continue</Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </LinearGradient>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 80,
  },
  textContainer: {
    position: 'absolute',
    bottom: '25%',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  welcomeText: {
    fontFamily: FONTS.bold,
    fontSize: 32,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitleText: {
    fontFamily: FONTS.medium,
    fontSize: 18,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  continueContainer: {
    position: 'absolute',
    bottom: '12%',
  },
  continueButton: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  continueText: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: '#FFFFFF',
  },
})
