import { ProjectDetailsPage } from './ProjectDetailsPage';
import { RouteParamParsers } from '@/lib/route-params';

// Disable static generation for this page since it uses client-side features
export const dynamic = 'force-dynamic';

interface ProjectPageProps {
  params: {
    id: string;
  };
}

export default function ProjectPage({ params }: ProjectPageProps) {
  const { projectId } = RouteParamParsers.parseProjectParams(params);
  return <ProjectDetailsPage projectId={projectId} />;
}
