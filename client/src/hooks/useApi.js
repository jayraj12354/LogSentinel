import { useCallback, useEffect, useState } from 'react';
import api from '../api/api';

// Loads `path` (unwrapping the server's { data, meta } envelope) and reloads on 'ls:refresh'
// (menu shortcut, new desktop alert). Pass null to skip loading.
export function useApi(path) {
  const [state, setState] = useState({ data: null, meta: null, error: null, loading: !!path });

  const reload = useCallback(() => {
    if (!path) return Promise.resolve();
    setState((s) => ({ ...s, loading: true }));
    return api
      .get(path)
      .then((body) => setState({ data: body.data, meta: body.meta || null, error: null, loading: false }))
      .catch((e) => setState((s) => ({ ...s, error: e.message, loading: false })));
  }, [path]);

  useEffect(() => {
    reload();
    window.addEventListener('ls:refresh', reload);
    return () => window.removeEventListener('ls:refresh', reload);
  }, [reload]);

  return { ...state, reload };
}

export const refreshAll = () => window.dispatchEvent(new Event('ls:refresh'));
