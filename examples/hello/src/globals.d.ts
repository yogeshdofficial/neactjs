declare const console: { log(...a: unknown[]): void; error(...a: unknown[]): void; warn(...a: unknown[]): void; info(...a: unknown[]): void; debug(...a: unknown[]): void };
declare function setTimeout(fn: (...a: any[]) => void, ms?: number, ...args: any[]): number;
declare function clearTimeout(id: number): void;
declare function setInterval(fn: (...a: any[]) => void, ms?: number, ...args: any[]): number;
declare function clearInterval(id: number): void;
declare function queueMicrotask(fn: () => void): void;

