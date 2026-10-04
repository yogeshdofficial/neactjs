// Node.js polyfills for native-react (QuickJS environment)
// Provides minimal implementations of Node.js built-in modules

// process
if (typeof globalThis.process === 'undefined') {
  globalThis.process = {
    env: {},
    version: '',
    versions: {},
    platform: 'android',
    nextTick: (fn, ...args) => Promise.resolve().then(() => fn(...args)),
    hrtime: () => [0, 0],
    uptime: () => 0,
    memoryUsage: () => ({}),
    cpuUsage: () => ({}),
    argv: [],
    execPath: '',
    cwd: () => '/',
    chdir: () => {},
    exit: (code) => { throw new Error(`process.exit(${code})`); },
    on: () => {},
    off: () => {},
    once: () => {},
    emit: () => false,
    listeners: () => [],
    listenerCount: () => 0,
  };
}

// Buffer
if (typeof globalThis.Buffer === 'undefined') {
  class Buffer extends Uint8Array {
    static from(data, encoding) {
      if (typeof data === 'string') {
        const str = encoding === 'base64' ? atob(data) : data;
        const buf = new Buffer(str.length);
        for (let i = 0; i < str.length; i++) buf[i] = str.charCodeAt(i);
        return buf;
      }
      if (data instanceof ArrayBuffer) {
        return new Buffer(data);
      }
      if (Array.isArray(data)) {
        return new Buffer(new Uint8Array(data));
      }
      return new Buffer(0);
    }
    static alloc(size, fill = 0) {
      const buf = new Buffer(size);
      if (fill !== 0) buf.fill(fill);
      return buf;
    }
    static allocUnsafe(size) { return new Buffer(size); }
    static isBuffer(obj) { return obj instanceof Buffer; }
    static byteLength(string, encoding) {
      if (typeof string === 'string') return new TextEncoder().encode(string).length;
      return string?.length || 0;
    }
    toString(encoding = 'utf8', start = 0, end = this.length) {
      if (encoding === 'base64') return btoa(String.fromCharCode(...this.slice(start, end)));
      return new TextDecoder(encoding).decode(this.slice(start, end));
    }
    toJSON() { return Array.from(this); }
    fill(value, offset = 0, end = this.length) {
      for (let i = offset; i < end; i++) this[i] = value;
      return this;
    }
    copy(target, targetStart = 0, sourceStart = 0, sourceEnd = this.length) {
      target.set(this.subarray(sourceStart, sourceEnd), targetStart);
    }
    slice(start = 0, end = this.length) { return new Buffer(this.subarray(start, end)); }
    subarray(start = 0, end = this.length) { return super.subarray(start, end); }
    write(string, offset = 0, length = this.length - offset, encoding = 'utf8') {
      const data = new TextEncoder().encode(string);
      this.set(data.subarray(0, length), offset);
      return data.length;
    }
    equals(other) {
      if (!Buffer.isBuffer(other)) return false;
      if (this.length !== other.length) return false;
      for (let i = 0; i < this.length; i++) if (this[i] !== other[i]) return false;
      return true;
    }
    indexOf(value, byteOffset = 0, encoding = 'utf8') {
      const buf = Buffer.from(value, encoding);
      for (let i = byteOffset; i <= this.length - buf.length; i++) {
        if (this.subarray(i, i + buf.length).equals(buf)) return i;
      }
      return -1;
    }
    includes(value, byteOffset = 0, encoding = 'utf8') {
      return this.indexOf(value, byteOffset, encoding) !== -1;
    }
  }
  globalThis.Buffer = Buffer;
  globalThis.Buffer.isBuffer = Buffer.isBuffer;
  globalThis.Buffer.from = Buffer.from;
  globalThis.Buffer.alloc = Buffer.alloc;
  globalThis.Buffer.allocUnsafe = Buffer.allocUnsafe;
  globalThis.Buffer.byteLength = Buffer.byteLength;
}

// crypto
if (typeof globalThis.crypto === 'undefined') {
  globalThis.crypto = {
    getRandomValues: (arr) => {
      for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256);
      return arr;
    },
    randomUUID: () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    }),
    subtle: {
      digest: async (algorithm, data) => {
        const msgBuffer = data instanceof ArrayBuffer ? data : new TextEncoder().encode(data);
        const hashBuffer = await crypto.subtle.digest(algorithm, msgBuffer);
        return hashBuffer;
      },
      generateKey: async () => ({}),
      sign: async () => new ArrayBuffer(0),
      verify: async () => false,
      encrypt: async () => new ArrayBuffer(0),
      decrypt: async () => new ArrayBuffer(0),
      deriveKey: async () => ({}),
      deriveBits: async () => new ArrayBuffer(0),
      importKey: async () => ({}),
      exportKey: async () => new ArrayBuffer(0),
      wrapKey: async () => new ArrayBuffer(0),
      unwrapKey: async () => ({}),
    },
  };
}

