import { HqShell } from '../_hq/HqShell';

export default function Layout({ children }: { children: React.ReactNode }) {
  return <HqShell console="vendor">{children}</HqShell>;
}
