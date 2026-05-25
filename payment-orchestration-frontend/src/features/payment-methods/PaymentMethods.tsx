import { useState } from 'react';
import { Table, Modal, Form, Input, Switch, Select, Popconfirm, message, Tabs } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  usePaymentMethods,
  useCreatePaymentMethod,
  useUpdatePaymentMethod,
  useDeletePaymentMethod,
} from './hooks/usePaymentMethods';
import type { PaymentMethodConfig } from '../../shared/types/paymentMethod';
import { Region } from '../../shared/types/enums';
import PageHeader from '../../shared/components/PageHeader';
import TableCard from '../../shared/components/TableCard';
import styles from './PaymentMethods.module.css';

const REGION_COLOR: Record<string, { color: string; bg: string }> = {
  MY: { color: '#7B5800', bg: 'rgba(252, 185, 0, 0.12)' },
  ID: { color: '#065F46', bg: 'rgba(6, 95, 70, 0.08)' },
  PH: { color: '#6B21A8', bg: 'rgba(107, 33, 168, 0.08)' },
};

const REGIONS = Object.values(Region);

const REGION_LABEL: Record<Region, string> = {
  [Region.MY]: 'Malaysia (MY)',
  [Region.ID]: 'Indonesia (ID)',
  [Region.PH]: 'Philippines (PH)',
};

type ModalMode = 'create' | 'edit';

const okButtonStyle = {
  background: 'linear-gradient(180deg, #FCB900 0%, #e0a400 100%)',
  border: 'none', color: '#261900', fontWeight: 600,
};

export default function PaymentMethods() {
  const [form] = Form.useForm();
  const [modal, setModal] = useState<{ mode: ModalMode; row?: PaymentMethodConfig } | null>(null);
  const [activeTab, setActiveTab] = useState<string>(Region.MY);

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
    form.setFieldValue('region', activeTab);
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
        code:   (values.code as string).toUpperCase(),
        region: values.region as string,
        name:   values.name as string,
      });
      message.success('Payment method created');
    } else if (modal?.mode === 'edit' && modal.row) {
      await updateMutation.mutateAsync({
        region: modal.row.region,
        code:   modal.row.code,
        req:    { name: values.name, active: values.active },
      });
      message.success('Payment method updated');
    }
    setModal(null);
  }

  async function handleDelete(row: PaymentMethodConfig) {
    await deleteMutation.mutateAsync({ region: row.region, code: row.code });
    message.success(`${row.code} deactivated`);
  }

  // Region column omitted — redundant inside a per-region tab
  const columns: ColumnsType<PaymentMethodConfig> = [
    {
      title: 'Code',
      dataIndex: 'code',
      width: 180,
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
            title={`Deactivate ${row.code}?`}
            description="The method will be disabled. You can re-enable it by editing."
            onConfirm={() => handleDelete(row)}
            okText="Deactivate"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
          >
            <button className={`${styles.actionBtn} ${styles.deleteBtn}`} title="Deactivate">
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>do_not_disturb_on</span>
            </button>
          </Popconfirm>
        </div>
      ),
    },
  ];

  const tabItems = REGIONS.map(region => {
    const rows  = grouped[region] ?? [];
    const active = rows.filter(r => r.active).length;
    const s = REGION_COLOR[region] ?? { color: '#6B7280', bg: '#F3F4F6' };
    return {
      key: region,
      label: (
        <span className={styles.tabLabel}>
          {REGION_LABEL[region as Region]}
          <span className={styles.tabCount} style={{ background: s.bg, color: s.color }}>
            {active}/{rows.length}
          </span>
        </span>
      ),
      children: (
        <TableCard>
          <Table<PaymentMethodConfig>
            columns={columns}
            dataSource={rows}
            rowKey={r => `${r.region}-${r.code}`}
            loading={isFetching}
            pagination={false}
            scroll={{ x: 500 }}
          />
        </TableCard>
      ),
    };
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className={styles.page}>
      <PageHeader
        title="Payment Methods"
        subtitle="Manage available payment methods per region. Disable a method to remove it from routing without deleting it."
      />

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
        tabBarExtraContent={{
          right: (
            <button className={styles.addBtn} onClick={openCreate}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>
              Add Method
            </button>
          ),
        }}
      />

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
        okButtonProps={{ style: okButtonStyle }}
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
                <Select
                  placeholder="Select region"
                  options={REGIONS.map(r => ({ value: r, label: REGION_LABEL[r] }))}
                />
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
