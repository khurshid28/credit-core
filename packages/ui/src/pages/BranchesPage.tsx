import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building, Plus } from '../lib/icons';
import { api } from '@credit-core/api-client';
import type { BranchDto } from '@credit-core/shared';
import { Button, Card, Field, Input } from '../components/primitives';
import { DataTable, type Column } from '../components/DataTable';

export function BranchesPage() {
  const qc = useQueryClient();
  const { data: branches } = useQuery({ queryKey: ['branches'], queryFn: () => api.branches() });
  const [b, setB] = useState({ name: '', symbol: '', region: '' });

  const create = useMutation({
    mutationFn: () => api.createBranch({ name: b.name, symbol: b.symbol, region: b.region || undefined }),
    onSuccess: () => { setB({ name: '', symbol: '', region: '' }); qc.invalidateQueries({ queryKey: ['branches'] }); },
  });

  const columns: Column<BranchDto>[] = [
    { key: 'name', header: 'Filial', render: (x) => <span className="font-medium">{x.name}</span> },
    { key: 'symbol', header: 'Simvol', render: (x) => <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700">{x.symbol}</span> },
    { key: 'region', header: 'Hudud', render: (x) => x.region ?? '—' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy-800 text-white"><Building className="h-5 w-5" /></span>
        <div>
          <h1 className="text-2xl font-bold">Filiallar</h1>
          <p className="text-sm text-muted">Tarmoq filiallari va simvollari</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <DataTable columns={columns} rows={branches ?? []} searchable searchFields={['name', 'symbol', 'region']} empty="Filial yo‘q" />
        </div>
        <Card className="space-y-3">
          <h2 className="font-semibold">Yangi filial</h2>
          <Field label="Nomi" required><Input value={b.name} onChange={(e) => setB({ ...b, name: e.target.value })} placeholder="Toshkent filiali" /></Field>
          <Field label="Simvol" required><Input value={b.symbol} onChange={(e) => setB({ ...b, symbol: e.target.value.toUpperCase() })} placeholder="TK" /></Field>
          <Field label="Hudud"><Input value={b.region} onChange={(e) => setB({ ...b, region: e.target.value })} /></Field>
          <Button className="w-full" loading={create.isPending} disabled={!b.name || !b.symbol} onClick={() => create.mutate()}>
            {!create.isPending && <Plus className="h-4 w-4" />} Qo‘shish
          </Button>
        </Card>
      </div>
    </div>
  );
}
