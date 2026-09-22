export type LicenseStatus = 'ACTIVE' | 'SUSPENDED' | 'EXPIRED';
/** الحالة الفعلية تشمل بلوغ حد الحركات (لا تُخزَّن؛ مشتقة). */
export type EffectiveStatus = LicenseStatus | 'LIMIT_REACHED';

export interface OfficeStats {
  officeId: string;
  admins: number;
  activeAdmins: number;
  clients: number;
  movements: number;
  movementsToday: number;
  lastMovementAt: string | null;
}

export interface License {
  status: EffectiveStatus;
  expiresAt: string | null;
  message: string | null;
  movementLimit?: number | null;
  movementsUsed?: number;
  checkedAt: string;
}

export interface OfficeDevice {
  id: string;
  officeId: string;
  label: string | null;
  enrolledBy: string | null;
  lastSeenAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

export interface Office {
  id: string;
  code: string;
  name: string;
  status: LicenseStatus;
  expiresAt: string | null;
  message: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  /** حد الحركات (إضافات فقط؛ null = بلا حد) وعدّاد الإضافات. */
  movementLimit: number | null;
  movementsUsed: number;
  /** لوغو المكتب (يُدار من اللوحة): مسار على خادم وفير أو null، ونسخة تتغيّر مع كل رفع. */
  logoPath: string | null;
  logoUpdatedAt: string | null;
  createdAt: string;
  updatedAt: string;
  stats?: OfficeStats | null;
  license?: License;
}

export interface OfficeAdmin {
  id: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  role: string;
  permissions: string[] | null;
  isActive: boolean;
}

export interface Owner {
  id: string;
  username: string;
  displayName: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface AuditRecord {
  id: string;
  ownerId: string | null;
  ownerUsername: string;
  action: string;
  officeId: string | null;
  officeCode: string | null;
  target: string | null;
  details: unknown;
  ip: string | null;
  createdAt: string;
}

export interface Overview {
  offices: { total: number; active: number; suspended: number; expired: number };
  movements: { total: number; today: number };
  clients: number;
  admins: number;
  recentAudit: AuditRecord[];
}

export interface CreateOfficeInput {
  name: string;
  phone?: string | null;
  address?: string | null;
  notes?: string | null;
  expiresAt?: string | null;
  message?: string | null;
  admin: { fullName: string; password: string; phone?: string | null; email?: string | null };
}

export interface CreatedOffice {
  office: Office;
  credentials: { officeCode: string; fullName: string };
}

/** الحالة الفعلية للعرض: نشط منتهي التاريخ يُعرض «منتهٍ». */
export function effectiveStatus(o: Pick<Office, 'status' | 'expiresAt'> & Partial<Pick<Office, 'movementLimit' | 'movementsUsed'>>): EffectiveStatus {
  if (o.status !== 'ACTIVE') return o.status;
  if (o.expiresAt && new Date(o.expiresAt).getTime() <= Date.now()) return 'EXPIRED';
  if (o.movementLimit != null && (o.movementsUsed ?? 0) >= o.movementLimit) return 'LIMIT_REACHED';
  return 'ACTIVE';
}

export const STATUS_LABEL: Record<EffectiveStatus, string> = { ACTIVE: 'نشط', SUSPENDED: 'موقوف', EXPIRED: 'منتهٍ', LIMIT_REACHED: 'بلغ حد الحركات — الإضافة موقوفة' };

/** إعلان المنصّة: رسالة المالك التي تُوقف كل التطبيقات عند تفعيلها (2026-09-23). */
export interface PlatformNotice {
  isActive: boolean;
  title: string | null;
  message: string;
  updatedAt: string | null;
}

export const ACTION_LABEL: Record<string, string> = {
  'owner.login': 'تسجيل دخول',
  'owner.password_changed': 'تغيير كلمة مرور المالك',
  'owner.created': 'إضافة مالك',
  'owner.activated': 'تفعيل مالك',
  'owner.deactivated': 'تعطيل مالك',
  'office.created': 'إنشاء مكتب',
  'office.updated': 'تعديل بيانات مكتب',
  'office.code_regenerated': 'توليد كود مكتب جديد',
  'office.deleted': 'حذف مكتب',
  'office.logo_updated': 'تغيير لوغو المكتب',
  'office.logo_removed': 'إزالة لوغو المكتب',
  'office.device_revoked': 'إلغاء جهاز مكتب',
  'office.movements_reset': 'تصفير عدّاد الحركات',
  'office.license.active': 'تفعيل الترخيص',
  'office.license.suspended': 'إيقاف الترخيص',
  'office.license.expired': 'إنهاء الترخيص',
  'office.admin.created': 'إضافة إداري',
  'office.admin.password_reset': 'إعادة تعيين كلمة مرور إداري',
  'office.admin.activated': 'تفعيل إداري',
  'office.admin.deactivated': 'تعطيل إداري',
  'notice.activated': 'تفعيل إعلان إيقاف التطبيقات',
  'notice.cancelled': 'إلغاء إعلان إيقاف التطبيقات',
};
