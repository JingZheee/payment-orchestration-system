import { useState } from 'react';
import { Table, Modal, Form, InputNumber, message, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useFeeRates, useUpdateFeeRate } from './hooks/useFeeRates';
import type { FeeRate, FeeRateUpdateRequest } from '../../shared/types/feeRate';
import { FeeType } from '../../shared/types/enums';

const PROVIDER_COLOR: Record<string, { color: string; bg: string }> = {
  BILLPLZ:  { color: '#7B5800', bg: 'rgba(252,185,0,0.12)' },
  MIDTRANS: { color: '#065F46', bg: 'rgba(6,95,70,0.08)' },
  PAYMONGO: { color: '#6B21A8', bg: 'rgba(107,33,168,0.08)' },
  MOCK:     { color: '#374151', bg: 'rgba(55,65,81,0.06)' },
};

const FEE_TYPE_LABEL: Record<FeeType, string> = {
  [FeeType.FIXED]:                'Fixed',
  [FeeType.PERCENTAGE]:           'Percentage',
  [FeeType.FIXED_PLUS_PERCENTAGE]:'Fixed + %',
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

  // Group rows by provider for visual separation
  const grouped = rates.reduce<Record<string, FeeRate[]>>((acc, r) => {
    (acc[r.provider] ??= []).push(r);
    return acc;
  }, {});

  const columns: ColumnsType<FeeRate> = [
    {
      title: 'Provider',
      dataIndex: 'provider',
      width: 140,
      render: (v: string) => {
        const s = PROVIDER_COLOR[v] ?? { color: '#6B7280', bg: '#F3F4F6' };
        return (
          <span style={{
            display: 'inline-block', padding: '3px 10px', borderRadius: 999,
            fontSize: 12, fontWeight: 700, background: s.bg, color: s.color,
          }}>
            {v}
          </span>
        );
      },
    },
    {
      title: 'Region',
      dataIndex: 'region',
      width: 90,
      render: (v: string) => (
        <Tag style={{ borderRadius: 6, fontWeight: 600, fontSize: 11 }}>{v}</Tag>
      ),
    },
    {
      title: 'Payment Method',
      dataIndex: 'paymentMethod',
      width: 160,
      render: (v: string) => (
        <span style={{ fontSize: 13, color: '#504532', fontWeight: 500 }}>
          {v.replace(/_/g, ' ')}
        </span>
      ),
    },
    {
      title: 'Fee Type',
      dataIndex: 'feeType',
      width: 150,
      render: (v: FeeType) => (
        <span style={{
          display: 'inline-block', padding: '2px 10px', borderRadius: 6,
          fontSize: 12, fontWeight: 600,
          background: v === FeeType.FIXED_PLUS_PERCENTAGE ? 'rgba(252,185,0,0.12)' : '#F0EDEB',
          color: v === FeeType.FIXED_PLUS_PERCENTAGE ? '#7B5800' : '#504532',
        }}>
          {FEE_TYPE_LABEL[v]}
        </span>
      ),
    },
    {
      title: 'Fixed Amount',
      dataIndex: 'fixedAmount',
      width: 130,
      render: (v: number | null, row) => v != null && Number(v) > 0
        ? <span style={{ fontWeight: 600, fontSize: 13, color: '#1C1C1E' }}>{row.currency} {Number(v).toFixed(2)}</span>
        : <span style={{ color: '#D1D5DB' }}>—</span>,
    },
    {
      title: 'Percentage',
      dataIndex: 'percentage',
      width: 110,
      render: (v: number | null) => v != null && Number(v) > 0
        ? <span style={{ fontWeight: 600, fontSize: 13, color: '#1C1C1E' }}>{(Number(v) * 100).toFixed(3)}%</span>
        : <span style={{ color: '#D1D5DB' }}>—</span>,
    },
    {
      title: 'Effective Fee',
      width: 170,
      render: (_: unknown, row: FeeRate) => (
        <span style={{ fontSize: 13, fontWeight: 700, color: '#7B5800' }}>
          {formatFee(row)}
        </span>
      ),
    },
    {
      title: 'Active',
      dataIndex: 'active',
      width: 80,
      render: (v: boolean) => (
        <span style={{
          display: 'inline-block', padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600,
          background: v ? '#DCFCE7' : '#F3F4F6',
          color: v ? '#166534' : '#6B7280',
        }}>
          {v ? 'Active' : 'Off'}
        </span>
      ),
    },
    {
      title: '',
      key: 'action',
      width: 52,
      render: (_: unknown, row: FeeRate) => (
        <button
          onClick={() => openEdit(row)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 6, borderRadius: 6 }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>edit</span>
        </button>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: '#1C1C1E', margin: 0 }}>Fee Rates</h1>
        <p style={{ color: '#6B7280', fontSize: 14, marginTop: 4 }}>
          Configure interchange fees per provider, region, and payment method.
        </p>
      </div>

      {/* Summary chips */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {Object.entries(grouped).map(([provider, rows]) => {
          const s = PROVIDER_COLOR[provider] ?? { color: '#6B7280', bg: '#F3F4F6' };
          return (
            <div key={provider} style={{
              background: '#FFFFFF', borderRadius: 12, padding: '12px 20px',
              boxShadow: '0 2px 16px -4px rgba(80,69,50,0.08)',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%', background: s.color, flexShrink: 0,
              }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: '#1C1C1E' }}>{provider}</span>
              <span style={{ fontSize: 12, color: '#9CA3AF' }}>{rows.length} rate{rows.length !== 1 ? 's' : ''}</span>
            </div>
          );
        })}
      </div>

      {/* Table */}
      <div style={{ background: '#FFFFFF', borderRadius: 16, boxShadow: '0 4px 40px -12px rgba(80,69,50,0.08)', overflow: 'hidden' }}>
        <Table<FeeRate>
          columns={columns}
          dataSource={rates}
          rowKey="id"
          loading={isFetching}
          pagination={false}
          scroll={{ x: 1000 }}
        />
      </div>

      {/* Edit modal */}
      <Modal
        open={!!editing}
        onCancel={() => setEditing(null)}
        onOk={handleSave}
        confirmLoading={updateMutation.isPending}
        okText="Save"
        title={
          editing && (
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#1C1C1E' }}>Edit Fee Rate</div>
              <div style={{ fontSize: 12, color: '#6B7280', fontWeight: 400, marginTop: 2 }}>
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
            <div style={{
              background: '#F6F3F5', borderRadius: 10, padding: '10px 14px',
              marginBottom: 20, fontSize: 12, color: '#504532',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>info</span>
              Fee type is <strong>{FEE_TYPE_LABEL[editing.feeType]}</strong> — only applicable fields apply.
            </div>

            <Form form={form} layout="vertical" requiredMark={false}>
              {editing.feeType !== FeeType.PERCENTAGE && (
                <Form.Item name="fixedAmount" label={`Fixed Amount (${editing.currency})`}>
                  <InputNumber
                    min={0} step={0.01} precision={2}
                    style={{ width: '100%' }}
                    placeholder="e.g. 1.00"
                  />
                </Form.Item>
              )}
              {editing.feeType !== FeeType.FIXED && (
                <Form.Item
                  name="percentage"
                  label="Percentage (%)"
                  help="Enter as a percentage, e.g. 1.5 for 1.5%"
                >
                  <InputNumber
                    min={0} max={100} step={0.001} precision={3}
                    style={{ width: '100%' }}
                    placeholder="e.g. 1.500"
                  />
                </Form.Item>
              )}
            </Form>
          </div>
        )}
      </Modal>
    </div>
  );
}
