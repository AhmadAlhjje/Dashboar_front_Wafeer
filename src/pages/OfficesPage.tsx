import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api, messageFor } from '../api/client';
import { effectiveStatus, type CreatedOffice, type LicenseStatus, type Office } from '../api/types';
import { Button, Card, CopyButton, Empty, ErrorBox, Field, Input, Modal, Select, StatusBadge, Textarea, fmtDate, useToast } from '../components/ui';

const emptyForm = { name: '', phone: '', address: '', notes: '', expiresAt: '', message: '', adminName: '', adminPassword: '', adminPhone: '', adminEmail: '' };

/** كلمة مرور عشوائية مقروءة (12 محرفاً) لتسليمها للمكتب. */
export function suggestPassword(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
}

export function OfficesPage() {
  const toast = useToast();
  const [offices, setOffices] = useState<Office[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'ALL' | LicenseStatus>('ALL');
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [created, setCreated] = useState<(CreatedOffice & { password: string }) | null>(null);

  const load = useCallback(async () => {
    try {
      setOffices(await api.offices());
      setError(null);
    } catch (e) {
      setError(messageFor(e));
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (offices ?? []).filter((o) => {
      const s = effectiveStatus(o);
      if (status !== 'ALL' && s !== status) return false;
      return !q || o.name.toLowerCase().includes(q) || o.code.toLowerCase().includes(q) || (o.phone ?? '').includes(q);
    });
  }, [offices, query, status]);

  const set = (k: keyof typeof emptyForm) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (form.name.trim().length < 2) return setFormError('اسم المكتب مطلوب (حرفان فأكثر)');
    if (form.adminName.trim().length < 2) return setFormError('اسم مدير المكتب مطلوب');
    if (form.adminPassword.length < 8) return setFormError('كلمة المرور 8 محارف فأكثر');
    setSaving(true);
    setFormError(null);
    try {
      const result = await api.createOffice({
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        address: form.address.trim() || null,
        notes: form.notes.trim() || null,
        expiresAt: form.expiresAt || null,
        message: form.message.trim() || null,
        admin: { fullName: form.adminName.trim(), password: form.adminPassword, phone: form.adminPhone.trim() || null, email: form.adminEmail.trim() || null },
      });
      setCreated({ ...result, password: form.adminPassword });
      setForm(emptyForm);
      setCreating(false);
      toast('success', `أُنشئ المكتب «${result.office.name}» بالكود ${result.office.code}`);
      await load();
    } catch (err) {
      setFormError(messageFor(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <header className="page-header">
        <h1>المكاتب</h1>
        <Button variant="primary" onClick={() => setCreating(true)}>
          + مكتب جديد
        </Button>
      </header>
      <ErrorBox text={error} />
      <Card>
        <div className="toolbar">
          <Input placeholder="بحث بالاسم أو الكود أو الهاتف…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="بحث" />
          <Select value={status} onChange={(e) => setStatus(e.target.value as 'ALL' | LicenseStatus)} aria-label="الحالة">
            <option value="ALL">كل الحالات</option>
            <option value="ACTIVE">نشط</option>
            <option value="SUSPENDED">موقوف</option>
            <option value="EXPIRED">منتهٍ</option>
          </Select>
          <span className="muted">{visible.length} مكتب</span>
        </div>
        {offices === null && !error ? (
          <p className="muted">جارٍ التحميل…</p>
        ) : visible.length === 0 ? (
          <Empty text="لا مكاتب مطابقة" />
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>الكود</th>
                <th>الاسم</th>
                <th>الحالة</th>
                <th>ينتهي</th>
                <th>الإداريون</th>
                <th>العملاء</th>
                <th>الحركات</th>
                <th>آخر حركة</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((o) => (
                <tr key={o.id}>
                  <td className="num">
                    <Link to={`/offices/${o.id}`} className="link mono">
                      {o.code}
                    </Link>
                  </td>
                  <td>
                    <Link to={`/offices/${o.id}`} className="link">
                      {o.name}
                    </Link>
                  </td>
                  <td>
                    <StatusBadge status={effectiveStatus(o)} />
                  </td>
                  <td className="num">{o.expiresAt ? fmtDate(o.expiresAt) : 'بلا انتهاء'}</td>
                  <td className="num">{o.stats?.activeAdmins ?? '—'} / {o.stats?.admins ?? '—'}</td>
                  <td className="num">{o.stats?.clients ?? '—'}</td>
                  <td className="num">{o.stats?.movements ?? '—'}</td>
                  <td className="num">{fmtDate(o.stats?.lastMovementAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Modal open={creating} title="مكتب جديد" onClose={() => !saving && setCreating(false)} width={720}>
        <form onSubmit={submit} noValidate className="form-grid">
          <h4 className="span-2">بيانات المكتب</h4>
          <Field label="اسم المكتب">
            <Input value={form.name} onChange={set('name')} autoFocus />
          </Field>
          <Field label="الهاتف">
            <Input value={form.phone} onChange={set('phone')} dir="ltr" />
          </Field>
          <Field label="العنوان">
            <Input value={form.address} onChange={set('address')} />
          </Field>
          <Field label="ينتهي الاشتراك في" hint="اتركه فارغاً لاشتراك مفتوح">
            <Input type="date" value={form.expiresAt} onChange={set('expiresAt')} dir="ltr" />
          </Field>
          <Field label="ملاحظات داخلية">
            <Textarea value={form.notes} onChange={set('notes')} />
          </Field>
          <Field label="رسالة تظهر للمكتب عند القفل (اختياري)">
            <Textarea value={form.message} onChange={set('message')} />
          </Field>
          <h4 className="span-2">مدير المكتب الأول (يُسلَّم مع الكود)</h4>
          <Field label="اسم المستخدم (الاسم الكامل)">
            <Input value={form.adminName} onChange={set('adminName')} />
          </Field>
          <Field label="كلمة المرور" hint="8 محارف فأكثر — يمكنه تغييرها من التطبيق">
            <div className="row">
              <Input value={form.adminPassword} onChange={set('adminPassword')} dir="ltr" autoComplete="new-password" />
              <Button type="button" onClick={() => setForm((f) => ({ ...f, adminPassword: suggestPassword() }))}>
                توليد
              </Button>
            </div>
          </Field>
          <Field label="هاتف المدير">
            <Input value={form.adminPhone} onChange={set('adminPhone')} dir="ltr" />
          </Field>
          <Field label="بريد المدير (اختياري)">
            <Input value={form.adminEmail} onChange={set('adminEmail')} dir="ltr" type="email" />
          </Field>
          <div className="span-2">
            <ErrorBox text={formError} />
          </div>
          <div className="span-2 modal-actions">
            <Button type="button" onClick={() => setCreating(false)} disabled={saving}>
              إلغاء
            </Button>
            <Button type="submit" variant="primary" loading={saving}>
              إنشاء المكتب
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={created !== null} title="بيانات التسليم للمكتب" onClose={() => setCreated(null)}>
        {created ? (
          <div className="handover">
            <p className="muted">تظهر كلمة المرور هنا مرة واحدة فقط ولا تُخزَّن في اللوحة. سلّم هذه البيانات للمكتب:</p>
            <dl className="kv">
              <dt>كود المكتب</dt>
              <dd className="mono">
                {created.credentials.officeCode} <CopyButton value={created.credentials.officeCode} />
              </dd>
              <dt>اسم المستخدم</dt>
              <dd>
                {created.credentials.fullName} <CopyButton value={created.credentials.fullName} />
              </dd>
              <dt>كلمة المرور</dt>
              <dd className="mono">
                {created.password} <CopyButton value={created.password} />
              </dd>
            </dl>
            <CopyButton
              label="نسخ الكل"
              value={`كود المكتب: ${created.credentials.officeCode}\nاسم المستخدم: ${created.credentials.fullName}\nكلمة المرور: ${created.password}`}
            />
            <div className="modal-actions">
              <Link to={`/offices/${created.office.id}`} className="btn btn-primary">
                فتح صفحة المكتب
              </Link>
            </div>
          </div>
        ) : null}
      </Modal>
    </>
  );
}
