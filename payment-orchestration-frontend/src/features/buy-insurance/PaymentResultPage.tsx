import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Divider, Spin, Tag, Typography } from 'antd';
import {
  CheckCircleFilled,
  CloseCircleFilled,
  ExclamationCircleFilled,
  SyncOutlined,
  ArrowRightOutlined,
  CopyOutlined,
} from '@ant-design/icons';
import { storeService, type StoreResult } from './services/storeService';

const { Text } = Typography;

const STRATEGY_LABELS: Record<string, string> = {
  REGION_BASED: 'Region-Based',
  LOWEST_FEE: 'Lowest Fee',
  SUCCESS_RATE: 'Success Rate',
  COMPOSITE_SCORE: 'Composite Score',
};

const PROVIDER_LABELS: Record<string, string> = {
  BILLPLZ: 'Billplz',
  MIDTRANS: 'Midtrans',
  XENDIT: 'Xendit',
  MOCK: 'Mock Provider',
};

function formatAmount(amount: number, currency: string): string {
  if (currency === 'IDR') return `IDR ${amount.toLocaleString('id-ID')}`;
  if (currency === 'PHP') return `PHP ${amount.toFixed(2)}`;
  return `MYR ${amount.toFixed(2)}`;
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
      <Text type="secondary" style={{ fontSize: 13, flexShrink: 0 }}>{label}</Text>
      <Text strong style={{ fontSize: 13, fontFamily: mono ? 'monospace' : undefined, textAlign: 'right', wordBreak: 'break-all' }}>
        {value}
      </Text>
    </div>
  );
}

