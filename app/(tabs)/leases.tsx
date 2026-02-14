import RenterLeaseDashboard from '../../src/components/RenterLeaseDashboard'
import { useSession } from '../../src/providers/SessionProvider'

export default function LeasesScreen() {
  const { session, isDemo } = useSession()
  if (!session) return null
  return <RenterLeaseDashboard isDemo={isDemo} session={session} />
}
