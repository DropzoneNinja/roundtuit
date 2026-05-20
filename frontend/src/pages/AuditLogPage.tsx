import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, ChevronDown } from 'lucide-react';
import { getAuditLog } from '@/api/settings';
import type { AuditLog } from '@/types';

const ACTION_STYLES: Record<string, string> = {
  CREATE: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
  UPDATE: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
  DELETE: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
};

function auditSummary(log: AuditLog): string {
  const d = log.detail as Record<string, unknown>;
  if (log.action === 'CREATE') {
    const parts: string[] = [];
    if (d.importance) parts.push(String(d.importance).toLowerCase());
    if (d.dueDate) parts.push(`due ${new Date(String(d.dueDate)).toLocaleDateString()}`);
    return parts.length ? `(${parts.join(', ')})` : '';
  }
  if (log.action === 'UPDATE') {
    const changes = d.changes as Record<string, { from: unknown; to: unknown }> | undefined;
    if (!changes || Object.keys(changes).length === 0) return '';
    return Object.entries(changes)
      .map(([field, { from, to }]) => {
        if (field === 'dueDate') {
          const f = from ? new Date(String(from)).toLocaleDateString() : 'none';
          const t = to ? new Date(String(to)).toLocaleDateString() : 'none';
          return `due: ${f} → ${t}`;
        }
        return `${field}: ${String(from)} → ${String(to)}`;
      })
      .join(', ');
  }
  return '';
}

export default function AuditLogPage() {
  const [extraPages, setExtraPages] = useState<AuditLog[][]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  useEffect(() => {
    document.title = 'Audit Log · RoundTuit';
  }, []);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['audit'],
    queryFn: () => getAuditLog(),
  });

  useEffect(() => {
    setExtraPages([]);
    setNextCursor(data?.nextCursor ?? null);
  }, [data]);

  const allLogs = [...(data?.logs ?? []), ...extraPages.flat()];

  async function loadMore() {
    if (!nextCursor) return;
    setIsLoadingMore(true);
    try {
      const more = await getAuditLog(nextCursor);
      setExtraPages((prev) => [...prev, more.logs]);
      setNextCursor(more.nextCursor);
    } finally {
      setIsLoadingMore(false);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="font-semibold text-lg">Audit Log</h1>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading…
        </div>
      ) : isError ? (
        <p className="text-sm text-destructive">Failed to load audit log.</p>
      ) : allLogs.length === 0 ? (
        <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
      ) : (
        <div className="rounded-lg border border-border divide-y divide-border">
          {allLogs.map((log) => {
            const summary = auditSummary(log);
            const title = String((log.detail as Record<string, unknown>).title ?? log.entityId);
            return (
              <div
                key={log.id}
                className="flex items-start gap-3 px-4 py-3 hover:bg-muted/40 transition-colors"
              >
                <span
                  className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${ACTION_STYLES[log.action] ?? ''}`}
                >
                  {log.action}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-snug">
                    <span className="font-medium">{log.actorUsername}</span>
                    {' '}
                    <span className="text-muted-foreground">
                      {log.action === 'CREATE' ? 'created' : log.action === 'DELETE' ? 'deleted' : 'updated'}
                    </span>
                    {' '}
                    <span className="font-medium">{title}</span>
                    {summary && (
                      <span className="text-muted-foreground text-xs"> {summary}</span>
                    )}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {new Date(log.createdAt).toLocaleString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {nextCursor && (
        <button
          onClick={() => void loadMore()}
          disabled={isLoadingMore}
          className="flex w-full items-center justify-center gap-1.5 rounded-md border border-border py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
        >
          {isLoadingMore ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ChevronDown className="size-4" />
          )}
          Load more
        </button>
      )}
    </div>
  );
}
