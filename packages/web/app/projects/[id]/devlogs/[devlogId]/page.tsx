import { ProjectDevlogDetailsPage } from './ProjectDevlogDetailsPage';
import { ProjectResolver } from '@/components/ProjectResolver';
import { RouteParamParsers } from '@/lib';

// Disable static generation for this page since it uses client-side features
export const dynamic = 'force-dynamic';

interface ProjectDevlogPageProps {
  params: {
    id: string;
    devlogId: string;
  };
}

export default function ProjectDevlogPage({ params }: ProjectDevlogPageProps) {
  const { projectIdentifier, identifierType, devlogId } = RouteParamParsers.parseDevlogParams(params);
  
  return (
    <ProjectResolver
      identifier={projectIdentifier}
      identifierType={identifierType}
    >
      {(projectId) => (
        <ProjectDevlogDetailsPage projectId={projectId} devlogId={devlogId} />
      )}
    </ProjectResolver>
  );
}
