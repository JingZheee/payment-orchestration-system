import { useState } from 'react';
import { Table, Modal, Form, InputNumber, Select, Checkbox, Tag, message, Popconfirm, Button } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useFeeRates, useCreateFeeRate, useUpdateFeeRate, useDeleteFeeRate } from './hooks/useFeeRates';
import { usePaymentMethods } from '../payment-methods/hooks/usePaymentMethods';
import type { FeeRate, FeeRateCreateRequest, FeeRateUpdateRequest } from '../../shared/types/feeRate';
import { FeeType, Provider, Region } from '../../shared/types/enums';
import type { Provider as ProviderType } from '../../shared/types/enums';
import PageHeader from '../../shared/components/PageHeader';
import TableCard from '../../shared/components/TableCard';
import ProviderBadge from '../../shared/components/ProviderBadge';
import InfoBanner from '../../shared/components/InfoBanner';
import { PROVIDER_BADGE_CONFIG } from '../../shared/constants/providerStyles';
import styles from './FeeRates.module.css';

const FEE_TYPE_LABEL: Record<FeeType, string> = {
  [FeeType.FIXED]:                 'Fixed',
  [FeeType.PERCENTAGE]:            'Percentage',
  [FeeType.FIXED_PLUS_PERCENTAGE]: 'Fixed + %',
};

// Providers that are locked to a single region
const PROVIDER_REGION: Partial<Record<Provider, Region>> = {
  [Provider.BILLPLZ]:  Region.MY,
  [Provider.MIDTRANS]: Region.ID,
  [Provider.PAYMONGO]: Region.PH,
};

function formatFee(rate: FeeRate): string {
  const parts: string[] = [];
  if (rate.fixedAmount != null && Number(rate.fixedAmount) > 0)
    parts.push(`${rate.currency} ${Number(rate.fixedAmount).toFixed(2)}`);
  if (rate.percentage != null && Number(rate.percentage) > 0)
    parts.push(`${(Number(rate.percentage) * 100).toFixed(3)}%`);
  return parts.length ? parts.join(' + ') : '—';
}

