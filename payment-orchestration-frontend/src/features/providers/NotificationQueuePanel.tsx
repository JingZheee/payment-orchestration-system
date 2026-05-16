import { Switch, message } from 'antd';
import { useNotificationQueueStatus, useToggleNotificationConsumer } from './hooks/useNotificationQueue';

export default function NotificationQueuePanel() {
  const { data: status, isLoading } = useNotificationQueueStatus();
  const toggleMutation = useToggleNotificationConsumer();

  const active = status?.consumerActive ?? true;
  const depth = status?.queueDepth ?? 0;

  async function handleToggle(checked: boolean) {
    await toggleMutation.mutateAsync({ active: checked });
    message.success(`Notification consumer ${checked ? 'started' : 'stopped'}`);
  }

  return (
    <div style={{
      background: '#FFFFFF',
      borderRadius: 20,
      padding: 28,
      boxShadow: '0 4px 40px -12px rgba(80,69,50,0.08)',
      border: `1px solid ${active ? 'rgba(252,185,0,0.2)' : '#F3F4F6'}`,
      transition: 'border-color 0.2s',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: active ? 'rgba(252,185,0,0.12)' : 'rgba(55,65,81,0.06)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            transition: 'background 0.2s',
          }}>
            <span className="material-symbols-outlined" style={{
              fontSize: 22,
              color: active ? '#7B5800' : '#9CA3AF',
              transition: 'color 0.2s',
            }}>
              {active ? 'notifications_active' : 'notifications_off'}
            </span>
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#1C1C1E' }}>Notification Queue</div>
            <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
              Post-payment insurance activation pipeline
            </div>
          </div>
        </div>

        <Switch
          checked={active}
          loading={isLoading || toggleMutation.isPending}
          onChange={handleToggle}
          style={active ? { background: '#FCB900' } : {}}
        />
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {/* Queue depth */}
        <div style={{
          background: depth > 0 ? 'rgba(252,185,0,0.08)' : '#F6F3F5',
          borderRadius: 12, padding: '12px 14px',
          border: depth > 0 ? '1px solid rgba(252,185,0,0.2)' : 'none',
          transition: 'background 0.3s, border-color 0.3s',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 13, color: depth > 0 ? '#7B5800' : '#9CA3AF' }}>
              inbox
            </span>
            <span style={{ fontSize: 10, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Pending
            </span>
          </div>
          <div style={{
            fontSize: 28, fontWeight: 800,
            color: depth > 0 ? '#7B5800' : '#1C1C1E',
            lineHeight: 1,
          }}>
            {depth}
          </div>
          <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>messages</div>
        </div>

        {/* Consumer status */}
        <div style={{ background: '#F6F3F5', borderRadius: 12, padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 13, color: '#9CA3AF' }}>circle</span>
            <span style={{ fontSize: 10, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Consumer
            </span>
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: active ? '#065F46' : '#991B1B' }}>
            {active ? 'Running' : 'Stopped'}
          </div>
        </div>

        {/* Queue name */}
        <div style={{ background: '#F6F3F5', borderRadius: 12, padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 13, color: '#9CA3AF' }}>queue</span>
            <span style={{ fontSize: 10, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Queue
            </span>
          </div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', wordBreak: 'break-all' }}>
            payment.notification.queue
          </div>
        </div>
      </div>

      {/* Demo hint */}
      {!active && depth > 0 && (
        <div style={{
          marginTop: 16,
          background: 'rgba(252,185,0,0.06)',
          borderRadius: 10,
          padding: '10px 14px',
          display: 'flex', alignItems: 'center', gap: 10,
          border: '1px solid rgba(252,185,0,0.15)',
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#7B5800', flexShrink: 0 }}>
            info
          </span>
          <span style={{ fontSize: 12, color: '#504532' }}>
            {depth} event{depth !== 1 ? 's' : ''} waiting — start the consumer to process them without any loss.
          </span>
        </div>
      )}
    </div>
  );
}
