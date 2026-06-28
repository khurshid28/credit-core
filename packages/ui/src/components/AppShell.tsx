import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Bell, LogOut, Menu, ShieldCheck, X } from '../lib/icons';
import { api } from '@credit-core/api-client';
import { ROLE_LABEL } from '@credit-core/shared';
import { useAuth } from '../lib/auth';
import { cn } from '../lib/cn';

export interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badgeKey?: 'unread';
}

export function AppShell({ title, nav, children }: { title: string; nav: NavItem[]; children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const { data: unread } = useQuery({ queryKey: ['unread'], queryFn: () => api.unreadCount(), refetchInterval: 20_000 });

  const current = nav.find((n) => n.to === location.pathname || (n.to !== '/' && location.pathname.startsWith(n.to)));

  const navList = (
    <nav className="space-y-1">
      {nav.map((item) => {
        const active = location.pathname === item.to || (item.to !== '/' && location.pathname.startsWith(item.to));
        const badge = item.badgeKey === 'unread' ? unread : 0;
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={() => setOpen(false)}
            className={cn(
              'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
              active ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-slate-100',
            )}
          >
            {active && <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r bg-brand-400" />}
            <item.icon className="h-[18px] w-[18px]" />
            <span className="flex-1">{item.label}</span>
            {!!badge && badge > 0 && (
              <span className="rounded-full bg-brand-500 px-1.5 text-[10px] font-semibold text-white">{badge > 99 ? '99+' : badge}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );

  const sidebar = (
    <div className="flex h-full flex-col bg-navy-900 p-4 text-white">
      <div className="mb-7 flex items-center gap-2.5 px-1">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/90">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-bold leading-tight">credit-core</p>
          <p className="text-xs text-slate-400">{user ? ROLE_LABEL[user.role] : ''}</p>
        </div>
      </div>
      {navList}
      <div className="mt-auto rounded-xl bg-white/5 p-3">
        <p className="truncate text-sm font-medium">{user?.fullName}</p>
        <p className="truncate text-xs text-slate-400">{user?.branch?.name ?? 'Markaziy apparat'}</p>
        <button onClick={logout} className="mt-2 flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-300 transition hover:bg-white/10 hover:text-white">
          <LogOut className="h-4 w-4" /> Chiqish
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-canvas">
      <aside className="hidden w-64 shrink-0 md:block">{sidebar}</aside>

      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-72">
            <button className="absolute right-3 top-4 z-10 text-slate-300" onClick={() => setOpen(false)}><X className="h-5 w-5" /></button>
            {sidebar}
          </aside>
        </div>
      )}

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-hairline bg-white/90 px-4 py-3 backdrop-blur md:px-8">
          <button className="text-slate-600 md:hidden" onClick={() => setOpen(true)} aria-label="Menyu"><Menu className="h-5 w-5" /></button>
          <h2 className="text-sm font-semibold text-ink">{current?.label ?? title}</h2>
          <div className="ml-auto flex items-center gap-4">
            <Link to="/notifications" className="relative text-slate-500 hover:text-ink">
              <Bell className="h-5 w-5" />
              {!!unread && unread > 0 && <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger-600 px-1 text-[10px] font-semibold text-white">{unread > 99 ? '99+' : unread}</span>}
            </Link>
            <div className="hidden items-center gap-2 sm:flex">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-navy-800 text-xs font-semibold text-white">
                {(user?.fullName ?? '?').slice(0, 1)}
              </div>
              <span className="text-sm text-slate-600">{user?.fullName}</span>
            </div>
          </div>
        </header>

        <div className="mx-auto w-full max-w-7xl flex-1 p-4 md:p-8">{children}</div>
      </main>
    </div>
  );
}
