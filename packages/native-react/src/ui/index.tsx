import React, { CSSProperties, ReactNode } from 'react';
type P = { children?: ReactNode; style?: CSSProperties; className?: string };
const vars = (dark: boolean): CSSProperties => ({
  ['--bg' as any]: dark ? '#0f1115' : '#f5f6f8', ['--fg' as any]: dark ? '#e8eaf0' : '#14161a',
  ['--card' as any]: dark ? '#181b22' : '#ffffff', ['--border' as any]: dark ? '#2a2f3a' : '#d9dce3',
  ['--accent' as any]: '#6c8cff', ['--muted' as any]: dark ? '#8a91a3' : '#5b6372',
});
export const Root = ({ dark = true, children, style }: P & { dark?: boolean }) =>
  <div style={{ ...vars(dark), background: 'var(--bg)', color: 'var(--fg)', boxSizing: 'border-box', width: '100%', height: '100%', overflowY: 'auto', overflowX: 'hidden', display: 'flex', flexDirection: 'column', padding: 24, fontFamily: 'sans-serif', ...style }}>{children}</div>;
export const Card = ({ children, style }: P) =>
  <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, boxSizing: 'border-box', width: '100%', ...style }}>{children}</div>;
export const Stack = ({ children, style, row, gap = 8 }: P & { row?: boolean; gap?: number }) =>
  <div style={{ display: 'flex', flexDirection: row ? 'row' : 'column', gap, minWidth: 0, ...style }}>{children}</div>;
export const Heading = ({ children, style }: P) => <h2 style={{ margin: 0, fontSize: 20, ...style }}>{children}</h2>;
export const Text = ({ children, style }: P) => <p style={{ margin: 0, fontSize: 14, color: 'var(--muted)', ...style }}>{children}</p>;
export const Badge = ({ children, style }: P) =>
  <span style={{ background: 'var(--accent)', color: '#ffffff', borderRadius: 999, padding: '2px 10px', fontSize: 12, ...style }}>{children}</span>;
export const Button = ({ children, onClick, style }: P & { onClick?: () => void }) =>
  <button onClick={onClick} style={{ background: 'var(--accent)', color: '#ffffff', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 14, ...style }}>{children}</button>;
export const Input = (p: { value?: string; placeholder?: string; onInput?: (e: any) => void; onKeyDown?: (e: any) => void; style?: CSSProperties }) =>
  <input value={p.value} placeholder={p.placeholder} onInput={p.onInput} onKeyDown={p.onKeyDown}
    style={{ background: 'var(--bg)', color: 'var(--fg)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', fontSize: 14, boxSizing: 'border-box', width: '100%', ...p.style }} />;
export const Progress = ({ value }: { value: number }) =>
  <div style={{ background: 'var(--border)', borderRadius: 999, height: 8, width: '100%' }}>
    <div style={{ background: 'var(--accent)', borderRadius: 999, height: 8, width: Math.max(0, Math.min(100, value)) + '%' }} /></div>;
export const Divider = () => <div style={{ height: 1, background: 'var(--border)', width: '100%' }} />;
export const Spacer = ({ size = 8 }: { size?: number }) => <div style={{ height: size, width: size }} />;
