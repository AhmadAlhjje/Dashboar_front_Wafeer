import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { messageFor } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { Button, ErrorBox, Field, Input } from '../components/ui';

export function LoginPage() {
  const { owner, login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (owner) return <Navigate to="/" replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('أدخل اسم المستخدم وكلمة المرور');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await login(username, password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={submit} noValidate>
        <div className="brand brand-lg">
          <span className="brand-mark">$</span>
          <div>
            <div className="brand-name">وفير</div>
            <div className="brand-sub">لوحة تحكم المنصّة</div>
          </div>
        </div>
        <h1>تسجيل الدخول</h1>
        <p className="muted">هذه اللوحة لمالك النظام فقط — لإدارة المكاتب وتراخيصها.</p>
        <Field label="اسم المستخدم">
          <Input value={username} onChange={(e) => setUsername(e.target.value)} autoFocus autoComplete="username" dir="ltr" />
        </Field>
        <Field label="كلمة المرور">
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" dir="ltr" />
        </Field>
        <ErrorBox text={error} />
        <Button type="submit" variant="primary" loading={loading} className="btn-block">
          دخول
        </Button>
      </form>
    </div>
  );
}
