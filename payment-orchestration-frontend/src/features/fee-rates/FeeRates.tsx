import { useState, useEffect } from 'react';
import { Table, Modal, Form, InputNumber, Select, Checkbox, Switch, Tag, message, Popconfirm, Button, Tabs } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useFeeRates, useCreateFeeRate, useUpdateFeeRate, useDeleteFeeRate } from './hooks/useFeeRates';
import { usePaymentMethods } from '../payment-methods/hooks/usePaymentMethods';
import { useProviderSummaries } from '../providers/hooks/useProviders';
import type { FeeRate, FeeRateCreateRequest, FeeRateUpdateRequest } from '../../shared/types/feeRate';
import { FeeType, Provider, Region } from '../../shared/types/enums';
import PageHeader from '../../shared/components/PageHeader';
import { isAdmin } from '../../lib/role';
import TableCard from '../../shared/components/TableCard';
import InfoBanner from '../../shared/components/InfoBanner';
import styles from './FeeRates.module.css';

const FEE_TYPE_LABEL: Record<FeeType, string> = {
  [FeeType.FIXED]:                 'Fixed',
  [FeeType.PERCENTAGE]:            'Percentage',
  [FeeType.FIXED_PLUS_PERCENTAGE]: 'Fixed + %',
};

function formatFee(rate: FeeRate): string {
  const parts: string[] = [];
  if (rate.fixedAmount != null && Number(rate.fixedAmount) > 0)
    parts.push(`${rate.currency} ${Number(rate.fixedAmount).toFixed(2)}`);
  if (rate.percentage != null && Number(rate.percentage) > 0)
    parts.push(`${(Number(rate.percentage) * 100).toFixed(3)}%`);
  return parts.length ? parts.join(' + ') : '—';
}

const okButtonStyle = {
  background: 'linear-gradient(180deg, #FCB900 0%, #e0a400 100%)',
  border: 'none', color: '#261900', fontWeight: 600,
};

