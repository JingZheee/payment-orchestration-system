import React, { useState } from 'react';
import {
  Button, Form, InputNumber, Modal, Popconfirm, Select, Switch, Tabs, message,
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
import PageHeader from '../../shared/components/PageHeader';
import TableCard from '../../shared/components/TableCard';
import InfoBanner from '../../shared/components/InfoBanner';
import EmptyState from '../../shared/components/EmptyState';
import { PROVIDER_TEXT_COLOR } from '../../shared/constants/providerStyles';
import styles from './RoutingRules.module.css';

const STRATEGY_LABELS: Record<RoutingStrategy, string> = {
  [RoutingStrategy.REGION_BASED]:    'Region-Based',
  [RoutingStrategy.LOWEST_FEE]:      'Lowest Fee',
  [RoutingStrategy.SUCCESS_RATE]:    'Success Rate',
  [RoutingStrategy.COMPOSITE_SCORE]: 'Composite Score',
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

  // transform + transition are runtime DnD values — must stay inline
  const dndStyle: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    position: 'relative',
    zIndex: isDragging ? 10 : undefined,
  };

  const providerColor = rule.preferredProvider
    ? (PROVIDER_TEXT_COLOR[rule.preferredProvider] ?? '#6B7280')
    : undefined;

  return (
    <div ref={setNodeRef} style={dndStyle}>
      <div className={`${styles.ruleCard} ${isDragging ? styles.ruleCardDragging : ''}`}>

        <div {...attributes} {...listeners} className={styles.dragHandle}>
          <HolderOutlined style={{ fontSize: 16 }} />
        </div>

        <div className={styles.priorityBadge}>{index + 1}</div>

        <div className={styles.ruleFields}>
          <div className={styles.fieldGroupCurrency}>
            <div className={styles.fieldLabel}>Currency</div>
            {rule.currency
              ? <span className={styles.fieldValue}>{rule.currency}</span>
              : <span className={styles.fieldMuted}>Any</span>}
          </div>

          <div className={styles.fieldGroupRange}>
            <div className={styles.fieldLabel}>Amount Range</div>
            {rule.minAmount != null || rule.maxAmount != null
              ? <span className={styles.fieldRange}>
                  {rule.minAmount != null ? Number(rule.minAmount).toLocaleString() : '0'}
                  {' – '}
                  {rule.maxAmount != null ? Number(rule.maxAmount).toLocaleString() : '∞'}
                </span>
              : <span className={styles.fieldMuted}>Any</span>}
          </div>

          <div className={styles.fieldGroupRouteTo}>
            <div className={styles.fieldLabel}>Route To</div>
            {rule.preferredProvider ? (
              // color is data-driven per provider — inline justified
              <div className={styles.routeTo}>
                <span className="material-symbols-outlined" style={{ fontSize: 13, color: providerColor }}>account_balance</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: providerColor }}>{rule.preferredProvider}</span>
              </div>
            ) : rule.strategy ? (
              <div className={styles.routeTo}>
                <span className={`material-symbols-outlined ${styles.strategyIcon}`}>auto_awesome</span>
                <span className={styles.strategyText}>{STRATEGY_LABELS[rule.strategy]}</span>
              </div>
            ) : (
              <span className={styles.fieldMuted}>—</span>
            )}
          </div>
        </div>

        <span className={`${styles.statusBadge} ${rule.enabled ? styles.statusActive : styles.statusOff}`}>
          {rule.enabled ? 'Active' : 'Off'}
        </span>

        <div className={styles.actions}>
          <button className={styles.actionBtn} onClick={() => onEdit(rule)}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>edit</span>
          </button>
          <Popconfirm
            title="Delete this rule?"
            description="This cannot be undone."
            okText="Delete"
            okButtonProps={{ danger: true }}
            onConfirm={() => onDelete(rule.id)}
          >
            <button className={styles.deleteBtn} disabled={isDeleting}>
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
    return <EmptyState icon="rule" message="No rules for this region — click Add Rule to create one." />;
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
  { key: 'MY',     label: '🇲🇾 Malaysia',    region: Region.MY },
  { key: 'ID',     label: '🇮🇩 Indonesia',   region: Region.ID },
  { key: 'PH',     label: '🇵🇭 Philippines', region: Region.PH },
  { key: 'GLOBAL', label: '🌐 Global',        region: null },
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
      // validation errors shown inline by antd Form
    }
  }

  async function handleDelete(id: number) {
    await deleteMutation.mutateAsync(id);
    message.success('Rule deleted');
  }

  function handleReorder(region: Region | null, newOrder: RoutingRule[]) {
    qc.setQueryData<RoutingRule[]>(['routing-rules'], (old = []) => {
      const others = old.filter(r => r.region !== region);
      const reordered = newOrder.map((rule, i) => ({ ...rule, priority: i + 1 }));
      return [...others, ...reordered];
    });

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
    <div className={styles.page}>
      <PageHeader
        title="Routing Rules"
        subtitle="Drag rows to set priority within each region. First matching enabled rule wins."
        actions={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={openCreate}
            loading={isFetching}
            style={{
              background: 'linear-gradient(180deg, #FCB900 0%, #e0a400 100%)',
              border: 'none', color: '#261900', fontWeight: 600,
            }}
          >
            Add Rule
          </Button>
        }
      />

      <InfoBanner>
        Rules are evaluated top-to-bottom. Drag the <HolderOutlined style={{ fontSize: 12 }} /> handle
        to reorder. Route to a <strong>Provider</strong> for a hard override,
        or a <strong>Strategy</strong> to let the engine decide.
      </InfoBanner>

      <TableCard>
        <Tabs
          activeKey={activeTab}
          onChange={(k) => setActiveTab(k as GroupKey)}
          className={styles.tabsInner}
          items={TABS.map(tab => ({
            key: tab.key,
            label: (
              <span className={styles.tabLabel}>
                {tab.label}
                <span className={styles.tabCount}>{grouped[tab.key].length}</span>
              </span>
            ),
            children: (
              <div className={styles.tabPanel}>
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
      </TableCard>

      <Modal
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSave}
        confirmLoading={isSaving}
        okText={editing ? 'Save changes' : 'Create rule'}
        title={<span className={styles.modalTitle}>{editing ? 'Edit Routing Rule' : 'New Routing Rule'}</span>}
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
          <div className={styles.formGrid}>
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
