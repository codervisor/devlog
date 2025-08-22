import { ProjectSettingsPage } from './project-settings-page';

// Disable static generation for this page since it uses client-side feature
export const dynamic = 'force-dynamic';

export default function ProjectSettings() {
  return <ProjectSettingsPage />;
}
