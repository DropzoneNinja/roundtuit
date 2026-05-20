import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  LayoutList,
  CheckCircle2,
  CircleDashed,
  AlertTriangle,
  Clock,
  TrendingUp,
  Timer,
  ChevronLeft,
  Play,
  Pause,
  Flag,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { getTaskStats, getTaskTimeline, getTaskSparklines } from '@/api/tasks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

// ── Sparkline ─────────────────────────────────────────────────────────────────

interface SparklineProps {
  data: number[];
  color: string;
}

// Weekly tick positions (indices into a 28-day array, oldest→newest)
const WEEK_TICKS = [
  { idx: 0,  label: '4w' },
  { idx: 7,  label: '3w' },
  { idx: 14, label: '2w' },
  { idx: 21, label: '1w' },
] as const;

function Sparkline({ data, color }: SparklineProps) {
  if (!data || data.length < 2) return <div className="mt-3 h-[46px]" />;

  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const CH = 32; // chart area height in px
  const gradId = `sg${color.replace(/[^a-z0-9]/gi, '')}`;
  const last = data.length - 1;

  const pts = data.map((v, i) => [
    (i / last) * 100,
    CH - ((v - min) / range) * (CH - 1) - 0.5,
  ]);
  const linePath = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`).join(' ');
  const areaPath = `${linePath} L100,${CH} L0,${CH} Z`;

  return (
    <div className="mt-3">
      <div className="flex items-start gap-1.5">
        {/* Y axis: max value only */}
        <span className="text-[9px] leading-none text-muted-foreground/60 select-none tabular-nums shrink-0">
          {max}
        </span>

        {/* Chart + X axis */}
        <div className="flex-1 min-w-0">
          <svg
            viewBox={`0 0 100 ${CH}`}
            preserveAspectRatio="none"
            width="100%"
            height={CH}
            style={{ display: 'block' }}
            aria-hidden
          >
            <defs>
              <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity="0.2" />
                <stop offset="100%" stopColor={color} stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={areaPath} fill={`url(#${gradId})`} />
            <path d={linePath} fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
          </svg>

          {/* X axis: tick mark + label every 7 days */}
          <div className="relative h-[14px] mt-px">
            {WEEK_TICKS.map(({ idx, label }) => (
              <div
                key={idx}
                className="absolute top-0 flex flex-col items-center"
                style={{ left: `${(idx / last) * 100}%`, transform: 'translateX(-50%)' }}
              >
                <div className="w-px h-[3px] bg-muted-foreground/25" />
                <span className="text-[9px] leading-none text-muted-foreground/60 select-none tabular-nums">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Stat tile ─────────────────────────────────────────────────────────────────

interface StatTileProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  sub?: string;
  sparkline?: number[];
  sparklineColor?: string;
}

function StatTile({ label, value, icon, sub, sparkline, sparklineColor = '#6366f1' }: StatTileProps) {
  return (
    <Card className="flex flex-col">
      <CardContent className="pt-6 pb-3 flex flex-col flex-1">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-3xl font-bold mt-1">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </div>
          <div className="text-muted-foreground mt-1">{icon}</div>
        </div>
        {sparkline && (
          <div className="mt-auto">
            <Sparkline data={sparkline} color={sparklineColor} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StatTileSkeleton() {
  return (
    <Card className="flex flex-col">
      <CardContent className="pt-6 pb-3 flex flex-col flex-1">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-16" />
          </div>
          <Skeleton className="h-6 w-6 rounded" />
        </div>
        <div className="mt-auto">
          <Skeleton className="h-[46px] w-full mt-3" />
        </div>
      </CardContent>
    </Card>
  );
}

function ChartSkeleton() {
  return <Skeleton className="h-[220px] w-full" />;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ReportingPage() {
  const navigate = useNavigate();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['taskStats'],
    queryFn: getTaskStats,
  });

  const { data: sparklines } = useQuery({
    queryKey: ['taskSparklines'],
    queryFn: getTaskSparklines,
  });

  const { data: timeline, isLoading: timelineLoading } = useQuery({
    queryKey: ['taskTimeline'],
    queryFn: getTaskTimeline,
  });

  const hasAvgDaysData = timeline?.some(d => d.avgDays !== null) ?? false;
  const sl = sparklines;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-8">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/settings')}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Reporting</h1>
          <p className="text-sm text-muted-foreground">Task statistics and completion trends</p>
        </div>
      </div>

      {/* Overview */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Overview
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <StatTileSkeleton key={i} />)
          ) : (
            <>
              <StatTile
                label="Total Tasks"
                value={stats!.total}
                icon={<LayoutList className="h-5 w-5" />}
                sparkline={sl?.total}
                sparklineColor="#64748b"
              />
              <StatTile
                label="Open"
                value={stats!.open}
                icon={<CircleDashed className="h-5 w-5 text-blue-500" />}
                sparkline={sl?.open}
                sparklineColor="#3b82f6"
              />
              <StatTile
                label="Completed"
                value={stats!.completed}
                icon={<CheckCircle2 className="h-5 w-5 text-green-500" />}
                sparkline={sl?.completedTotal}
                sparklineColor="#22c55e"
              />
              <StatTile
                label="Completion Rate"
                value={`${stats!.completionRate}%`}
                icon={<TrendingUp className="h-5 w-5 text-emerald-500" />}
                sparkline={sl?.completionRate}
                sparklineColor="#10b981"
              />
            </>
          )}
        </div>
      </section>

      {/* Timeliness */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Timeliness
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => <StatTileSkeleton key={i} />)
          ) : (
            <>
              <StatTile
                label="Completed On Time"
                value={stats!.completedOnTime}
                icon={<Clock className="h-5 w-5 text-green-500" />}
                sub="Had a due date"
                sparkline={sl?.onTime}
                sparklineColor="#22c55e"
              />
              <StatTile
                label="Completed Late"
                value={stats!.completedLate}
                icon={<Timer className="h-5 w-5 text-orange-500" />}
                sub="Had a due date"
                sparkline={sl?.late}
                sparklineColor="#f97316"
              />
              <StatTile
                label="Currently Overdue"
                value={stats!.overdue}
                icon={<AlertTriangle className="h-5 w-5 text-red-500" />}
                sub="Open & past due"
                sparkline={sl?.overdue}
                sparklineColor="#ef4444"
              />
            </>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          On time / late counts only tasks that had a due date set when completed.
        </p>
      </section>

      {/* By Status */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          By Status
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <StatTileSkeleton key={i} />)
          ) : (
            <>
              <StatTile
                label="Pending"
                value={stats!.byStatus.PENDING}
                icon={<CircleDashed className="h-5 w-5 text-slate-400" />}
                sparkline={sl?.open}
                sparklineColor="#94a3b8"
              />
              <StatTile
                label="Started"
                value={stats!.byStatus.STARTED}
                icon={<Play className="h-5 w-5 text-blue-500" />}
                sparkline={sl?.open}
                sparklineColor="#3b82f6"
              />
              <StatTile
                label="Waiting"
                value={stats!.byStatus.WAITING}
                icon={<Pause className="h-5 w-5 text-yellow-500" />}
                sparkline={sl?.open}
                sparklineColor="#eab308"
              />
              <StatTile
                label="Completed"
                value={stats!.byStatus.COMPLETED}
                icon={<CheckCircle2 className="h-5 w-5 text-green-500" />}
                sparkline={sl?.completedTotal}
                sparklineColor="#22c55e"
              />
            </>
          )}
        </div>
      </section>

      {/* By Importance */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          By Importance
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => <StatTileSkeleton key={i} />)
          ) : (
            <>
              <StatTile
                label="High"
                value={stats!.byImportance.HIGH}
                icon={<Flag className="h-5 w-5 text-red-500" />}
                sparkline={sl?.byImportance.HIGH}
                sparklineColor="#ef4444"
              />
              <StatTile
                label="Medium"
                value={stats!.byImportance.MEDIUM}
                icon={<Flag className="h-5 w-5 text-yellow-500" />}
                sparkline={sl?.byImportance.MEDIUM}
                sparklineColor="#eab308"
              />
              <StatTile
                label="Low"
                value={stats!.byImportance.LOW}
                icon={<Flag className="h-5 w-5 text-slate-400" />}
                sparkline={sl?.byImportance.LOW}
                sparklineColor="#94a3b8"
              />
            </>
          )}
        </div>
      </section>

      {/* Timeline charts */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Trends — Last 12 Months
        </h2>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Tasks Created vs Completed</CardTitle>
          </CardHeader>
          <CardContent>
            {timelineLoading ? (
              <ChartSkeleton />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={timeline} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={24} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6 }} cursor={{ fill: 'hsl(var(--muted))' }} />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="created" name="Created" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="completed" name="Completed" fill="#22c55e" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">On-Time vs Late Completions</CardTitle>
          </CardHeader>
          <CardContent>
            {timelineLoading ? (
              <ChartSkeleton />
            ) : (
              <>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={timeline} barCategoryGap="30%">
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={24} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6 }} cursor={{ fill: 'hsl(var(--muted))' }} />
                    <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="onTime" name="On Time" stackId="a" fill="#22c55e" />
                    <Bar dataKey="late" name="Late" stackId="a" fill="#f97316" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                <p className="text-xs text-muted-foreground mt-2">
                  Only counts tasks that had a due date set.
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Days to Complete</CardTitle>
          </CardHeader>
          <CardContent>
            {timelineLoading ? (
              <ChartSkeleton />
            ) : !hasAvgDaysData ? (
              <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">
                No completed tasks yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={timeline}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={24} unit="d" />
                  <Tooltip
                    formatter={(v: number) => [`${v} days`, 'Avg to complete']}
                    contentStyle={{ fontSize: 12, borderRadius: 6 }}
                  />
                  <Line
                    dataKey="avgDays"
                    name="Avg days"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#8b5cf6' }}
                    connectNulls={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
