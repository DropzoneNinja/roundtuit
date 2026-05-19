import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { passwordRules } from '@/lib/authSchemas';

interface PasswordRulesProps {
  value: string;
}

export function PasswordRules({ value }: PasswordRulesProps) {
  const hasInput = value.length > 0;

  return (
    <ul className="space-y-1 text-xs">
      {passwordRules.map(({ label, test }) => {
        const passed = test(value);
        return (
          <li
            key={label}
            className={cn(
              'flex items-center gap-1.5 transition-colors',
              !hasInput
                ? 'text-muted-foreground'
                : passed
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-500 dark:text-red-400',
            )}
          >
            {!hasInput ? (
              <span className="size-3.5 shrink-0" />
            ) : passed ? (
              <Check className="size-3.5 shrink-0" />
            ) : (
              <X className="size-3.5 shrink-0" />
            )}
            {label}
          </li>
        );
      })}
    </ul>
  );
}
