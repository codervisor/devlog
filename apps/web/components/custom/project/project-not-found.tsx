import Link from 'next/link';

export function ProjectNotFound() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Project Not Found</h1>
        <p className="text-gray-600 mb-4">
          The requested project could not be found.
        </p>
        <Link 
          href="/projects"
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 inline-block"
        >
          Back to Projects
        </Link>
      </div>
    </div>
  );
}