import React, { useState } from 'react';
import {
  Button, Form, InputNumber, Modal, Popconfirm, Select, Switch, Tabs, Typography, message,
} from 'antd';
import { HolderOutlined, PlusOutlined } from '@ant-design/icons';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, useSortable, verticalListSortingStrategy, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useQueryClient } from '@tanstack/react-query';
import { Provider, Region, Currency, RoutingStrategy } from '../../shared/types/enums';
import type { RoutingRule, RoutingRuleRequest } from '../../shared/types/routing';
import {
  useRoutingRules, useCreateRoutingRule, useUpdateRoutingRule, useDeleteRoutingRule,
} from './hooks/useRoutingRules';
import { routingRuleService } from './services/routingRuleService';

const { Text } = Typography;

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
type GroupKey = 'MY' | 'ID' | 'PH' | 'GLOBAL';

interface FormValues {
  region?: Region;
  currency?: Currency;
  minAmount?: number;
  maxAmount?: number;
  mode: RuleMode;
  preferredProvider?: Provider;
  strategy?: RoutingStrategy;
  enabled: boolean;
}

function toRequest(v: FormValues, priority: number): RoutingRuleRequest {
  return {
    priority,
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

// ── Sortable rule card ────────────────────────────────────────────────────────

function SortableRuleCard({
  rule, index, onEdit, onDelete, isDeleting,
}: {
  rule: RoutingRule;
  index: number;
  onEdit: (rule: RoutingRule) => void;
  onDelete: (id: number) => void;
  isDeleting: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: rule.id,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    position: 'relative',
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '14px 20px',
        background: isDragging ? '#FFFBEA' : 'white',
        borderRadius: 10,
        border: `1px solid ${isDragging ? 'rgba(252,185,0,0.5)' : '#F3F4F6'}`,
        marginBottom: 8,
        boxShadow: isDragging ? '0 6px 20px rgba(0,0,0,0.12)' : 'none',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        opacity: isDragging ? 0.9 : 1,
      }}>

        {/* Drag handle */}
        <div
          {...attributes}
          {...listeners}
          style={{
            cursor: isDragging ? 'grabbing' : 'grab',
            color: '#D1D5DB',
            touchAction: 'none',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            padding: '4px 2px',
          }}
        >
          <HolderOutlined style={{ fontSize: 16 }} />
        </div>

        {/* Priority badge */}
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          background: 'rgba(252,185,0,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 800, fontSize: 12, color: '#7B5800', flexShrink: 0,
        }}>
          {index + 1}
        </div>

        {/* Rule fields */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 28, flexWrap: 'wrap' }}>

          <div style={{ minWidth: 56 }}>
            <div style={{ fontSize: 10, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Currency</div>
            {rule.currency
              ? <span style={{ fontSize: 13, fontWeight: 600, color: '#504532' }}>{rule.currency}</span>
              : <span style={{ fontSize: 12, color: '#D1D5DB' }}>Any</span>}
          </div>

          <div style={{ minWidth: 120 }}>
            <div style={{ fontSize: 10, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Amount Range</div>
            {rule.minAmount != null || rule.maxAmount != null
              ? <span style={{ fontSize: 12, color: '#374151' }}>
                  {rule.minAmount != null ? Number(rule.minAmount).toLocaleString() : '0'}
                  {' – '}
                  {rule.maxAmount != null ? Number(rule.maxAmount).toLocaleString() : '∞'}
                </span>
              : <span style={{ fontSize: 12, color: '#D1D5DB' }}>Any</span>}
          </div>

          <div style={{ minWidth: 170 }}>
            <div style={{ fontSize: 10, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Route To</div>
            {rule.preferredProvider
              ? <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 13, color: PROVIDER_COLOR[rule.preferredProvider] ?? '#6B7280' }}>account_balance</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: PROVIDER_COLOR[rule.preferredProvider] ?? '#6B7280' }}>{rule.preferredProvider}</span>
                </div>
              : rule.strategy
              ? <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 13, color: '#1D4ED8' }}>auto_awesome</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#1D4ED8' }}>{STRATEGY_LABELS[rule.strategy]}</span>
                </div>
              : <span style={{ fontSize: 12, color: '#D1D5DB' }}>—</span>}
          </div>
        </div>

        {/* Enabled badge */}
        <span style={{
          display: 'inline-block', padding: '3px 12px', borderRadius: 999,
          fontSize: 12, fontWeight: 600, flexShrink: 0,
          background: rule.enabled ? '#DCFCE7' : '#F3F4F6',
          color: rule.enabled ? '#166534' : '#6B7280',
        }}>
          {rule.enabled ? 'Active' : 'Off'}
        </span>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
          <button
            onClick={() => onEdit(rule)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 6, borderRadius: 6 }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>edit</span>
          </button>
          <Popconfirm
            title="Delete this rule?"
            description="This cannot be undone."
            okText="Delete"
            okButtonProps={{ danger: true }}
            onConfirm={() => onDelete(rule.id)}
          >
            <button
              disabled={isDeleting}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#FCA5A5', padding: 6, borderRadius: 6 }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>
            </button>
          </Popconfirm>
        </div>
      </div>
    </div>
  );
}

