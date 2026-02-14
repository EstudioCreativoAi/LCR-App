import { Stack, useRouter } from 'expo-router'
import CreateListing from '../src/components/CreateListing'

export default function CreateListingModal() {
  const router = useRouter()

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
