// Content Security Policy for the built app, written into index.html as a
// <meta> tag so it applies wherever the files are hosted. Scripts come only
// from this site; the API is the one other place the app talks to.
// Styles stay 'unsafe-inline' because PrimeVue and the print window inject
// <style> elements at runtime.

const origin = (url) => {
  try {
    return new URL(url).origin;
  } catch {
    return '';
  }
};

export function contentSecurityPolicy(env, { dev = false } = {}) {
  const api = origin(env.VITE_API_BASE_URL || '');
  const directives = {
    'default-src': ["'self'"],
    'script-src': ["'self'"],
    'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
    'font-src': ["'self'", 'data:', 'https://fonts.gstatic.com'],
    'img-src': ["'self'", 'data:', 'blob:', api],
    // Vite's hot reload talks over a websocket while developing.
    'connect-src': ["'self'", api, ...(dev ? ['ws:', 'wss:'] : [])],
    // PDF previews are blob: URLs shown in an iframe.
    'frame-src': ["'self'", 'blob:', api],
    'worker-src': ["'self'", 'blob:'],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
  };
  return Object.entries(directives)
    .map(([name, sources]) => [name, ...sources.filter(Boolean)].join(' '))
    .join('; ');
}

/** Vite plugin: puts the policy at the top of <head>. */
export function cspPlugin(env, options) {
  return {
    name: 'trab-csp',
    transformIndexHtml() {
      return [
        {
          tag: 'meta',
          attrs: { 'http-equiv': 'Content-Security-Policy', content: contentSecurityPolicy(env, options) },
          injectTo: 'head-prepend',
        },
      ];
    },
  };
}
