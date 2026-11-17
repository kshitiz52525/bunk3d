import { Redirect, type Href } from 'expo-router';
import { useSession } from '@bunk3d/api';

const STEP_ROUTE: Record<string, Href> = {
  college: '/onboarding/college', verify: '/onboarding/verify', profile: '/onboarding/profile', interests: '/onboarding/interests', clubs: '/onboarding/clubs', guidelines: '/onboarding/guidelines', done: '/tea',
};

/** Gate: signed-out users see Welcome; others resume where onboarding stopped. */
export default function Index() {
  const session = useSession();
  if (!session) return <Redirect href="/welcome" />;
  return <Redirect href={STEP_ROUTE[session.onboarding]} />;
}
