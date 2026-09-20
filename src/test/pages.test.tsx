import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Office } from '../api/types';

// ── واجهة الخادم وهمية بالكامل ─────────────────────────────────────────────
const apiMock = vi.hoisted(() => ({
  login: vi.fn(),
  me: vi.fn(),
  offices: vi.fn(),
  office: vi.fn(),
  createOffice: vi.fn(),
  setLicense: vi.fn(),
  updateOffice: vi.fn(),
  regenerateCode: vi.fn(),
  health: vi.fn(),
  overview: vi.fn(),
  audit: vi.fn(),
}));
vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client');
  return { ...actual, api: apiMock };
});

import { App } from '../App';
import { ApiError, tokenStore } from '../api/client';
import { AuthProvider } from '../auth/AuthContext';
import { ToastProvider } from '../components/ui';
import { OfficePage } from '../pages/OfficePage';
import { OfficesPage } from '../pages/OfficesPage';
import { effectiveStatus } from '../api/types';

const office = (o: Partial<Office>): Office => ({
  id: '1',
  code: 'ABCD2345',
  name: 'مكتب حلب',
  status: 'ACTIVE',
  expiresAt: null,
  message: null,
  phone: null,
  address: null,
  notes: null,
  createdAt: '2026-09-20T00:00:00.000Z',
  updatedAt: '2026-09-20T00:00:00.000Z',
  stats: { officeId: '1', admins: 2, activeAdmins: 1, clients: 7, movements: 30, movementsToday: 2, lastMovementAt: null },
  ...o,
});

function renderAt(path: string, element: React.ReactNode) {
  return render(
    <ToastProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path={path.replace(/\/\d+$/, '/:id')} element={element} />
        </Routes>
      </MemoryRouter>
    </ToastProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  tokenStore.set(null);
});

