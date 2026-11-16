import { useState } from 'react';
import { supabase } from '../lib/supabase';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message === 'Invalid login credentials' ? 'Nieprawidłowy e-mail lub hasło' : error.message);
    setBusy(false);
  };

  return (
    <div className="login">
      <form onSubmit={submit} className="login-card">
        <div className="logo">🏠</div>
        <h1>Nasz domek</h1>
        <p className="muted">Planer remontu</p>
        <input type="email" autoComplete="email" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input
          type="password"
          autoComplete="current-password"
          placeholder="Hasło"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <div className="error">{error}</div>}
        <button className="btn primary block" disabled={busy}>
          {busy ? 'Logowanie…' : 'Zaloguj'}
        </button>
      </form>
    </div>
  );
}
