import { useEffect } from 'react'
import { useRouter } from 'expo-router'
import RenterLeaseDashboard from '../../src/components/RenterLeaseDashboard'
import { useSession } from '../../src/providers/SessionProvider'

export default function LeasesScreen() {
  const { session, isDemo, role } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (role && role !== 'renter') {
      router.replace('/(tabs)')
    }
  }, [role])

  if (!role || role !== 'renter') return null
  if (!session) return null

  return <RenterLeaseDashboard isDemo={isDemo} session={session} />
}
