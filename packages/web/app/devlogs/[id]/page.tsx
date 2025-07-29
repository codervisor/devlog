import { DevlogDetailsPage } from './DevlogDetailsPage';
import { RouteParamParsers } from '@/lib/route-params';

// Disable static generation for this page since it uses client-side features
export const dynamic = 'force-dynamic';

interface DevlogPageProps {
  params: {
    id: string;
  };
}

export default function DevlogPage({ params }: DevlogPageProps) {
  const { devlogId } = RouteParamParsers.parseDevlogId(params);
  return <DevlogDetailsPage id={devlogId} />;
}
