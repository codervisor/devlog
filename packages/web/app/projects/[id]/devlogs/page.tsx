import { ProjectDevlogListPage } from './ProjectDevlogListPage';
import { ProjectResolver } from '@/components/ProjectResolver';
import { RouteParamParsers } from '@/lib';

// Disable static generation for this page since it uses client-side features
export const dynamic = 'force-dynamic';

interface ProjectDevlogsPageProps {
  params: {
    id: string;
  };
}

export default function ProjectDevlogsPage({ params }: ProjectDevlogsPageProps) {
  const { projectIdentifier, identifierType } = RouteParamParsers.parseProjectParams(params);
  
  return (
    <ProjectResolver
      identifier={projectIdentifier}
      identifierType={identifierType}
    >
      {(projectId) => <ProjectDevlogListPage projectId={projectId} />}
    </ProjectResolver>
  );
}