export default function FeeRates() {
  const [editForm] = Form.useForm<FeeRateUpdateRequest>();
  const [createForm] = Form.useForm<FeeRateCreateRequest>();
  const [editing, setEditing] = useState<FeeRate | null>(null);
  const [creating, setCreating] = useState(false);

  // Watched create-form values for conditional rendering
  const selectedProvider = Form.useWatch('provider', createForm) as Provider | undefined;
  const selectedRegion   = Form.useWatch('region',   createForm) as Region   | undefined;
  const selectedFeeType  = Form.useWatch('feeType',  createForm) as FeeType  | undefined;

  const { data: rates = [], isFetching } = useFeeRates();
  const { data: allMethods = [] }        = usePaymentMethods();
  const createMutation = useCreateFeeRate();
  const updateMutation = useUpdateFeeRate();
  const deleteMutation = useDeleteFeeRate();

  // Payment methods filtered to the selected region in the create form
  const methodOptions = allMethods
    .filter(m => !selectedRegion || m.region === selectedRegion)
    .map(m => ({ value: m.code, label: `${m.code} — ${m.name}` }));

  function openEdit(rate: FeeRate) {
    setEditing(rate);
    editForm.setFieldsValue({
      fixedAmount: rate.fixedAmount != null ? Number(rate.fixedAmount) : undefined,
      percentage:  rate.percentage  != null ? Number(rate.percentage) * 100 : undefined,
    });
  }

  function openCreate() {
    createForm.resetFields();
    setCreating(true);
  }

  function handleProviderChange(provider: Provider) {
    const lockedRegion = PROVIDER_REGION[provider];
    if (lockedRegion) {
      createForm.setFieldValue('region', lockedRegion);
    } else {
      createForm.setFieldValue('region', undefined);
    }
    createForm.setFieldValue('paymentMethod', undefined);
  }

  function handleRegionChange() {
    createForm.setFieldValue('paymentMethod', undefined);
  }

  async function handleEditSave() {
    if (!editing) return;
    const values = await editForm.validateFields();
    const req: FeeRateUpdateRequest = {
      fixedAmount: values.fixedAmount,
      percentage:  values.percentage != null ? values.percentage / 100 : undefined,
    };
    await updateMutation.mutateAsync({ id: editing.id, req });
    message.success('Fee rate updated');
    setEditing(null);
  }

  async function handleCreateSave() {
    const values = await createForm.validateFields();
    const req: FeeRateCreateRequest = {
      provider:      values.provider,
      region:        values.region,
      paymentMethod: values.paymentMethod,
      feeType:       values.feeType,
      fixedAmount:   values.fixedAmount,
      percentage:    values.percentage != null ? values.percentage / 100 : undefined,
      active:        values.active ?? true,
    };
    await createMutation.mutateAsync(req);
    message.success('Fee rate created');
    setCreating(false);
  }

  async function handleDelete(id: number) {
    await deleteMutation.mutateAsync(id);
    message.success('Fee rate deleted');
  }

  const grouped = rates.reduce<Record<string, FeeRate[]>>((acc, r) => {
    (acc[r.provider] ??= []).push(r);
    return acc;
  }, {});

  const columns: ColumnsType<FeeRate> = [
    {
      title: 'Provider',
      dataIndex: 'provider',
      width: 140,
      render: (v: ProviderType) => <ProviderBadge provider={v} />,
    },
    {
      title: 'Region',
      dataIndex: 'region',
      width: 90,
      render: (v: string) => <Tag className={styles.regionTag}>{v}</Tag>,
    },
    {
      title: 'Payment Method',
      dataIndex: 'paymentMethod',
      width: 160,
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
      width: 130,
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
      render: (_: unknown, row: FeeRate) => (
        <div className={styles.actionGroup}>
          <button className={styles.actionBtn} onClick={() => openEdit(row)}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>edit</span>
          </button>
          <Popconfirm
            title="Delete this fee rate?"
            description="This cannot be undone."
            okText="Delete"
            okButtonProps={{ danger: true }}
            onConfirm={() => handleDelete(row.id)}
          >
            <button className={`${styles.actionBtn} ${styles.actionBtnDanger}`}>
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>
            </button>
          </Popconfirm>
        </div>
      ),
    },
  ];

  const okButtonStyle = {
    background: 'linear-gradient(180deg, #FCB900 0%, #e0a400 100%)',
    border: 'none', color: '#261900', fontWeight: 600,
  };

  return (
    <div className={styles.page}>
      <PageHeader
        title="Fee Rates"
        subtitle="Configure interchange fees per provider, region, and payment method."
        actions={
          <Button onClick={openCreate} type="primary" style={okButtonStyle}>
            Add Rate
          </Button>
        }
      />

      {/* Summary chips */}
      <div className={styles.summaryRow}>
        {Object.entries(grouped).map(([provider, rows]) => {
          const dotColor = PROVIDER_BADGE_CONFIG[provider]?.color ?? '#6B7280';
          return (
            <div key={provider} className={styles.summaryChip}>
              <div className={styles.summaryDot} style={{ background: dotColor }} />
              <span className={styles.summaryName}>{provider}</span>
              <span className={styles.summaryCount}>{rows.length} rate{rows.length !== 1 ? 's' : ''}</span>
            </div>
          );
        })}
      </div>

      <TableCard>
        <Table<FeeRate>
          columns={columns}
          dataSource={rates}
          rowKey="id"
          loading={isFetching}
          pagination={false}
          scroll={{ x: 1000 }}
        />
      </TableCard>

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
              options={Object.values(Provider).map(p => ({ value: p, label: p }))}
            />
          </Form.Item>

          <Form.Item name="region" label="Region" rules={[{ required: true }]}>
            <Select
              placeholder="Select region"
              disabled={!!selectedProvider && !!PROVIDER_REGION[selectedProvider]}
              onChange={handleRegionChange}
              options={Object.values(Region).map(r => ({ value: r, label: r }))}
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
