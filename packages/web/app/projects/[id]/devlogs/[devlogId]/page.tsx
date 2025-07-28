import { ProjectDevlogDetailsPage } from './ProjectDevlogDetailsPage';

// Disable static generation for this page since it uses client-side features
export const dynamic = 'force-dynamic';

interface ProjectDevlogPageProps {
  params: {
    id: string;
    devlogId: string;
  };
}

export default function ProjectDevlogPage({ params }: ProjectDevlogPageProps) {
  return <ProjectDevlogDetailsPage projectId={params.id} devlogId={params.devlogId} />;
}
