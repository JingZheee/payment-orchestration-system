import { useState } from 'react';
import { Table, Button, Modal, Form, Select, InputNumber, Switch, Popconfirm, message, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  useRoutingRules,
  useCreateRoutingRule,
  useUpdateRoutingRule,
  useDeleteRoutingRule,
} from './hooks/useRoutingRules';
import { Provider, Region, Currency, RoutingStrategy } from '../../shared/types/enums';
import type { RoutingRule, RoutingRuleRequest } from '../../shared/types/routing';

const STRATEGY_LABELS: Record<RoutingStrategy, string> = {
  [RoutingStrategy.REGION_BASED]:    'Region-Based',
  [RoutingStrategy.LOWEST_FEE]:      'Lowest Fee',
  [RoutingStrategy.SUCCESS_RATE]:    'Success Rate',
  [RoutingStrategy.COMPOSITE_SCORE]: 'Composite Score',
};

const PROVIDER_COLOR: Record<string, string> = {
  BILLPLZ: '#7B5800', MIDTRANS: '#504532', PAYMONGO: '#6B21A8', MOCK: '#6B7280',
};

type RuleMode = 'provider' | 'strategy';

interface FormValues {
  priority: number;
  region?: Region;
  currency?: Currency;
  minAmount?: number;
  maxAmount?: number;
  mode: RuleMode;
  preferredProvider?: Provider;
  strategy?: RoutingStrategy;
  enabled: boolean;
}

function toRequest(v: FormValues): RoutingRuleRequest {
  return {
    priority: v.priority,
    region: v.region ?? null,
    currency: v.currency ?? null,
    minAmount: v.minAmount ?? null,
    maxAmount: v.maxAmount ?? null,
    preferredProvider: v.mode === 'provider' ? (v.preferredProvider ?? null) : null,
    strategy: v.mode === 'strategy' ? (v.strategy ?? null) : null,
    enabled: v.enabled,
  };
}

function ruleToForm(r: RoutingRule): FormValues {
  return {
    priority: r.priority,
    region: r.region ?? undefined,
    currency: r.currency ?? undefined,
    minAmount: r.minAmount ?? undefined,
    maxAmount: r.maxAmount ?? undefined,
    mode: r.strategy ? 'strategy' : 'provider',
    preferredProvider: r.preferredProvider ?? undefined,
    strategy: r.strategy ?? undefined,
    enabled: r.enabled,
  };
}

