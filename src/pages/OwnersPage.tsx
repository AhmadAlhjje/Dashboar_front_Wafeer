import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { api, messageFor } from '../api/client';
import type { Owner } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { Button, Card, Empty, ErrorBox, Field, Input, Modal, fmtDate, useToast } from '../components/ui';

export function OwnersPage() {
  const toast = useToast();
  const { owner: me } = useAuth();
  const [owners, setOwners] = useState<Owner[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ username: '', displayName: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setOwners(await api.owners());
      setError(null);
    } catch (e) {
      setError(messageFor(e));
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const add = async (e: FormEvent) => {
    e.preventDefault();
    if (!/^[A-Za-z0-9_.-]{3,100}$/.test(form.username)) return setFormError('اسم المستخدم: أحرف لاتينية وأرقام و _ . - (3 فأكثر)');
    if (form.displayName.trim().length < 2) return setFormError('الاسم الظاهر مطلوب');
    if (form.password.length < 8) return setFormError('كلمة المرور 8 محارف فأكثر');
    setBusy(true);
    setFormError(null);
    try {
      await api.createOwner({ username: form.username, displayName: form.displayName.trim(), password: form.password });
      toast('success', 'أُضيف المالك');
      setAdding(false);
      setForm({ username: '', displayName: '', password: '' });
      await load();
    } catch (err) {
      setFormError(messageFor(err));
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (o: Owner) => {
    try {
      await api.setOwnerActive(o.id, !o.isActive);
      await load();
    } catch (err) {
      toast('error', messageFor(err));
    }
  };

  return (
    <>
      <header className="page-header">
        <h1>مالكو اللوحة</h1>
        <Button variant="primary" onClick={() => setAdding(true)}>
          + مالك
        </Button>
      </header>
      <ErrorBox text={error} />
      <Card>
        {owners === null ? (
          <p className="muted">جارٍ التحميل…</p>
        ) : owners.length === 0 ? (
          <Empty text="لا مالكين" />
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>اسم المستخدم</th>
                <th>الاسم</th>
                <th>آخر دخول</th>
                <th>الحالة</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {owners.map((o) => (
                <tr key={o.id}>
                  <td className="mono">{o.username}</td>
                  <td>{o.displayName}</td>
                  <td className="num">{fmtDate(o.lastLoginAt)}</td>
                  <td>{o.isActive ? <span className="badge badge-active">نشط</span> : <span className="badge badge-suspended">معطّل</span>}</td>
                  <td className="actions">
                    <Button className="btn-sm" variant={o.isActive ? 'danger' : 'secondary'} disabled={o.id === me?.id} onClick={() => toggle(o)}>
                      {o.isActive ? 'تعطيل' : 'تفعيل'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      <Modal open={adding} title="مالك جديد" onClose={() => !busy && setAdding(false)}>
        <form onSubmit={add} noValidate>
          <Field label="اسم المستخدم" hint="أحرف لاتينية وأرقام">
            <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} dir="ltr" autoFocus />
          </Field>
          <Field label="الاسم الظاهر">
            <Input value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} />
          </Field>
          <Field label="كلمة المرور">
            <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} dir="ltr" autoComplete="new-password" />
          </Field>
          <ErrorBox text={formError} />
          <div className="modal-actions">
            <Button type="button" onClick={() => setAdding(false)} disabled={busy}>
              إلغاء
            </Button>
            <Button type="submit" variant="primary" loading={busy}>
              إضافة
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