describe('login', () => {
  it('validates empty fields, shows the server message on failure, and enters the app on success', async () => {
    const user = userEvent.setup();
    apiMock.login.mockRejectedValueOnce(new ApiError('INVALID_CREDENTIALS', 'bad', 401));
    apiMock.login.mockResolvedValueOnce({ token: 't', owner: { id: '1', username: 'owner', displayName: 'المالك', isActive: true, lastLoginAt: null, createdAt: '' } });
    apiMock.overview.mockResolvedValue({ offices: { total: 0, active: 0, suspended: 0, expired: 0 }, movements: { total: 0, today: 0 }, clients: 0, admins: 0, recentAudit: [] });
    apiMock.health.mockResolvedValue({ status: 'ok', wafeer: true });
    render(
      <MemoryRouter initialEntries={['/login']}>
        <App />
      </MemoryRouter>,
    );
    await user.click(screen.getByRole('button', { name: 'دخول' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('أدخل اسم المستخدم وكلمة المرور');
    expect(apiMock.login).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText('اسم المستخدم'), 'owner');
    await user.type(screen.getByLabelText('كلمة المرور'), 'wrong');
    await user.click(screen.getByRole('button', { name: 'دخول' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('اسم المستخدم أو كلمة المرور غير صحيحة');

    await user.click(screen.getByRole('button', { name: 'دخول' }));
    expect(await screen.findByRole('heading', { name: 'نظرة عامة' })).toBeInTheDocument();
    expect(tokenStore.get()).toBe('t');
  });
});

describe('offices page', () => {
  it('lists offices with effective status and filters by search/status', async () => {
    const user = userEvent.setup();
    apiMock.offices.mockResolvedValue([
      office({ id: '1', name: 'مكتب حلب', code: 'AAAA2222' }),
      office({ id: '2', name: 'مكتب دمشق', code: 'BBBB3333', status: 'SUSPENDED' }),
      office({ id: '3', name: 'مكتب حمص', code: 'CCCC4444', expiresAt: '2020-01-01T00:00:00.000Z' }),
    ]);
    renderAt('/offices', <OfficesPage />);
    const rows = await screen.findAllByRole('row');
    expect(rows).toHaveLength(4); // رأس + 3
    expect(within(rows[1]).getByText('نشط')).toBeInTheDocument();
    expect(within(rows[2]).getByText('موقوف')).toBeInTheDocument();
    expect(within(rows[3]).getByText('منتهٍ')).toBeInTheDocument(); // نشط بتاريخ مضى

    await user.selectOptions(screen.getByLabelText('الحالة'), 'SUSPENDED');
    expect(screen.getAllByRole('row')).toHaveLength(2);
    await user.selectOptions(screen.getByLabelText('الحالة'), 'ALL');
    await user.type(screen.getByLabelText('بحث'), 'cccc');
    expect(screen.getAllByRole('row')).toHaveLength(2);
    expect(screen.getByText('مكتب حمص')).toBeInTheDocument();
  });

  it('creates an office and shows the handover credentials once', async () => {
    const user = userEvent.setup();
    apiMock.offices.mockResolvedValue([]);
    apiMock.createOffice.mockResolvedValue({ office: office({ id: '9', code: 'NEWC0DE1', name: 'مكتب جديد' }), credentials: { officeCode: 'NEWC0DE1', fullName: 'أحمد' } });
    renderAt('/offices', <OfficesPage />);
    await user.click(await screen.findByRole('button', { name: '+ مكتب جديد' }));
    const dialog = screen.getByRole('dialog', { name: 'مكتب جديد' });
    await user.click(within(dialog).getByRole('button', { name: 'إنشاء المكتب' }));
    expect(within(dialog).getByRole('alert')).toHaveTextContent('اسم المكتب مطلوب');
    await user.type(within(dialog).getByLabelText('اسم المكتب'), 'مكتب جديد');
    await user.type(within(dialog).getByLabelText('اسم المستخدم (الاسم الكامل)'), 'أحمد');
    await user.type(within(dialog).getByLabelText('كلمة المرور'), 'secret-123');
    await user.click(within(dialog).getByRole('button', { name: 'إنشاء المكتب' }));
    await waitFor(() => expect(apiMock.createOffice).toHaveBeenCalledWith(expect.objectContaining({ name: 'مكتب جديد', admin: expect.objectContaining({ fullName: 'أحمد', password: 'secret-123' }) })));
    const handover = await screen.findByRole('dialog', { name: 'بيانات التسليم للمكتب' });
    expect(within(handover).getByText('NEWC0DE1')).toBeInTheDocument();
    expect(within(handover).getByText('secret-123')).toBeInTheDocument();
  });
});

describe('office page', () => {
  it('saves a license change and confirms it', async () => {
    const user = userEvent.setup();
    apiMock.office.mockResolvedValue({ office: office({ id: '1' }), admins: [], audit: [] });
    apiMock.setLicense.mockResolvedValue(office({ id: '1', status: 'SUSPENDED' }));
    renderAt('/offices/1', <OfficePage />);
    expect(await screen.findByRole('heading', { name: /مكتب حلب/ })).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('الحالة'), 'SUSPENDED');
    await user.type(screen.getByLabelText('رسالة تظهر للمكتب في شاشة القفل'), 'لم يُسدَّد');
    await user.click(screen.getByRole('button', { name: 'حفظ الترخيص' }));
    await waitFor(() => expect(apiMock.setLicense).toHaveBeenCalledWith('1', { status: 'SUSPENDED', expiresAt: null, message: 'لم يُسدَّد' }));
    expect(await screen.findByText(/سيظهر القفل لدى المكتب/)).toBeInTheDocument();
  });
});

describe('office code regeneration', () => {
  it('asks for confirmation, then shows the new code once', async () => {
    const user = userEvent.setup();
    apiMock.office.mockResolvedValue({ office: office({ id: '1' }), admins: [], audit: [] });
    apiMock.regenerateCode.mockResolvedValue(office({ id: '1', code: 'NEWC2DE9' }));
    renderAt('/offices/1', <OfficePage />);
    await user.click(await screen.findByRole('button', { name: 'توليد كود جديد' }));
    const confirm = screen.getByRole('dialog', { name: 'توليد كود مكتب جديد' });
    expect(within(confirm).getByText('ABCD2345')).toBeInTheDocument();
    await user.click(within(confirm).getByRole('button', { name: 'توليد الكود' }));
    await waitFor(() => expect(apiMock.regenerateCode).toHaveBeenCalledWith('1'));
    const shown = await screen.findByRole('dialog', { name: 'الكود الجديد للمكتب' });
    expect(within(shown).getByText('NEWC2DE9')).toBeInTheDocument();
  });
});

describe('effectiveStatus', () => {
  it('treats an active office past its expiry as expired', () => {
    expect(effectiveStatus({ status: 'ACTIVE', expiresAt: null })).toBe('ACTIVE');
    expect(effectiveStatus({ status: 'ACTIVE', expiresAt: '2020-01-01T00:00:00.000Z' })).toBe('EXPIRED');
    expect(effectiveStatus({ status: 'SUSPENDED', expiresAt: null })).toBe('SUSPENDED');
  });
});

// AuthProvider يُصدَّر ويُستعمل في App؛ نضمن أنه لا يكسر بلا توكن.
describe('auth provider', () => {
  it('renders children without a token and never calls /auth/me', () => {
    render(
      <AuthProvider>
        <span>x</span>
      </AuthProvider>,
    );
    expect(screen.getByText('x')).toBeInTheDocument();
    expect(apiMock.me).not.toHaveBeenCalled();
  });
});
