import { createContext, useCallback, useContext, useEffect, useId, useMemo, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes, forwardRef } from 'react';
import { STATUS_LABEL, type LicenseStatus } from '../api/types';

// ── أزرار ─────────────────────────────────────────────────────────────────
type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
export function Button({ variant = 'secondary', loading = false, className = '', children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; loading?: boolean }) {
  return (
    <button className={`btn btn-${variant} ${className}`} disabled={loading || rest.disabled} {...rest}>
      {loading ? <span className="spinner" aria-label="جارٍ التنفيذ" /> : null}
      {children}
    </button>
  );
}

// ── حقول ──────────────────────────────────────────────────────────────────
/** معرّف الحقل داخل `Field`: يربط التسمية بعنصر الإدخال (`htmlFor`) حتى لو كان داخل صفّ مع زر. */
const FieldIdContext = createContext<string | undefined>(undefined);
export function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: ReactNode }) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      <FieldIdContext.Provider value={id}>{children}</FieldIdContext.Provider>
      {error ? <span className="field-error">{error}</span> : hint ? <span className="field-hint">{hint}</span> : null}
    </div>
  );
}
export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(props, ref) {
  const id = useContext(FieldIdContext);
  return <input ref={ref} id={id} className={`input ${props.className ?? ''}`} {...props} />;
});
export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useContext(FieldIdContext);
  return <textarea id={id} className={`input ${props.className ?? ''}`} rows={3} {...props} />;
}
export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useContext(FieldIdContext);
  return <select id={id} className={`input ${props.className ?? ''}`} {...props} />;
}

// ── بطاقات وشارات ─────────────────────────────────────────────────────────
export function Card({ title, actions, children, className = '' }: { title?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`card ${className}`}>
      {title || actions ? (
        <header className="card-header">
          <h2 className="card-title">{title}</h2>
          <div className="card-actions">{actions}</div>
        </header>
      ) : null}
      <div className="card-body">{children}</div>
    </section>
  );
}
export function StatusBadge({ status }: { status: LicenseStatus }) {
  return <span className={`badge badge-${status.toLowerCase()}`}>{STATUS_LABEL[status]}</span>;
}
export function Stat({ label, value, tone }: { label: string; value: ReactNode; tone?: 'gold' | 'success' | 'danger' | 'warning' }) {
  return (
    <div className={`stat ${tone ? `stat-${tone}` : ''}`}>
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}
export function Empty({ text }: { text: string }) {
  return <p className="empty">{text}</p>;
}
export function ErrorBox({ text }: { text: string | null }) {
  return text ? <p className="error-box" role="alert">{text}</p> : null;
}

// ── نافذة منبثقة ──────────────────────────────────────────────────────────
export function Modal({ open, title, onClose, children, width = 560 }: { open: boolean; title: string; onClose: () => void; children: ReactNode; width?: number }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title} style={{ maxWidth: width }}>
        <header className="modal-header">
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="إغلاق">
            ✕
          </button>
        </header>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

// ── تنبيهات ───────────────────────────────────────────────────────────────
interface ToastItem {
  id: number;
  kind: 'success' | 'error';
  text: string;
}
const ToastContext = createContext<(kind: ToastItem['kind'], text: string) => void>(() => {});
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const push = useCallback((kind: ToastItem['kind'], text: string) => {
    const id = Date.now() + Math.random();
    setItems((s) => [...s, { id, kind, text }]);
    setTimeout(() => setItems((s) => s.filter((t) => t.id !== id)), 4000);
  }, []);
  const value = useMemo(() => push, [push]);
  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toasts" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`toast toast-${t.kind}`}>
            {t.text}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
export const useToast = () => useContext(ToastContext);

// ── نسخ ───────────────────────────────────────────────────────────────────
export function CopyButton({ value, label = 'نسخ' }: { value: string; label?: string }) {
  const toast = useToast();
  return (
    <button
      type="button"
      className="btn btn-ghost btn-sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          toast('success', 'تم النسخ');
        } catch {
          toast('error', 'تعذّر النسخ');
        }
      }}
    >
      {label}
    </button>
  );
}

// ── تنسيق ─────────────────────────────────────────────────────────────────
export const fmtDate = (iso: string | null | undefined): string => {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('ar-SY', { dateStyle: 'medium', timeStyle: 'short', numberingSystem: 'latn' });
};
export const fmtDay = (iso: string | null | undefined): string => {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('ar-SY', { dateStyle: 'medium', numberingSystem: 'latn' });
};
/** `YYYY-MM-DD` لحقل التاريخ من ISO. */
export const toDateInput = (iso: string | null | undefined): string => (iso ? new Date(iso).toISOString().slice(0, 10) : '');
