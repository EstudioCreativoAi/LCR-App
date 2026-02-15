import { useEffect } from 'react'
import { useRouter } from 'expo-router'
import LeadDashboard from '../../src/components/LeadDashboard'
import { useSession } from '../../src/providers/SessionProvider'

export default function LeadsScreen() {
  const { session, isDemo, role } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (role && role !== 'landlord' && role !== 'agent') {
      router.replace('/(tabs)')
    }
  }, [role])

  if (!role || (role !== 'landlord' && role !== 'agent')) return null
  if (!session) return null

  return <LeadDashboard isDemo={isDemo} session={session} />
}
