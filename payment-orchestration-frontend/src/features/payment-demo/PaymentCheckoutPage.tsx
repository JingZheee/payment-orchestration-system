import { useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Divider, Form, Input, Spin, Tag, Typography } from 'antd';
import { ArrowLeftOutlined, CheckCircleFilled, LockOutlined } from '@ant-design/icons';
import { Region, Currency, PaymentType } from '../../shared/types/enums';
import type { InitiatePaymentRequest, InitiatePaymentResponse } from '../../shared/types/transaction';
import type { Provider } from '../../shared/types/enums';
import { paymentDemoService } from './services/paymentDemoService';
import { useDemoPolicies } from './hooks/useDemoPolicies';
import type { DemoPolicy } from './services/demoPolicyService';
import ProviderBadge from '../../shared/components/ProviderBadge';

const { Text } = Typography;

// ── Constants ─────────────────────────────────────────────────────────────────

const REGION_CURRENCY: Record<string, string> = { MY: 'MYR', ID: 'IDR', PH: 'PHP' };
const REGION_METHODS: Record<string, string[]> = {
  MY: ['FPX', 'CARD', 'EWALLET'],
  ID: ['VIRTUAL_ACCOUNT', 'QRIS', 'GOPAY', 'CARD', 'EWALLET'],
  PH: ['MAYA', 'GCASH', 'GRABPAY', 'CARD', 'EWALLET'],
};
const REGION_FLAG: Record<string, string> = { MY: '🇲🇾', ID: '🇮🇩', PH: '🇵🇭' };
const REGION_NAME: Record<string, string> = { MY: 'Malaysia', ID: 'Indonesia', PH: 'Philippines' };
const STRATEGY_LABELS: Record<string, string> = {
  REGION_BASED: 'Region-Based', LOWEST_FEE: 'Lowest Fee',
  SUCCESS_RATE: 'Success Rate', COMPOSITE_SCORE: 'Composite Score',
};

interface MethodConfig {
  bg: string;
  fg: string;
  label: string;
  abbr: string;
  description: string;
}

const METHOD_CONFIG: Record<string, MethodConfig> = {
  CARD:            { bg: '#1C1C1E', fg: '#fff',     abbr: '💳',  label: 'Card',           description: 'Visa · Mastercard · Secure hosted card page' },
  FPX:             { bg: '#1D4ED8', fg: '#fff',     abbr: 'FPX', label: 'Online Banking',  description: 'Internet banking · Select your bank at checkout' },
  VIRTUAL_ACCOUNT: { bg: '#0F766E', fg: '#fff',     abbr: 'VA',  label: 'Virtual Account', description: 'Bank transfer · Virtual account number issued on confirm' },
  QRIS:            { bg: '#7C3AED', fg: '#fff',     abbr: 'QR',  label: 'QRIS',            description: 'Scan & pay · Compatible with all major banking apps' },
  GOPAY:           { bg: '#00838F', fg: '#fff',     abbr: 'GP',  label: 'GoPay',           description: 'Redirected to Gojek app to approve payment' },
  GCASH:           { bg: '#007DFE', fg: '#fff',     abbr: 'GC',  label: 'GCash',           description: 'Redirected to GCash app to approve payment' },
  MAYA:            { bg: '#00875A', fg: '#fff',     abbr: 'MA',  label: 'Maya',            description: 'Redirected to Maya app to approve payment' },
  GRABPAY:         { bg: '#00B14F', fg: '#fff',     abbr: 'GR',  label: 'GrabPay',         description: 'Redirected to Grab app to approve payment' },
  EWALLET:         { bg: '#D97706', fg: '#fff',     abbr: 'eW',  label: 'e-Wallet',        description: 'Redirected to your e-wallet app to approve payment' },
};

function fmtAmount(amount: number, currency: string) {
  if (currency === 'IDR') return `IDR ${amount.toLocaleString('id-ID')}`;
  return `${currency} ${Number(amount).toFixed(2)}`;
}

// ── Method row (radio-button style) ──────────────────────────────────────────

