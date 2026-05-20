import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from 'next-themes';
import { Moon, Sun, Settings, LogOut, ChevronDown, ArrowLeft, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/authStore';
import { CalendarDialog } from '@/components/tasks/CalendarDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { logout } from '@/api/auth';

export default function AppLayout() {
  const { user, clearUser } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const { resolvedTheme, setTheme } = useTheme();
  const backDestination: Record<string, string> = { '/settings': '/', '/audit': '/settings' };
  const backTarget = backDestination[location.pathname];
  const [calendarOpen, setCalendarOpen] = useState(false);

  async function handleLogout() {
    try {
      await logout();
    } finally {
      clearUser();
      void navigate('/login');
    }
  }

  function toggleTheme() {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {backTarget ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void navigate(backTarget)}
                className="gap-1.5 px-2"
              >
                <ArrowLeft className="size-4" />
                Back
              </Button>
            ) : (
              <>
                <img src="/tuit-logo.png" alt="RoundTuit" className="h-12 w-12 bg-white rounded-lg p-0.5" />
                <span className="font-semibold text-base tracking-tight">RoundTuit</span>
              </>
            )}
          </div>
          {user && (
            <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCalendarOpen(true)}
              aria-label="Calendar"
              className="size-9"
            >
              <CalendarDays className="size-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-1 rounded-md px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors outline-none">
                {user.username}
                <ChevronDown className="size-3.5 text-muted-foreground" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-44">
                <DropdownMenuItem onClick={toggleTheme}>
                  {resolvedTheme === 'dark' ? (
                    <Sun className="mr-2 size-4" />
                  ) : (
                    <Moon className="mr-2 size-4" />
                  )}
                  {resolvedTheme === 'dark' ? 'Light mode' : 'Dark mode'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => void navigate('/settings')}>
                  <Settings className="mr-2 size-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => void handleLogout()}>
                  <LogOut className="mr-2 size-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            </div>
          )}
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-4 py-6">
        <Outlet />
      </main>
      <CalendarDialog open={calendarOpen} onOpenChange={setCalendarOpen} />
    </div>
  );
}
