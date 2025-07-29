import { ProjectDevlogCreatePage } from './ProjectDevlogCreatePage';
import { RouteParamParsers } from '@/lib/route-params';

// Disable static generation for this page since it uses client-side features
export const dynamic = 'force-dynamic';

interface ProjectCreateDevlogPageProps {
  params: {
    id: string;
  };
}

export default function ProjectCreateDevlogPage({ params }: ProjectCreateDevlogPageProps) {
  const { projectId } = RouteParamParsers.parseProjectParams(params);
  return <ProjectDevlogCreatePage projectId={projectId} />;
}