function MethodRow({
  method, selected, onSelect,
}: {
  method: string;
  selected: boolean;
  onSelect: () => void;
}) {
  const cfg: MethodConfig = METHOD_CONFIG[method] ?? {
    bg: '#F3F4F6', fg: '#374151', abbr: '?', label: method, description: '',
  };
  const isEmoji = cfg.abbr.length <= 2 && /\p{Emoji}/u.test(cfg.abbr);

  return (
    <button
      type="button"
      onClick={onSelect}
      style={{
        width: '100%',
        border: selected ? '2px solid #FCB900' : '1.5px solid #E5E7EB',
        borderLeft: selected ? '4px solid #FCB900' : undefined,
        borderRadius: 12,
        padding: '14px 16px',
        cursor: 'pointer',
        background: selected ? '#FFFBEB' : 'white',
        transition: 'border-color 0.15s, background 0.15s',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        textAlign: 'left',
        outline: 'none',
      }}
    >
      {/* Icon */}
      <div style={{
        width: 40, height: 40, borderRadius: 10, flexShrink: 0,
        background: isEmoji ? '#F3F4F6' : cfg.bg,
        color: isEmoji ? 'inherit' : cfg.fg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: isEmoji ? 20 : (cfg.abbr.length > 2 ? 10 : 12),
        fontWeight: 800, letterSpacing: '-0.01em',
      }}>
        {cfg.abbr}
      </div>

      {/* Label + description */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#1C1C1E', lineHeight: 1.3 }}>
          {cfg.label}
        </div>
        {selected && cfg.description && (
          <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2, lineHeight: 1.4 }}>
            {cfg.description}
          </div>
        )}
      </div>

      {/* Radio indicator */}
      <div style={{
        width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
        border: selected ? '5px solid #FCB900' : '2px solid #D1D5DB',
        background: 'white',
        transition: 'border 0.15s',
      }} />
    </button>
  );
}

// ── Order Summary (left panel) ───────────────────────────────────────────────

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div style={{
        fontSize: 10, fontWeight: 700, color: '#9CA3AF',
        textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3,
      }}>
        {label}
      </div>
      <div style={{
        fontSize: 13, color: '#1C1C1E', fontWeight: 600,
        fontFamily: mono ? 'monospace' : 'inherit',
        wordBreak: 'break-all',
      }}>
        {value}
      </div>
    </div>
  );
}

function OrderSummary({ policy, currency }: { policy: DemoPolicy; currency: string }) {
  const isPremium = policy.paymentType === 'PREMIUM_COLLECTION';

  return (
    <div style={{
      width: 290,
      background: '#F9F8F6',
      borderRight: '1px solid #ECEAE6',
      padding: '40px 32px',
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Heading */}
      <div style={{ marginBottom: 28 }}>
        <div style={{
          fontSize: 10, fontWeight: 700, color: '#9CA3AF',
          textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10,
        }}>
          Payment Summary
        </div>
        <div style={{ fontSize: 20, fontWeight: 800, color: '#1C1C1E', lineHeight: 1.3, marginBottom: 4 }}>
          {policy.insuranceType}
        </div>
        <div style={{ fontSize: 12, color: '#9CA3AF' }}>
          {isPremium ? 'Premium Payment' : 'Claim Disbursement'}
        </div>
      </div>

      <Divider style={{ borderColor: '#ECEAE6', margin: '0 0 28px 0' }} />

      {/* Details */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 'auto' }}>
        <DetailRow label="Policyholder" value={policy.holderName} />
        <DetailRow label="Email" value={policy.holderEmail} />
        {policy.policyNumber && (
          <DetailRow label="Policy No." value={policy.policyNumber} mono />
        )}
        {policy.claimReference && (
          <DetailRow label="Claim Ref." value={policy.claimReference} mono />
        )}
      </div>

      {/* Amount footer */}
      <div style={{ marginTop: 32 }}>
        <Divider style={{ borderColor: '#ECEAE6', margin: '0 0 20px 0' }} />
        <div style={{
          fontSize: 10, fontWeight: 700, color: '#9CA3AF',
          textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8,
        }}>
          {isPremium ? 'Premium Due' : 'Payout Amount'}
        </div>
        <div style={{ fontSize: 30, fontWeight: 900, color: '#FCB900', lineHeight: 1 }}>
          {fmtAmount(policy.amount, currency)}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 20 }}>
        <LockOutlined style={{ color: '#C4BFB8', fontSize: 11 }} />
        <Text style={{ fontSize: 11, color: '#C4BFB8' }}>256-bit SSL encrypted</Text>
      </div>
    </div>
  );
}

