import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '../src/lib/supabase'
import { COLORS, SPACING, FONTS } from '../src/theme/theme'

export default function UpdatePasswordScreen() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function handleUpdatePassword() {
    if (password.length < 6) {
      Alert.alert('Weak password', 'Password must be at least 6 characters.')
      return
    }
    if (password !== confirm) {
      Alert.alert('Mismatch', 'Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      setDone(true)
      setTimeout(() => router.replace('/(tabs)'), 1500)
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to update password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.header}>Los Cabos Rentals</Text>
        <Text style={styles.subHeader}>Set new password</Text>

        {done ? (
          <View style={styles.successBox}>
            <Text style={styles.successText}>
              Password updated! Redirecting you to the app…
            </Text>
          </View>
        ) : (
          <>
            <TextInput
              style={styles.input}
              placeholder="New password"
              placeholderTextColor={COLORS.muted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            <TextInput
              style={styles.input}
              placeholder="Confirm new password"
              placeholderTextColor={COLORS.muted}
              value={confirm}
              onChangeText={setConfirm}
              secureTextEntry
            />
            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleUpdatePassword}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.submitButtonText}>Update Password</Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    padding: SPACING.xl,
    justifyContent: 'center',
  },
  header: {
    fontSize: 32,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  subHeader: {
    fontSize: 16,
    color: COLORS.muted,
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },
  input: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.secondary,
    borderRadius: 12,
    padding: SPACING.md,
    fontSize: 16,
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  submitButtonText: {
    color: COLORS.white,
    fontFamily: FONTS.bold,
    fontSize: 16,
  },
  successBox: {
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: SPACING.lg,
  },
  successText: {
    fontSize: 14,
    fontFamily: FONTS.medium,
    color: '#2E7D32',
    textAlign: 'center',
    lineHeight: 20,
  },
})
