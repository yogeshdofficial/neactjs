import { flushSync } from './host';
import { registry, Inst } from './registry';
import { flush } from '../runtime/bridge';

const NON_BUBBLING = new Set(['mouseenter', 'mouseleave', 'focus', 'blur']);

// Rust hit-tests and sends the target->root id chain; JS performs bubbling.
(globalThis as any).__dispatch = (chain: number[], type: string, payloadJson: string): boolean => {
  const payload: Record<string, any> = payloadJson ? JSON.parse(payloadJson) : {};
  let path = chain.map(id => registry.get(id)).filter(Boolean) as Inst[];
  if (NON_BUBBLING.has(type)) path = path.slice(0, 1);
  let stopped = false;
  const ev: any = {
    type, key: payload.key, code: payload.code, value: payload.value, clientX: payload.x, clientY: payload.y,
    target: { id: path[0]?.id, value: payload.value }, currentTarget: null, defaultPrevented: false,
    stopPropagation() { stopped = true; }, preventDefault() { ev.defaultPrevented = true; },
  };
  flushSync(() => {
    for (const inst of path) {
      const h = inst.handlers[type];
      if (h) { ev.currentTarget = inst; h(ev); }
      if (stopped) break;
    }
  });
  flush();
  return ev.defaultPrevented;
};
