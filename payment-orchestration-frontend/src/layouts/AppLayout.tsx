import { Layout, Dropdown } from 'antd';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import type { CSSProperties } from 'react';
import { authService } from '../features/auth/services/authService';

const { Sider, Header, Content } = Layout;

const NAV_SECTIONS = [
  {
    heading: 'Overview',
    items: [
      { path: '/admin/dashboard',    label: 'Dashboard',    icon: 'dashboard' },
      { path: '/admin/transactions', label: 'Transactions', icon: 'payments' },
    ],
  },
  {
    heading: 'Routing',
    items: [
      { path: '/admin/routing-rules', label: 'Routing Rules',  icon: 'account_tree' },
      { path: '/admin/routing',       label: 'Routing Engine', icon: 'hub' },
    ],
  },
  {
    heading: 'Configuration',
    items: [
      { path: '/admin/providers',       label: 'Providers',        icon: 'account_balance' },
      { path: '/admin/fee-rates',       label: 'Fee Rates',        icon: 'percent' },
      { path: '/admin/payment-methods', label: 'Payment Methods',  icon: 'credit_card' },
      { path: '/admin/users',           label: 'Users',            icon: 'group' },
    ],
  },
  {
    heading: 'Analytics',
    items: [
      { path: '/admin/metrics',        label: 'Metrics',        icon: 'analytics' },
      { path: '/admin/reconciliation', label: 'Reconciliation', icon: 'account_balance_wallet' },
    ],
  },
  {
    heading: 'System',
    items: [
      { path: '/admin/dead-letter-queue', label: 'Dead Letter Queue', icon: 'error_outline' },
    ],
  },
];

function MIcon({ name, size = 20, style }: { name: string; size?: number; style?: CSSProperties }) {
  return (
    <span className="material-symbols-outlined" style={{ fontSize: size, lineHeight: 1, flexShrink: 0, ...style }}>
      {name}
    </span>
  );
}

export default function AppLayout() {
  const navigate = useNavigate();

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* ── Sidebar ── */}
      <Sider
        width={256}
        style={{
          background: '#FFFBEA',
          position: 'fixed',
          height: '100vh',
          left: 0,
          top: 0,
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column',
          padding: '24px 16px',
          zIndex: 100,
        }}
      >
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32, padding: '0 8px' }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: '#FCB900', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            color: 'white', fontWeight: 700, fontSize: 13, flexShrink: 0,
          }}>
            IR
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 900, color: '#1C1C1E', lineHeight: 1.2 }}>InsureRoute</div>
            <div style={{ fontSize: 10, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Payment Orchestration
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0 }}>
          {NAV_SECTIONS.map(({ heading, items }, sectionIdx) => (
            <div key={heading} style={{ marginTop: sectionIdx === 0 ? 0 : 16 }}>
              <div style={{
                fontSize: 10,
                fontWeight: 700,
                color: '#9CA3AF',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                padding: '0 12px',
                marginBottom: 4,
              }}>
                {heading}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {items.map(({ path, label, icon }) => (
                  <NavLink
                    key={path}
                    to={path}
                    className="nav-item"
                    style={({ isActive }): CSSProperties => ({
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '10px 12px',
                      borderLeft: `3px solid ${isActive ? '#FCB900' : 'transparent'}`,
                      borderRadius: '0 8px 8px 0',
                      background: isActive ? 'rgba(255,255,255,0.5)' : 'transparent',
                      color: isActive ? '#7B5800' : '#475569',
                      fontWeight: isActive ? 600 : 400,
                      fontSize: 14,
                      textDecoration: 'none',
                      opacity: isActive ? 1 : 0.85,
                      transition: 'all 0.15s',
                    })}
                  >
                    <MIcon name={icon} />
                    <span>{label}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div style={{ marginTop: 'auto', paddingTop: 24, borderTop: '1px solid #F6F3F5' }}>
          <button
            onClick={() => navigate('/admin/payment-demo')}
            style={{
              width: '100%',
              padding: '10px 16px',
              background: 'linear-gradient(180deg, #FCB900 0%, #e0a400 100%)',
              color: '#261900',
              fontWeight: 600,
              borderRadius: 12,
              border: 'none',
              cursor: 'pointer',
              fontSize: 14,
              marginBottom: 8,
              boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
            }}
          >
            ● Payment Demo
          </button>
          {[
            { label: 'Support', icon: 'help' },
            { label: 'Help Center', icon: 'info' },
          ].map(({ label, icon }) => (
            <a
              key={label}
              href="#"
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '8px 12px', color: '#475569', fontSize: 12,
                textDecoration: 'none', opacity: 0.8,
              }}
            >
              <MIcon name={icon} size={18} />
              <span>{label}</span>
            </a>
          ))}
        </div>
      </Sider>

      {/* ── Main area ── */}
      <Layout style={{ marginLeft: 256, background: '#FCF8FB' }}>
        {/* Topbar */}
        <Header
          style={{
            background: '#FCF8FB',
            padding: '0 32px',
            height: 65,
            lineHeight: '65px',
            position: 'sticky',
            top: 0,
            zIndex: 99,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #F6F3F5',
          }}
        >
          <div />

          {/* Right actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            {/* User */}
            <Dropdown
              trigger={['click']}
              menu={{
                items: [
                  {
                    key: 'email',
                    label: (
                      <span style={{ fontSize: 12, color: '#6B7280' }}>
                        {localStorage.getItem('pos_email') ?? ''}
                      </span>
                    ),
                    disabled: true,
                  },
                  { type: 'divider' },
                  {
                    key: 'logout',
                    icon: <span className="material-symbols-outlined" style={{ fontSize: 16 }}>logout</span>,
                    label: 'Sign out',
                    danger: true,
                    onClick: authService.logout,
                  },
                ],
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#1C1C1E', lineHeight: 1.3 }}>
                    {localStorage.getItem('pos_email')?.split('@')[0] ?? 'User'}
                  </div>
                  <div style={{ fontSize: 10, color: '#9CA3AF', lineHeight: 1.2, textTransform: 'capitalize' }}>
                    {(localStorage.getItem('pos_role') ?? '').toLowerCase()}
                  </div>
                </div>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: 'rgba(252,185,0,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#7B5800', fontWeight: 700, fontSize: 14,
                }}>
                  {(localStorage.getItem('pos_email') ?? 'U')[0].toUpperCase()}
                </div>
              </div>
            </Dropdown>
          </div>
        </Header>

        {/* Page content */}
        <Content style={{ padding: 32, minHeight: 'calc(100vh - 65px)' }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
