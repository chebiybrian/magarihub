// Tiny API client shared by every page.
// Change API_URL when you deploy the backend (e.g. https://api.magarihub.co.ke).
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export function getToken() { return localStorage.getItem('token'); }
export function getUser() {
  const raw = localStorage.getItem('user');
  return raw ? JSON.parse(raw) : null;
}
export function saveSession(token, user) {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
}
export function clearSession() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}
// Refresh the cached user (e.g. after changing the profile photo)
export function updateStoredUser(user) {
  localStorage.setItem('user', JSON.stringify(user));
}

// api('/api/listings')            -> GET
// api('/api/reels/1/like', { method: 'POST' })
// api('/api/auth/login', { method: 'POST', body: { email, password } })
export async function api(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
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

// Format 950000 -> "KES 950,000"
export function kes(amount) {
  if (amount == null) return '';
  return `KES ${Number(amount).toLocaleString('en-KE')}`;
}

// Uploaded files are stored as relative paths like "/uploads/abc.jpg".
// This turns them into full URLs; external links (http...) pass through unchanged.
export function mediaUrl(url) {
  if (!url) return url;
  return url.startsWith('/') ? `${API_URL}${url}` : url;
}

// Upload photos/videos. Takes a FileList or array of File objects,
// returns an array of URL paths to save with the listing/part/reel.
export async function uploadFiles(fileList) {
  const files = Array.from(fileList || []);
  if (files.length === 0) return [];
  const fd = new FormData();
  files.forEach((f) => fd.append('files', f));
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  // NOTE: no Content-Type header — the browser sets the multipart boundary itself
  const res = await fetch(`${API_URL}/api/upload`, { method: 'POST', headers, body: fd });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Upload failed');
  return data.urls;
}
