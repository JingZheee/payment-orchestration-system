import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Alert, Button, Col, Divider, Form, Input, InputNumber,
  Modal, Row, Select, Space, Table, Tag, Tabs, Tooltip, Typography, message,
} from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { Region, Currency, PaymentType } from '../../shared/types/enums';
import type { InitiatePaymentRequest, InitiatePaymentResponse } from '../../shared/types/transaction';
import type { Provider } from '../../shared/types/enums';
import { paymentDemoService } from './services/paymentDemoService';
import { useDemoPolicies, useCreateDemoPolicy, useDeleteDemoPolicy } from './hooks/useDemoPolicies';
import type { DemoPolicy, CreateDemoPolicyRequest } from './services/demoPolicyService';
import StatusBadge from '../../shared/components/StatusBadge';
import ProviderBadge from '../../shared/components/ProviderBadge';

const { Text } = Typography;

// ── Constants ─────────────────────────────────────────────────────────────────

const REGION_CURRENCY: Record<string, string> = { MY: 'MYR', ID: 'IDR', PH: 'PHP' };
const REGION_METHODS: Record<string, string[]> = {
  MY: ['FPX', 'CARD', 'EWALLET'],
  ID: ['VIRTUAL_ACCOUNT', 'QRIS', 'GOPAY', 'CARD', 'EWALLET'],
  PH: ['MAYA', 'GCASH', 'GRABPAY', 'CARD', 'EWALLET'],
};
const INSURANCE_TYPES = [
  'Life Insurance', 'Medical Insurance', 'Motor Insurance',
  'Travel Insurance', 'Home Insurance', 'Personal Accident',
  'Medical Claim', 'Accident Claim', 'Life Claim', 'Health Claim',
];
const STRATEGY_LABELS: Record<string, string> = {
  REGION_BASED: 'Region-Based', LOWEST_FEE: 'Lowest Fee',
  SUCCESS_RATE: 'Success Rate', COMPOSITE_SCORE: 'Composite Score',
};

function fmtAmount(amount: number, currency: string) {
  if (currency === 'IDR') return `IDR ${amount.toLocaleString('id-ID')}`;
  return `${currency} ${Number(amount).toFixed(2)}`;
}

function genRef(prefix: string, region: string) {
  return `${prefix}-${new Date().getFullYear()}-${region}-${String(Date.now()).slice(-4)}`;
}

// ── Status badge ──────────────────────────────────────────────────────────────

function PolicyStatusTag({ status }: { status: string }) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    PENDING:   { label: 'Pending',   bg: '#BAE6FD', color: '#075985' },
    ACTIVATED: { label: 'Activated ✓', bg: '#DCFCE7', color: '#166534' },
    DISBURSED: { label: 'Disbursed ✓', bg: '#DCFCE7', color: '#166534' },
  };
  const cfg = map[status] ?? { label: status, bg: '#F3F4F6', color: '#374151' };
  return (
    <Tag style={{ borderRadius: 999, border: 'none', fontWeight: 700, fontSize: 11, background: cfg.bg, color: cfg.color }}>
      {cfg.label}
    </Tag>
  );
}

// ── Add Policy Modal ──────────────────────────────────────────────────────────

