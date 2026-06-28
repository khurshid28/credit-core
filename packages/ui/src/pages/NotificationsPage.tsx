import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Bell, FileText } from '../lib/icons';
import { api } from '@credit-core/api-client';
import { Role, ROLE_LABEL } from '@credit-core/shared';
import { Card, Skeleton } from '../components/primitives';
import { cn } from '../lib/cn';
import { surfaceInteractive } from '../lib/surfaces';

const roleTone: Record<Role, string> = {
  [Role.OPERATOR]: 'bg-brand-600',
  [Role.MODERATOR]: 'bg-warning-600',
  [Role.DIRECTOR]: 'bg-violet-600',
  [Role.ADMIN]: 'bg-navy-800',
};

const initials = (name: string) => name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

export function NotificationsPage() {
  const { data, isLoading } = useQuery({ queryKey: ['notifications'], queryFn: () => api.notifications(), refetchInterval: 15_000 });
  const unreadCount = data?.filter((n) => !n.read).length ?? 0;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-700 text-white"><Bell className="h-5 w-5" /></span>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Bildirishnomalar</h1>
          <p className="text-sm text-muted">Hamkasblardan kelgan xabarlar va fayllar</p>
        </div>
        {unreadCount > 0 && (
          <span className="rounded-full bg-brand-50 px-3 py-1 text-sm font-semibold text-brand-700 dark:bg-brand-600/15 dark:text-brand-300">
            {unreadCount} yangi
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>
      ) : !data?.length ? (
        <Card className="flex flex-col items-center gap-3 py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-300 dark:bg-white/5"><Bell className="h-7 w-7" /></span>
          <p className="text-slate-400">Hozircha bildirishnoma yo‘q</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {data.map((n) => (
            <Link
              key={n.id}
              to={`/cases/${n.caseId}`}
              className={cn(
                surfaceInteractive,
                'group relative flex items-start gap-3.5 overflow-hidden p-4',
                !n.read && 'border-brand-200 dark:border-brand-500/40',
              )}
            >
              {!n.read && <span className="absolute left-0 top-0 h-full w-1 bg-brand-500" />}
              <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white', roleTone[n.senderRole])}>
                {initials(n.senderName)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-semibold text-ink dark:text-slate-100">{n.senderName}</p>
                  <span className="shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-500 dark:bg-white/10 dark:text-slate-300">{ROLE_LABEL[n.senderRole]}</span>
                  <span className="ml-auto shrink-0 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700 dark:bg-brand-600/15 dark:text-brand-300">{n.caseNumber}</span>
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">
                  {n.toRole ? <span className="font-medium text-brand-700 dark:text-brand-300">→ {ROLE_LABEL[n.toRole]}: </span> : null}
                  {n.text ?? ''}
                </p>
                <div className="mt-1.5 flex items-center gap-3">
                  <p className="text-xs text-slate-400">{new Date(n.createdAt).toLocaleString('ru-RU')}</p>
                  {n.hasFile && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500 dark:bg-white/10 dark:text-slate-300">
                      <FileText className="h-3.5 w-3.5" /> fayl
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
