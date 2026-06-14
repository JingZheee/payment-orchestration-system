import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Timeline, Spin } from 'antd';
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
  RETRY_EXHAUSTED: { bg: '#FEE2E2', fg: '#991B1B', label: 'Payment Failed' },
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  FPX:             'Online Banking (FPX)',
  VIRTUAL_ACCOUNT: 'Bank Transfer (Virtual Account)',
  QRIS:            'QRIS Scan & Pay',
  GOPAY:           'GoPay',
  EWALLET:         'E-Wallet',
  CARD:            'Credit / Debit Card',
  GCASH:           'GCash',
  MAYA:            'Maya',
  GRABPAY:         'GrabPay',
};

function formatPaymentMethod(method: string | null | undefined): string {
  if (!method) return '—';
  return PAYMENT_METHOD_LABELS[method] ?? method.replace(/_/g, ' ');
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

  const initiatedEvent = policy.events.find(e => e.eventType === 'INITIATED');
  const paymentDate = initiatedEvent?.createdAt ?? policy.createdAt;

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <span className={styles.cardHeaderIcon}>💳</span>
        <span className={styles.cardTitle}>Payment Summary</span>
      </div>
      <div className={styles.cardBody}>
        <div className={styles.detailGrid}>
          <DetailItem label="Payment Method" value={formatPaymentMethod(policy.paymentMethod)} />
          <DetailItem label="Date"           value={fmtDate(paymentDate)} />
          <DetailItem label="Amount Paid"    value={fmtAmount(Number(policy.amount), policy.currency)} />
          {policy.fee != null && (
            <DetailItem label="Service Fee"  value={fmtAmount(Number(policy.fee), policy.currency)} />
          )}
        </div>
      </div>
    </div>
  );
}

interface Milestone {
  label: string;
  sub?: string;
  time: string | null;
  color: string;
  pending?: boolean;
}

function buildMilestones(policy: PolicyStatus): Milestone[] {
  const milestones: Milestone[] = [];
  const find = (type: string) => policy.events.find(e => e.eventType === type);

  milestones.push({
    label: 'Application Received',
    sub: 'Your insurance application has been submitted.',
    time: policy.createdAt,
    color: '#059669',
  });

  const initiated = find('INITIATED');
  if (initiated) {
    milestones.push({
      label: 'Payment Submitted',
      sub: 'Your payment is being processed.',
      time: initiated.createdAt,
      color: '#1D4ED8',
    });
  }

  const activated = find('PREMIUM_ACTIVATED');
  const disbursed  = find('CLAIM_DISBURSED');

  if (activated) {
    milestones.push({
      label: 'Payment Confirmed',
      sub: 'Your payment has been received.',
      time: activated.createdAt,
      color: '#059669',
    });
    milestones.push({
      label: 'Policy Activated',
      sub: 'Your coverage is now active. Keep your policy number for your records.',
      time: activated.createdAt,
      color: '#059669',
    });
  } else if (disbursed) {
    milestones.push({
      label: 'Payment Confirmed',
      sub: 'Your claim payment has been processed.',
      time: disbursed.createdAt,
      color: '#059669',
    });
    milestones.push({
      label: 'Claim Disbursed',
      sub: 'Funds will be credited to your account within 1–3 business days.',
      time: disbursed.createdAt,
      color: '#059669',
    });
  } else if (policy.status === 'FAILED' || policy.status === 'RETRY_EXHAUSTED') {
    milestones.push({
      label: 'Payment Failed',
      sub: 'We were unable to process your payment. Please try again.',
      time: null,
      color: '#DC2626',
    });
  } else if (policy.status === 'PENDING' || policy.status === 'PROCESSING') {
    milestones.push({
      label: 'Payment in Progress',
      sub: 'We are waiting for confirmation from your bank. This usually takes a few minutes.',
      time: null,
      color: '#D97706',
      pending: true,
    });
  }

  return milestones;
}

function MilestonesCard({ policy }: { policy: PolicyStatus }) {
  const milestones = buildMilestones(policy);
  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <span className={styles.cardHeaderIcon}>📋</span>
        <span className={styles.cardTitle}>Application Progress</span>
      </div>
      <div className={styles.cardBody}>
        <Timeline
          items={milestones.map(m => ({
            color: m.color,
            children: (
              <div className={styles.eventItem}>
                <div className={styles.eventType} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {m.pending && <SyncOutlined spin style={{ fontSize: 12, color: m.color }} />}
                  {m.label}
                </div>
                {m.sub && <div className={styles.eventDesc}>{m.sub}</div>}
                {m.time && <div className={styles.eventTime}>{fmtDate(m.time)}</div>}
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
        <MilestonesCard policy={policy} />

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
