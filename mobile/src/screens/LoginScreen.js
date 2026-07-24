// Login / register screen.
import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { api, saveSession } from '../api/client';
import { colors } from '../theme';

export default function LoginScreen({ navigation }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' });
  const [error, setError] = useState('');

  const set = (key) => (value) => setForm({ ...form, [key]: value });

  async function submit() {
    setError('');
    try {
      const path = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const { token, user } = await api(path, { method: 'POST', body: form });
      await saveSession(token, user);
      navigation.replace('Profile');
    } catch (e) { setError(e.message); }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>{mode === 'login' ? 'Welcome back' : 'Create your account'}</Text>
      {mode === 'register' && (
        <>
          <TextInput style={styles.input} placeholder="Full name" value={form.name} onChangeText={set('name')} />
          <TextInput style={styles.input} placeholder="Phone e.g. +254712345678" value={form.phone}
            onChangeText={set('phone')} keyboardType="phone-pad" />
        </>
      )}
      <TextInput style={styles.input} placeholder="Email" value={form.email} onChangeText={set('email')}
        keyboardType="email-address" autoCapitalize="none" />
      <TextInput style={styles.input} placeholder="Password" value={form.password} onChangeText={set('password')}
        secureTextEntry />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <TouchableOpacity style={styles.btn} onPress={submit}>
        <Text style={styles.btnText}>{mode === 'login' ? 'Login' : 'Register'}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => setMode(mode === 'login' ? 'register' : 'login')}>
        <Text style={styles.switch}>
          {mode === 'login' ? "No account? Register" : 'Have an account? Login'}
        </Text>
      </TouchableOpacity>
      <Text style={styles.demo}>Demo: dealer@example.com / password123</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 20, gap: 12 },
  heading: { fontSize: 22, fontWeight: '800', color: colors.ink, marginBottom: 6 },
  input: {
    backgroundColor: colors.card, borderRadius: 10, padding: 14,
    borderWidth: 1, borderColor: colors.border,
  },
  btn: { backgroundColor: colors.green, borderRadius: 10, padding: 14, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  switch: { color: colors.greenDark, textAlign: 'center', fontWeight: '600' },
  demo: { color: colors.muted, fontSize: 11, textAlign: 'center' },
  error: { color: colors.red },
});
