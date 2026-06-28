import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Banknote, FileCheck2, Landmark, Layers } from 'lucide-react';
import { api } from '@credit-core/api-client';
import { CaseStatus, STATUS_LABEL } from '@credit-core/shared';
import { Card, Skeleton, StatusBadge } from '../components/primitives';
import { formatMoney } from '../lib/cn';

const statusColor: Record<CaseStatus, string> = {
  [CaseStatus.DRAFT]: 'bg-slate-400',
  [CaseStatus.MODERATION]: 'bg-warning-600',
  [CaseStatus.DIRECTOR_REVIEW]: 'bg-violet-500',
  [CaseStatus.ADMIN_FINALIZE]: 'bg-brand-600',
  [CaseStatus.FINALIZED]: 'bg-success-600',
  [CaseStatus.REJECTED]: 'bg-danger-600',
};

function StatCard({ icon: Icon, label, value, tone }: { icon: any; label: string; value: string; tone: string }) {
  return (
    <Card className="flex items-center gap-4">
      <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${tone}`}>
        <Icon className="h-6 w-6 text-white" />
      </div>
      <div>
        <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
        <p className="nums text-xl font-bold text-ink">{value}</p>
      </div>
    </Card>
  );
}

function Bars({ data }: { data: { label: string; count: number; color?: string }[] }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div className="space-y-3">
      {data.map((d) => (
        <div key={d.label} className="flex items-center gap-3">
          <span className="w-40 shrink-0 truncate text-sm text-slate-600">{d.label}</span>
          <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-100">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(d.count / max) * 100}%` }}
              transition={{ duration: 0.5 }}
              className={`h-full rounded-full ${d.color ?? 'bg-brand-600'}`}
            />
          </div>
          <span className="nums w-8 text-right text-sm font-semibold">{d.count}</span>
        </div>
      ))}
    </div>
  );
}

export function AnalyticsPage() {
  const { data, isLoading } = useQuery({ queryKey: ['stats'], queryFn: () => api.stats() });

  if (isLoading || !data) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Monitoring va tahlil</h1>
        <p className="text-sm text-slate-500">Ishlar bo‘yicha umumiy ko‘rsatkichlar</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Layers} label="Jami ishlar" value={String(data.totalCases)} tone="bg-brand-600" />
        <StatCard icon={FileCheck2} label="Yakunlangan" value={String(data.finalizedCount)} tone="bg-success-600" />
        <StatCard icon={Banknote} label="Jami summa" value={formatMoney(data.totalAmount)} tone="bg-navy-800" />
        <StatCard icon={Landmark} label="Jami KATM" value={formatMoney(data.totalKatm)} tone="bg-warning-600" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 font-semibold">Holat bo‘yicha</h2>
          <Bars
            data={data.byStatus.map((s) => ({
              label: STATUS_LABEL[s.status],
              count: s.count,
              color: statusColor[s.status],
            }))}
          />
        </Card>
        <Card>
          <h2 className="mb-4 font-semibold">Filial bo‘yicha</h2>
          {data.byBranch.length ? (
            <Bars data={data.byBranch.map((b) => ({ label: b.branch, count: b.count }))} />
          ) : (
            <p className="text-sm text-slate-400">Ma'lumot yo‘q</p>
          )}
        </Card>
      </div>

      <Card>
        <h2 className="mb-3 font-semibold">So‘nggi ishlar</h2>
        <div className="space-y-2">
          {data.recent.map((c) => (
            <Link
              key={c.id}
              to={`/cases/${c.id}`}
              className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2 hover:border-brand-200"
            >
              <span className="text-sm font-medium">{c.number} <span className="text-slate-400">· {c.borrowerName ?? '—'}</span></span>
              <span className="flex items-center gap-3">
                <span className="nums text-sm">{formatMoney(c.amount)}</span>
                <StatusBadge status={c.status} />
              </span>
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}
