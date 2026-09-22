import { useCallback, useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, messageFor } from '../api/client';
import { ACTION_LABEL, effectiveStatus, type AuditRecord, type LicenseStatus, type Office, type OfficeAdmin, type OfficeDevice } from '../api/types';
import { Button, Card, CopyButton, Empty, ErrorBox, Field, Input, Modal, Select, Stat, StatusBadge, Textarea, fmtDate, toDateInput, useToast } from '../components/ui';
import { suggestPassword } from './OfficesPage';

export function OfficePage() {
  const { id = '' } = useParams();
  const toast = useToast();
  const [office, setOffice] = useState<Office | null>(null);
  const [admins, setAdmins] = useState<OfficeAdmin[]>([]);
  const [audit, setAudit] = useState<AuditRecord[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await api.office(id);
      setOffice(data.office);
      setAdmins(data.admins);
      setAudit(data.audit);
      setError(null);
    } catch (e) {
      setError(messageFor(e));
    }
  }, [id]);
  useEffect(() => {
    void load();
  }, [load]);

  if (error && !office) return <ErrorBox text={error} />;
  if (!office) return <p className="muted">جارٍ التحميل…</p>;
  const status = effectiveStatus(office);

  return (
    <>
      <header className="page-header">
        <div>
          <p className="crumbs">
            <Link to="/offices" className="link">
              المكاتب
            </Link>{' '}
            ‹ {office.name}
          </p>
          <h1>
            {office.name} <StatusBadge status={status} />
          </h1>
          <p className="muted">
            كود التفعيل الحالي: <span className="mono">{office.code}</span> <CopyButton value={office.code} /> · أُنشئ {fmtDate(office.createdAt)}
          </p>
          <p className="muted small">الكود يُستخدم مرة واحدة لتفعيل جهاز؛ بعد استعماله يتولّد كود جديد تلقائياً ويظهر هنا فقط.</p>
        </div>
        <RegenerateCode office={office} onDone={load} />
      </header>
      <ErrorBox text={error} />

      <div className="stats-grid">
        <Stat label="الإداريون (نشط/الكل)" value={`${office.stats?.activeAdmins ?? 0} / ${office.stats?.admins ?? 0}`} />
        <Stat label="العملاء" value={office.stats?.clients ?? 0} />
        <Stat label="الحركات" value={office.stats?.movements ?? 0} tone="gold" />
        <Stat
          label="الإضافات / الحد"
          value={office.movementLimit == null ? `${office.movementsUsed} / بلا حد` : `${office.movementsUsed} / ${office.movementLimit}`}
          tone={office.movementLimit != null && office.movementsUsed >= office.movementLimit ? 'danger' : undefined}
        />
        <Stat label="حركات اليوم" value={office.stats?.movementsToday ?? 0} />
        <Stat label="آخر حركة" value={fmtDate(office.stats?.lastMovementAt)} />
      </div>

      <div className="two-col">
        <LicenseCard office={office} onSaved={load} />
        <InfoCard office={office} onSaved={load} />
      </div>
      <LogoCard office={office} onChanged={load} />
      <DevicesCard officeId={office.id} />
      <AdminsCard officeId={office.id} admins={admins} onChanged={load} toast={toast} />
      <Card title="سجل عمليات هذا المكتب">
        {audit.length === 0 ? (
          <Empty text="لا عمليات بعد" />
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>الوقت</th>
                <th>المالك</th>
                <th>العملية</th>
                <th>الهدف</th>
              </tr>
            </thead>
            <tbody>
              {audit.map((a) => (
                <tr key={a.id}>
                  <td className="num">{fmtDate(a.createdAt)}</td>
                  <td>{a.ownerUsername}</td>
                  <td>{ACTION_LABEL[a.action] ?? a.action}</td>
                  <td>{a.target ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </>
  );
}

/** توليد كود مكتب جديد عند ضياعه: تأكيد ← الكود الجديد يُعرض مرة واحدة ← الدخول التالي به. */
function RegenerateCode({ office, onDone }: { office: Office; onDone: () => Promise<void> }) {
  const toast = useToast();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [newCode, setNewCode] = useState<string | null>(null);
  const run = async () => {
    setBusy(true);
    try {
      const updated = await api.regenerateCode(office.id);
      setConfirm(false);
      setNewCode(updated.code);
      toast('success', 'وُلّد كود جديد للمكتب');
      await onDone();
    } catch (err) {
      toast('error', messageFor(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <Button onClick={() => setConfirm(true)}>توليد كود جديد</Button>
      <Modal open={confirm} title="توليد كود مكتب جديد" onClose={() => !busy && setConfirm(false)}>
        <p>
          سيتوقف الكود الحالي <span className="mono">{office.code}</span> فوراً ويُستبدل بكود جديد. الأجهزة المفعَّلة سابقاً تكمل عملها بمفتاحها الدائم؛ الكود الجديد يلزم فقط لتفعيل جهاز جديد.
        </p>
        <div className="modal-actions">
          <Button onClick={() => setConfirm(false)} disabled={busy}>
            إلغاء
          </Button>
          <Button variant="danger" loading={busy} onClick={run}>
            توليد الكود
          </Button>
        </div>
      </Modal>
      <Modal open={newCode !== null} title="الكود الجديد للمكتب" onClose={() => setNewCode(null)}>
        {newCode ? (
          <div className="handover">
            <p className="muted">سلّم هذا الكود للمكتب؛ يُدخله مرة واحدة عند أول دخول على الجهاز الجديد (يُستهلك بعدها ويتولّد غيره):</p>
            <dl className="kv">
              <dt>كود المكتب</dt>
              <dd className="mono">
                {newCode} <CopyButton value={newCode} />
              </dd>
            </dl>
          </div>
        ) : null}
      </Modal>
    </>
  );
}

function LicenseCard({ office, onSaved }: { office: Office; onSaved: () => Promise<void> }) {
  const toast = useToast();
  const [status, setStatus] = useState<LicenseStatus>(office.status);
  const [expiresAt, setExpiresAt] = useState(toDateInput(office.expiresAt));
  const [message, setMessage] = useState(office.message ?? '');
  const [limit, setLimit] = useState(office.movementLimit == null ? '' : String(office.movementLimit));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    setStatus(office.status);
    setExpiresAt(toDateInput(office.expiresAt));
    setMessage(office.message ?? '');
    setLimit(office.movementLimit == null ? '' : String(office.movementLimit));
  }, [office]);

  const resetCounter = async () => {
    if (!window.confirm(`تصفير عدّاد الحركات المضافة للمكتب «${office.name}» (${office.movementsUsed} → 0)؟ يعود للمكتب حقّ الإضافة فوراً.`)) return;
    setSaving(true);
    setError(null);
    try {
      await api.resetOfficeMovements(office.id);
      toast('success', 'صُفّر عدّاد الحركات');
      await onSaved();
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setSaving(false);
    }
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const trimmedLimit = limit.trim();
    if (trimmedLimit !== '' && !/^\d+$/.test(trimmedLimit)) {
      setSaving(false);
      return setError('حد الحركات يجب أن يكون رقماً صحيحاً أو فارغاً (بلا حد)');
    }
    try {
      await api.setLicense(office.id, {
        status,
        expiresAt: expiresAt || null,
        message: message.trim() || null,
        movementLimit: trimmedLimit === '' ? null : Number(trimmedLimit),
      });
      toast('success', status === 'ACTIVE' ? 'الترخيص نشط — سيُرفع القفل لدى المكتب خلال ثوانٍ' : 'تم تغيير الترخيص — سيظهر القفل لدى المكتب خلال ثوانٍ');
      await onSaved();
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card title="الترخيص" actions={<StatusBadge status={effectiveStatus(office)} />}>
      <form onSubmit={save} noValidate>
        <Field label="الحالة">
          <Select value={status} onChange={(e) => setStatus(e.target.value as LicenseStatus)}>
            <option value="ACTIVE">نشط</option>
            <option value="SUSPENDED">موقوف</option>
            <option value="EXPIRED">منتهٍ</option>
          </Select>
        </Field>
        <Field label="ينتهي الاشتراك في" hint="بعد هذا التاريخ يُعتبر النشط منتهياً تلقائياً — فارغ = بلا انتهاء">
          <Input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} dir="ltr" />
        </Field>
        <Field
          label="حد الحركات (إضافات فقط)"
          hint={`المضاف حتى الآن: ${office.movementsUsed}. عند بلوغ الحد يعمل التطبيق كالمعتاد لكن تُمنع إضافة حركات جديدة (التعديل والحذف مسموحان) حتى ترفع الحد أو تصفّر العدّاد. فارغ = بلا حد`}
        >
          <div className="row-inline">
            <Input value={limit} onChange={(e) => setLimit(e.target.value)} dir="ltr" inputMode="numeric" placeholder="بلا حد" />
            <Button type="button" onClick={resetCounter} disabled={saving || office.movementsUsed === 0}>
              تصفير العدّاد ({office.movementsUsed})
            </Button>
          </div>
        </Field>
        <Field label="رسالة تظهر للمكتب في شاشة القفل" hint="مثال: يرجى تسديد الاشتراك للتواصل 0998107722">
          <Textarea value={message} onChange={(e) => setMessage(e.target.value)} />
        </Field>
        <ErrorBox text={error} />
        <div className="row-end">
          {status !== 'ACTIVE' ? (
            <span className="muted small">سيُمنع دخول المكتب واستخدامه فوراً.</span>
          ) : (
            <span className="muted small">آخر فحص من الخادم: {fmtDate(office.license?.checkedAt)}</span>
          )}
          <Button type="submit" variant={status === 'ACTIVE' ? 'primary' : 'danger'} loading={saving}>
            حفظ الترخيص
          </Button>
        </div>
      </form>
    </Card>
  );
}

/**
 * لوغو المكتب (قرار المستخدم 2026-09-21): يُغيَّر من هنا متى شاء المالك — يصل إلى تطبيق المكتب
 * فوراً ويحلّ محل لوغوه المحلي؛ داخل التطبيق يبقى تعيين اللوغو «مرة واحدة» كما هو.
 */
function LogoCard({ office, onChanged }: { office: Office; onChanged: () => Promise<void> }) {
  const toast = useToast();
  const fileInput = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [current, setCurrent] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // الصورة الحالية من الخادم (تتغيّر مع logoUpdatedAt)
  useEffect(() => {
    let url: string | null = null;
    let cancelled = false;
    if (!office.logoPath) {
      setCurrent(null);
      return;
    }
    api
      .officeLogoBlob(office.id)
      .then((blob) => {
        if (cancelled || !blob) return;
        url = URL.createObjectURL(blob);
        setCurrent(url);
      })
      .catch(() => setCurrent(null));
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [office.id, office.logoPath, office.logoUpdatedAt]);

  // معاينة الملف المختار قبل الرفع
  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const pick = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setError(null);
    if (f && !['image/png', 'image/jpeg', 'image/webp'].includes(f.type)) {
      setFile(null);
      return setError('الصورة يجب أن تكون PNG أو JPG أو WEBP');
    }
    if (f && f.size > 20 * 1024 * 1024) {
      setFile(null);
      return setError('حجم الصورة يجب ألا يتجاوز 20MB');
    }
    setFile(f);
  };

  const upload = async () => {
    if (!file) return setError('اختر صورة أولاً');
    setBusy(true);
    setError(null);
    try {
      await api.setOfficeLogo(office.id, file);
      setFile(null);
      if (fileInput.current) fileInput.current.value = '';
      toast('success', 'تم تحديث لوغو المكتب — يصل إلى التطبيق فوراً');
      await onChanged();
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm('إزالة لوغو المكتب؟ سيعود التطبيق إلى شعار وفير الافتراضي.')) return;
    setBusy(true);
    setError(null);
    try {
      await api.removeOfficeLogo(office.id);
      toast('success', 'أُزيل لوغو المكتب');
      await onChanged();
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card title="لوغو المكتب" actions={office.logoUpdatedAt ? <span className="muted">آخر تغيير: {fmtDate(office.logoUpdatedAt)}</span> : null}>
      <div className="logo-row">
        <div className="logo-preview" aria-label="اللوغو الحالي">
          {preview ? <img src={preview} alt="معاينة اللوغو الجديد" /> : current ? <img src={current} alt="لوغو المكتب" /> : <span className="muted">لا لوغو</span>}
        </div>
        <div className="logo-actions">
          <p className="muted">يُستخدم في ترويسة الطباعة داخل تطبيق المكتب. يمكن تغييره من هنا في أي وقت (PNG/JPG/WEBP حتى 20MB).</p>
          <Field label="اختيار صورة">
            <Input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" onChange={pick} />
          </Field>
          <ErrorBox text={error} />
          <div className="row-end">
            {office.logoPath ? (
              <Button variant="danger" onClick={remove} disabled={busy}>
                إزالة اللوغو
              </Button>
            ) : null}
            <Button variant="primary" onClick={upload} loading={busy} disabled={!file}>
              {office.logoPath ? 'استبدال اللوغو' : 'رفع اللوغو'}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

/** أجهزة المكتب (2026-09-22): كل تفعيل بالكود يسجّل جهازاً؛ إلغاؤه يجبره على كود جديد عند دخوله التالي. */
function DevicesCard({ officeId }: { officeId: string }) {
  const toast = useToast();
  const [devices, setDevices] = useState<OfficeDevice[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    try {
      setDevices(await api.officeDevices(officeId));
      setError(null);
    } catch (e) {
      setError(messageFor(e));
    }
  }, [officeId]);
  useEffect(() => {
    void load();
  }, [load]);

  const revoke = async (d: OfficeDevice) => {
    if (!window.confirm(`إلغاء الجهاز «${d.label ?? d.id}»؟ سيُطلب منه كود مكتب جديد عند الدخول التالي.`)) return;
    try {
      await api.revokeOfficeDevice(officeId, d.id);
      toast('success', 'أُلغي الجهاز');
      await load();
    } catch (e) {
      toast('error', messageFor(e));
    }
  };

  return (
    <Card title="الأجهزة المفعَّلة">
      <ErrorBox text={error} />
      {devices === null ? (
        <p className="muted">جارٍ التحميل…</p>
      ) : devices.length === 0 ? (
        <Empty text="لم يُفعَّل أي جهاز بعد — يُفعَّل الجهاز بإدخال كود المكتب في شاشة الدخول" />
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>الجهاز</th>
              <th>فُعّل في</th>
              <th>آخر دخول</th>
              <th>الحالة</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {devices.map((d) => (
              <tr key={d.id}>
                <td>{d.label ?? `#${d.id}`}</td>
                <td className="num">{fmtDate(d.createdAt)}</td>
                <td className="num">{fmtDate(d.lastSeenAt)}</td>
                <td>{d.revokedAt ? <span className="badge badge-suspended">مُلغى</span> : <span className="badge badge-active">فعّال</span>}</td>
                <td className="row-end">
                  {d.revokedAt ? null : (
                    <Button variant="danger" onClick={() => revoke(d)}>
                      إلغاء
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}

function InfoCard({ office, onSaved }: { office: Office; onSaved: () => Promise<void> }) {
  const toast = useToast();
  const [name, setName] = useState(office.name);
  const [phone, setPhone] = useState(office.phone ?? '');
  const [address, setAddress] = useState(office.address ?? '');
  const [notes, setNotes] = useState(office.notes ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    setName(office.name);
    setPhone(office.phone ?? '');
    setAddress(office.address ?? '');
    setNotes(office.notes ?? '');
  }, [office]);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) return setError('اسم المكتب مطلوب');
    setSaving(true);
    setError(null);
    try {
      await api.updateOffice(office.id, { name: name.trim(), phone: phone.trim() || null, address: address.trim() || null, notes: notes.trim() || null });
      toast('success', 'حُفظت بيانات المكتب');
      await onSaved();
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card title="بيانات المكتب">
      <form onSubmit={save} noValidate>
        <Field label="الاسم">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="الهاتف">
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" />
        </Field>
        <Field label="العنوان">
          <Input value={address} onChange={(e) => setAddress(e.target.value)} />
        </Field>
        <Field label="ملاحظات داخلية (لا يراها المكتب)">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        <ErrorBox text={error} />
        <div className="row-end">
          <Button type="submit" variant="primary" loading={saving}>
            حفظ البيانات
          </Button>
        </div>
      </form>
    </Card>
  );
}

function AdminsCard({ officeId, admins, onChanged, toast }: { officeId: string; admins: OfficeAdmin[]; onChanged: () => Promise<void>; toast: (k: 'success' | 'error', t: string) => void }) {
  const [adding, setAdding] = useState(false);
  const [reset, setReset] = useState<OfficeAdmin | null>(null);
  const [form, setForm] = useState({ fullName: '', password: '', phone: '', email: '', role: 'ADMIN' });
  const [newPassword, setNewPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [handover, setHandover] = useState<{ fullName: string; password: string } | null>(null);

  const add = async (e: FormEvent) => {
    e.preventDefault();
    if (form.fullName.trim().length < 2) return setError('الاسم مطلوب');
    if (form.password.length < 8) return setError('كلمة المرور 8 محارف فأكثر');
    setBusy(true);
    setError(null);
    try {
      const admin = await api.createOfficeAdmin(officeId, { fullName: form.fullName.trim(), password: form.password, phone: form.phone.trim() || null, email: form.email.trim() || null, role: form.role });
      setHandover({ fullName: admin.fullName, password: form.password });
      setAdding(false);
      setForm({ fullName: '', password: '', phone: '', email: '', role: 'ADMIN' });
      toast('success', `أُضيف الإداري ${admin.fullName}`);
      await onChanged();
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setBusy(false);
    }
  };

  const doReset = async (e: FormEvent) => {
    e.preventDefault();
    if (!reset) return;
    if (newPassword.length < 8) return setError('كلمة المرور 8 محارف فأكثر');
    setBusy(true);
    setError(null);
    try {
      await api.resetOfficeAdminPassword(officeId, reset.id, newPassword);
      setHandover({ fullName: reset.fullName, password: newPassword });
      setReset(null);
      setNewPassword('');
      toast('success', 'أُعيد تعيين كلمة المرور');
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (a: OfficeAdmin) => {
    try {
      await api.setOfficeAdminActive(officeId, a.id, !a.isActive);
      toast('success', a.isActive ? `عُطّل ${a.fullName}` : `فُعّل ${a.fullName}`);
      await onChanged();
    } catch (err) {
      toast('error', messageFor(err));
    }
  };

  return (
    <Card
      title="إداريو المكتب"
      actions={
        <Button variant="primary" onClick={() => setAdding(true)}>
          + إداري
        </Button>
      }
    >
      {admins.length === 0 ? (
        <Empty text="لا إداريين" />
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>الاسم</th>
              <th>الدور</th>
              <th>الهاتف</th>
              <th>البريد</th>
              <th>الحالة</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {admins.map((a) => (
              <tr key={a.id}>
                <td>{a.fullName}</td>
                <td>{a.role}</td>
                <td className="num">{a.phone ?? '—'}</td>
                <td className="num">{a.email ?? '—'}</td>
                <td>{a.isActive ? <span className="badge badge-active">نشط</span> : <span className="badge badge-suspended">معطّل</span>}</td>
                <td className="actions">
                  <Button className="btn-sm" onClick={() => setReset(a)}>
                    إعادة تعيين كلمة المرور
                  </Button>
                  <Button className="btn-sm" variant={a.isActive ? 'danger' : 'secondary'} onClick={() => toggle(a)}>
                    {a.isActive ? 'تعطيل' : 'تفعيل'}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Modal open={adding} title="إداري جديد" onClose={() => !busy && setAdding(false)}>
        <form onSubmit={add} noValidate>
          <Field label="الاسم الكامل (اسم الدخول)">
            <Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} autoFocus />
          </Field>
          <Field label="كلمة المرور">
            <div className="row">
              <Input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} dir="ltr" autoComplete="new-password" />
              <Button type="button" onClick={() => setForm({ ...form, password: suggestPassword() })}>
                توليد
              </Button>
            </div>
          </Field>
          <Field label="الدور">
            <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="ADMIN">مدير (كل الصلاحيات)</option>
              <option value="MANAGER">مشرف</option>
              <option value="ACCOUNTANT">محاسب</option>
              <option value="EMPLOYEE">موظف</option>
              <option value="VIEWER">مشاهد</option>
            </Select>
          </Field>
          <Field label="الهاتف">
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} dir="ltr" />
          </Field>
          <Field label="البريد">
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} dir="ltr" />
          </Field>
          <ErrorBox text={error} />
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

      <Modal open={reset !== null} title={`إعادة تعيين كلمة مرور ${reset?.fullName ?? ''}`} onClose={() => !busy && setReset(null)}>
        <form onSubmit={doReset} noValidate>
          <Field label="كلمة المرور الجديدة">
            <div className="row">
              <Input value={newPassword} onChange={(e) => setNewPassword(e.target.value)} dir="ltr" autoFocus autoComplete="new-password" />
              <Button type="button" onClick={() => setNewPassword(suggestPassword())}>
                توليد
              </Button>
            </div>
          </Field>
          <ErrorBox text={error} />
          <div className="modal-actions">
            <Button type="button" onClick={() => setReset(null)} disabled={busy}>
              إلغاء
            </Button>
            <Button type="submit" variant="primary" loading={busy}>
              حفظ
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={handover !== null} title="بيانات التسليم" onClose={() => setHandover(null)}>
        {handover ? (
          <div className="handover">
            <p className="muted">تظهر كلمة المرور مرة واحدة فقط:</p>
            <dl className="kv">
              <dt>اسم المستخدم</dt>
              <dd>
                {handover.fullName} <CopyButton value={handover.fullName} />
              </dd>
              <dt>كلمة المرور</dt>
              <dd className="mono">
                {handover.password} <CopyButton value={handover.password} />
              </dd>
            </dl>
          </div>
        ) : null}
      </Modal>
    </Card>
  );
}
