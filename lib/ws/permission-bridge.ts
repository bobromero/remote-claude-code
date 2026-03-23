import type { PermissionRequestMessage, PermissionResponseMessage } from './protocol';

type PendingPermission = {
  resolve: (result: PermissionDecision) => void;
  timer: ReturnType<typeof setTimeout>;
};

export type PermissionDecision =
  | { behavior: 'allow'; updatedInput?: Record<string, unknown> }
  | { behavior: 'deny'; message: string };

const DEFAULT_TIMEOUT_MS = 120_000; // 2 minutes

export class PermissionBridge {
  private pending = new Map<string, PendingPermission>();
  private sendToClient: (msg: PermissionRequestMessage) => void;
  private timeoutMs: number;

  constructor(
    sendToClient: (msg: PermissionRequestMessage) => void,
    timeoutMs = DEFAULT_TIMEOUT_MS,
  ) {
    this.sendToClient = sendToClient;
    this.timeoutMs = timeoutMs;
  }

  async requestPermission(
    toolName: string,
    input: Record<string, unknown>,
    options?: { title?: string; description?: string; toolUseID?: string },
  ): Promise<PermissionDecision> {
    const requestId = options?.toolUseID ?? crypto.randomUUID();

    return new Promise<PermissionDecision>((resolve) => {
      const timer = setTimeout(() => {
        this.pending.delete(requestId);
        resolve({ behavior: 'deny', message: 'Permission request timed out' });
      }, this.timeoutMs);

      this.pending.set(requestId, { resolve, timer });

      this.sendToClient({
        type: 'permission_request',
        requestId,
        tool: toolName,
        args: input,
        title: options?.title,
        description: options?.description,
      });
    });
  }

  handleResponse(msg: PermissionResponseMessage): boolean {
    const entry = this.pending.get(msg.requestId);
    if (!entry) return false;

    clearTimeout(entry.timer);
    this.pending.delete(msg.requestId);

    if (msg.decision === 'allow') {
      entry.resolve({ behavior: 'allow' });
    } else {
      entry.resolve({ behavior: 'deny', message: msg.message ?? 'Permission denied by user' });
    }
    return true;
  }

  denyAll(): void {
    for (const [id, entry] of this.pending) {
      clearTimeout(entry.timer);
      entry.resolve({ behavior: 'deny', message: 'Connection closed' });
      this.pending.delete(id);
    }
  }

  get pendingCount(): number {
    return this.pending.size;
  }
}
