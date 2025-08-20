'use client';

import { ProjectDevlogDetailsPage } from './ProjectDevlogDetailsPage';
import { ProjectResolver } from '@/components/ProjectResolver';
import { RouteParamParsers } from '@/lib';

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
      {(projectName) => (
        <ProjectDevlogDetailsPage projectName={projectName} devlogId={devlogId} />
      )}
    </ProjectResolver>
  );
}
