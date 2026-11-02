import catalog from './tool-catalog.json';
import type { PdfOperation } from '../features/process-files';
export interface Tool {
  slug: string;
  title: string;
  description: string;
  category: 'image' | 'pdf';
  operation?: PdfOperation;
}
export const tools = catalog as Tool[];
export const rootPath = () =>
  location.pathname.startsWith('/fixmyupload') ? '/fixmyupload/' : '/';
export function toolForPath(path: string) {
  return tools.find((t) => t.slug === path.replace(/\/$/, '').split('/').at(-1));
}
export function navigate(slug = '') {
  history.pushState(null, '', `${rootPath()}${slug ? `${slug}/` : ''}`);
  window.dispatchEvent(new PopStateEvent('popstate'));
}
