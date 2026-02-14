import { Stack, useRouter } from 'expo-router'
import NotificationCenter from '../src/components/NotificationCenter'
import { useSession } from '../src/providers/SessionProvider'

export default function NotificationsModal() {
  const router = useRouter()
  const { session } = useSession()

  if (!session) return null

  return (
    <>
      <Stack.Screen options={{ presentation: 'modal', headerShown: false }} />
      <NotificationCenter
        userId={session.user.id}
        onClose={() => router.back()}
        onAction={(type) => {
          router.back()
          if (type === 'new_message' || type === 'lead_update') {
            router.push('/(tabs)/leads')
          } else if (type === 'lease_signed') {
            router.push('/(tabs)/commissions')
          }
        }}
      />
    </>
  )
}
