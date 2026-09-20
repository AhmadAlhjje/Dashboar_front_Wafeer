import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, messageFor } from '../api/client';
import { ACTION_LABEL, type Overview } from '../api/types';
import { Card, Empty, ErrorBox, Stat, fmtDate } from '../components/ui';

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
