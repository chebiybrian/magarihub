// Guides list + simple article reader.
import { useEffect, useState } from 'react';
import { View, Text, FlatList, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { api } from '../api/client';
import { colors } from '../theme';

export default function GuidesScreen() {
  const [guides, setGuides] = useState([]);
  const [openGuide, setOpenGuide] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/api/guides').then(setGuides).catch((e) => setError(e.message));
  }, []);

  async function open(id) {
    try { setOpenGuide(await api(`/api/guides/${id}`)); } catch (e) { setError(e.message); }
  }

  if (openGuide) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={{ padding: 14 }}>
        <TouchableOpacity onPress={() => setOpenGuide(null)}>
          <Text style={styles.back}>← All guides</Text>
        </TouchableOpacity>
        <Text style={styles.articleTitle}>{openGuide.title}</Text>
        {openGuide.content.split('\n').map((line, i) =>
          line.startsWith('## ') ? <Text key={i} style={styles.h2}>{line.slice(3)}</Text>
          : line.startsWith('- ') ? <Text key={i} style={styles.li}>• {line.slice(2)}</Text>
          : line.trim() ? <Text key={i} style={styles.p}>{line}</Text> : null
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    );
  }

  return (
    <View style={styles.container}>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
        data={guides}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: 12 }}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => open(item.id)}>
            <Text style={styles.category}>{item.category.replace('_', ' ')}</Text>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.summary}>{item.summary}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  card: {
    backgroundColor: colors.card, borderRadius: 12, padding: 14, marginBottom: 12,
    borderWidth: 1, borderColor: colors.border,
  },
  category: { fontSize: 10, fontWeight: '800', color: colors.greenDark, marginBottom: 4 },
  title: { fontSize: 15, fontWeight: '700', color: colors.ink, marginBottom: 4 },
  summary: { fontSize: 12, color: colors.muted, lineHeight: 17 },
  back: { color: colors.greenDark, fontWeight: '700', marginBottom: 10 },
  articleTitle: { fontSize: 20, fontWeight: '800', color: colors.ink, marginBottom: 8 },
  h2: { fontSize: 16, fontWeight: '800', color: colors.ink, marginTop: 14, marginBottom: 4 },
  p: { fontSize: 14, lineHeight: 21, color: colors.ink, marginBottom: 6 },
  li: { fontSize: 14, lineHeight: 21, color: colors.ink, marginLeft: 8 },
  error: { color: colors.red, padding: 12 },
});
