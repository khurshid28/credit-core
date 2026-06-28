import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Messages, House, Car } from '../lib/icons';
import { api } from '@credit-core/api-client';
import { ProductType } from '@credit-core/shared';
import { Card, Skeleton } from '../components/primitives';
import { CaseChat } from '../components/CaseChat';
import { cn } from '../lib/cn';

export function ChatsPage() {
  const { data: cases, isLoading } = useQuery({ queryKey: ['cases'], queryFn: () => api.cases(false) });
  const [active, setActive] = useState<string | null>(null);
  const selected = cases?.find((c) => c.id === active) ?? cases?.[0];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-700 text-white"><Messages className="h-5 w-5" /></span>
        <div>
          <h1 className="text-2xl font-bold">Chatlar</h1>
          <p className="text-sm text-muted">Ariza bo‘yicha hamkasblar bilan muloqot</p>
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-96" />
      ) : !cases?.length ? (
        <Card className="py-16 text-center text-slate-400">Ariza yo‘q</Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="space-y-1 p-2 lg:col-span-1">
            {cases.map((c) => {
              const on = (selected?.id ?? '') === c.id;
              return (
                <button key={c.id} onClick={() => setActive(c.id)}
                  className={cn('flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition', on ? 'bg-brand-50' : 'hover:bg-slate-50')}>
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white ${c.productType === ProductType.AUTO ? 'bg-warning-600' : 'bg-brand-700'}`}>
                    {c.productType === ProductType.AUTO ? <Car className="h-4 w-4" /> : <House className="h-4 w-4" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{c.number}</span>
                    <span className="block truncate text-xs text-muted">{c.borrowerName ?? '—'}</span>
                  </span>
                </button>
              );
            })}
          </Card>
          <Card className="lg:col-span-2">
            {selected ? (
              <>
                <div className="mb-3 border-b border-hairline pb-3">
                  <p className="font-semibold">{selected.number}</p>
                  <p className="text-xs text-muted">{selected.borrowerName ?? '—'}</p>
                </div>
                <CaseChat key={selected.id} caseId={selected.id} />
              </>
            ) : (
              <p className="py-16 text-center text-slate-400">Arizani tanlang</p>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
