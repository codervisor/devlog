import { ProjectDevlogDetailsPage } from './ProjectDevlogDetailsPage';
import { RouteParamParsers } from '@/lib/route-params';

// Disable static generation for this page since it uses client-side features
export const dynamic = 'force-dynamic';

interface ProjectDevlogPageProps {
  params: {
    id: string;
    devlogId: string;
  };
}

export default function ProjectDevlogPage({ params }: ProjectDevlogPageProps) {
  const { projectId, devlogId } = RouteParamParsers.parseDevlogParams(params);
  return <ProjectDevlogDetailsPage projectId={projectId} devlogId={devlogId} />;
}
