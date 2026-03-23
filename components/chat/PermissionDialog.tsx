'use client';

import { ShieldAlert } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import type { PermissionRequest } from '@/hooks/useChat';

type PermissionDialogProps = {
  request: PermissionRequest | null;
  onRespond: (requestId: string, decision: 'allow' | 'deny') => void;
};

export function PermissionDialog({ request, onRespond }: PermissionDialogProps) {
  if (!request) return null;

  return (
    <Dialog open={!!request}>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
            <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Permission Required
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Claude wants to use <strong>{request.tool}</strong>
            </p>
          </div>
        </div>

        {request.title && (
          <p className="text-sm text-zinc-700 dark:text-zinc-300">{request.title}</p>
        )}

        {request.description && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{request.description}</p>
        )}

        <div className="rounded-md bg-zinc-100 dark:bg-zinc-800 p-3">
          <pre className="text-xs text-zinc-600 dark:text-zinc-400 overflow-x-auto">
            {JSON.stringify(request.args, null, 2)}
          </pre>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="secondary"
            onClick={() => onRespond(request.requestId, 'deny')}
          >
            Deny
          </Button>
          <Button
            variant="primary"
            onClick={() => onRespond(request.requestId, 'allow')}
          >
            Allow
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
