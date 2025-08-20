'use client';

import { ProjectDevlogListPage } from './ProjectDevlogListPage';
import { ProjectResolver } from '@/components/ProjectResolver';
import { RouteParamParsers } from '@/lib';

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
      {(projectName) => <ProjectDevlogListPage projectName={projectName} />}
    </ProjectResolver>
  );
}
