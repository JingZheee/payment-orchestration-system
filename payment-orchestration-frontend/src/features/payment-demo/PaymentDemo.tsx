import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button, Col, Form, Input, InputNumber,
  Modal, Row, Select, Space, Table, Tag, Tabs, Tooltip, Typography, message,
} from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { PaymentType } from '../../shared/types/enums';
import { useDemoPolicies, useCreateDemoPolicy, useDeleteDemoPolicy } from './hooks/useDemoPolicies';
import type { DemoPolicy, CreateDemoPolicyRequest } from './services/demoPolicyService';

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
    PENDING:   { label: 'Pending',      bg: '#BAE6FD', color: '#075985' },
    ACTIVATED: { label: 'Activated ✓',  bg: '#DCFCE7', color: '#166534' },
    DISBURSED: { label: 'Disbursed ✓',  bg: '#DCFCE7', color: '#166534' },
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
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<string>('premium');
  const [addModalOpen, setAddModalOpen] = useState(false);

  const { data: allPolicies = [], isFetching } = useDemoPolicies();
  const deleteMutation = useDeleteDemoPolicy();

  const premiums = allPolicies.filter(p => p.paymentType === 'PREMIUM_COLLECTION');
  const claims   = allPolicies.filter(p => p.paymentType === 'CLAIMS_DISBURSEMENT');
  const activeTabType = activeTab === 'premium' ? PaymentType.PREMIUM_COLLECTION : PaymentType.CLAIMS_DISBURSEMENT;

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
          const isDone = row.status !== 'PENDING';
          return (
            <Space size={6}>
              <Tooltip title={isDone ? 'Already processed' : ''}>
                <Button
                  size="small"
                  disabled={isDone}
                  onClick={() => navigate(`/admin/payment-demo/pay/${row.id}`, { state: { policy: row } })}
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
      />
    );
  }

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
          onChange={k => setActiveTab(k)}
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

      {/* ── Hint ── */}
      <div style={{ textAlign: 'center', padding: '8px 0' }}>
        <Text type="secondary" style={{ fontSize: 13 }}>
          Clicking <strong>Pay</strong> or <strong>Disburse</strong> opens the secure InsureRoute payment gateway.
        </Text>
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
