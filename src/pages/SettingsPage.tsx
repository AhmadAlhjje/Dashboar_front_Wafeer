import { useState, type FormEvent } from 'react';
import { api, messageFor } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { Button, Card, ErrorBox, Field, Input, useToast } from '../components/ui';

export function SettingsPage() {
  const { owner } = useAuth();
  const toast = useToast();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (next.length < 8) return setError('كلمة المرور الجديدة 8 محارف فأكثر');
    if (next !== confirm) return setError('كلمتا المرور غير متطابقتين');
    setBusy(true);
    setError(null);
    try {
      await api.changePassword(current, next);
      toast('success', 'تم تغيير كلمة المرور');
      setCurrent('');
      setNext('');
      setConfirm('');
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <header className="page-header">
        <h1>الإعدادات</h1>
      </header>
      <div className="two-col">
        <Card title="حسابي">
          <dl className="kv">
            <dt>اسم المستخدم</dt>
            <dd className="mono">{owner?.username}</dd>
            <dt>الاسم</dt>
            <dd>{owner?.displayName}</dd>
          </dl>
        </Card>
        <Card title="تغيير كلمة المرور">
          <form onSubmit={submit} noValidate>
            <Field label="كلمة المرور الحالية">
              <Input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} dir="ltr" autoComplete="current-password" />
            </Field>
            <Field label="كلمة المرور الجديدة">
              <Input type="password" value={next} onChange={(e) => setNext(e.target.value)} dir="ltr" autoComplete="new-password" />
            </Field>
            <Field label="تأكيد كلمة المرور الجديدة">
              <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} dir="ltr" autoComplete="new-password" />
            </Field>
            <ErrorBox text={error} />
            <div className="row-end">
              <Button type="submit" variant="primary" loading={busy}>
                حفظ
              </Button>
            </div>
          </form>
        </Card>
      </div>
      <Card title="كيف يعمل الترخيص؟">
        <ul className="help">
          <li>كل مكتب له كود ثابت يُولَّد عند إنشائه؛ يسجّل المكتب الدخول بالكود + اسم المستخدم + كلمة المرور، ويستطيع تغيير كلمة المرور من التطبيق.</li>
          <li>تغيير حالة الترخيص (نشط / موقوف / منتهٍ) من صفحة المكتب يصل إلى كل أجهزته خلال ثوانٍ: يظهر القفل فوراً ويزول وحده عند إعادة التفعيل.</li>
          <li>تاريخ الانتهاء اختياري: بعده يُعتبر النشط منتهياً تلقائياً. الرسالة تُعرض للمكتب في شاشة القفل.</li>
          <li>كل عملية من هذه اللوحة تُدوَّن في سجل العمليات مع صاحبها.</li>
        </ul>
      </Card>
    </>
  );
}
