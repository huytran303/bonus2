import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  View,
} from 'react-native';
import * as SQLite from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import {
  Button,
  Card,
  DefaultTheme,
  IconButton,
  Paragraph,
  Provider as PaperProvider,
  Text,
  TextInput,
  Title,
} from 'react-native-paper';

const emptyForm = {
  title: '',
  content: '',
};

export default function App() {
  const dbRef = useRef(null);
  const [notes, setNotes] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setupDatabase();
  }, []);

  const setupDatabase = async () => {
    const db = await SQLite.openDatabaseAsync('notes.db');
    dbRef.current = db;

    await db.execAsync(`
      PRAGMA journal_mode = WAL;

      CREATE TABLE IF NOT EXISTS notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    await loadNotes();
    setIsReady(true);
  };

  const loadNotes = async () => {
    const rows = await dbRef.current.getAllAsync(
      'SELECT * FROM notes ORDER BY updated_at DESC'
    );
    setNotes(rows);
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const saveNote = async () => {
    const title = form.title.trim();
    const content = form.content.trim();

    if (!title || !content) {
      Alert.alert('Thieu du lieu', 'Nhap ca tieu de va noi dung.');
      return;
    }

    const now = new Date().toISOString();

    if (editingId) {
      await dbRef.current.runAsync(
        'UPDATE notes SET title = ?, content = ?, updated_at = ? WHERE id = ?',
        [title, content, now, editingId]
      );
    } else {
      await dbRef.current.runAsync(
        'INSERT INTO notes (title, content, created_at, updated_at) VALUES (?, ?, ?, ?)',
        [title, content, now, now]
      );
    }

    await loadNotes();
    resetForm();
  };

  const editNote = (note) => {
    setEditingId(note.id);
    setForm({
      title: note.title,
      content: note.content,
    });
  };

  const deleteNote = async (id) => {
    await dbRef.current.runAsync('DELETE FROM notes WHERE id = ?', [id]);
    await loadNotes();

    if (editingId === id) {
      resetForm();
    }
  };

  const renderNote = ({ item }) => (
    <Card style={styles.noteCard}>
      <Card.Content>
        <View style={styles.noteHeader}>
          <View style={styles.noteText}>
            <Title style={styles.noteTitle}>{item.title}</Title>
            <Text style={styles.noteDate}>
              {new Date(item.updated_at).toLocaleString()}
            </Text>
          </View>
          <View style={styles.noteActions}>
            <IconButton
              icon="pencil"
              size={20}
              accessibilityLabel="Sua ghi chu"
              onPress={() => editNote(item)}
            />
            <IconButton
              icon="delete"
              size={20}
              accessibilityLabel="Xoa ghi chu"
              onPress={() => deleteNote(item.id)}
            />
          </View>
        </View>
        <Paragraph style={styles.noteContent}>{item.content}</Paragraph>
      </Card.Content>
    </Card>
  );

  return (
    <PaperProvider theme={theme}>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.container}
        >
          <View style={styles.header}>
            <Text style={styles.eyebrow}>SQLite CRUD</Text>
            <Text style={styles.heading}>Quan ly ghi chu</Text>
          </View>

          <View style={styles.form}>
            <TextInput
              mode="outlined"
              label="Tieu de"
              value={form.title}
              onChangeText={(title) => setForm((current) => ({ ...current, title }))}
              style={styles.input}
            />
            <TextInput
              mode="outlined"
              label="Noi dung"
              value={form.content}
              multiline
              numberOfLines={3}
              onChangeText={(content) =>
                setForm((current) => ({ ...current, content }))
              }
              style={styles.input}
            />
            <View style={styles.formActions}>
              {editingId ? (
                <Button mode="outlined" icon="close" onPress={resetForm}>
                  Huy
                </Button>
              ) : null}
              <Button mode="contained" icon={editingId ? 'content-save' : 'plus'} onPress={saveNote}>
                {editingId ? 'Cap nhat' : 'Them moi'}
              </Button>
            </View>
          </View>

          <FlatList
            data={notes}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderNote}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <Text style={styles.emptyText}>
                {isReady ? 'Chua co ghi chu nao.' : 'Dang mo database...'}
              </Text>
            }
          />
        </KeyboardAvoidingView>
      </SafeAreaView>
    </PaperProvider>
  );
}

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#2f6f6d',
    accent: '#d58b3c',
  },
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f6f3ed',
  },
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    marginBottom: 14,
  },
  eyebrow: {
    color: '#6d7775',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  heading: {
    color: '#172321',
    fontSize: 28,
    fontWeight: '800',
    marginTop: 4,
  },
  form: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e1ded5',
  },
  input: {
    marginBottom: 10,
    backgroundColor: '#ffffff',
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  list: {
    paddingBottom: 24,
  },
  noteCard: {
    borderRadius: 8,
    marginBottom: 10,
    elevation: 1,
  },
  noteHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
  },
  noteText: {
    flex: 1,
    paddingRight: 8,
  },
  noteTitle: {
    color: '#172321',
    fontSize: 18,
    lineHeight: 24,
  },
  noteDate: {
    color: '#74807d',
    fontSize: 12,
    marginTop: 2,
  },
  noteActions: {
    flexDirection: 'row',
    marginRight: -10,
    marginTop: -8,
  },
  noteContent: {
    color: '#394845',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
  },
  emptyText: {
    color: '#6d7775',
    marginTop: 28,
    textAlign: 'center',
  },
});
