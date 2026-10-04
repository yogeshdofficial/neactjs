declare const RustBridge: { log(level: string, msg: string): void; setTimer(id: number, ms: number, repeat: boolean): void; clearTimer(id: number): void };
const g = globalThis as unknown as Record<string, unknown>;
const fmt = (a: unknown[]) => a.map(x => { if (typeof x === 'string') return x; try { return JSON.stringify(x); } catch { return String(x); } }).join(' ');
g.console = {
  log: (...a: unknown[]) => RustBridge.log('log', fmt(a)),
  info: (...a: unknown[]) => RustBridge.log('info', fmt(a)),
  warn: (...a: unknown[]) => RustBridge.log('warn', fmt(a)),
  error: (...a: unknown[]) => RustBridge.log('error', fmt(a)),
  debug: (...a: unknown[]) => RustBridge.log('debug', fmt(a)),
};
g.window = undefined; // never expose a fake window
const timers = new Map<number, { fn: () => void; repeat: boolean }>();
let tid = 1;
g.setTimeout = (fn: (...a: unknown[]) => void, ms = 0, ...args: unknown[]) => {
  const id = tid++; timers.set(id, { fn: () => fn(...args), repeat: false }); RustBridge.setTimer(id, +ms || 0, false); return id;
};
g.setInterval = (fn: (...a: unknown[]) => void, ms = 0, ...args: unknown[]) => {
  const id = tid++; timers.set(id, { fn: () => fn(...args), repeat: true }); RustBridge.setTimer(id, Math.max(1, +ms || 0), true); return id;
};
const clr = (id: number) => { if (timers.delete(id)) RustBridge.clearTimer(id); };
g.clearTimeout = clr; g.clearInterval = clr;
g.queueMicrotask = (fn: () => void) => { Promise.resolve().then(fn); };
g.setImmediate = (fn: (...a: unknown[]) => void, ...args: unknown[]) => { Promise.resolve().then(() => fn(...args)); return 0; };
g.__fireTimer = (id: number) => {
  const t = timers.get(id); if (!t) return;
  if (!t.repeat) timers.delete(id);
  t.fn();
};
import './node';
export {};
