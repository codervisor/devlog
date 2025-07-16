// Monaco Editor configuration for Next.js with Webpack
// This sets up proper worker paths to avoid module resolution issues

export function configureMonaco() {
  if (typeof window !== 'undefined') {
    // Set up Monaco Editor environment for webpack
    (window as any).MonacoEnvironment = {
      getWorkerUrl: function (moduleId: string, label: string) {
        if (label === 'json') {
          return '/_next/static/json.worker.js';
        }
        if (label === 'css' || label === 'scss' || label === 'less') {
          return '/_next/static/css.worker.js';
        }
        if (label === 'html' || label === 'handlebars' || label === 'razor') {
          return '/_next/static/html.worker.js';
        }
        if (label === 'typescript' || label === 'javascript') {
          return '/_next/static/ts.worker.js';
        }
        return '/_next/static/editor.worker.js';
      },
    };
  }
}
