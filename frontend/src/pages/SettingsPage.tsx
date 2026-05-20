import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import axios from 'axios';
import {
  Users,
  KeyRound,
  HardDrive,
  RotateCcw,
  Download,
  Trash2,
  Loader2,
  RefreshCw,
  AlertTriangle,
  Copy,
  Check,
  Upload,
  BarChart2,
  MessageCircle,
  Unlink,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import {
  getUsers,
  resetPassword,
  getBackups,
  createBackup,
  deleteBackup,
  backupDownloadUrl,
  setAutoBackup,
  restoreFromBackup,
  restoreFromFile,
  getTelegramStatus,
  unlinkTelegram,
  regenerateTelegramCode,
  testTelegram,
} from '@/api/settings';
import type { AutoBackupConfig, BackupInfo, UserSummary, TelegramStatus } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// ── helpers ──────────────────────────────────────────────────────────────────

function apiError(error: unknown, fallback: string): string {
  return axios.isAxiosError(error) ? (error.response?.data?.error ?? fallback) : fallback;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ── Password Reset section ────────────────────────────────────────────────────

interface TempPasswordDialogProps {
  username: string;
  tempPassword: string;
  onClose: () => void;
}

function TempPasswordDialog({ username, tempPassword, onClose }: TempPasswordDialogProps) {
  const [copied, setCopied] = useState(false);

  function copy() {
    void navigator.clipboard.writeText(tempPassword).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Password Reset</DialogTitle>
          <DialogDescription>
            Temporary password for <strong>{username}</strong>. Share it once — it won't be shown again.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2 rounded-md border border-border bg-muted px-3 py-2">
          <code className="flex-1 font-mono text-sm select-all">{tempPassword}</code>
          <Button size="icon" variant="ghost" onClick={copy} className="size-7 shrink-0">
            {copied ? <Check className="size-3.5 text-green-500" /> : <Copy className="size-3.5" />}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          {username} will be prompted to set a new password on their next login.
        </p>
        <DialogFooter>
          <Button onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PasswordSection() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const [tempResult, setTempResult] = useState<{ username: string; tempPassword: string } | null>(null);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['settings', 'users'],
    queryFn: getUsers,
  });

  const resetMutation = useMutation({
    mutationFn: (userId: string) => resetPassword(userId),
    onSuccess: (data) => {
      setTempResult(data);
      void queryClient.invalidateQueries({ queryKey: ['settings', 'users'] });
    },
    onError: (err) => toast.error(apiError(err, 'Failed to reset password')),
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Users className="size-4 text-muted-foreground" />
          <CardTitle className="text-base">Passwords</CardTitle>
        </div>
        <CardDescription>Change your own password or reset another user's.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading users…
          </div>
        ) : (
          users.map((u: UserSummary) => {
            const isSelf = u.id === currentUser?.id;
            return (
              <div
                key={u.id}
                className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium">
                    {u.username}
                    {isSelf && <span className="ml-1.5 text-xs text-muted-foreground">(you)</span>}
                  </p>
                  {u.passwordChangeRequired && (
                    <p className="text-xs text-amber-500">Awaiting password change</p>
                  )}
                </div>
                {isSelf ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void navigate('/change-password')}
                    className="text-xs"
                  >
                    <KeyRound className="size-3.5" />
                    Change Password
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={resetMutation.isPending}
                    onClick={() => resetMutation.mutate(u.id)}
                    className="text-xs"
                  >
                    {resetMutation.isPending ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="size-3.5" />
                    )}
                    Reset Password
                  </Button>
                )}
              </div>
            );
          })
        )}
      </CardContent>

      {tempResult && (
        <TempPasswordDialog
          username={tempResult.username}
          tempPassword={tempResult.tempPassword}
          onClose={() => setTempResult(null)}
        />
      )}
    </Card>
  );
}

// ── Backup section ────────────────────────────────────────────────────────────

