import { useMemo, useState } from 'react';
import { Search } from '../lib/icons';
import { cn } from '../lib/cn';

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  align?: 'left' | 'right' | 'center';
  className?: string;
}

export function DataTable<T extends { id?: string }>({
  columns,
  rows,
  pageSize = 8,
  onRowClick,
  searchable,
  searchFields,
  empty = 'Ma’lumot yo‘q',
}: {
  columns: Column<T>[];
  rows: T[];
  pageSize?: number;
  onRowClick?: (row: T) => void;
  searchable?: boolean;
  searchFields?: (keyof T)[];
  empty?: string;
}) {
  const [q, setQ] = useState('');
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    if (!q || !searchFields) return rows;
    const needle = q.toLowerCase();
    return rows.filter((r) => searchFields.some((f) => String(r[f] ?? '').toLowerCase().includes(needle)));
  }, [rows, q, searchFields]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const slice = filtered.slice(safePage * pageSize, safePage * pageSize + pageSize);

  const alignCls = (a?: string) => (a === 'right' ? 'text-right' : a === 'center' ? 'text-center' : 'text-left');

  return (
    <div className="overflow-hidden rounded-2xl border border-hairline bg-surface shadow-card">
      {searchable && (
        <div className="flex items-center gap-2 border-b border-hairline px-4 py-3">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(0); }}
            placeholder="Qidirish…"
            className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
          />
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50/80 text-xs uppercase tracking-wide text-muted">
            <tr>
              {columns.map((c) => (
                <th key={c.key} className={cn('px-4 py-3 font-medium', alignCls(c.align))}>{c.header}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {slice.length === 0 && (
              <tr><td colSpan={columns.length} className="px-4 py-12 text-center text-slate-400">{empty}</td></tr>
            )}
            {slice.map((row, i) => (
              <tr
                key={row.id ?? i}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn('transition', onRowClick && 'cursor-pointer hover:bg-brand-50/40')}
              >
                {columns.map((c) => (
                  <td key={c.key} className={cn('px-4 py-3', alignCls(c.align), c.className)}>
                    {c.render ? c.render(row) : String((row as any)[c.key] ?? '—')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filtered.length > pageSize && (
        <div className="flex items-center justify-between border-t border-hairline px-4 py-3 text-sm">
          <span className="text-muted">{filtered.length} ta · {safePage + 1}/{pageCount} sahifa</span>
          <div className="flex gap-1">
            <button disabled={safePage === 0} onClick={() => setPage(safePage - 1)} className="rounded-lg border border-hairline px-3 py-1.5 disabled:opacity-40 enabled:hover:bg-slate-50">Oldingi</button>
            <button disabled={safePage >= pageCount - 1} onClick={() => setPage(safePage + 1)} className="rounded-lg border border-hairline px-3 py-1.5 disabled:opacity-40 enabled:hover:bg-slate-50">Keyingi</button>
          </div>
        </div>
      )}
    </div>
  );
}