export default function RoutingRules() {
  const [form] = Form.useForm<FormValues>();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<RoutingRule | null>(null);
  const [mode, setMode] = useState<RuleMode>('provider');

  const { data: rules = [], isFetching } = useRoutingRules();
  const createMutation = useCreateRoutingRule();
  const updateMutation = useUpdateRoutingRule();
  const deleteMutation = useDeleteRoutingRule();

  const isSaving = createMutation.isPending || updateMutation.isPending;

  function openCreate() {
    setEditing(null);
    setMode('provider');
    form.resetFields();
    form.setFieldsValue({ enabled: true, mode: 'provider', priority: rules.length + 1 });
    setModalOpen(true);
  }

  function openEdit(rule: RoutingRule) {
    setEditing(rule);
    const vals = ruleToForm(rule);
    setMode(vals.mode);
    form.setFieldsValue(vals);
    setModalOpen(true);
  }

  async function handleSave() {
    try {
      const values = await form.validateFields();
      const req = toRequest(values);
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, req });
        message.success('Rule updated');
      } else {
        await createMutation.mutateAsync(req);
        message.success('Rule created');
      }
      setModalOpen(false);
    } catch {
      // validation errors shown inline
    }
  }

  async function handleDelete(id: number) {
    await deleteMutation.mutateAsync(id);
    message.success('Rule deleted');
  }

  const sorted = [...rules].sort((a, b) => a.priority - b.priority);

  const columns: ColumnsType<RoutingRule> = [
    {
      title: 'Priority',
      dataIndex: 'priority',
      width: 80,
      render: (v: number) => (
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: 'rgba(252,185,0,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 800, fontSize: 13, color: '#7B5800',
        }}>
          {v}
        </div>
      ),
    },
    {
      title: 'Region',
      dataIndex: 'region',
      width: 90,
      render: (v: string | null) => v
        ? <Tag style={{ borderRadius: 6, fontWeight: 600, fontSize: 11 }}>{v}</Tag>
        : <span style={{ color: '#D1D5DB', fontSize: 12 }}>Any</span>,
    },
    {
      title: 'Currency',
      dataIndex: 'currency',
      width: 90,
      render: (v: string | null) => v
        ? <span style={{ fontSize: 12, fontWeight: 600, color: '#504532' }}>{v}</span>
        : <span style={{ color: '#D1D5DB', fontSize: 12 }}>Any</span>,
    },
    {
      title: 'Amount Range',
      width: 160,
      render: (_: unknown, row: RoutingRule) => {
        const min = row.minAmount != null ? Number(row.minAmount).toLocaleString() : null;
        const max = row.maxAmount != null ? Number(row.maxAmount).toLocaleString() : null;
        if (!min && !max) return <span style={{ color: '#D1D5DB', fontSize: 12 }}>Any</span>;
        return (
          <span style={{ fontSize: 12, color: '#504532' }}>
            {min ?? '0'} – {max ?? '∞'}
          </span>
        );
      },
    },
    {
      title: 'Route To',
      width: 200,
      render: (_: unknown, row: RoutingRule) => {
        if (row.preferredProvider) {
          const color = PROVIDER_COLOR[row.preferredProvider] ?? '#6B7280';
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 14, color }}>account_balance</span>
              <span style={{ fontSize: 13, fontWeight: 600, color }}>{row.preferredProvider}</span>
            </div>
          );
        }
        if (row.strategy) {
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#1D4ED8' }}>auto_awesome</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#1D4ED8' }}>
                {STRATEGY_LABELS[row.strategy]}
              </span>
            </div>
          );
        }
        return <span style={{ color: '#D1D5DB' }}>—</span>;
      },
    },
    {
      title: 'Enabled',
      dataIndex: 'enabled',
      width: 90,
      render: (v: boolean) => (
        <span style={{
          display: 'inline-block', padding: '2px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600,
          background: v ? '#DCFCE7' : '#F3F4F6',
          color: v ? '#166534' : '#6B7280',
        }}>
          {v ? 'Active' : 'Off'}
        </span>
      ),
    },
    {
      title: '',
      key: 'actions',
      width: 80,
      render: (_: unknown, row: RoutingRule) => (
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            onClick={() => openEdit(row)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 6, borderRadius: 6 }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>edit</span>
          </button>
          <Popconfirm
            title="Delete this rule?"
            description="This cannot be undone."
            okText="Delete"
            okButtonProps={{ danger: true }}
            onConfirm={() => handleDelete(row.id)}
          >
            <button
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#FCA5A5', padding: 6, borderRadius: 6 }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>
            </button>
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#1C1C1E', margin: 0 }}>Routing Rules</h1>
          <p style={{ color: '#6B7280', fontSize: 14, marginTop: 4 }}>
            Rules are evaluated sequentially from highest priority to lowest.
          </p>
        </div>
        <Button
          type="primary"
          icon={<span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>}
          onClick={openCreate}
          style={{
            background: 'linear-gradient(180deg, #FCB900 0%, #e0a400 100%)',
            border: 'none', color: '#261900', fontWeight: 600,
            borderRadius: 10, display: 'flex', alignItems: 'center', gap: 4,
          }}
        >
          Add Rule
        </Button>
      </div>

      {/* Info banner */}
      <div style={{
        background: 'rgba(252,185,0,0.08)', borderRadius: 12, padding: '12px 20px',
        display: 'flex', alignItems: 'center', gap: 12,
        border: '1px solid rgba(252,185,0,0.2)',
      }}>
        <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#7B5800' }}>info</span>
        <span style={{ fontSize: 13, color: '#504532' }}>
          Each rule matches by region, currency, and amount range. The first matching enabled rule wins.
          Route to a <strong>Provider</strong> for a hard override, or a <strong>Strategy</strong> to let the engine decide.
        </span>
      </div>

      {/* Table */}
      <div style={{ background: '#FFFFFF', borderRadius: 16, boxShadow: '0 4px 40px -12px rgba(80,69,50,0.08)', overflow: 'hidden' }}>
        <Table<RoutingRule>
          columns={columns}
          dataSource={sorted}
          rowKey="id"
          loading={isFetching}
          pagination={false}
        />
      </div>

      {/* Create / Edit Modal */}
      <Modal
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSave}
        confirmLoading={isSaving}
        okText={editing ? 'Save changes' : 'Create rule'}
        title={
          <span style={{ fontSize: 16, fontWeight: 700, color: '#1C1C1E' }}>
            {editing ? 'Edit Routing Rule' : 'New Routing Rule'}
          </span>
        }
        okButtonProps={{
          style: {
            background: 'linear-gradient(180deg, #FCB900 0%, #e0a400 100%)',
            border: 'none', color: '#261900', fontWeight: 600,
          },
        }}
        width={520}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }} requiredMark={false}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <Form.Item name="priority" label="Priority" rules={[{ required: true }]}>
              <InputNumber min={1} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="enabled" label="Status" valuePropName="checked">
              <Switch checkedChildren="Active" unCheckedChildren="Off" />
            </Form.Item>
            <Form.Item name="region" label="Region">
              <Select allowClear placeholder="Any region"
                options={Object.values(Region).map((r) => ({ value: r, label: r }))} />
            </Form.Item>
            <Form.Item name="currency" label="Currency">
              <Select allowClear placeholder="Any currency"
                options={Object.values(Currency).map((c) => ({ value: c, label: c }))} />
            </Form.Item>
            <Form.Item name="minAmount" label="Min Amount">
              <InputNumber min={0} style={{ width: '100%' }} placeholder="No minimum" />
            </Form.Item>
            <Form.Item name="maxAmount" label="Max Amount">
              <InputNumber min={0} style={{ width: '100%' }} placeholder="No maximum" />
            </Form.Item>
          </div>

          <Form.Item name="mode" label="Route to" rules={[{ required: true }]}>
            <Select
              onChange={(v: RuleMode) => {
                setMode(v);
                form.setFieldsValue({ preferredProvider: undefined, strategy: undefined });
              }}
              options={[
                { value: 'provider', label: 'Specific Provider (hard override)' },
                { value: 'strategy', label: 'Strategy (engine decides)' },
              ]}
            />
          </Form.Item>

          {mode === 'provider' && (
            <Form.Item
              name="preferredProvider"
              label="Provider"
              rules={[{ required: true, message: 'Select a provider' }]}
            >
              <Select
                placeholder="Select provider"
                options={Object.values(Provider).map((p) => ({ value: p, label: p }))}
              />
            </Form.Item>
          )}

          {mode === 'strategy' && (
            <Form.Item
              name="strategy"
              label="Strategy"
              rules={[{ required: true, message: 'Select a strategy' }]}
            >
              <Select
                placeholder="Select strategy"
                options={Object.values(RoutingStrategy).map((s) => ({
                  value: s,
                  label: STRATEGY_LABELS[s],
                }))}
              />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  );
}
