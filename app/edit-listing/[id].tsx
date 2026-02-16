import React, { useState, useEffect } from 'react'
import { View, ActivityIndicator, Alert, StyleSheet } from 'react-native'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { useSession } from '../../src/providers/SessionProvider'
import { supabase } from '../../src/lib/supabase'
import CreateListing from '../../src/components/CreateListing'
import { COLORS } from '../../src/theme/theme'
import type { Property } from '../../src/types/database'

export default function EditListingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { session, role } = useSession()
  const router = useRouter()
  const [property, setProperty] = useState<Property | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (role && role !== 'landlord' && role !== 'agent') {
      router.replace('/(tabs)')
    }
  }, [role])

  useEffect(() => {
    async function fetchProperty() {
      if (!id || !session?.user?.id) return
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('id', id)
        .single()

      if (error || !data) {
        Alert.alert('Error', 'Property not found.')
        router.back()
        return
      }

      const property = data as Property

      if (property.landlord_id !== session.user.id && property.agent_id !== session.user.id) {
        Alert.alert('Unauthorized', 'You do not own this property.')
        router.back()
        return
      }

      setProperty(property)
      setLoading(false)
    }
    fetchProperty()
  }, [id, session])

  if (loading || !property) {
    return (
      <View style={styles.loading}>
        <Stack.Screen options={{ presentation: 'modal', headerShown: false }} />
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    )
  }

  return (
    <>
      <Stack.Screen options={{ presentation: 'modal', headerShown: false }} />
      <CreateListing
        initialData={property}
        onClose={() => router.back()}
        onSuccess={() => router.back()}
      />
    </>
  )
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
})
