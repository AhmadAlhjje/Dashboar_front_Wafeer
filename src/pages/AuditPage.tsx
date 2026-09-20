import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, messageFor } from '../api/client';
import { ACTION_LABEL, type AuditRecord } from '../api/types';
import { Button, Card, Empty, ErrorBox, Input, fmtDate } from '../components/ui';

export function AuditPage() {
  const [rows, setRows] = useState<AuditRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(100);

  useEffect(() => {
    let cancelled = false;
    api
      .audit(limit)
      .then((r) => {
        if (!cancelled) {
          setRows(r);
          setError(null);
        }
      })
      .catch((e) => !cancelled && setError(messageFor(e)));
    return () => {
      cancelled = true;
    };
  }, [limit]);

  const q = query.trim().toLowerCase();
  const visible = (rows ?? []).filter(
    (r) => !q || r.ownerUsername.toLowerCase().includes(q) || (ACTION_LABEL[r.action] ?? r.action).includes(q) || (r.target ?? '').toLowerCase().includes(q) || (r.officeCode ?? '').toLowerCase().includes(q),
  );

  return (
    <>
      <header className="page-header">
        <h1>سجل العمليات</h1>
      </header>
      <ErrorBox text={error} />
      <Card>
        <div className="toolbar">
          <Input placeholder="بحث…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="بحث" />
          <span className="muted">{visible.length} عملية</span>
          {rows && rows.length >= limit ? (
            <Button className="btn-sm" onClick={() => setLimit((l) => Math.min(l + 200, 500))}>
              تحميل المزيد
            </Button>
          ) : null}
        </div>
        {rows === null && !error ? (
          <p className="muted">جارٍ التحميل…</p>
        ) : visible.length === 0 ? (
          <Empty text="لا عمليات" />
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>الوقت</th>
                <th>المالك</th>
                <th>العملية</th>
                <th>المكتب</th>
                <th>الهدف</th>
                <th>التفاصيل</th>
                <th>IP</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr key={r.id}>
                  <td className="num">{fmtDate(r.createdAt)}</td>
                  <td>{r.ownerUsername}</td>
                  <td>{ACTION_LABEL[r.action] ?? r.action}</td>
                  <td className="mono">{r.officeId ? <Link to={`/offices/${r.officeId}`} className="link">{r.officeCode ?? r.officeId}</Link> : '—'}</td>
                  <td>{r.target ?? '—'}</td>
                  <td className="details">{r.details ? <code>{JSON.stringify(r.details)}</code> : '—'}</td>
                  <td className="num">{r.ip ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </>
  );
}
