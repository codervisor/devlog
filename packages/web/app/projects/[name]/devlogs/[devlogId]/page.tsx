import { ProjectDevlogDetailsPage } from './ProjectDevlogDetailsPage';
import { RouteParamParsers } from '@/lib';

interface ProjectDevlogPageProps {
  params: {
    id: string;
    devlogId: string;
  };
}

export default function ProjectDevlogPage({ params }: ProjectDevlogPageProps) {
  const { devlogId } = RouteParamParsers.parseDevlogParams(params);
  
  return <ProjectDevlogDetailsPage devlogId={devlogId} />;
}
