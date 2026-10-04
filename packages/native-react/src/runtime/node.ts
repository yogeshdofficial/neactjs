declare const RustBridge: { fsRead(p: string): string; fsWrite(p: string, d: string): void; fsExists(p: string): boolean; fsList(p: string): string; osInfo(): string };
const g = globalThis as unknown as Record<string, unknown>;
const sep = '/';
const norm = (p: string) => { const abs = p.startsWith('/'); const out: string[] = []; for (const s of p.split(/[\\/]+/)) { if (!s || s === '.') continue; if (s === '..') out.pop(); else out.push(s); } return (abs ? '/' : '') + out.join('/') || '.'; };
const path = { sep, normalize: norm, join: (...a: string[]) => norm(a.join('/')), resolve: (...a: string[]) => norm(a.join('/')),
  basename: (p: string) => p.split('/').pop() || '', dirname: (p: string) => p.split('/').slice(0, -1).join('/') || '/',
  extname: (p: string) => { const b = p.split('/').pop() || ''; const i = b.lastIndexOf('.'); return i > 0 ? b.slice(i) : ''; } };
const fs = { readFileSync: (p: string) => RustBridge.fsRead(p), writeFileSync: (p: string, d: string) => RustBridge.fsWrite(p, String(d)),
  existsSync: (p: string) => RustBridge.fsExists(p), readdirSync: (p: string) => JSON.parse(RustBridge.fsList(p)) as string[] };
const os = { platform: () => JSON.parse(RustBridge.osInfo()).platform as string, homedir: () => JSON.parse(RustBridge.osInfo()).home as string,
  tmpdir: () => JSON.parse(RustBridge.osInfo()).tmp as string, EOL: '\n' };
const mods: Record<string, unknown> = { fs, path, os, 'node:fs': fs, 'node:path': path, 'node:os': os };
g.require = (n: string) => { if (n in mods) return mods[n]; throw new Error('module not found: ' + n); };

class EventEmitter {
  private l = new Map<string, Function[]>();
  on(e: string, f: Function) { (this.l.get(e) || this.l.set(e, []).get(e)!).push(f); return this; }
  off(e: string, f: Function) { this.l.set(e, (this.l.get(e) || []).filter(x => x !== f)); return this; }
  once(e: string, f: Function) { const w = (...a: unknown[]) => { this.off(e, w); f(...a); }; return this.on(e, w); }
  emit(e: string, ...a: unknown[]) { const ls = this.l.get(e) || []; ls.slice().forEach(f => f(...a)); return ls.length > 0; }
}
const events = { EventEmitter, default: EventEmitter };
mods['events'] = events; mods['node:events'] = events;
export {};
