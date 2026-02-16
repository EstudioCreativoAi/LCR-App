import RenterLeaseDashboard from '../../src/components/RenterLeaseDashboard'
import LandlordLeaseDashboard from '../../src/components/LandlordLeaseDashboard'
import { useSession } from '../../src/providers/SessionProvider'

export default function LeasesScreen() {
  const { session, isDemo, role } = useSession()

  if (!session) return null

  if (role === 'landlord' || role === 'agent') {
    return <LandlordLeaseDashboard isDemo={isDemo} session={session} />
  }

  return <RenterLeaseDashboard isDemo={isDemo} session={session} />
}
