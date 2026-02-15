import { useEffect } from 'react'
import { useRouter } from 'expo-router'
import CommissionTracker from '../../src/components/CommissionTracker'
import { useSession } from '../../src/providers/SessionProvider'

export default function CommissionsScreen() {
  const { isDemo, role } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (role && role !== 'agent') {
      router.replace('/(tabs)')
    }
  }, [role])

  if (!role || role !== 'agent') return null

  return <CommissionTracker isDemo={isDemo} />
}
