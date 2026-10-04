export interface Inst { id: number; type: string; props: Record<string, any>; handlers: Record<string, Function>; hidden: boolean; css?: string }
export interface TextInst { id: number; text: string }
export const registry = new Map<number, Inst>();
let next = 1;
export const newId = () => next++;