// events
class EventEmitter {
  constructor() { this._events = {}; }
  on(event, listener) { (this._events[event] ||= []).push(listener); return this; }
  off(event, listener) { this._events[event] = (this._events[event] || []).filter(l => l !== listener); return this; }
  once(event, listener) { const fn = (...args) => { this.off(event, fn); listener(...args); }; return this.on(event, fn); }
  emit(event, ...args) { (this._events[event] || []).forEach(l => l(...args)); return true; }
  listenerCount(event) { return (this._events[event] || []).length; }
  rawListeners(event) { return this._events[event] || []; }
  listeners(event) { return this._events[event] || []; }
  eventNames() { return Object.keys(this._events); }
  setMaxListeners() { return this; }
  getMaxListeners() { return Infinity; }
  prependListener(event, listener) { (this._events[event] ||= []).unshift(listener); return this; }
  prependOnceListener(event, listener) { return this.prependListener(event, this.once(event, listener)); }
  removeAllListeners(event) { if (event) delete this._events[event]; else this._events = {}; return this; }
}
if (typeof globalThis.EventEmitter === 'undefined') globalThis.EventEmitter = EventEmitter;

// util
globalThis.util = {
  inherits: (ctor, superCtor) => { ctor.prototype = Object.create(superCtor.prototype); ctor.prototype.constructor = ctor; },
  format: (...args) => args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '),
  inspect: (obj, opts) => JSON.stringify(obj, null, opts?.depth ?? 2),
  promisify: (fn) => (...args) => new Promise((resolve, reject) => fn(...args, (err, result) => err ? reject(err) : resolve(result))),
  promisifyAll: (obj) => { for (const key of Object.keys(obj)) if (typeof obj[key] === 'function') obj[key + 'Async'] = globalThis.util.promisify(obj[key]); },
  types: { isDate: (d) => d instanceof Date, isRegExp: (r) => r instanceof RegExp, isError: (e) => e instanceof Error },
  deprecate: (fn, msg) => fn,
  isArray: Array.isArray,
  isBoolean: (v) => typeof v === 'boolean',
  isNull: (v) => v === null,
  isNullOrUndefined: (v) => v == null,
  isNumber: (v) => typeof v === 'number',
  isString: (v) => typeof v === 'string',
  isSymbol: (v) => typeof v === 'symbol',
  isUndefined: (v) => v === undefined,
  isRegExp: (v) => v instanceof RegExp,
  isDate: (v) => v instanceof Date,
  isError: (v) => v instanceof Error,
  isFunction: (v) => typeof v === 'function',
  isPrimitive: (v) => v !== Object(v),
  isBuffer: (v) => v instanceof Buffer,
};

// path
globalThis.path = {
  resolve: (...args) => args.join('/').replace(/\/+/g, '/'),
  join: (...args) => args.join('/').replace(/\/+/g, '/'),
  dirname: (p) => p.split('/').slice(0, -1).join('/') || '/',
  basename: (p, ext) => { const b = p.split('/').pop() || ''; return ext && b.endsWith(ext) ? b.slice(0, -ext.length) : b; },
  extname: (p) => { const i = p.lastIndexOf('.'); return i > p.lastIndexOf('/') ? p.slice(i) : ''; },
  isAbsolute: (p) => p.startsWith('/'),
  relative: (from, to) => to,
  sep: '/',
  delimiter: ':',
  parse: (p) => ({ root: '/', dir: p.split('/').slice(0, -1).join('/') || '/', base: p.split('/').pop() || '', ext: '', name: p.split('/').pop() || '' }),
  format: (obj) => (obj.dir || '') + (obj.base || ''),
  normalize: (p) => p.replace(/\/+/g, '/'),
  win32: null,
  posix: null,
};

// os
globalThis.os = {
  platform: () => 'android',
  arch: () => 'arm64',
  type: () => 'Linux',
  release: () => '5.0',
  hostname: () => 'localhost',
  tmpdir: () => '/tmp',
  homedir: () => '/home/user',
  cpus: () => [],
  freemem: () => 0,
  totalmem: () => 0,
  loadavg: () => [0, 0, 0],
  uptime: () => 0,
  networkInterfaces: () => ({}),
  endianness: () => 'LE',
  constants: {},
  getPriority: () => 0,
  setPriority: () => {},
  userInfo: () => ({ username: 'user', uid: 1000, gid: 1000, shell: '/bin/sh', homedir: '/home/user' }),
};

