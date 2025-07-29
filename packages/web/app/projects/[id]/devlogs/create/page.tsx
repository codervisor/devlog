import { ProjectDevlogCreatePage } from './ProjectDevlogCreatePage';

// Disable static generation for this page since it uses client-side features
export const dynamic = 'force-dynamic';

interface ProjectCreateDevlogPageProps {
  params: {
    id: string;
  };
}

export default function ProjectCreateDevlogPage({ params }: ProjectCreateDevlogPageProps) {
  return <ProjectDevlogCreatePage projectId={parseInt(params.id, 10)} />;
}