// ── Payment Form Panel (right panel, pre-payment) ─────────────────────────────

function PaymentFormPanel({
  policy, currency, onSubmit, isPending, payError,
}: {
  policy: DemoPolicy;
  currency: string;
  onSubmit: (paymentMethod: string, customerEmail: string) => void;
  isPending: boolean;
  payError: string | null;
}) {
  const [form] = Form.useForm();
  const methods = REGION_METHODS[policy.region] ?? [];
  const [selectedMethod, setSelectedMethod] = useState(policy.paymentMethod || methods[0] || '');

  return (
    <div>
      {/* Title */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#1C1C1E', marginBottom: 4 }}>
          Complete your payment
        </div>
        <div style={{ fontSize: 13, color: '#6B7280' }}>
          Choose a payment method and confirm to proceed.
        </div>
      </div>

      {/* Method list */}
      <div style={{ marginBottom: 24 }}>
        <div style={{
          fontSize: 11, fontWeight: 700, color: '#9CA3AF',
          textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10,
        }}>
          Payment Method
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {methods.map(m => (
            <MethodRow
              key={m}
              method={m}
              selected={selectedMethod === m}
              onSelect={() => setSelectedMethod(m)}
            />
          ))}
        </div>
      </div>

      <Divider style={{ margin: '20px 0', borderColor: '#F3F4F6' }} />

      {/* Email + Pay */}
      <Form
        form={form}
        layout="vertical"
        onFinish={({ customerEmail }) => onSubmit(selectedMethod, customerEmail)}
        initialValues={{ customerEmail: policy.holderEmail }}
      >
        <Form.Item
          name="customerEmail"
          label={
            <span style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Email for receipt
            </span>
          }
          rules={[{ required: true, type: 'email', message: 'Enter a valid email' }]}
          style={{ marginBottom: 24 }}
        >
          <Input
            size="large"
            placeholder="you@example.com"
            style={{ borderRadius: 10, borderColor: '#E5E7EB', fontSize: 14 }}
          />
        </Form.Item>

        {payError && (
          <Alert type="error" message={payError} showIcon style={{ marginBottom: 16, borderRadius: 8 }} />
        )}

        <Button
          type="primary"
          htmlType="submit"
          loading={isPending}
          size="large"
          block
          style={{
            height: 52,
            background: '#FCB900',
            borderColor: '#FCB900',
            color: '#1C1C1E',
            fontWeight: 800,
            fontSize: 16,
            borderRadius: 12,
            boxShadow: '0 4px 14px rgba(252,185,0,0.35)',
          }}
        >
          {isPending ? 'Routing payment…' : `Pay ${fmtAmount(policy.amount, currency)}`}
        </Button>
      </Form>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 20 }}>
        <LockOutlined style={{ color: '#9CA3AF', fontSize: 11 }} />
        <Text style={{ fontSize: 12, color: '#9CA3AF' }}>
          Secured by InsureRoute · 256-bit TLS encryption
        </Text>
      </div>
    </div>
  );
}

// ── Already Processed panel ───────────────────────────────────────────────────

function AlreadyProcessedPanel({
  policy, navigate,
}: {
  policy: DemoPolicy;
  navigate: ReturnType<typeof useNavigate>;
}) {
  const label = policy.status === 'ACTIVATED' ? 'Activated' : 'Disbursed';
  return (
    <div style={{ textAlign: 'center' }}>
      <CheckCircleFilled style={{ fontSize: 64, color: '#059669', marginBottom: 16 }} />
      <div style={{ fontSize: 22, fontWeight: 800, color: '#1C1C1E', marginBottom: 8 }}>
        Already {label}
      </div>
      <div style={{ fontSize: 14, color: '#6B7280', marginBottom: 32 }}>
        This {policy.paymentType === 'PREMIUM_COLLECTION' ? 'policy' : 'claim'} has already been processed.
      </div>
      <Button
        size="large"
        onClick={() => navigate('/payment-demo')}
        icon={<ArrowLeftOutlined />}
        style={{ height: 48, borderRadius: 10, fontWeight: 600 }}
      >
        Back to Demo
      </Button>
    </div>
  );
}

