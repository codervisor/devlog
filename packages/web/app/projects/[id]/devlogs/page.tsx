import { ProjectDevlogListPage } from './ProjectDevlogListPage';
import { RouteParamParsers } from '@/lib';

// Disable static generation for this page since it uses client-side features
export const dynamic = 'force-dynamic';

interface ProjectDevlogsPageProps {
  params: {
    id: string;
  };
}

export default function ProjectDevlogsPage({ params }: ProjectDevlogsPageProps) {
  const { projectId } = RouteParamParsers.parseProjectParams(params);
  return <ProjectDevlogListPage projectId={projectId} />;
}
