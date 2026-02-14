import LeadDashboard from '../../src/components/LeadDashboard'
import { useSession } from '../../src/providers/SessionProvider'

export default function LeadsScreen() {
  const { session, isDemo } = useSession()
  if (!session) return null
  return <LeadDashboard isDemo={isDemo} session={session} />
}
