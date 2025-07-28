import { ProjectDetailsPage } from './ProjectDetailsPage';

// Disable static generation for this page since it uses client-side features
export const dynamic = 'force-dynamic';

interface ProjectPageProps {
  params: {
    id: string;
  };
}

export default function ProjectPage({ params }: ProjectPageProps) {
  return <ProjectDetailsPage projectId={params.id} />;
}
