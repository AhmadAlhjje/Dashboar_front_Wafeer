export type LicenseStatus = 'ACTIVE' | 'SUSPENDED' | 'EXPIRED';

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
  status: LicenseStatus;
  expiresAt: string | null;
  message: string | null;
  checkedAt: string;
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
export function effectiveStatus(o: Pick<Office, 'status' | 'expiresAt'>): LicenseStatus {
  if (o.status !== 'ACTIVE') return o.status;
  if (o.expiresAt && new Date(o.expiresAt).getTime() <= Date.now()) return 'EXPIRED';
  return 'ACTIVE';
}

export const STATUS_LABEL: Record<LicenseStatus, string> = { ACTIVE: 'نشط', SUSPENDED: 'موقوف', EXPIRED: 'منتهٍ' };

export const ACTION_LABEL: Record<string, string> = {
  'owner.login': 'تسجيل دخول',
  'owner.password_changed': 'تغيير كلمة مرور المالك',
  'owner.created': 'إضافة مالك',
  'owner.activated': 'تفعيل مالك',
  'owner.deactivated': 'تعطيل مالك',
  'office.created': 'إنشاء مكتب',
  'office.updated': 'تعديل بيانات مكتب',
  'office.code_regenerated': 'توليد كود مكتب جديد',
  'office.logo_updated': 'تغيير لوغو المكتب',
  'office.logo_removed': 'إزالة لوغو المكتب',
  'office.license.active': 'تفعيل الترخيص',
  'office.license.suspended': 'إيقاف الترخيص',
  'office.license.expired': 'إنهاء الترخيص',
  'office.admin.created': 'إضافة إداري',
  'office.admin.password_reset': 'إعادة تعيين كلمة مرور إداري',
  'office.admin.activated': 'تفعيل إداري',
  'office.admin.deactivated': 'تعطيل إداري',
};
