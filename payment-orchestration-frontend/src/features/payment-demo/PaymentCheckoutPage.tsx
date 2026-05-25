import { useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Divider, Form, Input, Select, Spin, Tag, Typography } from 'antd';
import { ArrowLeftOutlined, CheckCircleFilled, LockOutlined } from '@ant-design/icons';
import { Region, Currency, PaymentType, PAYMENT_METHOD_LABELS } from '../../shared/types/enums';
import type { InitiatePaymentRequest, InitiatePaymentResponse } from '../../shared/types/transaction';
import type { Provider } from '../../shared/types/enums';
import { paymentDemoService } from './services/paymentDemoService';
import { useDemoPolicies } from './hooks/useDemoPolicies';
import type { DemoPolicy } from './services/demoPolicyService';
import ProviderBadge from '../../shared/components/ProviderBadge';

const { Text } = Typography;

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

function fmtAmount(amount: number, currency: string) {
  if (currency === 'IDR') return `IDR ${amount.toLocaleString('id-ID')}`;
  return `${currency} ${Number(amount).toFixed(2)}`;
}

// ── Order Summary (left dark panel) ──────────────────────────────────────────

function OrderSummary({ policy, currency }: { policy: DemoPolicy; currency: string }) {
  const isPremium = policy.paymentType === 'PREMIUM_COLLECTION';
  const reference = policy.claimReference ?? policy.policyNumber ?? '—';

  return (
    <div style={{
      width: 320,
      background: '#1C1C1E',
      padding: '44px 36px',
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
    }}>
      <Tag
        color={isPremium ? 'blue' : 'purple'}
        style={{ borderRadius: 999, fontSize: 11, padding: '2px 10px', alignSelf: 'flex-start', marginBottom: 28 }}
      >
        {isPremium ? 'PREMIUM COLLECTION' : 'CLAIMS DISBURSEMENT'}
      </Tag>

      <div style={{ fontSize: 22, fontWeight: 800, color: 'white', lineHeight: 1.3, marginBottom: 6 }}>
        {policy.insuranceType}
      </div>
      <div style={{ fontSize: 12, color: '#6B7280', fontFamily: 'monospace', marginBottom: 32 }}>
        {reference}
      </div>

      <Divider style={{ borderColor: 'rgba(255,255,255,0.08)', margin: '0 0 28px 0' }} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 'auto' }}>
        <div>
          <div style={{ fontSize: 10, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
            Policyholder
          </div>
          <div style={{ fontSize: 14, color: 'white', fontWeight: 600 }}>{policy.holderName}</div>
          <div style={{ fontSize: 12, color: '#9CA3AF' }}>{policy.holderEmail}</div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
            Region
          </div>
          <div style={{ fontSize: 14, color: 'white' }}>
            {REGION_FLAG[policy.region]} {REGION_NAME[policy.region] ?? policy.region}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
            Payment Method
          </div>
          <div style={{ fontSize: 14, color: 'white' }}>
            {PAYMENT_METHOD_LABELS[policy.paymentMethod] ?? policy.paymentMethod}
          </div>
        </div>
      </div>

      <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: '20px', marginTop: 32 }}>
        <div style={{ fontSize: 10, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
          {isPremium ? 'Premium Amount' : 'Claim Amount'}
        </div>
        <div style={{ fontSize: 30, fontWeight: 900, color: '#FCB900', lineHeight: 1 }}>
          {fmtAmount(policy.amount, currency)}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 24 }}>
        <LockOutlined style={{ color: '#4B5563', fontSize: 12 }} />
        <Text style={{ fontSize: 11, color: '#4B5563' }}>256-bit SSL encrypted</Text>
      </div>
    </div>
  );
}

// ── Payment Form (right panel, pre-payment) ───────────────────────────────────

function PaymentFormPanel({
  policy, currency, form, onFinish, isPending, payError,
}: {
  policy: DemoPolicy;
  currency: string;
  form: ReturnType<typeof Form.useForm>[0];
  onFinish: (values: { paymentMethod: string; customerEmail: string; description?: string }) => void;
  isPending: boolean;
  payError: string | null;
}) {
  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 24, fontWeight: 800, color: '#1C1C1E', marginBottom: 6 }}>
          Complete your payment
        </div>
        <div style={{ fontSize: 13, color: '#6B7280' }}>
          Confirm the details below and click Pay to proceed.
        </div>
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={{
          paymentMethod: policy.paymentMethod,
          customerEmail: policy.holderEmail,
          description: `${policy.insuranceType} — ${policy.claimReference ?? policy.policyNumber}`,
        }}
      >
        <Form.Item
          name="paymentMethod"
          label={<span style={{ fontWeight: 600, fontSize: 13 }}>Payment Method</span>}
          rules={[{ required: true }]}
          style={{ marginBottom: 20 }}
        >
          <Select size="large">
            {(REGION_METHODS[policy.region] ?? []).map(m => (
              <Select.Option key={m} value={m}>
                {PAYMENT_METHOD_LABELS[m] ?? m.replace(/_/g, ' ')}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="customerEmail"
          label={<span style={{ fontWeight: 600, fontSize: 13 }}>Customer Email</span>}
          rules={[{ required: true, type: 'email' }]}
          style={{ marginBottom: 20 }}
        >
          <Input size="large" />
        </Form.Item>

        <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
          {policy.policyNumber && (
            <Form.Item
              label={<span style={{ fontWeight: 600, fontSize: 13 }}>Policy No.</span>}
              style={{ flex: 1, marginBottom: 0 }}
            >
              <Input
                size="large"
                value={policy.policyNumber}
                readOnly
                style={{ background: '#F9FAFB', fontFamily: 'monospace', color: '#374151' }}
              />
            </Form.Item>
          )}
          {policy.claimReference && (
            <Form.Item
              label={<span style={{ fontWeight: 600, fontSize: 13 }}>Claim Ref.</span>}
              style={{ flex: 1, marginBottom: 0 }}
            >
              <Input
                size="large"
                value={policy.claimReference}
                readOnly
                style={{ background: '#F9FAFB', fontFamily: 'monospace', color: '#374151' }}
              />
            </Form.Item>
          )}
        </div>

        <Form.Item
          name="description"
          label={<span style={{ fontWeight: 600, fontSize: 13 }}>Description</span>}
          style={{ marginBottom: 28 }}
        >
          <Input size="large" />
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
          }}
        >
          {isPending ? 'Routing payment…' : `Pay ${fmtAmount(policy.amount, currency)}`}
        </Button>
      </Form>

      <div style={{ textAlign: 'center', marginTop: 20 }}>
        <LockOutlined style={{ color: '#9CA3AF', marginRight: 6, fontSize: 12 }} />
        <Text style={{ fontSize: 12, color: '#9CA3AF' }}>
          Your payment is protected by InsureRoute's secure orchestration infrastructure
        </Text>
      </div>
    </div>
  );
}

