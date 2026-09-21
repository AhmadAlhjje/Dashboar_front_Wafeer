import type { AuditRecord, CreateOfficeInput, CreatedOffice, License, Office, OfficeAdmin, Overview, Owner } from './types';

const TOKEN_KEY = 'wafeer_dashboard_token';
const BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/+$/, '') || '/api';

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
    public readonly details: unknown = null,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** رسائل عربية للأكواد الشائعة؛ غير ذلك رسالة الخادم. */
const MESSAGES: Record<string, string> = {
  INVALID_CREDENTIALS: 'اسم المستخدم أو كلمة المرور غير صحيحة',
  UNAUTHENTICATED: 'انتهت الجلسة، سجّل الدخول من جديد',
  VALIDATION_ERROR: 'بيانات غير صالحة، راجع الحقول',
  OFFICE_NOT_FOUND: 'المكتب غير موجود',
  ADMIN_NOT_FOUND: 'الإداري غير موجود',
  CONFLICT: 'القيمة مستخدمة مسبقاً',
  WAFEER_UNREACHABLE: 'تعذّر الوصول إلى خادم وفير',
  WAFEER_OUTDATED: 'خادم وفير يعمل بنسخة قديمة بلا مسارات المنصّة — شغّل هجرة قاعدة البيانات (npx sequelize-cli db:migrate) وأعد تشغيل الباك اند',
  WAFEER_BAD_RESPONSE: 'ردّ غير مفهوم من خادم وفير',
  INVALID_PASSWORD: 'كلمة المرور الحالية غير صحيحة',
  SAME_PASSWORD: 'كلمة المرور الجديدة مطابقة للحالية',
  CANNOT_DEACTIVATE_SELF: 'لا يمكنك تعطيل حسابك',
  PLATFORM_UNAUTHORIZED: 'مفتاح المنصّة غير صحيح (راجع PLATFORM_API_KEY)',
};
export const messageFor = (e: unknown): string =>
  e instanceof ApiError ? (MESSAGES[e.code] ?? e.message) : e instanceof Error ? e.message : 'حدث خطأ غير متوقع';

export const tokenStore = {
  get: (): string | null => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set: (token: string | null) => {
    try {
      if (token) localStorage.setItem(TOKEN_KEY, token);
      else localStorage.removeItem(TOKEN_KEY);
    } catch {
      // التخزين غير متاح (وضع خاص) — تبقى الجلسة في الذاكرة فقط.
    }
  },
};

let onUnauthorized: (() => void) | null = null;
export const setUnauthorizedHandler = (handler: (() => void) | null) => {
  onUnauthorized = handler;
};

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { accept: 'application/json' };
  // FormData (رفع ملف): المتصفح يضع content-type بحدود multipart بنفسه
  const multipart = typeof FormData !== 'undefined' && body instanceof FormData;
  if (body !== undefined && !multipart) headers['content-type'] = 'application/json';
  const token = tokenStore.get();
  if (token) headers.authorization = `Bearer ${token}`;
  let response: Response;
  try {
    response = await fetch(`${BASE}${path}`, { method, headers, body: body === undefined ? undefined : multipart ? body : JSON.stringify(body) });
  } catch {
    throw new ApiError('NETWORK', 'تعذّر الاتصال بخادم اللوحة', 0);
  }
  const text = await response.text();
  let json: { success?: boolean; data?: T; error?: { code?: string; message?: string; details?: unknown } } = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    throw new ApiError('BAD_RESPONSE', 'ردّ غير مفهوم من الخادم', response.status);
  }
  if (!response.ok || json.success === false) {
    const code = json.error?.code ?? `HTTP_${response.status}`;
    if (response.status === 401 && !path.startsWith('/auth/login')) onUnauthorized?.();
    throw new ApiError(code, json.error?.message ?? `HTTP ${response.status}`, response.status, json.error?.details);
  }
  return json.data as T;
}

export const api = {
  login: (username: string, password: string) => call<{ token: string; owner: Owner }>('POST', '/auth/login', { username, password }),
  me: () => call<Owner>('GET', '/auth/me'),
  changePassword: (currentPassword: string, newPassword: string) => call<{ changed: boolean }>('PATCH', '/auth/me/password', { currentPassword, newPassword }),
  health: () => call<{ status: string; wafeer: boolean }>('GET', '/health'),
  overview: () => call<Overview>('GET', '/overview'),
  offices: () => call<Office[]>('GET', '/offices'),
  office: (id: string) => call<{ office: Office; admins: OfficeAdmin[]; audit: AuditRecord[] }>('GET', `/offices/${id}`),
  createOffice: (input: CreateOfficeInput) => call<CreatedOffice>('POST', '/offices', input),
  updateOffice: (id: string, patch: Partial<Pick<Office, 'name' | 'phone' | 'address' | 'notes'>>) => call<Office>('PATCH', `/offices/${id}`, patch),
  setLicense: (id: string, license: Pick<License, 'status'> & { expiresAt?: string | null; message?: string | null }) =>
    call<Office>('PUT', `/offices/${id}/license`, license),
  regenerateCode: (id: string) => call<Office>('POST', `/offices/${id}/code`),
  /** لوغو المكتب: يُبدَّل من اللوحة متى شاء المالك (داخل التطبيق يبقى مرة واحدة). */
  setOfficeLogo: (id: string, file: File) => {
    const form = new FormData();
    form.append('logo', file, file.name);
    return call<Office>('PUT', `/offices/${id}/logo`, form);
  },
  removeOfficeLogo: (id: string) => call<Office>('DELETE', `/offices/${id}/logo`),
  /** يجلب صورة اللوغو الحالية (بتوكن المالك) كـ Blob لعرضها؛ null إن لم يوجد. */
  officeLogoBlob: async (id: string): Promise<Blob | null> => {
    const token = tokenStore.get();
    const response = await fetch(`${BASE}/offices/${id}/logo`, { headers: token ? { authorization: `Bearer ${token}` } : {} });
    if (response.status === 404) return null;
    if (!response.ok) throw new ApiError(`HTTP_${response.status}`, 'تعذّر جلب اللوغو', response.status);
    return response.blob();
  },
  officeAdmins: (id: string) => call<OfficeAdmin[]>('GET', `/offices/${id}/admins`),
  createOfficeAdmin: (id: string, input: { fullName: string; password: string; phone?: string | null; email?: string | null; role?: string }) =>
    call<OfficeAdmin>('POST', `/offices/${id}/admins`, input),
  resetOfficeAdminPassword: (id: string, adminId: string, password: string) => call<OfficeAdmin>('PUT', `/offices/${id}/admins/${adminId}/password`, { password }),
  setOfficeAdminActive: (id: string, adminId: string, active: boolean) =>
    call<OfficeAdmin>('PATCH', `/offices/${id}/admins/${adminId}/${active ? 'activate' : 'deactivate'}`),
  owners: () => call<Owner[]>('GET', '/owners'),
  createOwner: (input: { username: string; displayName: string; password: string }) => call<Owner>('POST', '/owners', input),
  setOwnerActive: (id: string, active: boolean) => call<Owner>('PATCH', `/owners/${id}/${active ? 'activate' : 'deactivate'}`),
  audit: (limit = 100, officeId?: string) => call<AuditRecord[]>('GET', `/audit?limit=${limit}${officeId ? `&officeId=${officeId}` : ''}`),
};