// ── Region tab content (DnD list) ─────────────────────────────────────────────

function RegionTabContent({
  rules, onEdit, onDelete, onReorder, isDeleting,
}: {
  rules: RoutingRule[];
  onEdit: (rule: RoutingRule) => void;
  onDelete: (id: number) => void;
  onReorder: (newOrder: RoutingRule[]) => void;
  isDeleting: boolean;
}) {
  const sensors = useSensors(useSensor(PointerSensor));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = rules.findIndex(r => r.id === active.id);
    const newIndex = rules.findIndex(r => r.id === over.id);
    onReorder(arrayMove(rules, oldIndex, newIndex));
  }

  if (rules.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 0' }}>
        <span className="material-symbols-outlined" style={{ fontSize: 40, display: 'block', marginBottom: 12, color: '#E5E7EB' }}>rule</span>
        <Text type="secondary">No rules for this region — click Add Rule to create one.</Text>
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={rules.map(r => r.id)} strategy={verticalListSortingStrategy}>
        {rules.map((rule, i) => (
          <SortableRuleCard
            key={rule.id}
            rule={rule}
            index={i}
            onEdit={onEdit}
            onDelete={onDelete}
            isDeleting={isDeleting}
          />
        ))}
      </SortableContext>
    </DndContext>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

const TABS: { key: GroupKey; label: string; region: Region | null }[] = [
  { key: 'MY',     label: '🇲🇾 Malaysia',   region: Region.MY },
  { key: 'ID',     label: '🇮🇩 Indonesia',  region: Region.ID },
  { key: 'PH',     label: '🇵🇭 Philippines', region: Region.PH },
  { key: 'GLOBAL', label: '🌐 Global',       region: null },
];

export default function RoutingRules() {
  const [form] = Form.useForm<FormValues>();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<RoutingRule | null>(null);
  const [mode, setMode] = useState<RuleMode>('provider');
  const [activeTab, setActiveTab] = useState<GroupKey>('MY');
  const qc = useQueryClient();

  const { data: rules = [], isFetching } = useRoutingRules();
  const createMutation = useCreateRoutingRule();
  const updateMutation = useUpdateRoutingRule();
  const deleteMutation = useDeleteRoutingRule();
  const isSaving = createMutation.isPending || updateMutation.isPending;

  const grouped: Record<GroupKey, RoutingRule[]> = {
    MY:     [...rules].filter(r => r.region === 'MY').sort((a, b) => a.priority - b.priority),
    ID:     [...rules].filter(r => r.region === 'ID').sort((a, b) => a.priority - b.priority),
    PH:     [...rules].filter(r => r.region === 'PH').sort((a, b) => a.priority - b.priority),
    GLOBAL: [...rules].filter(r => r.region === null).sort((a, b) => a.priority - b.priority),
  };

  function openCreate() {
    setEditing(null);
    setMode('provider');
    form.resetFields();
    form.setFieldsValue({
      enabled: true,
      mode: 'provider',
      region: activeTab === 'GLOBAL' ? undefined : activeTab as Region,
    });
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
      const groupKey: GroupKey = values.region ? (values.region as GroupKey) : 'GLOBAL';
      const priority = editing ? editing.priority : (grouped[groupKey]?.length ?? 0) + 1;
      const req = toRequest(values, priority);

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

  function handleReorder(region: Region | null, newOrder: RoutingRule[]) {
    // Optimistic update
    qc.setQueryData<RoutingRule[]>(['routing-rules'], (old = []) => {
      const others = old.filter(r => r.region !== region);
      const reordered = newOrder.map((rule, i) => ({ ...rule, priority: i + 1 }));
      return [...others, ...reordered];
    });

    // Fire parallel PUTs for rules whose priority changed
    const updates = newOrder
      .map((rule, i) => ({ rule, newPriority: i + 1 }))
      .filter(({ rule, newPriority }) => rule.priority !== newPriority);

    if (updates.length === 0) return;

    Promise.all(
      updates.map(({ rule, newPriority }) =>
        routingRuleService.update(rule.id, toRequest(ruleToForm(rule), newPriority))
      )
    ).catch(() => {
      qc.invalidateQueries({ queryKey: ['routing-rules'] });
      message.error('Failed to save order — please try again');
    });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#1C1C1E', margin: 0 }}>Routing Rules</h1>
          <p style={{ color: '#6B7280', fontSize: 14, marginTop: 4 }}>
            Drag rows to set priority within each region. First matching enabled rule wins.
          </p>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={openCreate}
          loading={isFetching}
          style={{
            background: 'linear-gradient(180deg, #FCB900 0%, #e0a400 100%)',
            border: 'none', color: '#261900', fontWeight: 600, borderRadius: 10,
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
          Rules are evaluated top-to-bottom. Drag the{' '}
          <HolderOutlined style={{ fontSize: 12 }} />{' '}
          handle to reorder. Route to a <strong>Provider</strong> for a hard override,
          or a <strong>Strategy</strong> to let the engine decide.
        </span>
      </div>

      {/* Region tabs */}
      <div style={{ background: '#FFFFFF', borderRadius: 16, boxShadow: '0 4px 40px -12px rgba(80,69,50,0.08)', overflow: 'hidden' }}>
        <Tabs
          activeKey={activeTab}
          onChange={(k) => setActiveTab(k as GroupKey)}
          style={{ padding: '0 24px' }}
          items={TABS.map(tab => ({
            key: tab.key,
            label: (
              <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                {tab.label}
                <span style={{
                  background: 'rgba(252,185,0,0.15)', color: '#7B5800',
                  borderRadius: 999, padding: '0 8px', fontSize: 11, fontWeight: 700,
                }}>
                  {grouped[tab.key].length}
                </span>
              </span>
            ),
            children: (
              <div style={{ padding: '8px 0 24px' }}>
                <RegionTabContent
                  rules={grouped[tab.key]}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                  onReorder={(newOrder) => handleReorder(tab.region, newOrder)}
                  isDeleting={deleteMutation.isPending}
                />
              </div>
            ),
          }))}
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
            <Form.Item name="region" label="Region">
              <Select allowClear placeholder="Any region (Global)"
                options={Object.values(Region).map(r => ({ value: r, label: r }))} />
            </Form.Item>
            <Form.Item name="enabled" label="Status" valuePropName="checked">
              <Switch checkedChildren="Active" unCheckedChildren="Off" />
            </Form.Item>
            <Form.Item name="currency" label="Currency">
              <Select allowClear placeholder="Any currency"
                options={Object.values(Currency).map(c => ({ value: c, label: c }))} />
            </Form.Item>
            <div />
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
            <Form.Item name="preferredProvider" label="Provider" rules={[{ required: true, message: 'Select a provider' }]}>
              <Select placeholder="Select provider"
                options={Object.values(Provider).map(p => ({ value: p, label: p }))} />
            </Form.Item>
          )}

          {mode === 'strategy' && (
            <Form.Item name="strategy" label="Strategy" rules={[{ required: true, message: 'Select a strategy' }]}>
              <Select placeholder="Select strategy"
                options={Object.values(RoutingStrategy).map(s => ({ value: s, label: STRATEGY_LABELS[s] }))} />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  );
}
