import { ProjectDetailsPage } from './ProjectDetailsPage';
import { ProjectResolver } from '@/components/ProjectResolver';
import { RouteParamParsers } from '@/lib';

// Disable static generation for this page since it uses client-side features
export const dynamic = 'force-dynamic';

interface ProjectPageProps {
  params: {
    id: string;
  };
}

export default function ProjectPage({ params }: ProjectPageProps) {
  const { projectIdentifier, identifierType } = RouteParamParsers.parseProjectParams(params);
  
  return (
    <ProjectResolver
      identifier={projectIdentifier}
      identifierType={identifierType}
      onNotFound={() => {
        // This will be handled in the ProjectResolver component
      }}
    >
      {(projectId, project) => (
        <ProjectDetailsPage projectId={projectId} />
      )}
    </ProjectResolver>
  );
}
