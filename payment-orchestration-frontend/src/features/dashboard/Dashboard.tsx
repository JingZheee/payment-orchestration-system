import { Spin, Alert } from 'antd';
import { useDashboardSummary } from './hooks/useDashboardSummary';
import KpiCard from './components/KpiCard';
import StatusBreakdownChart from './components/StatusBreakdownChart';
import VolumeByProviderChart from './components/VolumeByProviderChart';
import RoutingIntelligencePanel from './components/RoutingIntelligencePanel';

export default function Dashboard() {
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

      {/* Routing intelligence — always shown */}
      <RoutingIntelligencePanel />
    </div>
  );
}