// fs (mock - no actual file system access)
const fsMock = {
  readFileSync: (p) => '',
  writeFileSync: (p, d) => {},
  existsSync: (p) => false,
  mkdirSync: (p, o) => {},
  rmSync: (p, o) => {},
  readdirSync: (p) => [],
  statSync: (p) => ({ isFile: () => false, isDirectory: () => false, size: 0, mtime: new Date() }),
  readFile: (p, o, cb) => cb?.(new Error('ENOENT')),
  writeFile: (p, d, o, cb) => cb?.(null),
  mkdir: (p, o, cb) => cb?.(null),
  rmdir: (p, o, cb) => cb?.(null),
  unlink: (p, cb) => cb?.(null),
  rename: (oldPath, newPath, cb) => cb?.(null),
  stat: (p, cb) => cb?.(new Error('ENOENT')),
  lstat: (p, cb) => cb?.(new Error('ENOENT')),
  readFileSync: (p) => '',
  writeFileSync: (p, d) => {},
  createReadStream: () => ({ on: () => {}, pipe: () => {} }),
  createWriteStream: () => ({ on: () => {}, write: () => {}, end: () => {} }),
  watch: () => ({ on: () => {}, close: () => {} }),
  constants: { F_OK: 0, R_OK: 4, W_OK: 2, X_OK: 1 },
  promises: {
    readFile: async () => '',
    writeFile: async () => {},
    mkdir: async () => {},
    rmdir: async () => {},
    unlink: async () => {},
    rename: async () => {},
    stat: async () => ({ isFile: () => false, isDirectory: () => false, size: 0, mtime: new Date() }),
    lstat: async () => ({ isFile: () => false, isDirectory: () => false, size: 0, mtime: new Date() }),
    readdir: async () => [],
    access: async () => {},
    copyFile: async () => {},
  },
};
globalThis.fs = fsMock;

// url
globalThis.URL = class URL {
  constructor(url, base) { const u = new URL(url, base); Object.assign(this, u); }
  toString() { return this.href; }
  toJSON() { return this.href; }
};
globalThis.URLSearchParams = class URLSearchParams {
  constructor(init = '') { this._params = new Map(); if (typeof init === 'string') init.slice(1).split('&').forEach(p => { const [k, v] = p.split('='); this._params.set(k, v); }); }
  append(k, v) { this._params.set(k, v); }
  delete(k) { this._params.delete(k); }
  get(k) { return this._params.get(k) || null; }
  getAll(k) { return [this._params.get(k)].filter(Boolean); }
  has(k) { return this._params.has(k); }
  set(k, v) { this._params.set(k, v); }
  toString() { return Array.from(this._params.entries()).map(([k, v]) => `${k}=${v}`).join('&'); }
  forEach(fn) { this._params.forEach((v, k) => fn(v, k, this)); }
  keys() { return this._params.keys(); }
  values() { return this._params.values(); }
  entries() { return this._params.entries(); }
};
globalThis.url = {
  format: (obj) => obj.href || '',
  parse: (str) => new URL(str),
  resolve: (from, to) => new URL(to, from).href,
  resolveObject: (from, to) => new URL(to, from),
};

// querystring
globalThis.querystring = {
  parse: (str) => Object.fromEntries(new URLSearchParams(str).entries()),
  stringify: (obj) => new URLSearchParams(obj).toString(),
  escape: (str) => encodeURIComponent(str),
  unescape: (str) => decodeURIComponent(str),
};

// assert
globalThis.assert = {
  ok: (value, message) => { if (!value) throw new AssertionError(message); },
  equal: (a, b, msg) => { if (a !== b) throw new AssertionError(msg); },
  deepEqual: (a, b, msg) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new AssertionError(msg); },
  strictEqual: (a, b, msg) => { if (a !== b) throw new AssertionError(msg); },
  throws: (fn, error, msg) => { try { fn(); throw new AssertionError(msg); } catch (e) { if (e instanceof AssertionError) throw e; if (error && !(e instanceof error)) throw new AssertionError(msg); } },
  doesNotThrow: (fn, msg) => { try { fn(); } catch (e) { throw new AssertionError(msg); } },
  ifError: (err) => { if (err) throw err; },
};
class AssertionError extends Error {
  constructor(message) { super(message); this.name = 'AssertionError'; }
}
globalThis.AssertionError = AssertionError;

// constants
globalThis.constants = {};

// zlib (minimal)
globalThis.zlib = {
  createGzip: () => ({ write: () => {}, end: () => {}, on: () => {} }),
  createGunzip: () => ({ write: () => {}, end: () => {}, on: () => {} }),
  createDeflate: () => ({ write: () => {}, end: () => {}, on: () => {} }),
  createInflate: () => ({ write: () => {}, end: () => {}, on: () => {} }),
  deflate: (buf, cb) => cb(null, buf),
  deflateSync: (buf) => buf,
  gzip: (buf, cb) => cb(null, buf),
  gzipSync: (buf) => buf,
  gunzip: (buf, cb) => cb(null, buf),
  gunzipSync: (buf) => buf,
  inflate: (buf, cb) => cb(null, buf),
  inflateSync: (buf) => buf,
};

// punycode
globalThis.punycode = { encode: (s) => s, decode: (s) => s, toASCII: (s) => s, toUnicode: (s) => s, ucs2: { decode: (s) => [...s], encode: (a) => String.fromCodePoint(...a) } };

// domain
class Domain extends EventEmitter { run(fn) { return fn(); } }
globalThis.domain = { create: () => new Domain() };

// timers (already provided by prelude.ts)
// but ensure setImmediate exists
if (typeof globalThis.setImmediate === 'undefined') {
  globalThis.setImmediate = (fn, ...args) => Promise.resolve().then(() => fn(...args));
}
if (typeof globalThis.clearImmediate === 'undefined') {
  globalThis.clearImmediate = (id) => {};
}

export {};