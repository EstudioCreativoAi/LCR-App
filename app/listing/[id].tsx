import { View, Text, ActivityIndicator, StyleSheet } from 'react-native'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import PropertyDetail from '../../src/components/PropertyDetail'
import { supabase } from '../../src/lib/supabase'
import { COLORS } from '../../src/theme/theme'

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const [property, setProperty] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    supabase
      .from('properties')
      .select('*, profiles!properties_landlord_id_fkey(full_name, email)')
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (error) console.error('Error fetching property:', error)
        setProperty(data)
        setLoading(false)
      })
  }, [id])

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: 'Listing' }} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </>
    )
  }

  if (!property) {
    return (
      <>
        <Stack.Screen options={{ title: 'Not Found' }} />
        <View style={styles.center}>
          <Text>Property not found.</Text>
        </View>
      </>
    )
  }

  return (
    <>
      <Stack.Screen options={{ title: property.title || 'Listing', headerShown: false }} />
      <PropertyDetail property={property} onClose={() => router.back()} />
    </>
  )
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
})
