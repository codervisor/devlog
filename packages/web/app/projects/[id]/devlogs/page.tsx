import { ProjectDevlogListPage } from './ProjectDevlogListPage';

// Disable static generation for this page since it uses client-side features
export const dynamic = 'force-dynamic';

interface ProjectDevlogsPageProps {
  params: {
    id: string;
  };
}

export default function ProjectDevlogsPage({ params }: ProjectDevlogsPageProps) {
  return <ProjectDevlogListPage projectId={params.id} />;
}
