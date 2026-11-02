import { useSyncExternalStore } from 'react';
const subscribe = (listener: () => void) => {
  window.addEventListener('popstate', listener);
  return () => window.removeEventListener('popstate', listener);
};
export function useRoute() {
  return useSyncExternalStore(subscribe, () => location.pathname);
}
