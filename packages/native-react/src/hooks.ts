import { useEffect, useRef } from 'react';
import { listen } from './runtime/bridge';
export function useEvent<T = unknown>(name: string, cb: (p: T) => void) {
  const ref = useRef(cb); ref.current = cb;
  useEffect(() => listen<T>(name, p => ref.current(p)), [name]);
}
