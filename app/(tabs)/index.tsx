import PropertyFeed from '../../src/components/PropertyFeed'
import { useSession } from '../../src/providers/SessionProvider'

export default function HomeScreen() {
  const { role, isDemo } = useSession()
  return <PropertyFeed role={role || 'renter'} isDemo={isDemo} />
}