// ── Success panel (after payment) ─────────────────────────────────────────────

function SuccessPanel({
  result, currency, navigate,
}: {
  result: InitiatePaymentResponse;
  currency: string;
  navigate: ReturnType<typeof useNavigate>;
}) {
  const isVa = !!result.vaNumber;
  const isRedirect = !isVa && !!result.redirectUrl;

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <CheckCircleFilled style={{ fontSize: 60, color: '#059669', marginBottom: 12 }} />
        <div style={{ fontSize: 24, fontWeight: 800, color: '#1C1C1E', marginBottom: 6 }}>
          {isVa ? 'Transfer Required' : isRedirect ? 'Redirected to Payment Page' : 'Payment Processed'}
        </div>
        <div style={{ fontSize: 13, color: '#6B7280' }}>
          {isVa
            ? 'Transfer the exact amount to the BCA Virtual Account below.'
            : isRedirect
            ? 'Complete your card payment in the tab that just opened.'
            : 'The payment has been routed and processed successfully.'}
        </div>
      </div>

      {isVa && (
        <div style={{
          background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 12,
          padding: '16px 20px', marginBottom: 20, textAlign: 'center',
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#1D4ED8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
            BCA Virtual Account Number
          </div>
          <Text copyable style={{ fontSize: 22, fontWeight: 800, fontFamily: 'monospace', color: '#1E40AF', letterSpacing: '0.1em' }}>
            {result.vaNumber}
          </Text>
          <div style={{ fontSize: 11, color: '#6B7280', marginTop: 8 }}>
            Pay via BCA mobile / ATM
          </div>
        </div>
      )}

      <div style={{ background: '#F9FAFB', borderRadius: 12, padding: '20px 24px', marginBottom: 24 }}>
        <div style={{
          fontSize: 10, fontWeight: 700, color: '#9CA3AF',
          textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16,
        }}>
          Routing Decision
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text type="secondary" style={{ fontSize: 13 }}>Routed To</Text>
            <ProviderBadge provider={result.provider as Provider} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text type="secondary" style={{ fontSize: 13 }}>Strategy</Text>
            <Tag style={{ borderRadius: 999, border: 'none', background: '#E5E7EB', color: '#374151', fontWeight: 600, margin: 0 }}>
              {STRATEGY_LABELS[result.routingStrategy] ?? result.routingStrategy}
            </Tag>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text type="secondary" style={{ fontSize: 13 }}>Fee Charged</Text>
            <Text strong>{result.fee != null ? `${currency} ${Number(result.fee).toFixed(4)}` : '—'}</Text>
          </div>
        </div>

        <Divider style={{ margin: '16px 0', borderColor: '#E5E7EB' }} />

        <div style={{ background: '#F0FDF4', borderRadius: 8, padding: '10px 14px', marginBottom: 14 }}>
          <Text style={{ fontSize: 12, color: '#166534' }}>{result.routingReason}</Text>
        </div>

        <div>
          <Text style={{ fontSize: 11, color: '#9CA3AF' }}>Transaction ID</Text>
          <br />
          <Text copyable style={{ fontSize: 11, fontFamily: 'monospace', color: '#374151' }}>
            {result.transactionId}
          </Text>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12 }}>
        <Button
          block
          size="large"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/payment-demo')}
          style={{ height: 46, borderRadius: 10, fontWeight: 600 }}
        >
          Back to Demo
        </Button>
        <Button
          type="primary"
          block
          size="large"
          onClick={() => navigate('/transactions')}
          style={{
            height: 46, borderRadius: 10, fontWeight: 600,
            background: '#FCB900', borderColor: '#FCB900', color: '#1C1C1E',
          }}
        >
          View Event Timeline →
        </Button>
      </div>
    </div>
  );
}

// ── Main checkout page ────────────────────────────────────────────────────────

