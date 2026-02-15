import { useEffect } from 'react'
import { Stack, useRouter } from 'expo-router'
import CreateListing from '../src/components/CreateListing'
import { useSession } from '../src/providers/SessionProvider'

export default function CreateListingModal() {
  const router = useRouter()
  const { role } = useSession()

  useEffect(() => {
    if (role && role !== 'landlord' && role !== 'agent') {
      router.replace('/(tabs)')
    }
  }, [role])

  if (!role || (role !== 'landlord' && role !== 'agent')) return null

  return (
    <>
      <Stack.Screen options={{ presentation: 'modal', headerShown: false }} />
      <CreateListing
        onClose={() => router.back()}
        onSuccess={() => router.back()}
      />
    </>
  )
}