export default function FeeRates() {
  const [editForm] = Form.useForm<FeeRateUpdateRequest>();
  const [createForm] = Form.useForm<FeeRateCreateRequest>();
  const [editing, setEditing]   = useState<FeeRate | null>(null);
  const [creating, setCreating] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('');

  const selectedProvider = Form.useWatch('provider', createForm) as Provider | undefined;
  const selectedRegion   = Form.useWatch('region',   createForm) as Region   | undefined;
  const selectedFeeType  = Form.useWatch('feeType',  createForm) as FeeType  | undefined;

  const { data: rates = [], isFetching } = useFeeRates();
  const { data: allMethods = [] }        = usePaymentMethods();
  const { data: providerSummaries = [] } = useProviderSummaries();

  // Default to first provider tab once summaries load
  useEffect(() => {
    if (providerSummaries.length > 0 && !activeTab) {
      setActiveTab(providerSummaries[0].provider);
    }
  }, [providerSummaries, activeTab]);

  // Provider → supported regions (ProviderRegionSupport is the single source of truth via the summary API)
  const providerRegions = Object.fromEntries(
    providerSummaries.map(s => [s.provider, s.regions as Region[]])
  ) as Partial<Record<Provider, Region[]>>;

  const createMutation = useCreateFeeRate();
  const updateMutation = useUpdateFeeRate();
  const deleteMutation = useDeleteFeeRate();

  const regionOptions = (selectedProvider && providerRegions[selectedProvider]
    ? providerRegions[selectedProvider]!
    : Object.values(Region)
  ).map(r => ({ value: r, label: r }));

  const lockedRegion = selectedProvider && providerRegions[selectedProvider]?.length === 1
    ? providerRegions[selectedProvider]![0]
    : undefined;

  const usedMethods = new Set(
    rates
      .filter(r => r.provider === selectedProvider && r.region === selectedRegion)
      .map(r => r.paymentMethod),
  );
  const methodOptions = allMethods
    .filter(m => !selectedRegion || m.region === selectedRegion)
    .filter(m => !usedMethods.has(m.code))
    .map(m => ({ value: m.code, label: `${m.code} — ${m.name}` }));

  function openEdit(rate: FeeRate) {
    setEditing(rate);
    editForm.setFieldsValue({
      fixedAmount: rate.fixedAmount != null ? Number(rate.fixedAmount) : undefined,
      percentage:  rate.percentage  != null ? Number(rate.percentage) * 100 : undefined,
      active:      rate.active,
    });
  }

  function openCreate() {
    createForm.resetFields();
    if (activeTab) {
      const provider = activeTab as Provider;
      createForm.setFieldValue('provider', provider);
      handleProviderChange(provider);
    }
    setCreating(true);
  }

  function handleProviderChange(provider: Provider) {
    const supportedRegions = providerRegions[provider];
    createForm.setFieldValue('region', supportedRegions?.length === 1 ? supportedRegions[0] : undefined);
    createForm.setFieldValue('paymentMethod', undefined);
  }

  function handleRegionChange() {
    createForm.setFieldValue('paymentMethod', undefined);
  }

  async function handleEditSave() {
    if (!editing) return;
    const values = await editForm.validateFields();
    await updateMutation.mutateAsync({
      id: editing.id,
      req: {
        fixedAmount: values.fixedAmount,
        percentage:  values.percentage != null ? values.percentage / 100 : undefined,
        active:      values.active,
      },
    });
    message.success('Fee rate updated');
    setEditing(null);
  }

  async function handleCreateSave() {
    const values = await createForm.validateFields();
    await createMutation.mutateAsync({
      provider:      values.provider,
      region:        values.region,
      paymentMethod: values.paymentMethod,
      feeType:       values.feeType,
      fixedAmount:   values.fixedAmount,
      percentage:    values.percentage != null ? values.percentage / 100 : undefined,
      active:        values.active ?? true,
    });
    message.success('Fee rate created');
    setCreating(false);
  }

  async function handleDelete(id: number) {
    await deleteMutation.mutateAsync(id);
    message.success('Fee rate deleted');
  }

  // Provider column omitted — redundant inside a per-provider tab
  const columns: ColumnsType<FeeRate> = [
    {
      title: 'Region',
      dataIndex: 'region',
      width: 80,
      render: (v: string) => <Tag className={styles.regionTag}>{v}</Tag>,
    },
    {
      title: 'Payment Method',
      dataIndex: 'paymentMethod',
      width: 180,
      render: (v: string) => <span className={styles.cellMethod}>{v.replace(/_/g, ' ')}</span>,
    },
    {
      title: 'Fee Type',
      dataIndex: 'feeType',
      width: 150,
      render: (v: FeeType) => (
        <span className={`${styles.feeTypeBadge} ${v === FeeType.FIXED_PLUS_PERCENTAGE ? styles.feeTypeHighlight : ''}`}>
          {FEE_TYPE_LABEL[v]}
        </span>
      ),
    },
    {
      title: 'Fixed Amount',
      dataIndex: 'fixedAmount',
      width: 140,
      render: (v: number | null, row) => v != null && Number(v) > 0
        ? <span className={styles.cellAmount}>{row.currency} {Number(v).toFixed(2)}</span>
        : <span className={styles.cellMuted}>—</span>,
    },
    {
      title: 'Percentage',
      dataIndex: 'percentage',
      width: 110,
      render: (v: number | null) => v != null && Number(v) > 0
        ? <span className={styles.cellAmount}>{(Number(v) * 100).toFixed(3)}%</span>
        : <span className={styles.cellMuted}>—</span>,
    },
    {
      title: 'Effective Fee',
      width: 170,
      render: (_: unknown, row: FeeRate) => (
        <span className={styles.cellFee}>{formatFee(row)}</span>
      ),
    },
    {
      title: 'Active',
      dataIndex: 'active',
      width: 80,
      render: (v: boolean) => (
        <span className={`${styles.statusBadge} ${v ? styles.statusActive : styles.statusOff}`}>
          {v ? 'Active' : 'Off'}
        </span>
      ),
    },
    {
      title: '',
      key: 'action',
      width: 88,
      render: (_: unknown, row: FeeRate) => isAdmin() ? (
        <div className={styles.actionGroup}>
          <button className={styles.actionBtn} onClick={() => openEdit(row)}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>edit</span>
          </button>
          <Popconfirm
            title="Deactivate this fee rate?"
            description="The rate will be disabled. You can re-enable it by editing."
            okText="Deactivate"
            okButtonProps={{ danger: true }}
            onConfirm={() => handleDelete(row.id)}
          >
            <button className={`${styles.actionBtn} ${styles.actionBtnDanger}`} title="Deactivate">
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>do_not_disturb_on</span>
            </button>
          </Popconfirm>
        </div>
      ) : null,
    },
  ];

  const tabItems = providerSummaries.map(s => {
    const providerRates = rates.filter(r => r.provider === s.provider);
    return {
      key: s.provider,
      label: (
        <span className={styles.tabLabel}>
          {s.label}
          <span className={styles.tabCount}>{providerRates.length}</span>
        </span>
      ),
      children: (
        <TableCard>
          <Table<FeeRate>
            columns={columns}
            dataSource={providerRates}
            rowKey="id"
            loading={isFetching}
            pagination={false}
            scroll={{ x: 900 }}
          />
        </TableCard>
      ),
    };
  });

  return (
    <div className={styles.page}>
      <PageHeader
        title="Fee Rates"
        subtitle="Configure interchange fees per provider, region, and payment method."
      />

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
        tabBarExtraContent={{
          right: isAdmin() ? (
            <Button onClick={openCreate} type="primary" style={okButtonStyle}>
              Add Rate
            </Button>
          ) : undefined,
        }}
      />

      {/* ── Edit modal ── */}
      <Modal
        open={!!editing}
        onCancel={() => setEditing(null)}
        onOk={handleEditSave}
        confirmLoading={updateMutation.isPending}
        okText="Save"
        title={
          editing && (
            <div>
              <div className={styles.modalTitle}>Edit Fee Rate</div>
              <div className={styles.modalSubtitle}>
                {editing.provider} · {editing.region} · {editing.paymentMethod.replace(/_/g, ' ')}
              </div>
            </div>
          )
        }
        okButtonProps={{ style: okButtonStyle }}
        destroyOnHidden
      >
        {editing && (
          <div style={{ marginTop: 8 }}>
            <div style={{ marginBottom: 20 }}>
              <InfoBanner variant="subtle">
                Fee type is <strong>{FEE_TYPE_LABEL[editing.feeType]}</strong> — only applicable fields apply.
              </InfoBanner>
            </div>
            <Form form={editForm} layout="vertical" requiredMark={false}>
              {editing.feeType !== FeeType.PERCENTAGE && (
                <Form.Item name="fixedAmount" label={`Fixed Amount (${editing.currency})`}>
                  <InputNumber min={0} step={0.01} precision={2} style={{ width: '100%' }} placeholder="e.g. 1.00" />
                </Form.Item>
              )}
              {editing.feeType !== FeeType.FIXED && (
                <Form.Item name="percentage" label="Percentage (%)" help="Enter as a percentage, e.g. 1.5 for 1.5%">
                  <InputNumber min={0} max={100} step={0.001} precision={3} style={{ width: '100%' }} placeholder="e.g. 1.500" />
                </Form.Item>
              )}
              <Form.Item name="active" label="Status" valuePropName="checked">
                <Switch checkedChildren="Active" unCheckedChildren="Off" />
              </Form.Item>
            </Form>
          </div>
        )}
      </Modal>

      {/* ── Create modal ── */}
      <Modal
        open={creating}
        onCancel={() => setCreating(false)}
        onOk={handleCreateSave}
        confirmLoading={createMutation.isPending}
        okText="Create"
        title={<div className={styles.modalTitle}>Add Fee Rate</div>}
        okButtonProps={{ style: okButtonStyle }}
        destroyOnHidden
        width={480}
      >
        <Form form={createForm} layout="vertical" requiredMark={false} style={{ marginTop: 12 }}>
          <Form.Item name="provider" label="Provider" rules={[{ required: true }]}>
            <Select
              placeholder="Select provider"
              onChange={handleProviderChange}
              options={providerSummaries.map(s => ({ value: s.provider, label: s.label }))}
            />
          </Form.Item>

          <Form.Item name="region" label="Region" rules={[{ required: true }]}>
            <Select
              placeholder={selectedProvider ? 'Select region' : 'Select provider first'}
              disabled={!selectedProvider || !!lockedRegion}
              onChange={handleRegionChange}
              options={regionOptions}
            />
          </Form.Item>

          <Form.Item name="paymentMethod" label="Payment Method" rules={[{ required: true }]}>
            <Select
              placeholder={selectedRegion ? 'Select method' : 'Select region first'}
              disabled={!selectedRegion}
              options={methodOptions}
              showSearch
              filterOption={(input, opt) =>
                (opt?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
            />
          </Form.Item>

          <Form.Item name="feeType" label="Fee Type" rules={[{ required: true }]}>
            <Select
              placeholder="Select fee type"
              options={Object.values(FeeType).map(t => ({ value: t, label: FEE_TYPE_LABEL[t] }))}
            />
          </Form.Item>

          {selectedFeeType !== FeeType.PERCENTAGE && (
            <Form.Item
              name="fixedAmount"
              label="Fixed Amount"
              rules={selectedFeeType === FeeType.FIXED || selectedFeeType === FeeType.FIXED_PLUS_PERCENTAGE
                ? [{ required: true }] : []}
            >
              <InputNumber min={0} step={0.01} precision={2} style={{ width: '100%' }} placeholder="e.g. 1.00" />
            </Form.Item>
          )}

          {selectedFeeType !== FeeType.FIXED && (
            <Form.Item
              name="percentage"
              label="Percentage (%)"
              help="Enter as a percentage, e.g. 1.5 for 1.5%"
              rules={selectedFeeType === FeeType.PERCENTAGE || selectedFeeType === FeeType.FIXED_PLUS_PERCENTAGE
                ? [{ required: true }] : []}
            >
              <InputNumber min={0} max={100} step={0.001} precision={3} style={{ width: '100%' }} placeholder="e.g. 1.500" />
            </Form.Item>
          )}

          <Form.Item name="active" valuePropName="checked" initialValue={true}>
            <Checkbox>Active</Checkbox>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
