import { useState } from 'react';
import { Table, Modal, Form, Input, Select, Popconfirm, message, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useUsers, useCreateUser, useUpdateUserRole, useDeleteUser } from './hooks/useUsers';
import type { UserRecord } from '../../shared/types/user';
import { UserRole } from '../../shared/types/enums';
import PageHeader from '../../shared/components/PageHeader';
import { isAdmin } from '../../lib/role';
import TableCard from '../../shared/components/TableCard';
import styles from './Users.module.css';

const ROLE_STYLE: Record<UserRole, { color: string; bg: string; label: string }> = {
  [UserRole.ADMIN]:    { color: '#7B5800', bg: 'rgba(252,185,0,0.15)',   label: 'Admin' },
  [UserRole.VIEWER]:   { color: '#075985', bg: 'rgba(186,230,253,0.4)',  label: 'Viewer' },
  [UserRole.MERCHANT]: { color: '#166534', bg: 'rgba(134,239,172,0.3)', label: 'Merchant' },
};

const ROLE_OPTIONS = Object.values(UserRole).map(r => ({
  value: r,
  label: ROLE_STYLE[r].label,
}));

const okButtonStyle = {
  background: 'linear-gradient(180deg, #FCB900 0%, #e0a400 100%)',
  border: 'none', color: '#261900', fontWeight: 600,
};

type ModalMode = 'create' | 'editRole';

export default function Users() {
  const [form] = Form.useForm();
  const [modal, setModal] = useState<{ mode: ModalMode; row?: UserRecord } | null>(null);

  const { data: users = [], isFetching } = useUsers();
  const createMutation    = useCreateUser();
  const updateRoleMutation = useUpdateUserRole();
  const deleteMutation    = useDeleteUser();

  function openCreate() {
    form.resetFields();
    setModal({ mode: 'create' });
  }

  function openEditRole(row: UserRecord) {
    form.setFieldsValue({ role: row.role });
    setModal({ mode: 'editRole', row });
  }

  async function handleSave() {
    const values = await form.validateFields();
    if (modal?.mode === 'create') {
      await createMutation.mutateAsync({
        email:    values.email as string,
        password: values.password as string,
        role:     values.role as UserRole,
      });
      message.success('User created');
    } else if (modal?.mode === 'editRole' && modal.row) {
      await updateRoleMutation.mutateAsync({
        id:  modal.row.id,
        req: { role: values.role as UserRole },
      });
      message.success('Role updated');
    }
    setModal(null);
  }

  async function handleDelete(row: UserRecord) {
    await deleteMutation.mutateAsync(row.id);
    message.success(`${row.email} deleted`);
  }

  const columns: ColumnsType<UserRecord> = [
    {
      title: 'Email',
      dataIndex: 'email',
      render: (v: string) => <span className={styles.cellEmail}>{v}</span>,
    },
    {
      title: 'Role',
      dataIndex: 'role',
      width: 130,
      render: (v: UserRole) => {
        const s = ROLE_STYLE[v];
        return (
          <Tag style={{ background: s.bg, color: s.color, border: 'none', fontWeight: 600 }}>
            {s.label}
          </Tag>
        );
      },
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      width: 180,
      render: (v: string) => new Date(v).toLocaleDateString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric',
      }),
    },
    {
      title: '',
      key: 'actions',
      width: 100,
      render: (_: unknown, row: UserRecord) => isAdmin() ? (
        <div className={styles.actionBtns}>
          <button
            className={styles.actionBtn}
            title="Change role"
            onClick={() => openEditRole(row)}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>manage_accounts</span>
          </button>
          <Popconfirm
            title={`Delete ${row.email}?`}
            description="This action cannot be undone."
            onConfirm={() => handleDelete(row)}
            okText="Delete"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
          >
            <button className={`${styles.actionBtn} ${styles.deleteBtn}`} title="Delete user">
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>
            </button>
          </Popconfirm>
        </div>
      ) : null,
    },
  ];

  const isPending = createMutation.isPending || updateRoleMutation.isPending;

  return (
    <div className={styles.page}>
      <PageHeader
        title="Users"
        subtitle="Manage admin, viewer, and merchant accounts."
        actions={isAdmin() ? (
          <button className={styles.addBtn} onClick={openCreate}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>person_add</span>
            Add User
          </button>
        ) : undefined}
      />

      <TableCard>
        <Table<UserRecord>
          columns={columns}
          dataSource={users}
          rowKey="id"
          loading={isFetching}
          pagination={{ pageSize: 15, showSizeChanger: false }}
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
              {modal?.mode === 'create' ? 'Add User' : 'Change Role'}
            </div>
            {modal?.mode === 'editRole' && modal.row && (
              <div className={styles.modalSubtitle}>{modal.row.email}</div>
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
                name="email"
                label="Email"
                rules={[
                  { required: true, message: 'Required' },
                  { type: 'email', message: 'Enter a valid email' },
                ]}
              >
                <Input placeholder="user@example.com" />
              </Form.Item>
              <Form.Item
                name="password"
                label="Password"
                rules={[{ required: true, message: 'Required' }, { min: 8, message: 'Min 8 characters' }]}
              >
                <Input.Password placeholder="Min 8 characters" />
              </Form.Item>
            </>
          )}
          <Form.Item
            name="role"
            label="Role"
            rules={[{ required: true, message: 'Required' }]}
          >
            <Select placeholder="Select role" options={ROLE_OPTIONS} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
