import { useState } from 'react';
import { create } from 'zustand';
import './theme.css';
import styles from './App.module.css';
import { render, invoke, useEvent, Root, Card, Stack, Heading, Text, Badge, Button, Input, Progress, Divider, Spacer } from 'native-react';

interface Todo { id: number; text: string }
const useTodos = create<{ items: Todo[]; add: (t: string) => void; remove: (id: number) => void }>(set => ({
  items: [],
  add: t => set(s => ({ items: [...s.items, { id: Date.now() + s.items.length, text: t }] })),
  remove: id => set(s => ({ items: s.items.filter(i => i.id !== id) })),
}));

function App() {
  const [dark, setDark] = useState(true);
  const [count, setCount] = useState(0);
  const [draft, setDraft] = useState('');
  const [greeting, setGreeting] = useState('');
  const [tick, setTick] = useState(0);
  const { items, add, remove } = useTodos();
  useEvent<number>('tick', n => setTick(n));
  const submit = () => { const t = draft.trim(); if (t) { add(t); setDraft(''); } };
  return (
    <Root dark={dark}>
      <Stack gap={16}>
        <div className={styles.row}>
          <h1 className={styles.title}>native-react</h1>
          <Button onClick={() => setDark(!dark)}>{dark ? 'Light' : 'Dark'}</Button>
        </div>
        <Card>
          <Stack gap={10}>
            <Heading>Counter <Badge>{count}</Badge></Heading>
            <Progress value={(count % 11) * 10} />
            <Stack row gap={8}>
              <Button onClick={() => setCount(count + 1)}>+1</Button>
              <Button onClick={() => setCount(0)}>Reset</Button>
            </Stack>
          </Stack>
        </Card>
        <Card>
          <Stack gap={10}>
            <Heading>Todos</Heading>
            <Input value={draft} placeholder="Type and press Enter" onInput={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') submit(); }} />
            {items.map(i => (
              <Stack row key={i.id} style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: 'var(--fg)' }}>{i.text}</Text>
                <Button onClick={() => remove(i.id)}>x</Button>
              </Stack>
            ))}
          </Stack>
        </Card>
        <Card>
          <Stack gap={10}>
            <Heading>Rust</Heading>
            <Button onClick={() => invoke<string>('greet', { name: 'native-react' }).then(setGreeting)}>Greet via invoke</Button>
            <Text>{greeting || '...'}</Text>
            <Divider />
            <Text>Live tick from Rust: {tick}</Text>
          </Stack>
        </Card>
        <Spacer size={4} />
      </Stack>
    </Root>
  );
}
render(<App />);
