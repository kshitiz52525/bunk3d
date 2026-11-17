import { SectionView } from '../_hq/SectionView';
import { HQ } from '../_hq/sections';

export default function Page() {
  return <SectionView console="collab" id={HQ.collab.ids[0]} />;
}