// ── Already Processed panel ───────────────────────────────────────────────────

function AlreadyProcessedPanel({ policy, navigate }: { policy: DemoPolicy; navigate: ReturnType<typeof useNavigate> }) {
  const statusLabel = policy.status === 'ACTIVATED' ? 'Activated' : 'Disbursed';
  return (
    <div style={{ textAlign: 'center' }}>
      <CheckCircleFilled style={{ fontSize: 64, color: '#059669', marginBottom: 16 }} />
      <div style={{ fontSize: 22, fontWeight: 800, color: '#1C1C1E', marginBottom: 8 }}>
        Already {statusLabel}
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
  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <CheckCircleFilled style={{ fontSize: 60, color: '#059669', marginBottom: 12 }} />
        <div style={{ fontSize: 24, fontWeight: 800, color: '#1C1C1E', marginBottom: 6 }}>Payment Processed</div>
        <div style={{ fontSize: 13, color: '#6B7280' }}>
          The payment has been routed and processed successfully.
        </div>
      </div>

      <div style={{ background: '#F9FAFB', borderRadius: 12, padding: '20px 24px', marginBottom: 24 }}>
        <div style={{
          fontSize: 10, fontWeight: 700, color: '#6B7280',
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

        <Divider style={{ margin: '16px 0' }} />

        <div style={{ background: '#F0FDF4', borderRadius: 8, padding: '10px 14px', marginBottom: 14 }}>
          <Text style={{ fontSize: 12, color: '#166534' }}>{result.routingReason}</Text>
        </div>

        <div>
          <Text type="secondary" style={{ fontSize: 11 }}>Transaction ID</Text>
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
          style={{ height: 46, borderRadius: 10, fontWeight: 600, background: '#FCB900', borderColor: '#FCB900', color: '#1C1C1E' }}
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
  const [form] = Form.useForm();
  const [result, setResult] = useState<InitiatePaymentResponse | null>(null);
  const [payError, setPayError] = useState<string | null>(null);

  // Policy comes from router state (fast path) or falls back to API data
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

  function onFinish(values: { paymentMethod: string; customerEmail: string; description?: string }) {
    if (!policy) return;
    const request: InitiatePaymentRequest = {
      policyId: policy.id,
      merchantOrderId: `INS-${policy.id.slice(0, 8).toUpperCase()}-${Date.now()}`,
      amount: policy.amount,
      currency: currency as Currency,
      region: policy.region as Region,
      paymentMethod: values.paymentMethod,
      paymentType: policy.paymentType as PaymentType,
      customerEmail: values.customerEmail,
      description: values.description,
      redirectUrl: window.location.href,
      policyNumber: policy.policyNumber ?? undefined,
      claimReference: policy.claimReference ?? undefined,
    };
    paymentMutation.mutate({ request, key: crypto.randomUUID() });
  }

  // ── Loading / not found ──────────────────────────────────────────────────────

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

  // ── Page ─────────────────────────────────────────────────────────────────────

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
            background: '#FCB900', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            color: '#1C1C1E', fontWeight: 900, fontSize: 14, flexShrink: 0,
          }}>
            IR
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 900, color: '#1C1C1E', lineHeight: 1.2 }}>InsureRoute</div>
            <div style={{ fontSize: 10, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Secure Payment Gateway
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <LockOutlined style={{ color: '#9CA3AF', fontSize: 13 }} />
          <Text style={{ fontSize: 12, color: '#9CA3AF' }}>256-bit SSL</Text>
          <Divider type="vertical" style={{ margin: '0 4px' }} />
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
          boxShadow: '0 8px 40px rgba(0,0,0,0.10)',
          maxWidth: 900,
          width: '100%',
          display: 'flex',
          overflow: 'hidden',
          minHeight: 560,
        }}>
          <OrderSummary policy={policy!} currency={currency} />

          <div style={{ flex: 1, padding: '44px 48px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            {result ? (
              <SuccessPanel result={result} currency={currency} navigate={navigate} />
            ) : policy!.status !== 'PENDING' ? (
              <AlreadyProcessedPanel policy={policy!} navigate={navigate} />
            ) : (
              <PaymentFormPanel
                policy={policy!}
                currency={currency}
                form={form}
                onFinish={onFinish}
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
