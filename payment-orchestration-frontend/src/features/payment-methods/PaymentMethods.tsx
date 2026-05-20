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
import PageHeader from '../../shared/components/PageHeader';
import TableCard from '../../shared/components/TableCard';
import styles from './PaymentMethods.module.css';

const REGION_COLOR: Record<string, { color: string; bg: string }> = {
  MY: { color: '#7B5800', bg: 'rgba(252, 185, 0, 0.12)' },
  ID: { color: '#065F46', bg: 'rgba(6, 95, 70, 0.08)' },
  PH: { color: '#6B21A8', bg: 'rgba(107, 33, 168, 0.08)' },
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
        /* bg/color are region-driven — inline justified */
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
      render: (v: string) => <span className={styles.cellCode}>{v}</span>,
    },
    {
      title: 'Display Name',
      dataIndex: 'name',
      render: (v: string) => <span className={styles.cellName}>{v}</span>,
    },
    {
      title: 'Status',
      dataIndex: 'active',
      width: 90,
      render: (v: boolean) => (
        <span className={`${styles.statusBadge} ${v ? styles.statusActive : styles.statusOff}`}>
          {v ? 'Active' : 'Off'}
        </span>
      ),
    },
    {
      title: '',
      key: 'actions',
      width: 100,
      render: (_: unknown, row: PaymentMethodConfig) => (
        <div className={styles.actionBtns}>
          <button className={styles.actionBtn} onClick={() => openEdit(row)}>
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
            <button className={`${styles.actionBtn} ${styles.deleteBtn}`}>
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>
            </button>
          </Popconfirm>
        </div>
      ),
    },
  ];

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className={styles.page}>
      <PageHeader
        title="Payment Methods"
        subtitle="Manage available payment methods per region. Disable a method to remove it from routing without deleting it."
        actions={
          <button className={styles.addBtn} onClick={openCreate}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>
            Add Method
          </button>
        }
      />

      <div className={styles.summaryRow}>
        {REGIONS.map(region => {
          const rows = grouped[region] ?? [];
          const active = rows.filter(r => r.active).length;
          const s = REGION_COLOR[region] ?? { color: '#6B7280', bg: '#F3F4F6' };
          return (
            <div key={region} className={styles.summaryChip}>
              {/* dot color is region-driven — inline justified */}
              <div className={styles.summaryDot} style={{ background: s.color }} />
              <span className={styles.summaryName}>{region}</span>
              <span className={styles.summaryCount}>{active}/{rows.length} active</span>
            </div>
          );
        })}
      </div>

      <TableCard>
        <Table<PaymentMethodConfig>
          columns={columns}
          dataSource={methods}
          rowKey={r => `${r.region}-${r.code}`}
          loading={isFetching}
          pagination={false}
          scroll={{ x: 600 }}
        />
      </TableCard>

      <Modal
        open={!!modal}
        onCancel={() => setModal(null)}
        onOk={handleSave}
        confirmLoading={isPending}
        okText={modal?.mode === 'create' ? 'Create' : 'Save'}
        title={
          <div>
            <div className={styles.modalTitle}>
              {modal?.mode === 'create' ? 'Add Payment Method' : 'Edit Payment Method'}
            </div>
            {modal?.mode === 'edit' && modal.row && (
              <div className={styles.modalSubtitle}>
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
        <Form form={form} layout="vertical" requiredMark={false} className={styles.modalForm}>
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
