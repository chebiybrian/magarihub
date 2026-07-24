// API client for the mobile app.
import AsyncStorage from '@react-native-async-storage/async-storage';

//
// IMPORTANT: "localhost" on your phone means the PHONE, not your computer.
// When testing with Expo Go on a real phone:
//   1. Make sure phone + computer are on the same WiFi
//   2. Find your computer's IP (Windows: run `ipconfig`, look for IPv4 e.g. 192.168.1.23)
//   3. Set API_URL to `http://192.168.1.23:4000`
// Android emulator can use http://10.0.2.2:4000 instead.
export const API_URL = 'http://192.168.100.41:4000'; // your PC's WiFi IP (update if your network changes)

export async function getToken() { return AsyncStorage.getItem('token'); }
export async function getUser() {
  const raw = await AsyncStorage.getItem('user');
  return raw ? JSON.parse(raw) : null;
}
export async function saveSession(token, user) {
  await AsyncStorage.setItem('token', token);
  await AsyncStorage.setItem('user', JSON.stringify(user));
}
export async function clearSession() {
  await AsyncStorage.multiRemove(['token', 'user']);
}
// Refresh the cached user (e.g. after changing the profile photo)
export async function updateStoredUser(user) {
  await AsyncStorage.setItem('user', JSON.stringify(user));
}

export async function api(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = await getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export function kes(amount) {
  if (amount == null) return '';
  return `KES ${Number(amount).toLocaleString('en-KE')}`;
}

// Upload photos/videos picked with expo-image-picker.
// Takes picker assets, returns server paths like ["/uploads/abc.jpg"].
const EXT_FROM_MIME = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif',
  'video/mp4': 'mp4', 'video/quicktime': 'mov', 'video/webm': 'webm',
};
const ALLOWED_EXT = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'mp4', 'mov', 'webm', 'm4v'];

export async function uploadAssets(assets) {
  if (!assets || assets.length === 0) return [];
  const fd = new FormData();
  assets.forEach((a, i) => {
    let ext = (a.fileName?.split('.').pop() || a.uri.split('.').pop() || '').toLowerCase();
    if (!ALLOWED_EXT.includes(ext)) {
      ext = EXT_FROM_MIME[a.mimeType] || (a.type === 'video' ? 'mp4' : 'jpg');
    }
    fd.append('files', {
      uri: a.uri,
      name: `upload-${Date.now()}-${i}.${ext}`,
      type: a.mimeType || (a.type === 'video' ? 'video/mp4' : 'image/jpeg'),
    });
  });
  const headers = {};
  const token = await getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  // NOTE: no Content-Type header — fetch sets the multipart boundary itself
  const res = await fetch(`${API_URL}/api/upload`, { method: 'POST', headers, body: fd });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Upload failed');
  return data.urls;
}

// Uploaded files are stored as relative paths like "/uploads/abc.jpg".
// This turns them into full URLs; external links pass through unchanged.
export function mediaUrl(url) {
  if (!url) return url;
  return url.startsWith('/') ? `${API_URL}${url}` : url;
}
