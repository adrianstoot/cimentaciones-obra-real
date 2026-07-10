/** Resolve runtime public assets in both Vite development and GitHub Pages. */
export function assetPath(path) {
  const cleanPath = String(path ?? '').replace(/^\/+/, '');
  const base = (import.meta.env.BASE_URL || '/').replace(/\/?$/, '/');
  return `${base}${cleanPath}`;
}

export default assetPath;