function BackupSection() {
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['settings', 'backups'],
    queryFn: getBackups,
  });

  const backups = data?.backups ?? [];
  const autoBackup = data?.autoBackup ?? { schedule: 'disabled', hour: 2 };

  const createMutation = useMutation({
    mutationFn: createBackup,
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ['settings', 'backups'] });
      toast.success(`Backup created: ${result.filename}`);
    },
    onError: (err) => toast.error(apiError(err, 'Backup failed')),
  });

  const deleteMutation = useMutation({
    mutationFn: (filename: string) => deleteBackup(filename),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['settings', 'backups'] });
      toast.success('Backup deleted');
    },
    onError: (err) => toast.error(apiError(err, 'Failed to delete backup')),
  });

  const autoMutation = useMutation({
    mutationFn: (cfg: AutoBackupConfig) => setAutoBackup(cfg),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['settings', 'backups'] });
      toast.success('Auto-backup schedule saved');
    },
    onError: (err) => toast.error(apiError(err, 'Failed to save auto-backup settings')),
  });

  const hourOptions = Array.from({ length: 24 }, (_, i) => ({
    value: String(i),
    label: `${String(i).padStart(2, '0')}:00`,
  }));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HardDrive className="size-4 text-muted-foreground" />
            <CardTitle className="text-base">Backups</CardTitle>
          </div>
          <Button
            size="sm"
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <HardDrive className="size-4" />
            )}
            Back Up Now
          </Button>
        </div>
        <CardDescription>Manual and scheduled database backups.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Auto-backup settings */}
        <div className="rounded-lg border border-border p-3 space-y-3">
          <p className="text-sm font-medium">Automatic Backups</p>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Schedule</p>
              <Select
                value={autoBackup.schedule}
                onValueChange={(v) =>
                  autoMutation.mutate({ schedule: v as AutoBackupConfig['schedule'], hour: autoBackup.hour })
                }
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="disabled">Disabled</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {autoBackup.schedule !== 'disabled' && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Run at</p>
                <Select
                  value={String(autoBackup.hour)}
                  onValueChange={(v) =>
                    autoMutation.mutate({ schedule: autoBackup.schedule, hour: Number(v) })
                  }
                >
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {hourOptions.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>

        {/* Backup list */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Saved Backups</p>
          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Loading…
            </div>
          )}
          {isError && (
            <p className="text-sm text-destructive">Failed to load backups.</p>
          )}
          {!isLoading && backups.length === 0 && (
            <p className="text-sm text-muted-foreground">No backups yet.</p>
          )}
          {backups.map((b: BackupInfo) => (
            <div
              key={b.filename}
              className="flex items-center justify-between rounded-lg border border-border px-3 py-2 gap-2"
            >
              <div className="min-w-0">
                <p className="text-xs font-mono truncate text-muted-foreground">{b.filename}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(b.createdAt)} · {formatBytes(b.size)}
                </p>
              </div>
              <div className="flex gap-1 shrink-0">
                <a
                  href={backupDownloadUrl(b.filename)}
                  download={b.filename}
                  className="inline-flex items-center justify-center size-7 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  <Download className="size-3.5" />
                </a>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-7 text-destructive hover:text-destructive"
                  disabled={deleteMutation.isPending}
                  onClick={() => deleteMutation.mutate(b.filename)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Restore section ───────────────────────────────────────────────────────────

interface RestoreConfirmDialogProps {
  description: string;
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
}

function RestoreConfirmDialog({ description, onConfirm, onCancel, isPending }: RestoreConfirmDialogProps) {
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onCancel(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="size-5" />
            <DialogTitle>Restore Database?</DialogTitle>
          </div>
          <DialogDescription className="pt-1">
            {description} <strong>This will permanently replace all current data.</strong> This cannot
            be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onCancel} disabled={isPending}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isPending}>
            {isPending && <Loader2 className="size-4 animate-spin" />}
            {isPending ? 'Restoring…' : 'Yes, Restore'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RestoreSection() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedBackup, setSelectedBackup] = useState<string>('');
  const [confirmTarget, setConfirmTarget] = useState<
    | { type: 'backup'; filename: string }
    | { type: 'file'; file: File }
    | null
  >(null);

  const { data } = useQuery({
    queryKey: ['settings', 'backups'],
    queryFn: getBackups,
  });
  const backups = data?.backups ?? [];

  const restoreMutation = useMutation({
    mutationFn: async (target: typeof confirmTarget) => {
      if (!target) return;
      if (target.type === 'backup') await restoreFromBackup(target.filename);
      else await restoreFromFile(target.file);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['settings', 'backups'] });
      void queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setConfirmTarget(null);
      setSelectedFile(null);
      setSelectedBackup('');
      toast.success('Database restored successfully');
    },
    onError: (err) => {
      setConfirmTarget(null);
      toast.error(apiError(err, 'Restore failed'));
    },
  });

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (file && !file.name.endsWith('.sql')) {
      toast.error('Only .sql files are supported');
      e.target.value = '';
      return;
    }
    setSelectedFile(file);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <RotateCcw className="size-4 text-muted-foreground" />
          <CardTitle className="text-base">Restore</CardTitle>
        </div>
        <CardDescription>
          Replace the current database with a backup. All existing data will be lost.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Restore from existing backup */}
        <div className="rounded-lg border border-border p-3 space-y-3">
          <p className="text-sm font-medium">From Saved Backup</p>
          {backups.length === 0 ? (
            <p className="text-sm text-muted-foreground">No backups available.</p>
          ) : (
            <div className="flex gap-2 items-center">
              <Select value={selectedBackup} onValueChange={(v) => { if (v !== null) setSelectedBackup(v); }}>
                <SelectTrigger className="flex-1 text-xs">
                  <SelectValue placeholder="Select a backup…" />
                </SelectTrigger>
                <SelectContent>
                  {backups.map((b: BackupInfo) => (
                    <SelectItem key={b.filename} value={b.filename} className="text-xs font-mono">
                      {b.filename} ({formatBytes(b.size)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="destructive"
                size="sm"
                disabled={!selectedBackup || restoreMutation.isPending}
                onClick={() => setConfirmTarget({ type: 'backup', filename: selectedBackup })}
              >
                <RotateCcw className="size-3.5" />
                Restore
              </Button>
            </div>
          )}
        </div>

        {/* Restore from file upload */}
        <div className="rounded-lg border border-border p-3 space-y-3">
          <p className="text-sm font-medium">From File Upload</p>
          <div className="flex gap-2 items-center">
            <input
              ref={fileInputRef}
              type="file"
              accept=".sql"
              className="hidden"
              onChange={handleFileChange}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="size-3.5" />
              Choose .sql file
            </Button>
            {selectedFile && (
              <span className="text-xs text-muted-foreground truncate max-w-[160px]">
                {selectedFile.name}
              </span>
            )}
          </div>
          {selectedFile && (
            <Button
              variant="destructive"
              size="sm"
              disabled={restoreMutation.isPending}
              onClick={() => setConfirmTarget({ type: 'file', file: selectedFile })}
            >
              <RotateCcw className="size-3.5" />
              Restore from {selectedFile.name}
            </Button>
          )}
        </div>
      </CardContent>

      {confirmTarget && (
        <RestoreConfirmDialog
          description={
            confirmTarget.type === 'backup'
              ? `You are about to restore from "${confirmTarget.filename}".`
              : `You are about to restore from the uploaded file "${confirmTarget.file.name}".`
          }
          onConfirm={() => restoreMutation.mutate(confirmTarget)}
          onCancel={() => setConfirmTarget(null)}
          isPending={restoreMutation.isPending}
        />
      )}
    </Card>
  );
}

// ── Telegram section ──────────────────────────────────────────────────────────

function TelegramSection() {
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);

  const { data, isLoading } = useQuery<TelegramStatus>({
    queryKey: ['settings', 'telegram'],
    queryFn: getTelegramStatus,
  });

  const unlinkMutation = useMutation({
    mutationFn: unlinkTelegram,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['settings', 'telegram'] });
      toast.success('Telegram unlinked');
    },
    onError: (err) => toast.error(apiError(err, 'Failed to unlink Telegram')),
  });

  const regenerateMutation = useMutation({
    mutationFn: regenerateTelegramCode,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['settings', 'telegram'] });
      toast.success('New link code generated');
    },
    onError: (err) => toast.error(apiError(err, 'Failed to regenerate code')),
  });

  const testMutation = useMutation({
    mutationFn: testTelegram,
    onSuccess: () => toast.success('Test message sent — check your Telegram'),
    onError: (err) => toast.error(apiError(err, 'Failed to send test message')),
  });

  function copyCode() {
    if (!data?.linkCode) return;
    void navigator.clipboard.writeText(data.linkCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (!isLoading && data?.enabled === false) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <MessageCircle className="size-4 text-muted-foreground" />
          <CardTitle className="text-base">Telegram Notifications</CardTitle>
        </div>
        <CardDescription>Get notified about new tasks and due-date reminders.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading…
          </div>
        ) : data?.linked ? (
          <div className="flex items-center justify-between">
            <span className="text-sm text-green-600 font-medium">Linked</span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={testMutation.isPending}
                onClick={() => testMutation.mutate()}
                className="text-xs"
              >
                {testMutation.isPending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <MessageCircle className="size-3.5" />
                )}
                Send Test
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={unlinkMutation.isPending}
                onClick={() => unlinkMutation.mutate()}
                className="text-xs"
              >
                {unlinkMutation.isPending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Unlink className="size-3.5" />
                )}
                Unlink
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Start a chat with your Telegram bot and send this code to link your account:
            </p>
            <div className="flex items-center gap-2 rounded-md border border-border bg-muted px-3 py-2">
              <code className="flex-1 font-mono text-sm select-all">{data?.linkCode ?? '…'}</code>
              <Button size="icon" variant="ghost" onClick={copyCode} className="size-7 shrink-0">
                {copied ? <Check className="size-3.5 text-green-500" /> : <Copy className="size-3.5" />}
              </Button>
            </div>
            <Button
              size="sm"
              variant="outline"
              disabled={regenerateMutation.isPending}
              onClick={() => regenerateMutation.mutate()}
              className="text-xs"
            >
              {regenerateMutation.isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <RefreshCw className="size-3.5" />
              )}
              Regenerate Code
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

function ReportingLinkCard() {
  const navigate = useNavigate();
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart2 className="size-4 text-muted-foreground" />
            <CardTitle className="text-base">Reporting</CardTitle>
          </div>
          <Button size="sm" variant="outline" onClick={() => void navigate('/reporting')}>
            View Dashboard
          </Button>
        </div>
        <CardDescription>Task completion statistics, timeliness, and breakdowns.</CardDescription>
      </CardHeader>
    </Card>
  );
}

declare const __APP_VERSION__: string;

export default function SettingsPage() {
  useEffect(() => {
    document.title = 'Settings · RoundTuit';
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="font-semibold text-lg">Settings</h1>
      <ReportingLinkCard />
      <TelegramSection />
      <PasswordSection />
      <BackupSection />
      <RestoreSection />
      <p className="text-xs text-muted-foreground text-center pb-2">v{__APP_VERSION__}</p>
    </div>
  );
}