export default function PaymentResultPage() {
  const navigate = useNavigate();
  const [result, setResult] = useState<StoreResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // policyId is appended to the redirect URL by the backend before sending to the provider.
  // All three providers (Billplz/Midtrans/Xendit) preserve query params when redirecting back.
  const params = new URLSearchParams(window.location.search);
  const policyId = params.get('policyId') ?? '';

  useEffect(() => {
    if (!policyId) {
      setLoading(false);
      return;
    }
    storeService.getResult(policyId)
      .then(setResult)
      .catch(() => setResult(null))
      .finally(() => setLoading(false));
  }, [policyId]);

  function copyPolicyNumber() {
    const policyNum = result?.policyNumber ?? '';
    if (policyNum) {
      navigator.clipboard.writeText(policyNum).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  }

  const isPaid   = result?.status === 'SUCCESS';
  const isPending = result?.status === 'PENDING' || result?.status === 'PROCESSING';

  // ── No policyId param — user navigated directly ──────────────────────────────
  if (!policyId && !loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ background: 'white', borderRadius: 20, padding: '48px 40px', maxWidth: 420, width: '100%', textAlign: 'center', boxShadow: '0 8px 40px rgba(0,0,0,0.09)' }}>
          <ExclamationCircleFilled style={{ fontSize: 56, color: '#F59E0B', marginBottom: 16 }} />
          <div style={{ fontSize: 22, fontWeight: 800, color: '#1C1C1E', marginBottom: 8 }}>No payment found</div>
          <div style={{ fontSize: 14, color: '#6B7280', marginBottom: 32 }}>
            This page is shown after completing a payment. Start a new purchase below.
          </div>
          <Button
            type="primary"
            size="large"
            block
            onClick={() => navigate('/store')}
            style={{ height: 48, borderRadius: 12, background: '#FCB900', borderColor: '#FCB900', color: '#1C1C1E', fontWeight: 700 }}
          >
            Browse Insurance Plans
          </Button>
        </div>
      </div>
    );
  }

  // ── Loading ───────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  // ── Result ────────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: '#F3F4F6', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{
        background: 'white', borderBottom: '1px solid #E5E7EB',
        height: 64, padding: '0 32px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8, background: '#FCB900',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#1C1C1E', fontWeight: 900, fontSize: 14,
          }}>IR</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 900, color: '#1C1C1E', lineHeight: 1.2 }}>InsureRoute</div>
            <div style={{ fontSize: 10, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Payment Receipt</div>
          </div>
        </div>
      </div>

      {/* Main card */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
        <div style={{
          background: 'white', borderRadius: 20,
          boxShadow: '0 8px 40px rgba(0,0,0,0.09)',
          maxWidth: 480, width: '100%',
          padding: '44px 40px',
        }}>
          {/* Status icon */}
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            {isPending ? (
              <SyncOutlined spin style={{ fontSize: 64, color: '#F59E0B', marginBottom: 14 }} />
            ) : isPaid ? (
              <CheckCircleFilled style={{ fontSize: 64, color: '#059669', marginBottom: 14 }} />
            ) : (
              <CloseCircleFilled style={{ fontSize: 64, color: '#DC2626', marginBottom: 14 }} />
            )}
            <div style={{ fontSize: 26, fontWeight: 800, color: '#1C1C1E', marginBottom: 6 }}>
              {isPending ? 'Payment Processing' : isPaid ? 'Payment Successful' : 'Payment Unsuccessful'}
            </div>
            <div style={{ fontSize: 14, color: '#6B7280' }}>
              {isPending
                ? 'Your payment is being processed. Please check back shortly.'
                : isPaid
                ? 'Your insurance policy is being activated. A confirmation will be sent to your email.'
                : 'Your payment was not completed. No charges have been made.'}
            </div>
          </div>

          {/* Policy info */}
          {result && (isPaid || isPending) && (
            <>
              <div style={{
                background: isPaid ? '#F0FDF4' : '#FFFBEB', borderRadius: 12,
                padding: '16px 20px', marginBottom: 20,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: isPaid ? '#166534' : '#92400E', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                    Policy Number
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 900, color: isPaid ? '#166534' : '#92400E', fontFamily: 'monospace' }}>
                    {result.policyNumber ?? '—'}
                  </div>
                </div>
                {result.policyNumber && (
                  <Button
                    size="small"
                    icon={<CopyOutlined />}
                    onClick={copyPolicyNumber}
                    style={{ borderRadius: 8, fontSize: 12 }}
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </Button>
                )}
              </div>

              {/* Policy details */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                {result.holderName && <DetailRow label="Policyholder" value={result.holderName} />}
                {result.holderEmail && <DetailRow label="Email" value={result.holderEmail} />}
                {result.insuranceType && <DetailRow label="Plan" value={result.insuranceType} />}
                <DetailRow label="Premium" value={formatAmount(Number(result.amount), result.currency)} />
              </div>

              <Divider style={{ margin: '16px 0', borderColor: '#F3F4F6' }} />

              {/* Routing details */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
                  Payment Routing
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text type="secondary" style={{ fontSize: 13 }}>Provider</Text>
                    <Tag style={{ borderRadius: 999, border: 'none', background: '#EFF6FF', color: '#1D4ED8', fontWeight: 700, margin: 0 }}>
                      {PROVIDER_LABELS[result.provider ?? ''] ?? result.provider}
                    </Tag>
                  </div>
                  {result.routingStrategy && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text type="secondary" style={{ fontSize: 13 }}>Strategy</Text>
                      <Tag style={{ borderRadius: 999, border: 'none', background: '#F3F4F6', color: '#374151', fontWeight: 600, margin: 0 }}>
                        {STRATEGY_LABELS[result.routingStrategy] ?? result.routingStrategy}
                      </Tag>
                    </div>
                  )}
                  {result.fee != null && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text type="secondary" style={{ fontSize: 13 }}>Processing Fee</Text>
                      <Text strong style={{ fontSize: 13 }}>{formatAmount(Number(result.fee), result.currency)}</Text>
                    </div>
                  )}
                </div>

                {result.routingReason && (
                  <div style={{ background: '#FFFBEB', borderRadius: 8, padding: '10px 14px', marginTop: 12 }}>
                    <Text style={{ fontSize: 12, color: '#92400E' }}>{result.routingReason}</Text>
                  </div>
                )}
              </div>

              <Divider style={{ margin: '16px 0', borderColor: '#F3F4F6' }} />

              <div>
                <Text style={{ fontSize: 11, color: '#9CA3AF' }}>Transaction ID</Text>
                <br />
                <Text style={{ fontSize: 11, fontFamily: 'monospace', color: '#374151' }}>
                  {result.transactionId}
                </Text>
              </div>
            </>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 12, marginTop: 28 }}>
            <Button
              block
              size="large"
              onClick={() => navigate('/store')}
              style={{ height: 46, borderRadius: 10, fontWeight: 600 }}
            >
              Buy Another Plan
            </Button>
            {isPaid && (
              <Button
                type="primary"
                block
                size="large"
                icon={<ArrowRightOutlined />}
                onClick={() => navigate('/admin/dashboard')}
                style={{
                  height: 46, borderRadius: 10, fontWeight: 600,
                  background: '#FCB900', borderColor: '#FCB900', color: '#1C1C1E',
                }}
              >
                View Dashboard
              </Button>
            )}
          </div>
        </div>
      </div>

      <div style={{ textAlign: 'center', padding: '16px 0 24px' }}>
        <Text style={{ fontSize: 12, color: '#9CA3AF' }}>
          Powered by <strong style={{ color: '#6B7280' }}>InsureRoute</strong> · Payment Orchestration System
        </Text>
      </div>
    </div>
  );
}
