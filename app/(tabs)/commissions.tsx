import CommissionTracker from '../../src/components/CommissionTracker'
import { useSession } from '../../src/providers/SessionProvider'

export default function CommissionsScreen() {
  const { isDemo } = useSession()
  return <CommissionTracker isDemo={isDemo} />
}