export default function PaymentCheckoutPage() {
  const { policyId } = useParams<{ policyId: string }>();
  const { state } = useLocation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [result, setResult] = useState<InitiatePaymentResponse | null>(null);
  const [payError, setPayError] = useState<string | null>(null);

  const { data: allPolicies = [], isLoading } = useDemoPolicies();
  const policy: DemoPolicy | undefined =
    (state as { policy?: DemoPolicy })?.policy ?? allPolicies.find(p => p.id === policyId);

  const currency = REGION_CURRENCY[policy?.region ?? ''] ?? 'MYR';

  const paymentMutation = useMutation({
    mutationFn: ({ request, key }: { request: InitiatePaymentRequest; key: string }) =>
      paymentDemoService.initiatePayment(request, key),
    onSuccess: (data) => {
      setResult(data);
      setPayError(null);
      if (data.redirectUrl && !data.redirectUrl.startsWith('http://localhost')) {
        window.open(data.redirectUrl, '_blank', 'noopener,noreferrer');
      }
      setTimeout(() => qc.invalidateQueries({ queryKey: ['demoPolicies'] }), 2000);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message ?? 'Backend unavailable — start the Spring Boot server.';
      setPayError(msg);
    },
  });

  function handleSubmit(paymentMethod: string, customerEmail: string) {
    if (!policy) return;
    const request: InitiatePaymentRequest = {
      policyId: policy.id,
      merchantOrderId: `INS-${policy.id.slice(0, 8).toUpperCase()}-${Date.now()}`,
      amount: policy.amount,
      currency: currency as Currency,
      region: policy.region as Region,
      paymentMethod,
      paymentType: policy.paymentType as PaymentType,
      customerEmail,
      redirectUrl: window.location.href,
      policyNumber: policy.policyNumber ?? undefined,
      claimReference: policy.claimReference ?? undefined,
    };
    paymentMutation.mutate({ request, key: crypto.randomUUID() });
  }

  if (isLoading && !policy) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!isLoading && !policy) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <Text type="secondary" style={{ fontSize: 14 }}>Policy not found.</Text>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/payment-demo')}>
          Back to Demo
        </Button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F3F4F6', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{
        background: 'white',
        borderBottom: '1px solid #E5E7EB',
        height: 64,
        padding: '0 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8,
            background: '#FCB900',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#1C1C1E', fontWeight: 900, fontSize: 14, flexShrink: 0,
          }}>
            IR
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 900, color: '#1C1C1E', lineHeight: 1.2 }}>InsureRoute</div>
            <div style={{ fontSize: 10, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Secure Payment Gateway
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <LockOutlined style={{ color: '#9CA3AF', fontSize: 12 }} />
          <Text style={{ fontSize: 12, color: '#9CA3AF' }}>256-bit SSL</Text>
          <Divider type="vertical" style={{ margin: '0 4px', borderColor: '#E5E7EB' }} />
          <Button
            type="link"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/payment-demo')}
            style={{ color: '#6B7280', padding: 0, fontSize: 13 }}
          >
            Back to Demo
          </Button>
        </div>
      </div>

      {/* Main card */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 24px',
      }}>
        <div style={{
          background: 'white',
          borderRadius: 20,
          boxShadow: '0 8px 40px rgba(0,0,0,0.09)',
          maxWidth: 880,
          width: '100%',
          display: 'flex',
          overflow: 'hidden',
          minHeight: 540,
        }}>
          <OrderSummary policy={policy!} currency={currency} />

          <div style={{
            flex: 1,
            padding: '44px 48px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}>
            {result ? (
              <SuccessPanel result={result} currency={currency} navigate={navigate} />
            ) : policy!.status !== 'PENDING' ? (
              <AlreadyProcessedPanel policy={policy!} navigate={navigate} />
            ) : (
              <PaymentFormPanel
                policy={policy!}
                currency={currency}
                onSubmit={handleSubmit}
                isPending={paymentMutation.isPending}
                payError={payError}
              />
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', padding: '16px 0 24px', flexShrink: 0 }}>
        <Text style={{ fontSize: 12, color: '#9CA3AF' }}>
          Powered by <strong style={{ color: '#6B7280' }}>InsureRoute</strong> · Payment Orchestration System
        </Text>
      </div>
    </div>
  );
}
