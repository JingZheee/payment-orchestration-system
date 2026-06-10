import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Timeline, Spin, Tag } from 'antd';
import { CopyOutlined, SyncOutlined } from '@ant-design/icons';
import styles from './PolicyStatusPage.module.css';
import { usePolicyStatus } from './hooks/usePolicyStatus';
import type { PolicyStatus } from './services/policyStatusService';

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { bg: string; fg: string; label: string }> = {
  ACTIVATED:       { bg: '#DCFCE7', fg: '#166534', label: 'Active' },
  DISBURSED:       { bg: '#DCFCE7', fg: '#166534', label: 'Disbursed' },
  PENDING:         { bg: '#FEF3C7', fg: '#92400E', label: 'Pending' },
  PROCESSING:      { bg: '#FEF3C7', fg: '#92400E', label: 'Processing' },
  QUOTE:           { bg: '#F3F4F6', fg: '#374151', label: 'Not Paid' },
  FAILED:          { bg: '#FEE2E2', fg: '#991B1B', label: 'Failed' },
  RETRY_EXHAUSTED: { bg: '#FEE2E2', fg: '#991B1B', label: 'Retries Exhausted' },
};

function eventColor(type: string): string {
  if (type.includes('SUCCEEDED') || type.includes('SUCCESS') || type.includes('ACTIVATED')) return '#059669';
  if (type.includes('FAILED') || type.includes('EXHAUSTED')) return '#DC2626';
  if (type.includes('RETRY') || type.includes('DELAYED')) return '#D97706';
  if (type.includes('WEBHOOK')) return '#7C3AED';
  if (type.includes('INITIATED') || type.includes('SELECTED')) return '#1D4ED8';
  return '#6B7280';
}

function formatEventType(type: string): string {
  return type.split('_').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
}

function formatStrategy(s: string): string {
  return s.split('_').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
}

function fmtAmount(amount: number, currency: string): string {
  if (currency === 'IDR') return `IDR ${amount.toLocaleString('id-ID')}`;
  if (currency === 'PHP') return `PHP ${Number(amount).toFixed(2)}`;
  return `MYR ${Number(amount).toFixed(2)}`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
  });
}

// ── Sub-components ────────────────────────────────────────────────────────────

function DetailItem({ label, value, mono }: { label: string; value: string | null | undefined; mono?: boolean }) {
  return (
    <div className={styles.detailItem}>
      <div className={styles.detailLabel}>{label}</div>
      {value
        ? <div className={mono ? styles.detailValueMono : styles.detailValue}>{value}</div>
        : <div className={styles.detailValueMuted}>—</div>
      }
    </div>
  );
}

function PolicyCard({ policy }: { policy: PolicyStatus }) {
  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <span className={styles.cardHeaderIcon}>🛡️</span>
        <span className={styles.cardTitle}>Policy Details</span>
      </div>
      <div className={styles.cardBody}>
        <div className={styles.detailGrid}>
          <DetailItem label="Policyholder"    value={policy.holderName} />
          <DetailItem label="Email"           value={policy.holderEmail} />
          <DetailItem label="Insurance Plan"  value={policy.insuranceType} />
          <DetailItem label="Premium"         value={fmtAmount(Number(policy.amount), policy.currency)} />
          <DetailItem label="Region"          value={policy.region} />
          <DetailItem label="Payment Method"  value={policy.paymentMethod?.replace(/_/g, ' ') ?? null} />
          <DetailItem label="Applied On"      value={fmtDate(policy.createdAt)} />
        </div>
      </div>
    </div>
  );
}

