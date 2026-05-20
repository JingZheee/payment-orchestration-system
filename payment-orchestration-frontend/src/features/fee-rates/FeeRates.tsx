import { useState } from 'react';
import { Table, Modal, Form, InputNumber, Tag, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useFeeRates, useUpdateFeeRate } from './hooks/useFeeRates';
import type { FeeRate, FeeRateUpdateRequest } from '../../shared/types/feeRate';
import { FeeType } from '../../shared/types/enums';
import type { Provider } from '../../shared/types/enums';
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

function formatFee(rate: FeeRate): string {
  const parts: string[] = [];
  if (rate.fixedAmount != null && Number(rate.fixedAmount) > 0)
    parts.push(`${rate.currency} ${Number(rate.fixedAmount).toFixed(2)}`);
  if (rate.percentage != null && Number(rate.percentage) > 0)
    parts.push(`${(Number(rate.percentage) * 100).toFixed(3)}%`);
  return parts.length ? parts.join(' + ') : '—';
}

export default function FeeRates() {
  const [form] = Form.useForm<FeeRateUpdateRequest>();
  const [editing, setEditing] = useState<FeeRate | null>(null);

  const { data: rates = [], isFetching } = useFeeRates();
  const updateMutation = useUpdateFeeRate();

  function openEdit(rate: FeeRate) {
    setEditing(rate);
    form.setFieldsValue({
      fixedAmount: rate.fixedAmount != null ? Number(rate.fixedAmount) : undefined,
      percentage:  rate.percentage  != null ? Number(rate.percentage) * 100 : undefined,
    });
  }

  async function handleSave() {
    if (!editing) return;
    const values = await form.validateFields();
    const req: FeeRateUpdateRequest = {
      fixedAmount: values.fixedAmount,
      percentage:  values.percentage != null ? values.percentage / 100 : undefined,
    };
    await updateMutation.mutateAsync({ id: editing.id, req });
    message.success('Fee rate updated');
    setEditing(null);
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
      render: (v: Provider) => <ProviderBadge provider={v} />,
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
      width: 52,
      render: (_: unknown, row: FeeRate) => (
        <button className={styles.actionBtn} onClick={() => openEdit(row)}>
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>edit</span>
        </button>
      ),
    },
  ];

  return (
    <div className={styles.page}>
      <PageHeader
        title="Fee Rates"
        subtitle="Configure interchange fees per provider, region, and payment method."
      />

      {/* Summary chips */}
      <div className={styles.summaryRow}>
        {Object.entries(grouped).map(([provider, rows]) => {
          // dot color is data-driven per provider — inline justified
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

      <Modal
        open={!!editing}
        onCancel={() => setEditing(null)}
        onOk={handleSave}
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
        okButtonProps={{
          style: {
            background: 'linear-gradient(180deg, #FCB900 0%, #e0a400 100%)',
            border: 'none', color: '#261900', fontWeight: 600,
          },
        }}
        destroyOnHidden
      >
        {editing && (
          <div style={{ marginTop: 8 }}>
            <div style={{ marginBottom: 20 }}>
              <InfoBanner variant="subtle">
                Fee type is <strong>{FEE_TYPE_LABEL[editing.feeType]}</strong> — only applicable fields apply.
              </InfoBanner>
            </div>
            <Form form={form} layout="vertical" requiredMark={false}>
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
    </div>
  );
}
