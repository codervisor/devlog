import { ProjectSettingsPage } from './ProjectSettingsPage';

// Disable static generation for this page since it uses client-side feature
export const dynamic = 'force-dynamic';

export default function ProjectSettings() {
  return <ProjectSettingsPage />;
}
