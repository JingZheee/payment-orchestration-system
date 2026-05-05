import { useState } from 'react';
import { Table, Modal, Form, Input, Switch, Select, Tag, Popconfirm, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  usePaymentMethods,
  useCreatePaymentMethod,
  useUpdatePaymentMethod,
  useDeletePaymentMethod,
} from './hooks/usePaymentMethods';
import type { PaymentMethodConfig } from '../../shared/types/paymentMethod';

const REGION_COLOR: Record<string, { color: string; bg: string }> = {
  MY: { color: '#7B5800', bg: 'rgba(252,185,0,0.12)' },
  ID: { color: '#065F46', bg: 'rgba(6,95,70,0.08)' },
  PH: { color: '#6B21A8', bg: 'rgba(107,33,168,0.08)' },
};

const REGIONS = ['MY', 'ID', 'PH'];

type ModalMode = 'create' | 'edit';

export default function PaymentMethods() {
  const [form] = Form.useForm();
  const [modal, setModal] = useState<{ mode: ModalMode; row?: PaymentMethodConfig } | null>(null);

  const { data: methods = [], isFetching } = usePaymentMethods();
  const createMutation = useCreatePaymentMethod();
  const updateMutation = useUpdatePaymentMethod();
  const deleteMutation = useDeletePaymentMethod();

  // Group by region for summary chips
  const grouped = methods.reduce<Record<string, PaymentMethodConfig[]>>((acc, m) => {
    (acc[m.region] ??= []).push(m);
    return acc;
  }, {});

  function openCreate() {
    form.resetFields();
    setModal({ mode: 'create' });
  }

  function openEdit(row: PaymentMethodConfig) {
    form.setFieldsValue({ name: row.name, active: row.active });
    setModal({ mode: 'edit', row });
  }

  async function handleSave() {
    const values = await form.validateFields();

    if (modal?.mode === 'create') {
      await createMutation.mutateAsync({
        code: (values.code as string).toUpperCase(),
        region: values.region as string,
        name: values.name as string,
      });
      message.success('Payment method created');
    } else if (modal?.mode === 'edit' && modal.row) {
      await updateMutation.mutateAsync({
        region: modal.row.region,
        code: modal.row.code,
        req: { name: values.name, active: values.active },
      });
      message.success('Payment method updated');
    }
    setModal(null);
  }

  async function handleDelete(row: PaymentMethodConfig) {
    try {
      await deleteMutation.mutateAsync({ region: row.region, code: row.code });
      message.success(`${row.code} (${row.region}) deleted`);
    } catch {
      message.error('Cannot delete — referenced by existing transactions or fee rates');
    }
  }

  const columns: ColumnsType<PaymentMethodConfig> = [
    {
      title: 'Region',
      dataIndex: 'region',
      width: 90,
      render: (v: string) => {
        const s = REGION_COLOR[v] ?? { color: '#6B7280', bg: '#F3F4F6' };
        return (
          <Tag style={{ borderRadius: 6, fontWeight: 700, fontSize: 11, background: s.bg, color: s.color, border: 'none' }}>
            {v}
          </Tag>
        );
      },
    },
    {
      title: 'Code',
      dataIndex: 'code',
      width: 160,
      render: (v: string) => (
        <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 600, color: '#1C1C1E' }}>{v}</span>
      ),
    },
    {
      title: 'Display Name',
      dataIndex: 'name',
      render: (v: string) => <span style={{ fontSize: 13, color: '#504532' }}>{v}</span>,
    },
    {
      title: 'Status',
      dataIndex: 'active',
      width: 90,
      render: (v: boolean) => (
        <span style={{
          display: 'inline-block', padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600,
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
      width: 100,
      render: (_: unknown, row: PaymentMethodConfig) => (
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            onClick={() => openEdit(row)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 6, borderRadius: 6 }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>edit</span>
          </button>
          <Popconfirm
            title={`Delete ${row.code} (${row.region})?`}
            description="This will fail if any transactions or fee rates reference this method."
            onConfirm={() => handleDelete(row)}
            okText="Delete"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
          >
            <button
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 6, borderRadius: 6 }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>
            </button>
          </Popconfirm>
        </div>
      ),
    },
  ];

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#1C1C1E', margin: 0 }}>Payment Methods</h1>
          <p style={{ color: '#6B7280', fontSize: 14, marginTop: 4 }}>
            Manage available payment methods per region. Disable a method to remove it from routing without deleting it.
          </p>
        </div>
        <button
          onClick={openCreate}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'linear-gradient(180deg, #FCB900 0%, #e0a400 100%)',
            color: '#261900', fontWeight: 600, border: 'none',
            borderRadius: 10, padding: '10px 20px', cursor: 'pointer',
            fontSize: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>
          Add Method
        </button>
      </div>

      {/* Region summary chips */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {REGIONS.map(region => {
          const rows = grouped[region] ?? [];
          const active = rows.filter(r => r.active).length;
          const s = REGION_COLOR[region] ?? { color: '#6B7280', bg: '#F3F4F6' };
          return (
            <div key={region} style={{
              background: '#FFFFFF', borderRadius: 12, padding: '12px 20px',
              boxShadow: '0 2px 16px -4px rgba(80,69,50,0.08)',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: '#1C1C1E' }}>{region}</span>
              <span style={{ fontSize: 12, color: '#9CA3AF' }}>
                {active}/{rows.length} active
              </span>
            </div>
          );
        })}
      </div>

      {/* Table */}
      <div style={{ background: '#FFFFFF', borderRadius: 16, boxShadow: '0 4px 40px -12px rgba(80,69,50,0.08)', overflow: 'hidden' }}>
        <Table<PaymentMethodConfig>
          columns={columns}
          dataSource={methods}
          rowKey={r => `${r.region}-${r.code}`}
          loading={isFetching}
          pagination={false}
          scroll={{ x: 600 }}
        />
      </div>

      {/* Create / Edit Modal */}
      <Modal
        open={!!modal}
        onCancel={() => setModal(null)}
        onOk={handleSave}
        confirmLoading={isPending}
        okText={modal?.mode === 'create' ? 'Create' : 'Save'}
        title={
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#1C1C1E' }}>
              {modal?.mode === 'create' ? 'Add Payment Method' : 'Edit Payment Method'}
            </div>
            {modal?.mode === 'edit' && modal.row && (
              <div style={{ fontSize: 12, color: '#6B7280', fontWeight: 400, marginTop: 2 }}>
                {modal.row.code} · {modal.row.region}
              </div>
            )}
          </div>
        }
        okButtonProps={{
          style: {
            background: 'linear-gradient(180deg, #FCB900 0%, #e0a400 100%)',
            border: 'none', color: '#261900', fontWeight: 600,
          },
        }}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" requiredMark={false} style={{ marginTop: 16 }}>
          {modal?.mode === 'create' && (
            <>
              <Form.Item
                name="code"
                label="Method Code"
                rules={[{ required: true, message: 'Required' }]}
                help="Uppercase identifier, e.g. PAYNOW, DUITNOW"
              >
                <Input placeholder="e.g. PAYNOW" style={{ textTransform: 'uppercase' }} />
              </Form.Item>
              <Form.Item
                name="region"
                label="Region"
                rules={[{ required: true, message: 'Required' }]}
              >
                <Select placeholder="Select region">
                  {REGIONS.map(r => <Select.Option key={r} value={r}>{r}</Select.Option>)}
                </Select>
              </Form.Item>
            </>
          )}
          <Form.Item
            name="name"
            label="Display Name"
            rules={[{ required: true, message: 'Required' }]}
          >
            <Input placeholder="e.g. PayNow Bank Transfer" />
          </Form.Item>
          {modal?.mode === 'edit' && (
            <Form.Item name="active" label="Status" valuePropName="checked">
              <Switch checkedChildren="Active" unCheckedChildren="Off" />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  );
}