function PaymentCard({ policy }: { policy: PolicyStatus }) {
  if (!policy.transactionId) return null;
  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <span className={styles.cardHeaderIcon}>💳</span>
        <span className={styles.cardTitle}>Payment Details</span>
      </div>
      <div className={styles.cardBody}>
        <div className={styles.detailGrid}>
          <DetailItem label="Provider"         value={policy.provider} />
          <DetailItem label="Routing Strategy" value={policy.routingStrategy ? formatStrategy(policy.routingStrategy) : null} />
          <DetailItem label="Fee Charged"      value={policy.fee != null ? fmtAmount(Number(policy.fee), policy.currency) : null} />
          <DetailItem label="Transaction ID"   value={policy.transactionId} mono />
        </div>
        {policy.routingReason && (
          <div className={styles.routingReason}>
            <div className={styles.detailLabel}>Routing Reason</div>
            <div className={styles.detailValue} style={{ fontWeight: 400, fontSize: 13, color: '#4B5563', marginTop: 5, lineHeight: 1.6 }}>
              {policy.routingReason}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TimelineCard({ policy }: { policy: PolicyStatus }) {
  if (policy.events.length === 0) return null;
  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <span className={styles.cardHeaderIcon}>📋</span>
        <span className={styles.cardTitle}>Activity Timeline</span>
      </div>
      <div className={styles.cardBody}>
        <Timeline
          items={policy.events.map(ev => ({
            color: eventColor(ev.eventType),
            children: (
              <div className={styles.eventItem}>
                <div className={styles.eventType}>{formatEventType(ev.eventType)}</div>
                {ev.description && <div className={styles.eventDesc}>{ev.description}</div>}
                <div className={styles.eventTime}>{fmtDate(ev.createdAt)}</div>
              </div>
            ),
          }))}
        />
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

const btnAmber = {
  background: '#FCB900', borderColor: '#FCB900', color: '#1C1C1E',
  height: 44, borderRadius: 10, fontWeight: 700,
};

const btnGrey = {
  height: 44, borderRadius: 10, fontWeight: 600,
};

export default function PolicyStatusPage() {
  const { policyId } = useParams<{ policyId: string }>();
  const navigate     = useNavigate();
  const [copied, setCopied] = useState(false);

  const { data: policy, isLoading, isError } = usePolicyStatus(policyId ?? '');

  const statusCfg = policy ? (STATUS_CONFIG[policy.status] ?? { bg: '#F3F4F6', fg: '#374151', label: policy.status }) : null;
  const isPending = policy?.status === 'PENDING' || policy?.status === 'PROCESSING';
  const canRetry  = policy?.status === 'FAILED' || policy?.status === 'RETRY_EXHAUSTED';

  function copyPolicyNumber() {
    if (!policy?.policyNumber) return;
    navigator.clipboard.writeText(policy.policyNumber).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const header = (
    <header className={styles.header}>
      <div className={styles.logo}>IR</div>
      <div>
        <div className={styles.logoName}>InsureRoute</div>
        <div className={styles.logoSub}>Policy Status</div>
      </div>
    </header>
  );

  if (!policyId || isError) {
    return (
      <div className={styles.page}>
        {header}
        <div className={styles.content}>
          <div className={styles.card}>
            <div className={styles.cardBody} style={{ textAlign: 'center', padding: '48px 24px' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>❌</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#1C1C1E', marginBottom: 8 }}>Policy not found</div>
              <div style={{ fontSize: 14, color: '#6B7280', marginBottom: 28 }}>
                The link may be invalid or the policy does not exist. Use the lookup form to find your policy.
              </div>
              <Button onClick={() => navigate('/store/policy')} style={btnAmber} type="primary">
                Look Up My Policy
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={styles.page}>
        {header}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Spin size="large" />
        </div>
      </div>
    );
  }

  if (!policy) return null;

  return (
    <div className={styles.page}>
      {header}

      <div className={styles.content}>

        {/* Hero row: title + status badge */}
        <div className={styles.heroRow}>
          <div className={styles.pageTitle}>Policy Status</div>
          {statusCfg && (
            <span
              className={styles.statusBadge}
              style={{ background: statusCfg.bg, color: statusCfg.fg }}
            >
              {isPending && <SyncOutlined spin style={{ marginRight: 6, fontSize: 11 }} />}
              {statusCfg.label}
            </span>
          )}
        </div>

        {/* Auto-refresh notice */}
        {isPending && (
          <div className={styles.pendingBanner}>
            <SyncOutlined spin />
            Your payment is being processed. This page refreshes automatically every 5 seconds.
          </div>
        )}

        {/* Policy number box */}
        {policy.policyNumber && (
          <div className={styles.policyNumberBox}>
            <div>
              <div className={styles.policyNumberLabel}>Policy Number</div>
              <div className={styles.policyNumber}>{policy.policyNumber}</div>
            </div>
            <Button
              size="small"
              icon={<CopyOutlined />}
              onClick={copyPolicyNumber}
              style={{ borderRadius: 8, fontSize: 12 }}
            >
              {copied ? 'Copied!' : 'Copy'}
            </Button>
          </div>
        )}

        <PolicyCard policy={policy} />
        <PaymentCard policy={policy} />
        <TimelineCard policy={policy} />

        {/* Actions */}
        <div className={styles.actionRow}>
          {canRetry && (
            <Button
              type="primary"
              size="large"
              style={btnAmber}
              onClick={() => navigate(`/store/complete?policyId=${policy.policyId}`)}
            >
              Retry Payment →
            </Button>
          )}
          <Button
            size="large"
            style={btnGrey}
            onClick={() => navigate('/store')}
          >
            Browse Plans
          </Button>
        </div>

      </div>

      <div className={styles.footer}>
        Powered by <strong style={{ color: '#6B7280' }}>InsureRoute</strong> · Payment Orchestration System
      </div>
    </div>
  );
}
