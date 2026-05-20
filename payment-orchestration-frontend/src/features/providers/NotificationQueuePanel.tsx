import { Switch, message } from 'antd';
import { useNotificationQueueStatus, useToggleNotificationConsumer } from './hooks/useNotificationQueue';
import InfoBanner from '../../shared/components/InfoBanner';
import styles from './NotificationQueuePanel.module.css';

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
    <div className={`${styles.panel} ${active ? styles.panelActive : ''}`}>
      <div className={styles.header}>
        <div className={styles.iconAndMeta}>
          {/* bg/color are state-driven — inline justified */}
          <div
            className={styles.iconWrap}
            style={{ background: active ? 'rgba(252,185,0,0.12)' : 'rgba(55,65,81,0.06)' }}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 22, color: active ? '#7B5800' : '#9CA3AF', transition: 'color 0.2s' }}
            >
              {active ? 'notifications_active' : 'notifications_off'}
            </span>
          </div>
          <div>
            <div className={styles.panelTitle}>Notification Queue</div>
            <div className={styles.panelSubtitle}>Post-payment insurance activation pipeline</div>
          </div>
        </div>
        {/* Switch amber when active — theming a 3rd-party component */}
        <Switch
          checked={active}
          loading={isLoading || toggleMutation.isPending}
          onChange={handleToggle}
          style={active ? { background: '#FCB900' } : {}}
        />
      </div>

      <div className={styles.statsGrid}>
        <div className={`${styles.statBox} ${depth > 0 ? styles.statBoxHighlight : ''}`}>
          <div className={styles.statLabelRow}>
            <span className={`material-symbols-outlined ${styles.statIcon} ${depth > 0 ? styles.statIconHighlight : ''}`}>
              inbox
            </span>
            <span className={styles.statLabel}>Pending</span>
          </div>
          <div className={`${styles.depthValue} ${depth > 0 ? styles.depthValueHighlight : ''}`}>{depth}</div>
          <div className={styles.depthUnit}>messages</div>
        </div>

        <div className={styles.statBox}>
          <div className={styles.statLabelRow}>
            <span className={`material-symbols-outlined ${styles.statIcon}`}>circle</span>
            <span className={styles.statLabel}>Consumer</span>
          </div>
          <div className={active ? styles.consumerRunning : styles.consumerStopped}>
            {active ? 'Running' : 'Stopped'}
          </div>
        </div>

        <div className={styles.statBox}>
          <div className={styles.statLabelRow}>
            <span className={`material-symbols-outlined ${styles.statIcon}`}>queue</span>
            <span className={styles.statLabel}>Queue</span>
          </div>
          <div className={styles.queueName}>payment.notification.queue</div>
        </div>
      </div>

      {!active && depth > 0 && (
        <div className={styles.demoHint}>
          <InfoBanner variant="subtle">
            {depth} event{depth !== 1 ? 's' : ''} waiting — start the consumer to process them without any loss.
          </InfoBanner>
        </div>
      )}
    </div>
  );
}
