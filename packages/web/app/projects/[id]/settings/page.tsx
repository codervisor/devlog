import { ProjectSettingsPage } from './ProjectSettingsPage';
import { RouteParamParsers } from '@/lib';

// Disable static generation for this page since it uses client-side features
export const dynamic = 'force-dynamic';

interface ProjectSettingsPageProps {
  params: {
    id: string;
  };
}

export default function ProjectSettings({ params }: ProjectSettingsPageProps) {
  const { projectIdentifier } = RouteParamParsers.parseProjectParams(params);
  return <ProjectSettingsPage projectName={projectIdentifier} />;
}