function AddPolicyModal({
  open, paymentType, onClose,
}: {
  open: boolean; paymentType: string; onClose: () => void;
}) {
  const [form] = Form.useForm();
  const createMutation = useCreateDemoPolicy();
  const isClaim = paymentType === PaymentType.CLAIMS_DISBURSEMENT;
  const [selectedRegion, setSelectedRegion] = useState<string>('MY');

  async function handleOk() {
    const values = await form.validateFields();
    const req: CreateDemoPolicyRequest = {
      holderName:    values.holderName,
      holderEmail:   values.holderEmail,
      insuranceType: values.insuranceType,
      policyNumber:  values.policyNumber || genRef('POL', values.region),
      claimReference: isClaim ? (values.claimReference || genRef('CLM', values.region)) : undefined,
      amount:        values.amount,
      currency:      REGION_CURRENCY[values.region] ?? 'MYR',
      region:        values.region,
      paymentMethod: values.paymentMethod,
      paymentType,
    };
    await createMutation.mutateAsync(req);
    message.success(`${isClaim ? 'Claim' : 'Policy'} added`);
    form.resetFields();
    onClose();
  }

  return (
    <Modal
      open={open}
      title={isClaim ? '➕ Add Claim Record' : '➕ Add Policy Record'}
      okText="Add"
      onOk={handleOk}
      onCancel={onClose}
      confirmLoading={createMutation.isPending}
      destroyOnClose
    >
      <Form form={form} layout="vertical" initialValues={{ region: 'MY', paymentMethod: 'FPX' }}>
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item name="holderName" label="Holder Name" rules={[{ required: true }]}>
              <Input placeholder="Full name" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="holderEmail" label="Email" rules={[{ required: true, type: 'email' }]}>
              <Input placeholder="email@example.com" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="insuranceType" label="Insurance Type" rules={[{ required: true }]}>
          <Select placeholder="Select type">
            {INSURANCE_TYPES.map(t => <Select.Option key={t} value={t}>{t}</Select.Option>)}
          </Select>
        </Form.Item>

        <Row gutter={12}>
          <Col span={12}>
            <Form.Item name="policyNumber" label="Policy Number">
              <Input placeholder="Auto-generated if blank" />
            </Form.Item>
          </Col>
          {isClaim && (
            <Col span={12}>
              <Form.Item name="claimReference" label="Claim Reference">
                <Input placeholder="Auto-generated if blank" />
              </Form.Item>
            </Col>
          )}
        </Row>

        <Row gutter={12}>
          <Col span={8}>
            <Form.Item name="region" label="Region" rules={[{ required: true }]}>
              <Select onChange={v => {
                setSelectedRegion(v);
                form.setFieldValue('paymentMethod', REGION_METHODS[v]?.[0]);
              }}>
                <Select.Option value="MY">🇲🇾 Malaysia</Select.Option>
                <Select.Option value="ID">🇮🇩 Indonesia</Select.Option>
                <Select.Option value="PH">🇵🇭 Philippines</Select.Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="amount" label="Amount" rules={[{ required: true, type: 'number', min: 0.01 }]}>
              <InputNumber
                style={{ width: '100%' }}
                addonBefore={<span style={{ fontWeight: 700 }}>{REGION_CURRENCY[selectedRegion]}</span>}
                min={0.01}
                step={selectedRegion === 'ID' ? 1000 : 1}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="paymentMethod" label="Payment Method" rules={[{ required: true }]}>
              <Select>
                {(REGION_METHODS[selectedRegion] ?? []).map(m => (
                  <Select.Option key={m} value={m}>{m.replace('_', ' ')}</Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function PaymentDemo() {
  const [form] = Form.useForm();
  const [activeTab, setActiveTab] = useState<string>('premium');
  const [selectedPolicy, setSelectedPolicy] = useState<DemoPolicy | null>(null);
  const [result, setResult] = useState<InitiatePaymentResponse | null>(null);
  const [payError, setPayError] = useState<string | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  // Tracks IDs that have had payment submitted; disables Pay immediately on submit,
  // regardless of how long the API or notification consumer takes to respond.
  const [submittedIds, setSubmittedIds] = useState<Set<string>>(new Set());
  const formRef = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();

  const { data: allPolicies = [], isFetching } = useDemoPolicies();
  const deleteMutation = useDeleteDemoPolicy();

  const paymentMutation = useMutation({
    mutationFn: ({ request, key }: { request: InitiatePaymentRequest; key: string; policy: DemoPolicy }) =>
      paymentDemoService.initiatePayment(request, key),
    onSuccess: (data, variables) => {
      setResult(data);
      setPayError(null);
      // Auto-open payment gateway for real providers (not localhost mock)
      if (data.redirectUrl && !data.redirectUrl.startsWith('http://localhost')) {
        window.open(data.redirectUrl, '_blank', 'noopener,noreferrer');
      }
      // Optimistically flip status in cache — no waiting for the 4s poll
      const newStatus = variables.policy.paymentType === 'PREMIUM_COLLECTION' ? 'ACTIVATED' : 'DISBURSED';
      qc.setQueryData<DemoPolicy[]>(['demoPolicies'], (old = []) =>
        old.map(p => p.id === variables.policy.id ? { ...p, status: newStatus } : p)
      );
      // Confirm against DB after consumer has had time to process
      setTimeout(() => qc.invalidateQueries({ queryKey: ['demoPolicies'] }), 2000);
    },
    onError: (err: unknown, variables) => {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message ?? 'Backend unavailable — start the Spring Boot server.';
      setPayError(msg);
      // Remove from submitted set so the user can retry after a failure
      setSubmittedIds(prev => { const s = new Set(prev); s.delete(variables.policy.id); return s; });
    },
  });

  const premiums = allPolicies.filter(p => p.paymentType === 'PREMIUM_COLLECTION');
  const claims   = allPolicies.filter(p => p.paymentType === 'CLAIMS_DISBURSEMENT');
  const activeTabType = activeTab === 'premium' ? PaymentType.PREMIUM_COLLECTION : PaymentType.CLAIMS_DISBURSEMENT;

  function handlePay(policy: DemoPolicy) {
    setSelectedPolicy(policy);
    setResult(null);
    setPayError(null);
    form.setFieldsValue({
      paymentType:   policy.paymentType,
      amount:        policy.amount,
      paymentMethod: policy.paymentMethod,
      customerEmail: policy.holderEmail,
      policyNumber:  policy.policyNumber ?? undefined,
      claimReference: policy.claimReference ?? undefined,
      description:   `${policy.insuranceType} — ${policy.claimReference ?? policy.policyNumber}`,
    });
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  }

  function onFinish(values: {
    paymentType: string; paymentMethod: string; amount: number;
    customerEmail: string; policyNumber?: string; claimReference?: string; description?: string;
  }) {
    if (!selectedPolicy) return;
    // Lock this policy immediately — before the API responds
    setSubmittedIds(prev => new Set(prev).add(selectedPolicy.id));
    const request: InitiatePaymentRequest = {
      merchantOrderId: `INS-${selectedPolicy.id.slice(0, 8).toUpperCase()}-${Date.now()}`,
      amount:          values.amount,
      currency:        selectedPolicy.currency as Currency,
      region:          selectedPolicy.region as Region,
      paymentMethod:   values.paymentMethod,
      paymentType:     values.paymentType as PaymentType,
      customerEmail:   values.customerEmail,
      description:     values.description,
      redirectUrl:     window.location.href,
      policyNumber:    values.policyNumber || undefined,
      claimReference:  values.claimReference || undefined,
    };
    paymentMutation.mutate({ request, key: crypto.randomUUID(), policy: selectedPolicy });
  }

  function renderTable(policies: DemoPolicy[], actionLabel: string, actionColor: string) {
    const cols: ColumnsType<DemoPolicy> = [
      {
        title: 'Policyholder',
        render: (_, row) => (
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, color: '#1C1C1E' }}>{row.holderName}</div>
            <div style={{ fontSize: 11, color: '#9CA3AF' }}>{row.holderEmail}</div>
          </div>
        ),
      },
      {
        title: 'Reference',
        render: (_, row) => (
          <div>
            <div style={{ fontSize: 12, fontFamily: 'monospace', color: '#374151' }}>
              {row.claimReference ?? row.policyNumber ?? '—'}
            </div>
            <div style={{ fontSize: 11, color: '#6B7280' }}>{row.insuranceType}</div>
          </div>
        ),
      },
      {
        title: 'Amount',
        render: (_, row) => (
          <span style={{ fontWeight: 700, fontSize: 13 }}>{fmtAmount(row.amount, row.currency)}</span>
        ),
        width: 140,
      },
      {
        title: 'Region',
        render: (_, row) => {
          const flag: Record<string, string> = { MY: '🇲🇾', ID: '🇮🇩', PH: '🇵🇭' };
          return <span style={{ fontSize: 13 }}>{flag[row.region]} {row.region}</span>;
        },
        width: 70,
      },
      {
        title: 'Status',
        render: (_, row) => <PolicyStatusTag status={row.status} />,
        width: 120,
      },
      {
        title: '',
        render: (_, row) => {
          const isPaying = paymentMutation.isPending && selectedPolicy?.id === row.id;
          const isDone = row.status !== 'PENDING' || submittedIds.has(row.id);
          return (
            <Space size={6}>
              <Tooltip title={isDone ? 'Already processed' : ''}>
                <Button
                  size="small"
                  loading={isPaying}
                  disabled={isDone || (paymentMutation.isPending && !isPaying)}
                  onClick={() => handlePay(row)}
                  style={{
                    background: isDone ? '#F3F4F6' : actionColor,
                    borderColor: isDone ? '#E5E7EB' : actionColor,
                    color: isDone ? '#9CA3AF' : '#fff',
                    fontWeight: 600,
                    fontSize: 12,
                  }}
                >
                  {isDone ? 'Done' : actionLabel}
                </Button>
              </Tooltip>
              <Tooltip title="Remove">
                <Button
                  size="small"
                  icon={<DeleteOutlined />}
                  danger
                  onClick={() => deleteMutation.mutate(row.id)}
                  loading={deleteMutation.isPending}
                  style={{ fontSize: 12 }}
                />
              </Tooltip>
            </Space>
          );
        },
        width: 140,
      },
    ];

    return (
      <Table
        dataSource={policies}
        columns={cols}
        rowKey="id"
        pagination={false}
        size="small"
        loading={isFetching && policies.length === 0}
        locale={{ emptyText: 'No records — click "+ Add" to create one' }}
        style={{ borderRadius: 8, overflow: 'hidden' }}
        rowClassName={row => row.id === selectedPolicy?.id ? 'ant-table-row-selected' : ''}
      />
    );
  }

  const formRegion = selectedPolicy?.region as Region | undefined;
  const formCurrency = selectedPolicy ? (REGION_CURRENCY[selectedPolicy.region] ?? 'MYR') : 'MYR';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* ── Header ── */}
      <div>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: '#1C1C1E', margin: 0 }}>
          Insurance Payment Operations
        </h1>
        <p style={{ color: '#6B7280', fontSize: 14, marginTop: 4 }}>
          Policy and claims records received from the Policy Management System. Click <strong>Pay</strong> to route a payment.
        </p>
      </div>

      {/* ── Policy / Claim Queue ── */}
      <div style={{ background: '#FFFFFF', borderRadius: 16, border: '1px solid #F3F4F6', overflow: 'hidden' }}>
        <Tabs
          activeKey={activeTab}
          onChange={k => { setActiveTab(k); setSelectedPolicy(null); setResult(null); }}
          tabBarExtraContent={
            <Button
              type="primary"
              icon={<PlusOutlined />}
              size="small"
              style={{ background: '#FCB900', borderColor: '#FCB900', color: '#1C1C1E', fontWeight: 700, margin: '12px 16px 12px 0' }}
              onClick={() => setAddModalOpen(true)}
            >
              Add
            </Button>
          }
          style={{ padding: '0 20px' }}
          items={[
            {
              key: 'premium',
              label: <span style={{ fontWeight: 600 }}>💰 Premium Collection</span>,
              children: (
                <div style={{ paddingBottom: 20 }}>
                  {renderTable(premiums, 'Pay', '#059669')}
                </div>
              ),
            },
            {
              key: 'claims',
              label: <span style={{ fontWeight: 600 }}>🏥 Claims Disbursement</span>,
              children: (
                <div style={{ paddingBottom: 20 }}>
                  {renderTable(claims, 'Disburse', '#7C3AED')}
                </div>
              ),
            },
          ]}
        />
      </div>

      {/* ── Payment Form + Routing Decision ── */}
      <div ref={formRef}>
        <Row gutter={[24, 24]} align="top">

          {/* Form */}
          <Col xs={24} lg={12}>
            <div style={{
              background: '#FFFFFF', borderRadius: 16, border: `1.5px solid ${selectedPolicy ? 'rgba(252,185,0,0.4)' : '#F3F4F6'}`,
              overflow: 'hidden', transition: 'border-color 0.3s',
            }}>
              {/* Form header */}
              <div style={{ padding: '16px 24px', borderBottom: '1px solid #F3F4F6' }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#1C1C1E' }}>
                  {selectedPolicy ? `Payment Form — ${selectedPolicy.claimReference ?? selectedPolicy.policyNumber}` : 'Payment Form'}
                </div>
                {selectedPolicy && (
                  <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
                    {selectedPolicy.holderName} · {selectedPolicy.insuranceType} · {fmtAmount(selectedPolicy.amount, selectedPolicy.currency)}
                  </div>
                )}
              </div>

              {!selectedPolicy ? (
                <div style={{ padding: '48px 24px', textAlign: 'center' }}>
                  <div style={{ fontSize: 36, marginBottom: 12 }}>☝️</div>
                  <Text type="secondary">Click <strong>Pay</strong> on a record above to load the payment form</Text>
                </div>
              ) : (
                <div style={{ padding: 24 }}>
                  <Form
                    form={form}
                    layout="vertical"
                    onFinish={onFinish}
                    initialValues={{ paymentType: selectedPolicy.paymentType }}
                  >
                    {/* Payment Type (read-only display) */}
                    <Form.Item label={<span style={{ fontWeight: 600 }}>Payment Type</span>} style={{ marginBottom: 16 }}>
                      <Tag
                        color={selectedPolicy.paymentType === 'PREMIUM_COLLECTION' ? 'blue' : 'purple'}
                        style={{ borderRadius: 999, fontSize: 13, padding: '2px 12px' }}
                      >
                        {selectedPolicy.paymentType === 'PREMIUM_COLLECTION' ? 'Premium Collection' : 'Claims Disbursement'}
                      </Tag>
                      <Form.Item name="paymentType" hidden><Input /></Form.Item>
                    </Form.Item>

                    {/* Amount */}
                    <Form.Item
                      name="amount"
                      label={<span style={{ fontWeight: 600 }}>Amount</span>}
                      rules={[{ required: true, type: 'number', min: 0.01 }]}
                      style={{ marginBottom: 16 }}
                    >
                      <InputNumber
                        style={{ width: '100%' }}
                        addonBefore={<span style={{ fontWeight: 700, minWidth: 36, display: 'inline-block', textAlign: 'center' }}>{formCurrency}</span>}
                        min={0.01}
                        step={formRegion === Region.ID ? 1000 : 1}
                        precision={formRegion === Region.ID ? 0 : 2}
                      />
                    </Form.Item>

                    {/* Payment Method */}
                    <Form.Item
                      name="paymentMethod"
                      label={<span style={{ fontWeight: 600 }}>Payment Method</span>}
                      rules={[{ required: true }]}
                      style={{ marginBottom: 16 }}
                    >
                      <Select>
                        {(REGION_METHODS[selectedPolicy.region] ?? []).map(m => (
                          <Select.Option key={m} value={m}>{m.replace(/_/g, ' ')}</Select.Option>
                        ))}
                      </Select>
                    </Form.Item>

                    {/* Email */}
                    <Form.Item
                      name="customerEmail"
                      label={<span style={{ fontWeight: 600 }}>Customer Email</span>}
                      rules={[{ required: true, type: 'email' }]}
                      style={{ marginBottom: 16 }}
                    >
                      <Input />
                    </Form.Item>

                    {/* Policy / Claim refs (read-only) */}
                    <Row gutter={12}>
                      <Col span={12}>
                        <Form.Item name="policyNumber" label={<span style={{ fontWeight: 600 }}>Policy No.</span>} style={{ marginBottom: 16 }}>
                          <Input readOnly style={{ background: '#F9FAFB', color: '#374151', fontFamily: 'monospace' }} />
                        </Form.Item>
                      </Col>
                      {selectedPolicy.claimReference && (
                        <Col span={12}>
                          <Form.Item name="claimReference" label={<span style={{ fontWeight: 600 }}>Claim Ref.</span>} style={{ marginBottom: 16 }}>
                            <Input readOnly style={{ background: '#F9FAFB', color: '#374151', fontFamily: 'monospace' }} />
                          </Form.Item>
                        </Col>
                      )}
                    </Row>

                    {/* Description */}
                    <Form.Item name="description" label={<span style={{ fontWeight: 600 }}>Description</span>} style={{ marginBottom: 20 }}>
                      <Input />
                    </Form.Item>

                    {payError && (
                      <Alert type="error" message={payError} showIcon style={{ marginBottom: 16 }} />
                    )}

                    <Button
                      type="primary"
                      htmlType="submit"
                      loading={paymentMutation.isPending}
                      size="large"
                      block
                      style={{ background: '#FCB900', borderColor: '#FCB900', color: '#1C1C1E', fontWeight: 700, height: 44 }}
                    >
                      {paymentMutation.isPending ? 'Routing payment…' : 'Initiate Payment'}
                    </Button>
                  </Form>
                </div>
              )}
            </div>
          </Col>

          {/* Routing Decision */}
          <Col xs={24} lg={12}>
            {result ? (
              <div style={{ background: '#FFFFFF', borderRadius: 16, border: '1px solid #F3F4F6', padding: 24 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>
                  Routing Decision
                </div>

                <div style={{ textAlign: 'center', marginBottom: 20 }}>
                  <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>Transaction Status</Text>
                  <StatusBadge status={result.status} />
                </div>

                <Divider style={{ margin: '16px 0' }} />

                <Space direction="vertical" style={{ width: '100%' }} size={14}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>Routed To</Text>
                    <ProviderBadge provider={result.provider as Provider} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>Strategy</Text>
                    <Tag style={{ borderRadius: 999, border: 'none', background: '#F3F4F6', color: '#374151', fontWeight: 600, margin: 0 }}>
                      {STRATEGY_LABELS[result.routingStrategy] ?? result.routingStrategy}
                    </Tag>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>Fee Charged</Text>
                    <Text strong>{result.fee != null ? `${formCurrency} ${Number(result.fee).toFixed(4)}` : '—'}</Text>
                  </div>
                </Space>

                <Divider style={{ margin: '16px 0' }} />

                <div style={{ background: '#F6F3F5', borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
                  <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>Why this provider?</Text>
                  <Text style={{ fontSize: 12, color: '#374151' }}>{result.routingReason}</Text>
                </div>

                <div>
                  <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>Transaction ID</Text>
                  <Text copyable style={{ fontSize: 11, fontFamily: 'monospace', color: '#374151' }}>{result.transactionId}</Text>
                </div>

                {/* Payment gateway link */}
                {result.redirectUrl && (
                  <>
                    <Divider style={{ margin: '16px 0' }} />
                    <div style={{
                      background: 'rgba(5,150,105,0.06)', borderRadius: 10, padding: '14px 16px',
                      border: '1px solid rgba(5,150,105,0.2)',
                    }}>
                      <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 8 }}>
                        Payment Gateway
                      </Text>
                      <Button
                        type="primary"
                        block
                        href={result.redirectUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ background: '#059669', borderColor: '#059669', fontWeight: 700, height: 40 }}
                      >
                        Open Payment Page ↗
                      </Button>
                      <Text
                        copyable={{ text: result.redirectUrl }}
                        style={{ fontSize: 10, fontFamily: 'monospace', color: '#9CA3AF', display: 'block', marginTop: 8, wordBreak: 'break-all' }}
                      >
                        {result.redirectUrl}
                      </Text>
                    </div>
                  </>
                )}

                <Divider style={{ margin: '16px 0' }} />

                <div style={{
                  background: 'rgba(252,185,0,0.06)', borderRadius: 8, padding: '10px 14px',
                  border: '1px solid rgba(252,185,0,0.15)',
                }}>
                  <Text style={{ fontSize: 12, color: '#504532' }}>
                    ✓ A <strong>PaymentSucceeded</strong> event has been published to the notification queue.
                    The policy status above will update to <strong>Activated</strong> within seconds.
                  </Text>
                </div>

                <Button
                  type="link"
                  style={{ padding: 0, fontSize: 13, color: '#FCB900', fontWeight: 600, marginTop: 12 }}
                  onClick={() => window.location.href = '/transactions'}
                >
                  View full event timeline →
                </Button>
              </div>
            ) : (
              <div style={{
                borderRadius: 16, border: '2px dashed #E5E7EB', background: '#FAFAFA',
                minHeight: 340, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>⚡</div>
                  <Text type="secondary" style={{ fontSize: 14 }}>
                    {selectedPolicy ? 'Fill the form and initiate payment' : 'Select a record above to begin'}
                  </Text>
                </div>
              </div>
            )}
          </Col>
        </Row>
      </div>

      {/* Add Modal */}
      <AddPolicyModal
        open={addModalOpen}
        paymentType={activeTabType}
        onClose={() => setAddModalOpen(false)}
      />
    </div>
  );
}
