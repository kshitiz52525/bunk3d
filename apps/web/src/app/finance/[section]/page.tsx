import { notFound } from 'next/navigation';
import { SectionView } from '../../_hq/SectionView';
import { HQ } from '../../_hq/sections';

export const dynamicParams = false;
export const generateStaticParams = () => HQ.finance.ids.slice(1).map((section) => ({ section }));

export default async function Page({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (!HQ.finance.ids.includes(section)) notFound();
  return <SectionView key={section} console="finance" id={section} />;
}
