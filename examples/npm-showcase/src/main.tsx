import { useState, useEffect } from 'react';
import { create } from 'zustand';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import './theme.css';
import styles from './App.module.css';
import { render, invoke, useEvent, Root, Card, Stack, Heading, Text, Badge, Button, Input, Divider, Spacer } from 'native-react';

interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

interface NoteState {
  notes: Note[];
  addNote: (title: string, content: string) => void;
  updateNote: (id: string, title: string, content: string) => void;
  deleteNote: (id: string) => void;
}

const useNotes = create<NoteState>((set) => ({
  notes: [],
  addNote: (title, content) => {
    const now = new Date().toISOString();
    const note: Note = {
      id: uuidv4(),
      title,
      content,
      createdAt: now,
      updatedAt: now,
    };
    set((state) => ({ notes: [note, ...state.notes] }));
  },
  updateNote: (id, title, content) => {
    const now = new Date().toISOString();
    set((state) => ({
      notes: state.notes.map((note) =>
        note.id === id ? { ...note, title, content, updatedAt: now } : note
      ),
    }));
  },
  deleteNote: (id) => {
    set((state) => ({ notes: state.notes.filter((note) => note.id !== id) }));
  },
}));

function App() {
  const [showForm, setShowForm] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const { notes, addNote, updateNote, deleteNote } = useNotes();
  const [uuidTest, setUuidTest] = useState('');
  const [dateTest, setDateTest] = useState('');

  useEffect(() => {
    const id = uuidv4();
    setUuidTest(`Generated UUID: ${id}`);
    const formatted = format(parseISO('2024-01-15T10:30:00Z'), 'PPpp');
    setDateTest(`Formatted date: ${formatted}`);
  }, []);

  const handleSubmit = () => {
    if (!title.trim() || !content.trim()) return;
    if (editingNote) {
      updateNote(editingNote.id, title, content);
    } else {
      addNote(title, content);
    }
    setTitle('');
    setContent('');
    setEditingNote(null);
    setShowForm(false);
  };

  const handleEdit = (note: Note) => {
    setTitle(note.title);
    setContent(note.content);
    setEditingNote(note);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    deleteNote(id);
  };

  return (
    <Root dark={true}>
      <Stack gap={16} className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>npm-showcase</h1>
          <Text className={styles.subtitle}>Using npm packages in native-react</Text>
        </div>

        <Card>
          <Stack gap={10}>
            <Heading>📦 Package: uuid</Heading>
            <Text>{uuidTest}</Text>
            <Button onClick={() => setUuidTest(`New UUID: ${uuidv4()}`)}>Generate New UUID</Button>
          </Stack>
        </Card>

        <Card>
          <Stack gap={10}>
            <Heading>📅 Package: date-fns</Heading>
            <Text>{dateTest}</Text>
            <Text>Relative time: {formatDistanceToNow(new Date('2024-01-01'), { addSuffix: true })}</Text>
          </Stack>
        </Card>

        <Card>
          <Stack gap={10}>
            <Heading>🗃️ Package: zustand (State Management)</Heading>
            <Button onClick={() => { setTitle(''); setContent(''); setEditingNote(null); setShowForm(true); }}>
              {showForm ? (editingNote ? 'Cancel Edit' : 'Cancel') : 'Add Note'}
            </Button>

            {showForm && (
              <Stack gap={10}>
                <Input
                  value={title}
                  placeholder="Note title"
                  onInput={(e) => setTitle(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
                />
                <Input
                  value={content}
                  placeholder="Note content"
                  onInput={(e) => setContent(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
                />
                <Button onClick={handleSubmit}>{editingNote ? 'Update' : 'Create'}</Button>
              </Stack>
            )}

            <Divider />
            {notes.length === 0 ? (
              <Text style={{ color: 'var(--muted)', textAlign: 'center' }}>No notes yet. Click "Add Note" to create one.</Text>
            ) : (
              notes.map((note) => (
                <div key={note.id} className={styles.note}>
                  <Stack row style={{ justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <Stack gap={4} style={{ flex: 1 }}>
                      <Text style={{ fontWeight: 'bold', fontSize: 16 }}>{note.title}</Text>
                      <Text style={{ fontSize: 14, color: 'var(--muted)' }}>
                        {formatDistanceToNow(parseISO(note.updatedAt), { addSuffix: true })}
                      </Text>
                      <Text style={{ fontSize: 14 }}>{note.content}</Text>
                    </Stack>
                    <Stack gap={4}>
                      <Button onClick={() => handleEdit(note)} style={{ padding: '4px 8px', fontSize: 12 }}>Edit</Button>
                      <Button onClick={() => handleDelete(note.id)} style={{ padding: '4px 8px', fontSize: 12, background: '#e04040' }}>Delete</Button>
                    </Stack>
                  </Stack>
                </div>
              ))
            )}
          </Stack>
        </Card>

        <Card>
          <Stack gap={10}>
            <Heading>🦀 Rust Integration</Heading>
            <Button onClick={() => invoke<string>('greet', { name: 'npm-showcase' }).then(setUuidTest)}>
              Greet from Rust
            </Button>
            <Text>{uuidTest || 'Click to greet from Rust'}</Text>
          </Stack>
        </Card>

        <Spacer size={4} />
      </Stack>
    </Root>
  );
}

render(<App />);