'use client';

import { ProjectDetailsPage } from './ProjectDetailsPage';
import { ProjectResolver } from '@/components/ProjectResolver';
import { RouteParamParsers } from '@/lib';

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
    >
      {(projectName, project) => (
        <ProjectDetailsPage projectName={projectName} />
      )}
    </ProjectResolver>
  );
}
