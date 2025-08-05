import { redirect } from 'next/navigation';

// Disable static generation for this page since it redirects
export const dynamic = 'force-dynamic';

export default function Home() {
  // Redirect to the projects page as the main entry point
  redirect('/projects');
}
