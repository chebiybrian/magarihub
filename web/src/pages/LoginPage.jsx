// Login + register in one page.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, saveSession } from '../api/client';

export default function LoginPage() {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', role: 'BUYER' });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError('');
    try {
      const path = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const { token, user } = await api(path, { method: 'POST', body: form });
      saveSession(token, user);
      navigate('/');
      window.location.reload(); // refresh navbar with logged-in state
    } catch (err) { setError(err.message); }
  }

  return (
    <div className="page narrow">
      <h1>{mode === 'login' ? 'Login' : 'Create Account'}</h1>
      <form className="stack" onSubmit={submit}>
        {mode === 'register' && (
          <>
            <input placeholder="Full name" value={form.name} onChange={set('name')} required />
            <input placeholder="Phone e.g. +254712345678" value={form.phone} onChange={set('phone')} />
            <select value={form.role} onChange={set('role')}>
              <option value="BUYER">I'm buying</option>
              <option value="SELLER">I'm selling my car</option>
              <option value="DEALER">I'm a dealer</option>
              <option value="DRIVER">I'm a driver for hire</option>
            </select>
          </>
        )}
        <input type="email" placeholder="Email" value={form.email} onChange={set('email')} required />
        <input type="password" placeholder="Password" value={form.password} onChange={set('password')} required />
        {error && <p className="error">{error}</p>}
        <button className="btn" type="submit">{mode === 'login' ? 'Login' : 'Register'}</button>
      </form>
      <p>
        {mode === 'login' ? "No account yet? " : 'Already have an account? '}
        <button className="link" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
          {mode === 'login' ? 'Register' : 'Login'}
        </button>
      </p>
      <p className="meta">Demo account: dealer@example.com / password123</p>
    </div>
  );
}
