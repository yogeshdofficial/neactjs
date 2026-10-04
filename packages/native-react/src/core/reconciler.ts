import Reconciler from 'react-reconciler';
import { ConcurrentRoot, DefaultEventPriority } from 'react-reconciler/constants';
import { enqueue, flush } from '../runtime/bridge';
import { registry, newId, Inst, TextInst } from './registry';
import { styleToCss } from './styles';
import './events';

export const OP = { CREATE: 1, SET_ATTR: 2, APPEND: 3, REMOVE: 4, TEXT: 5, INSERT_BEFORE: 6, REMOVE_ATTR: 7, CREATE_TEXT: 8 } as const;
type Props = Record<string, any>;
type Container = { id: 0 };

const EVENTS: Record<string, string> = {
  onClick: 'click', onDoubleClick: 'dblclick', onMouseDown: 'mousedown', onMouseUp: 'mouseup', onMouseEnter: 'mouseenter',
  onMouseLeave: 'mouseleave', onInput: 'input', onChange: 'input', onKeyDown: 'keydown', onKeyUp: 'keyup', onFocus: 'focus', onBlur: 'blur',
};
const ATTR_ALIAS: Record<string, string> = { className: 'class', htmlFor: 'for', defaultValue: 'value', defaultChecked: 'checked' };

function applyProps(inst: Inst, prev: Props, next: Props) {
  for (const k in prev) {
    if (k === 'children' || k in next) continue;
    if (EVENTS[k]) { delete inst.handlers[EVENTS[k]]; continue; }
    enqueue([OP.REMOVE_ATTR, inst.id, k === 'style' ? 'style' : (ATTR_ALIAS[k] || k)]);
  }
  for (const k in next) {
    if (k === 'children' || k === 'key' || k === 'ref') continue;
    const v = next[k];
    if (EVENTS[k]) { if (typeof v === 'function') inst.handlers[EVENTS[k]] = v; else delete inst.handlers[EVENTS[k]]; continue; }
    if (prev[k] === v && k !== 'style') continue;
    if (k === 'style') {
      const css = styleToCss(v) + (inst.hidden ? 'display:none !important;' : '');
      if (css !== inst.css) { inst.css = css; enqueue([OP.SET_ATTR, inst.id, 'style', css]); }
      continue;
    }
    const name = ATTR_ALIAS[k] || k;
    if (v == null || v === false) enqueue([OP.REMOVE_ATTR, inst.id, name]);
    else enqueue([OP.SET_ATTR, inst.id, name, v === true ? '' : String(v)]);
  }
}

const host = Reconciler({
  supportsMutation: true, supportsPersistence: false, supportsHydration: false, isPrimaryRenderer: true,
  noTimeout: -1,
  scheduleTimeout: (fn: any, ms: number) => setTimeout(fn, ms), cancelTimeout: (id: any) => clearTimeout(id),
  getRootHostContext: () => ({}), getChildHostContext: (c: any) => c,
  prepareForCommit: () => null, resetAfterCommit: () => { flush(); },
  shouldSetTextContent: () => false,
  createInstance(type: string, props: Props) {
    const inst: Inst = { id: newId(), type, props, handlers: {}, hidden: false };
    registry.set(inst.id, inst);
    enqueue([OP.CREATE, inst.id, type]);
    applyProps(inst, {}, props);
    return inst;
  },
  createTextInstance(text: string): TextInst { const t = { id: newId(), text }; enqueue([OP.CREATE_TEXT, t.id, text]); return t; },
  appendInitialChild: (p: Inst, c: Inst | TextInst) => enqueue([OP.APPEND, p.id, c.id]),
  finalizeInitialChildren: () => false,
  appendChild: (p: Inst, c: Inst | TextInst) => enqueue([OP.APPEND, p.id, c.id]),
  appendChildToContainer: (_c: Container, ch: Inst | TextInst) => enqueue([OP.APPEND, 0, ch.id]),
  insertBefore: (p: Inst, c: Inst | TextInst, b: Inst | TextInst) => enqueue([OP.INSERT_BEFORE, p.id, c.id, b.id]),
  insertInContainerBefore: (_c: Container, ch: Inst | TextInst, b: Inst | TextInst) => enqueue([OP.INSERT_BEFORE, 0, ch.id, b.id]),
  removeChild(p: Inst, c: Inst | TextInst) { enqueue([OP.REMOVE, p.id, c.id]); drop(c); },
  removeChildFromContainer(_c: Container, ch: Inst | TextInst) { enqueue([OP.REMOVE, 0, ch.id]); drop(ch); },
  commitTextUpdate(t: TextInst, _o: string, n: string) { t.text = n; enqueue([OP.TEXT, t.id, n]); },
  prepareUpdate: (_i: Inst, _t: string, o: Props, n: Props) => (o === n ? null : true),
  commitUpdate(inst: Inst, _p: unknown, _t: string, oldProps: Props, newProps: Props) { applyProps(inst, oldProps, newProps); inst.props = newProps; },
  hideInstance(inst: Inst) { inst.hidden = true; enqueue([OP.SET_ATTR, inst.id, 'style', styleToCss(inst.props.style) + 'display:none !important;']); },
  unhideInstance(inst: Inst) { inst.hidden = false; enqueue([OP.SET_ATTR, inst.id, 'style', styleToCss(inst.props.style)]); },
  hideTextInstance(t: TextInst) { enqueue([OP.TEXT, t.id, '']); },
  unhideTextInstance(t: TextInst, text: string) { enqueue([OP.TEXT, t.id, text]); },
  clearContainer: () => {},
  getPublicInstance: (i: Inst) => i,
  preparePortalMount: () => {}, getCurrentEventPriority: () => DefaultEventPriority,
  getInstanceFromNode: () => null, beforeActiveInstanceBlur: () => {}, afterActiveInstanceBlur: () => {},
  prepareScopeUpdate: () => {}, getInstanceFromScope: () => null, detachDeletedInstance: () => {},
} as any);

function drop(n: Inst | TextInst) { registry.delete(n.id); }

export const flushSync: (fn: () => void) => void = (host as any).flushSync;

export function render(element: any) {
  const root = host.createContainer({ id: 0 } as Container, ConcurrentRoot, null, false, null, 'nr', (e: unknown) => { console.error('uncaught', String((e as Error)?.stack || e)); }, null);
  host.updateContainer(element, root, null, () => {});
  return root;
}

