declare const RustBridge: { flushCommands(json: string): void; invoke(id: number, cmd: string, args: string): void; listenAdd(ev: string): void };
type G = { __dispatch?: unknown; __fireTimer?: unknown; __resolveInvoke?: unknown; __emit?: unknown };
const g = globalThis as unknown as G & Record<string, unknown>;

let queue: unknown[][] = [];
export function enqueue(op: unknown[]) { queue.push(op); }
export function flush() {
  if (!queue.length) return;
  const q = queue; queue = [];
  RustBridge.flushCommands(JSON.stringify(q));
}

let nextInvoke = 1;
const pending = new Map<number, { res: (v: unknown) => void; rej: (e: unknown) => void }>();
const listeners = new Map<string, Set<(p: unknown) => void>>();

export function invoke<T = unknown>(cmd: string, args: unknown = {}): Promise<T> {
  return new Promise<T>((res, rej) => {
    const id = nextInvoke++;
    pending.set(id, { res: res as (v: unknown) => void, rej });
    RustBridge.invoke(id, cmd, JSON.stringify(args));
  });
}
export function listen<T = unknown>(ev: string, cb: (p: T) => void): () => void {
  let s = listeners.get(ev);
  if (!s) { s = new Set(); listeners.set(ev, s); RustBridge.listenAdd(ev); }
  s.add(cb as (p: unknown) => void);
  return () => { s!.delete(cb as (p: unknown) => void); };
}

g.__resolveInvoke = (id: number, ok: boolean, json: string) => {
  const p = pending.get(id); if (!p) return;
  pending.delete(id);
  const v = json ? JSON.parse(json) : null;
  ok ? p.res(v) : p.rej(new Error(String(v)));
};
g.__emit = (ev: string, json: string) => {
  const s = listeners.get(ev); if (!s) return;
  const v = json ? JSON.parse(json) : null;
  for (const cb of Array.from(s)) cb(v);
};
