import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Divider, Spin, Typography } from 'antd';
import {
  ArrowRightOutlined,
  ExclamationCircleFilled,
  CheckCircleFilled,
  SyncOutlined,
  SafetyOutlined,
} from '@ant-design/icons';
import { storeService, type StoreResult } from './services/storeService';

const { Text } = Typography;

const METHOD_LABELS: Record<string, string> = {
  FPX:             'FPX (Online Banking)',
  EWALLET:         'E-Wallet',
  VIRTUAL_ACCOUNT: 'Virtual Account',
  QRIS:            'QRIS',
  GOPAY:           'GoPay',
  GCASH:           'GCash',
  MAYA:            'Maya',
  GRABPAY:         'GrabPay',
  CARD:            'Credit / Debit Card',
};

function formatAmount(amount: number, currency: string): string {
  if (currency === 'IDR') return `IDR ${amount.toLocaleString('id-ID')}`;
  if (currency === 'PHP') return `PHP ${Number(amount).toFixed(2)}`;
  return `MYR ${Number(amount).toFixed(2)}`;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #F3F4F6' }}>
      <Text type="secondary" style={{ fontSize: 13 }}>{label}</Text>
      <Text strong style={{ fontSize: 13 }}>{value}</Text>
    </div>
  );
}

export default function CompletePaymentPage() {
  const navigate = useNavigate();
  const [quote, setQuote] = useState<StoreResult | null>(null);
  const [loading, setLoading]   = useState(true);
  const [paying,  setPaying]    = useState(false);
  const [error,   setError]     = useState<string | null>(null);

  const params   = new URLSearchParams(window.location.search);
  const policyId = params.get('policyId') ?? '';

  useEffect(() => {
    if (!policyId) { setLoading(false); return; }
    storeService.getResult(policyId)
      .then(data => {
        // Already paid — redirect to result page
        if (data.status === 'SUCCESS' || data.status === 'ACTIVATED') {
          navigate(`/store/result?policyId=${policyId}`, { replace: true });
          return;
        }
        setQuote(data);
      })
      .catch(() => setError('Quote not found. The link may have expired.'))
      .finally(() => setLoading(false));
  }, [policyId, navigate]);

  async function handlePay() {
    if (!policyId || !quote) return;
    setPaying(true); setError(null);
    try {
      const res = await storeService.initiateStorePayment({
        policyId,
        redirectUrl: `${window.location.origin}/store/result`,
      });
      window.location.href = res.redirectUrl;
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Something went wrong. Please try again.';
      setError(msg);
      setPaying(false);
    }
  }

  // ── No policyId ───────────────────────────────────────────────────────────────
  if (!policyId && !loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ background: 'white', borderRadius: 20, padding: '48px 40px', maxWidth: 420, width: '100%', textAlign: 'center', boxShadow: '0 8px 40px rgba(0,0,0,0.09)' }}>
          <ExclamationCircleFilled style={{ fontSize: 56, color: '#F59E0B', marginBottom: 16 }} />
          <div style={{ fontSize: 20, fontWeight: 800, color: '#1C1C1E', marginBottom: 8 }}>Invalid Payment Link</div>
          <div style={{ fontSize: 14, color: '#6B7280', marginBottom: 28 }}>This link is missing required information. Please use the link from your quote email.</div>
          <Button type="primary" block size="large" onClick={() => navigate('/store')}
            style={{ height: 46, borderRadius: 10, fontWeight: 700, background: '#FCB900', borderColor: '#FCB900', color: '#111827' }}>
            Browse Plans
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

  // ── Error ─────────────────────────────────────────────────────────────────────
  if (error && !quote) {
    return (
      <div style={{ minHeight: '100vh', background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ background: 'white', borderRadius: 20, padding: '48px 40px', maxWidth: 420, width: '100%', textAlign: 'center', boxShadow: '0 8px 40px rgba(0,0,0,0.09)' }}>
          <ExclamationCircleFilled style={{ fontSize: 56, color: '#DC2626', marginBottom: 16 }} />
          <div style={{ fontSize: 20, fontWeight: 800, color: '#1C1C1E', marginBottom: 8 }}>Quote Not Found</div>
          <div style={{ fontSize: 14, color: '#6B7280', marginBottom: 28 }}>{error}</div>
          <Button type="primary" block size="large" onClick={() => navigate('/store')}
            style={{ height: 46, borderRadius: 10, fontWeight: 700, background: '#FCB900', borderColor: '#FCB900', color: '#111827' }}>
            Start New Application
          </Button>
        </div>
      </div>
    );
  }

  // ── PENDING: payment initiated — allow resumption via existing provider URL ──
  if (quote?.status === 'PENDING' || quote?.status === 'PROCESSING') {
    return (
      <div style={{ minHeight: '100vh', background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ background: 'white', borderRadius: 20, padding: '48px 40px', maxWidth: 420, width: '100%', textAlign: 'center', boxShadow: '0 8px 40px rgba(0,0,0,0.09)' }}>
          <SyncOutlined spin style={{ fontSize: 56, color: '#F59E0B', marginBottom: 16 }} />
          <div style={{ fontSize: 20, fontWeight: 800, color: '#1C1C1E', marginBottom: 8 }}>Payment In Progress</div>
          <div style={{ fontSize: 14, color: '#6B7280', marginBottom: 28 }}>
            Your payment was initiated. Resume it at the provider page, or go back if you changed your mind.
          </div>
          {error && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 8, padding: '12px 14px', marginBottom: 16, textAlign: 'left' }}>
              <Text style={{ fontSize: 13, color: '#DC2626' }}>{error}</Text>
            </div>
          )}
          <Button
            type="primary" block size="large"
            loading={paying}
            icon={!paying ? <ArrowRightOutlined /> : undefined}
            onClick={handlePay}
            style={{ height: 46, borderRadius: 10, fontWeight: 700, background: '#FCB900', borderColor: '#FCB900', color: '#111827', marginBottom: 12 }}
          >
            {paying ? 'Redirecting…' : 'Resume Payment'}
          </Button>
          <Button block size="large" onClick={() => navigate('/store')}
            style={{ height: 42, borderRadius: 10, fontWeight: 600, color: '#6B7280' }}>
            Cancel — Back to Plans
          </Button>
        </div>
      </div>
    );
  }

  // ── Main: quote ready to pay ──────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: '#F3F4F6', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ background: 'white', borderBottom: '1px solid #E5E7EB', height: 64, padding: '0 32px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 8, background: '#FCB900', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 14, color: '#111827' }}>IR</div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 900, color: '#1C1C1E', lineHeight: 1.2 }}>InsureRoute</div>
          <div style={{ fontSize: 10, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Complete Your Purchase</div>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
        <div style={{ background: 'white', borderRadius: 20, boxShadow: '0 8px 40px rgba(0,0,0,0.09)', maxWidth: 480, width: '100%', padding: '40px 40px' }}>

          {/* Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: '#FFF9E6', border: '1px solid #FDE68A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <SafetyOutlined style={{ fontSize: 22, color: '#D97706' }} />
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#111827', lineHeight: 1.2 }}>Complete Your Payment</div>
              <div style={{ fontSize: 13, color: '#6B7280' }}>Review your quote and pay securely</div>
            </div>
          </div>

          {/* Quote summary */}
          {quote && (
            <>
              <div style={{ background: '#F9FAFB', borderRadius: 12, padding: '20px 20px', marginBottom: 24 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>Application Summary</div>
                <Row label="Policyholder"    value={quote.holderName ?? '—'} />
                <Row label="Email"           value={quote.holderEmail ?? '—'} />
                <Row label="Insurance Plan"  value={quote.insuranceType ?? '—'} />
                <Row label="Payment Method"  value={METHOD_LABELS[quote.paymentMethod ?? ''] ?? quote.paymentMethod ?? '—'} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 14, marginTop: 4 }}>
                  <Text style={{ fontSize: 13, color: '#6B7280' }}>Premium Amount</Text>
                  <Text style={{ fontSize: 20, fontWeight: 900, color: '#111827' }}>
                    {formatAmount(Number(quote.amount), quote.currency)}
                  </Text>
                </div>
              </div>

              <div style={{ background: '#FFF9E6', border: '1px solid #FDE68A', borderRadius: 10, padding: '12px 16px', marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#B45309', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Quote Reference</div>
                <div style={{ fontSize: 15, fontWeight: 800, fontFamily: 'monospace', color: '#78350F' }}>{quote.policyNumber}</div>
              </div>

              <Divider style={{ margin: '4px 0 20px', borderColor: '#F3F4F6' }} />

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 24 }}>
                <CheckCircleFilled style={{ color: '#059669', fontSize: 16, marginTop: 1, flexShrink: 0 }} />
                <Text style={{ fontSize: 13, color: '#374151', lineHeight: 1.6 }}>
                  By completing payment you confirm all details are accurate. Your policy will be activated
                  immediately upon successful payment and a confirmation will be sent to your email.
                </Text>
              </div>

              {(quote?.status === 'FAILED' || quote?.status === 'RETRY_EXHAUSTED') && (
                <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 8, padding: '12px 14px', marginBottom: 16 }}>
                  <Text style={{ fontSize: 13, color: '#DC2626' }}>
                    {quote.status === 'RETRY_EXHAUSTED'
                      ? 'All previous payment attempts were exhausted. You can try again below.'
                      : 'Previous payment attempt failed. You can try again below.'}
                  </Text>
                </div>
              )}

              {error && (
                <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 8, padding: '12px 14px', marginBottom: 16 }}>
                  <Text style={{ fontSize: 13, color: '#DC2626' }}>{error}</Text>
                </div>
              )}

              <Button
                type="primary" block size="large"
                loading={paying}
                icon={!paying ? <ArrowRightOutlined /> : undefined}
                onClick={handlePay}
                style={{ height: 50, borderRadius: 12, fontWeight: 700, fontSize: 15, background: '#FCB900', borderColor: '#FCB900', color: '#111827', boxShadow: '0 2px 12px rgba(252,185,0,0.3)', marginBottom: 12 }}
              >
                {paying ? 'Redirecting to payment…' : `Pay ${formatAmount(Number(quote.amount), quote.currency)}`}
              </Button>

              <Button block size="large" onClick={() => navigate('/store')}
                style={{ height: 42, borderRadius: 10, fontWeight: 600, color: '#6B7280' }}>
                Cancel — Back to Plans
              </Button>
            </>
          )}
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
