import { Redirect, type Href } from 'expo-router';
import { useSession } from '@bunk3d/api';

const STEP_ROUTE: Record<string, Href> = {
  college: '/college', verify: '/verify', profile: '/profile', interests: '/interests', clubs: '/clubs', guidelines: '/guidelines', done: '/feed',
};

/** Gate: signed-out users see Welcome; others resume where onboarding stopped. */
export default function Index() {
  const session = useSession();
  if (!session) return <Redirect href="/welcome" />;
  return <Redirect href={STEP_ROUTE[session.onboarding]} />;
}
