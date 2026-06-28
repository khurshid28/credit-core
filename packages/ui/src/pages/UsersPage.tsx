import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { UserAdd, Plus } from '../lib/icons';
import { api } from '@credit-core/api-client';
import { Role, ROLE_LABEL } from '@credit-core/shared';
import { Button, Field, Input, PasswordInput } from '../components/primitives';
import { Select } from '../components/forms';
import { Modal } from '../components/Modal';
import { useToast } from '../components/Toast';
import { DataTable, type Column } from '../components/DataTable';

const ROLES: Role[] = [Role.OPERATOR, Role.MODERATOR, Role.DIRECTOR, Role.ADMIN];
const empty = { fullName: '', login: '', password: '', role: Role.OPERATOR as Role, branchId: '' };

interface UserRow { id: string; fullName: string; login: string; role: Role; isActive: boolean; branch?: { name: string } | null }

export function UsersPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const { data: users } = useQuery({ queryKey: ['users'], queryFn: () => api.users() as Promise<UserRow[]> });
  const { data: branches } = useQuery({ queryKey: ['branches'], queryFn: () => api.branches() });
  const [u, setU] = useState(empty);

  const create = useMutation({
    mutationFn: () => api.createUser({ ...u, branchId: u.branchId || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      toast.success('Foydalanuvchi qo‘shildi', u.fullName);
      setU(empty);
      setOpen(false);
    },
    onError: () => toast.error('Xatolik', 'Foydalanuvchi qo‘shilmadi'),
  });

  const columns: Column<UserRow>[] = [
    { key: 'fullName', header: 'F.I.O', render: (x) => <span className="font-medium">{x.fullName}</span> },
    { key: 'login', header: 'Login', render: (x) => <span className="text-muted">@{x.login}</span> },
    { key: 'role', header: 'Rol', render: (x) => <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs dark:bg-white/10">{ROLE_LABEL[x.role]}</span> },
    { key: 'branch', header: 'Filial', render: (x) => x.branch?.name ?? '—' },
    { key: 'isActive', header: 'Holat', render: (x) => x.isActive ? <span className="text-success-700">Faol</span> : <span className="text-slate-400">Nofaol</span> },
  ];

  const invalid = !u.fullName || !u.login || u.password.length < 4;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy-800 text-white"><UserAdd className="h-5 w-5" /></span>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Foydalanuvchilar</h1>
          <p className="text-sm text-muted">Tizim foydalanuvchilari va rollari</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Yangi foydalanuvchi</Button>
      </div>

      <DataTable columns={columns} rows={users ?? []} searchable searchFields={['fullName', 'login']} empty="Foydalanuvchi yo‘q" />

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Yangi foydalanuvchi"
        description="Tizimga yangi xodim qo‘shish"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>Bekor qilish</Button>
            <Button loading={create.isPending} disabled={invalid} onClick={() => create.mutate()}>
              {!create.isPending && <UserAdd className="h-4 w-4" />} Qo‘shish
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="F.I.O" required><Input value={u.fullName} onChange={(e) => setU({ ...u, fullName: e.target.value })} autoFocus /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Login" required><Input value={u.login} onChange={(e) => setU({ ...u, login: e.target.value })} /></Field>
            <Field label="Parol" required hint="kamida 4 belgi"><PasswordInput value={u.password} onChange={(e) => setU({ ...u, password: e.target.value })} /></Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Rol">
              <Select value={u.role} onChange={(v) => setU({ ...u, role: v })} options={ROLES.map((r) => ({ value: r, label: ROLE_LABEL[r] }))} />
            </Field>
            <Field label="Filial">
              <Select<string> value={u.branchId} onChange={(v) => setU({ ...u, branchId: v })} placeholder="— markaziy —"
                options={[{ value: '', label: '— markaziy —' }, ...(branches ?? []).map((br) => ({ value: br.id, label: br.name }))]} />
            </Field>
          </div>
        </div>
      </Modal>
    </div>
  );
}
