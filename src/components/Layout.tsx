import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

const NAV: Array<{ to: string; label: string; icon: string; end?: boolean }> = [
  { to: '/', label: 'نظرة عامة', icon: '▦', end: true },
  { to: '/offices', label: 'المكاتب', icon: '🏢' },
  { to: '/owners', label: 'مالكو اللوحة', icon: '👤' },
  { to: '/audit', label: 'سجل العمليات', icon: '🗒' },
  { to: '/settings', label: 'الإعدادات', icon: '⚙' },
];

/** الهيكل: شريط جانبي (يمين) + محتوى. */
export function Layout() {
  const { owner, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">$</span>
          <div>
            <div className="brand-name">وفير</div>
            <div className="brand-sub">لوحة التحكم</div>
          </div>
        </div>
        <nav className="nav">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <span className="nav-icon" aria-hidden>
                {n.icon}
              </span>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="owner-chip" title={owner?.username}>
            {owner?.displayName ?? owner?.username}
          </div>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => {
              logout();
              navigate('/login');
            }}
          >
            تسجيل الخروج
          </button>
        </div>
      </aside>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
