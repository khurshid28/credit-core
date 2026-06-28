import React, { useEffect, useRef, useState } from 'react';
import { Calendar, ChevronDown, ArrowRight } from '../lib/icons';
import { cn } from '../lib/cn';

function useClickOutside<T extends HTMLElement>(onClose: () => void) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [onClose]);
  return ref;
}

const fieldBase =
  'flex w-full items-center rounded-xl border border-hairline bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition focus-within:border-brand-400 focus-within:ring-4 focus-within:ring-brand-100 dark:bg-navy-800 dark:border-white/10 dark:text-slate-100';
const popoverCls = 'border-hairline bg-white shadow-pop dark:bg-navy-800 dark:border-white/10 dark:text-slate-100';

/** Money input — masks the value with thousand separators as you type. */
export function MoneyInput({
  value, onChange, placeholder, suffix = "so'm",
}: { value: number | null; onChange: (n: number | null) => void; placeholder?: string; suffix?: string }) {
  const display = value == null ? '' : new Intl.NumberFormat('ru-RU').format(value);
  return (
    <div className={cn(fieldBase, 'pr-2')}>
      <input
        inputMode="numeric"
        value={display}
        placeholder={placeholder ?? '0'}
        onChange={(e) => {
          const raw = e.target.value.replace(/[^\d]/g, '');
          onChange(raw === '' ? null : Number(raw));
        }}
        className="nums w-full bg-transparent outline-none placeholder:text-slate-400"
      />
      <span className="ml-2 shrink-0 text-xs font-medium text-muted">{suffix}</span>
    </div>
  );
}

export interface Option<T extends string> { value: T; label: string; icon?: React.ComponentType<{ className?: string }> }

/** Custom styled dropdown (replaces the unstyled native <select>). */
export function Select<T extends string>({
  value, onChange, options, placeholder = 'Tanlang',
}: { value: T | ''; onChange: (v: T) => void; options: Option<T>[]; placeholder?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useClickOutside<HTMLDivElement>(() => setOpen(false));
  const sel = options.find((o) => o.value === value);
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} className={cn(fieldBase, 'justify-between text-left')}>
        <span className={cn('flex items-center gap-2 truncate', !sel && 'text-slate-400')}>
          {sel?.icon && <sel.icon className="h-4 w-4" />}
          {sel ? sel.label : placeholder}
        </span>
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-slate-400 transition', open && 'rotate-180')} />
      </button>
      {open && (
        <div className={cn('absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-xl border p-1', popoverCls)}>
          {options.map((o) => (
            <button key={o.value} type="button" onClick={() => { onChange(o.value); setOpen(false); }}
              className={cn('flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition hover:bg-brand-50', o.value === value && 'bg-brand-50 font-medium text-brand-700')}>
              {o.icon && <o.icon className="h-4 w-4" />}
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const MONTHS = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'];
const WD = ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'];

/** Custom date picker with a calendar popover (replaces native date input). */
export function DatePicker({ value, onChange, placeholder = 'kk.oo.yyyy' }: { value: string | null; onChange: (iso: string | null) => void; placeholder?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useClickOutside<HTMLDivElement>(() => setOpen(false));
  const sel = value ? new Date(value) : null;
  const [view, setView] = useState(() => (sel ? new Date(sel.getFullYear(), sel.getMonth(), 1) : new Date(2026, 5, 1)));

  const y = view.getFullYear(), m = view.getMonth();
  const firstDow = (new Date(y, m, 1).getDay() + 6) % 7; // Monday-first
  const days = new Date(y, m + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(firstDow).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  const fmt = (d: Date) => `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} className={cn(fieldBase, 'justify-between text-left')}>
        <span className={cn('nums', !sel && 'text-slate-400')}>{sel ? fmt(sel) : placeholder}</span>
        <Calendar className="h-4 w-4 shrink-0 text-slate-400" />
      </button>
      {open && (
        <div className={cn('absolute z-50 mt-1 w-72 rounded-xl border p-3', popoverCls)}>
          <div className="mb-2 flex items-center justify-between">
            <button type="button" className="rounded-lg p-1.5 hover:bg-slate-100" onClick={() => setView(new Date(y, m - 1, 1))}><ArrowRight className="h-4 w-4 rotate-180" /></button>
            <span className="text-sm font-semibold">{MONTHS[m]} {y}</span>
            <button type="button" className="rounded-lg p-1.5 hover:bg-slate-100" onClick={() => setView(new Date(y, m + 1, 1))}><ArrowRight className="h-4 w-4" /></button>
          </div>
          <div className="mb-1 grid grid-cols-7 text-center text-[11px] font-medium text-slate-400">{WD.map((w) => <span key={w}>{w}</span>)}</div>
          <div className="grid grid-cols-7 gap-0.5">
            {cells.map((d, i) => {
              if (d == null) return <span key={i} />;
              const date = new Date(y, m, d);
              const active = sel && date.toDateString() === sel.toDateString();
              return (
                <button key={i} type="button"
                  onClick={() => { onChange(date.toISOString()); setOpen(false); }}
                  className={cn('nums h-8 rounded-lg text-sm transition hover:bg-brand-50', active && 'bg-brand-600 font-semibold text-white hover:bg-brand-700')}>
                  {d}
                </button>
              );
            })}
          </div>
          {value && <button type="button" className="mt-2 w-full text-xs text-muted hover:text-danger-600" onClick={() => { onChange(null); setOpen(false); }}>Tozalash</button>}
        </div>
      )}
    </div>
  );
}
