// Monaco Editor configuration for Next.js with Webpack
// This sets up proper worker loading using webpack chunks instead of separate files

export function configureMonaco() {
  if (typeof window !== 'undefined') {
    // Set up Monaco Editor environment for webpack with proper dynamic imports
    (window as any).MonacoEnvironment = {
      getWorker: function (moduleId: string, label: string) {
        switch (label) {
          case 'json':
            return new Worker(
              new URL('monaco-editor/esm/vs/language/json/json.worker', import.meta.url)
            );
          case 'css':
          case 'scss':
          case 'less':
            return new Worker(
              new URL('monaco-editor/esm/vs/language/css/css.worker', import.meta.url)
            );
          case 'html':
          case 'handlebars':
          case 'razor':
            return new Worker(
              new URL('monaco-editor/esm/vs/language/html/html.worker', import.meta.url)
            );
          case 'typescript':
          case 'javascript':
            return new Worker(
              new URL('monaco-editor/esm/vs/language/typescript/ts.worker', import.meta.url)
            );
          default:
            return new Worker(
              new URL('monaco-editor/esm/vs/editor/editor.worker', import.meta.url)
            );
        }
      },
    };
  }
}
