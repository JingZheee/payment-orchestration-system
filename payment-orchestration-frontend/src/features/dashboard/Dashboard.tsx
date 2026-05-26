import { Spin, Alert } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useDashboardSummary } from './hooks/useDashboardSummary';
import KpiCard from './components/KpiCard';
import StatusBreakdownChart from './components/StatusBreakdownChart';
import VolumeByProviderChart from './components/VolumeByProviderChart';

export default function Dashboard() {
  const navigate = useNavigate();
  const { data: summary, isLoading, isError } = useDashboardSummary();

  const successRate = summary && summary.total > 0
    ? ((( summary.byStatus['SUCCESS'] ?? 0) / summary.total) * 100).toFixed(1)
    : '—';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: '#1C1C1E', margin: 0 }}>Overview</h1>
        <p style={{ color: '#6B7280', fontSize: 14, marginTop: 4 }}>Real-time payment routing intelligence and metrics.</p>
      </div>

      {isError && (
        <Alert type="error" message="Failed to load dashboard data. Ensure the backend is running." showIcon />
      )}

      {isLoading && !summary && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 64 }}>
          <Spin size="large" />
        </div>
      )}

      {summary && (
        <>
          {/* KPI row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
            <KpiCard
              label="Total Transactions"
              value={summary.total.toLocaleString()}
              icon="receipt_long"
            />
            <KpiCard
              label="Success Rate"
              value={`${successRate}%`}
              icon="check_circle"
              iconBg="rgba(134,239,172,0.15)"
              iconColor="#15803D"
            />
            <KpiCard
              label="Active Providers"
              value={Object.values(summary.byProvider).filter(v => v > 0).length}
              icon="hub"
              iconBg="rgba(147,197,253,0.15)"
              iconColor="#1D4ED8"
            />
            <KpiCard
              label="Regions Covered"
              value={Object.values(summary.byRegion).filter(v => v > 0).length}
              icon="public"
              iconBg="rgba(167,243,208,0.15)"
              iconColor="#065F46"
            />
          </div>

          {/* Charts row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <StatusBreakdownChart summary={summary} />
            <VolumeByProviderChart summary={summary} />
          </div>
        </>
      )}

      {/* Routing Engine shortcut */}
      <div
        onClick={() => navigate('/routing')}
        style={{
          background: 'linear-gradient(135deg, #FFFBEA 0%, #FFF3CD 100%)',
          borderRadius: 16,
          border: '1px solid rgba(252,185,0,0.3)',
          padding: '24px 28px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          transition: 'box-shadow 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 20px rgba(252,185,0,0.15)')}
        onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: 'rgba(252,185,0,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 24, color: '#7B5800' }}>hub</span>
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#1C1C1E' }}>Routing Engine</div>
            <div style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>
              Simulate routing decisions, inspect composite scores, and compare strategies
            </div>
          </div>
        </div>
        <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#FCB900' }}>arrow_forward</span>
      </div>
    </div>
  );
}
