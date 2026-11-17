import { SectionView } from '../_hq/SectionView';
import { HQ } from '../_hq/sections';

export default function Page() {
  return <SectionView console="college" id={HQ.college.ids[0]} />;
}
