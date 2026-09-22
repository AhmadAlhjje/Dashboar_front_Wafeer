import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api, messageFor } from '../api/client';
import { ACTION_LABEL, type Overview, type PlatformNotice } from '../api/types';
import { Button, Card, Empty, ErrorBox, Field, Input, Stat, Textarea, fmtDate, useToast } from '../components/ui';

export function OverviewPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [wafeer, setWafeer] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [overview, health] = await Promise.all([api.overview(), api.health()]);
        if (cancelled) return;
        setData(overview);
        setWafeer(health.wafeer);
        setError(null);
      } catch (e) {
        if (!cancelled) setError(messageFor(e));
      }
    };
    void load();
    const timer = setInterval(load, 30_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  return (
    <>
      <header className="page-header">
        <h1>نظرة عامة</h1>
        <span className={`pill ${wafeer === null ? '' : wafeer ? 'pill-ok' : 'pill-bad'}`}>
          خادم وفير: {wafeer === null ? '…' : wafeer ? 'متصل' : 'غير متصل'}
        </span>
      </header>
      <ErrorBox text={error} />
      <NoticeCard />
      {data ? (
        <>
          <div className="stats-grid">
            <Stat label="المكاتب" value={data.offices.total} tone="gold" />
            <Stat label="نشطة" value={data.offices.active} tone="success" />
            <Stat label="موقوفة" value={data.offices.suspended} tone="danger" />
            <Stat label="منتهية" value={data.offices.expired} tone="warning" />
            <Stat label="الحركات اليوم" value={data.movements.today} />
            <Stat label="إجمالي الحركات" value={data.movements.total} />
            <Stat label="العملاء" value={data.clients} />
            <Stat label="الإداريون" value={data.admins} />
          </div>
          <Card title="آخر العمليات" actions={<Link to="/audit" className="link">السجل كاملاً</Link>}>
            {data.recentAudit.length === 0 ? (
              <Empty text="لا عمليات بعد" />
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>الوقت</th>
                    <th>المالك</th>
                    <th>العملية</th>
                    <th>المكتب / الهدف</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentAudit.map((a) => (
                    <tr key={a.id}>
                      <td className="num">{fmtDate(a.createdAt)}</td>
                      <td>{a.ownerUsername}</td>
                      <td>{ACTION_LABEL[a.action] ?? a.action}</td>
                      <td>
                        {a.officeId ? <Link to={`/offices/${a.officeId}`} className="link">{a.target ?? a.officeCode}</Link> : (a.target ?? '—')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </>
      ) : !error ? (
        <p className="muted">جارٍ التحميل…</p>
      ) : null}
    </>
  );
}

/**
 * إعلان إيقاف التطبيقات (قرار المستخدم 2026-09-23): رسالة يكتبها المالك ويضغط «تفعيل»، فتظهر
 * على كل التطبيقات ويتوقّف التطبيق عن العمل. من كان داخل التطبيق لا تظهر له حتى يخرج ويعود
 * أو يسجّل دخولاً جديداً، ولا يعود أحد للعمل إلا بعد «إلغاء الإيقاف» من هنا.
 */
function NoticeCard() {
  const toast = useToast();
  const [notice, setNotice] = useState<PlatformNotice | null>(null);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      const current = await api.notice();
      setNotice(current);
      setTitle(current.title ?? '');
      setMessage(current.message ?? '');
    } catch (e) {
      setError(messageFor(e));
    }
  };
  useEffect(() => {
    void load();
  }, []);

  const apply = async (isActive: boolean, e?: FormEvent) => {
    e?.preventDefault();
    if (isActive && !message.trim()) return setError('اكتب الرسالة التي ستظهر في التطبيقات قبل التفعيل');
    if (isActive && !window.confirm('تفعيل الإيقاف سيمنع كل المكاتب من استخدام التطبيق عند فتحه أو تسجيل الدخول. متابعة؟')) return;
    setBusy(true);
    setError(null);
    try {
      const saved = await api.setNotice({ isActive, title: title.trim() || null, message: message.trim() });
      setNotice(saved);
      toast('success', isActive ? 'فُعِّل الإيقاف — يظهر لكل من يفتح التطبيق أو يسجّل دخوله' : 'أُلغي الإيقاف — عادت التطبيقات للعمل');
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setBusy(false);
    }
  };

  const active = notice?.isActive === true;
  return (
    <Card
      title="إيقاف التطبيقات برسالة"
      actions={<span className={`badge ${active ? 'badge-suspended' : 'badge-active'}`}>{active ? 'مُفعَّل الآن' : 'غير مفعَّل'}</span>}
    >
      <form onSubmit={(e) => apply(true, e)} noValidate>
        <Field label="عنوان الرسالة (اختياري)" hint="مثال: إيقاف مؤقت للصيانة">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={150} placeholder="إيقاف مؤقت" />
        </Field>
        <Field
          label="نصّ الرسالة"
          hint="تظهر في كل التطبيقات مع أرقام الدعم. من كان داخل التطبيق يُكمل عمله ولا تظهر له حتى يخرج ويعود أو يسجّل دخولاً جديداً."
        >
          <Textarea value={message} onChange={(e) => setMessage(e.target.value)} maxLength={2000} rows={4} placeholder="اكتب الرسالة التي تريد أن يراها الجميع…" />
        </Field>
        <ErrorBox text={error} />
        <div className="row-end">
          <span className="muted small">
            {active ? `مفعَّل منذ ${fmtDate(notice?.updatedAt)} — التطبيقات متوقفة حتى الإلغاء` : 'التطبيقات تعمل بشكل طبيعي'}
          </span>
          {active ? (
            <Button type="button" variant="primary" loading={busy} onClick={() => void apply(false)}>
              إلغاء الإيقاف
            </Button>
          ) : null}
          <Button type="submit" variant="danger" loading={busy}>
            {active ? 'تحديث الرسالة' : 'تفعيل الإيقاف'}
          </Button>
        </div>
      </form>
    </Card>
  );
}
