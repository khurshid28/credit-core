import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { UserAdd } from '../lib/icons';
import { api } from '@credit-core/api-client';
import { Role, ROLE_LABEL } from '@credit-core/shared';
import { Button, Card, Field, Input } from '../components/primitives';
import { DataTable, type Column } from '../components/DataTable';

const ROLES: Role[] = [Role.OPERATOR, Role.MODERATOR, Role.DIRECTOR, Role.ADMIN];

interface UserRow { id: string; fullName: string; login: string; role: Role; isActive: boolean; branch?: { name: string } | null }

export function UsersPage() {
  const qc = useQueryClient();
  const { data: users } = useQuery({ queryKey: ['users'], queryFn: () => api.users() as Promise<UserRow[]> });
  const { data: branches } = useQuery({ queryKey: ['branches'], queryFn: () => api.branches() });
  const [u, setU] = useState({ fullName: '', login: '', password: '', role: Role.OPERATOR as Role, branchId: '' });

  const create = useMutation({
    mutationFn: () => api.createUser({ ...u, branchId: u.branchId || undefined }),
    onSuccess: () => { setU({ fullName: '', login: '', password: '', role: Role.OPERATOR, branchId: '' }); qc.invalidateQueries({ queryKey: ['users'] }); },
  });

  const columns: Column<UserRow>[] = [
    { key: 'fullName', header: 'F.I.O', render: (x) => <span className="font-medium">{x.fullName}</span> },
    { key: 'login', header: 'Login', render: (x) => <span className="text-muted">@{x.login}</span> },
    { key: 'role', header: 'Rol', render: (x) => <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">{ROLE_LABEL[x.role]}</span> },
    { key: 'branch', header: 'Filial', render: (x) => x.branch?.name ?? '—' },
    { key: 'isActive', header: 'Holat', render: (x) => x.isActive ? <span className="text-success-700">Faol</span> : <span className="text-slate-400">Nofaol</span> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy-800 text-white"><UserAdd className="h-5 w-5" /></span>
        <div>
          <h1 className="text-2xl font-bold">Foydalanuvchilar</h1>
          <p className="text-sm text-muted">Tizim foydalanuvchilari va rollari</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <DataTable columns={columns} rows={users ?? []} searchable searchFields={['fullName', 'login']} empty="Foydalanuvchi yo‘q" />
        </div>
        <Card className="space-y-3">
          <h2 className="font-semibold">Yangi foydalanuvchi</h2>
          <Field label="F.I.O" required><Input value={u.fullName} onChange={(e) => setU({ ...u, fullName: e.target.value })} /></Field>
          <Field label="Login" required><Input value={u.login} onChange={(e) => setU({ ...u, login: e.target.value })} /></Field>
          <Field label="Parol" required><Input type="password" value={u.password} onChange={(e) => setU({ ...u, password: e.target.value })} /></Field>
          <Field label="Rol">
            <select className="w-full rounded-xl border border-hairline px-3 py-2.5 text-sm" value={u.role} onChange={(e) => setU({ ...u, role: e.target.value as Role })}>
              {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
            </select>
          </Field>
          <Field label="Filial">
            <select className="w-full rounded-xl border border-hairline px-3 py-2.5 text-sm" value={u.branchId} onChange={(e) => setU({ ...u, branchId: e.target.value })}>
              <option value="">— markaziy —</option>
              {branches?.map((br) => <option key={br.id} value={br.id}>{br.name}</option>)}
            </select>
          </Field>
          <Button className="w-full" loading={create.isPending} disabled={!u.fullName || !u.login || u.password.length < 4} onClick={() => create.mutate()}>
            {!create.isPending && <UserAdd className="h-4 w-4" />} Qo‘shish
          </Button>
        </Card>
      </div>
    </div>
  );
}
