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
  private _bypassed = false;

  constructor(
    sendToClient: (msg: PermissionRequestMessage) => void,
    timeoutMs = DEFAULT_TIMEOUT_MS,
  ) {
    this.sendToClient = sendToClient;
    this.timeoutMs = timeoutMs;
  }

  get isBypassed(): boolean {
    return this._bypassed;
  }

  async requestPermission(
    toolName: string,
    input: Record<string, unknown>,
    options?: { title?: string; description?: string; toolUseID?: string },
  ): Promise<PermissionDecision> {
    const requestId = options?.toolUseID ?? crypto.randomUUID();

    // #region agent log
    fetch('http://127.0.0.1:7810/ingest/2e2765a4-321c-48c9-a611-3bbbbd5a96cb',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'ecb1a5'},body:JSON.stringify({sessionId:'ecb1a5',location:'permission-bridge.ts:requestPermission',message:'Sending permission request to client',data:{toolName,requestId,pendingCount:this.pending.size,isBypassed:this._bypassed},timestamp:Date.now(),hypothesisId:'H3'})}).catch(()=>{});
    // #endregion

    return new Promise<PermissionDecision>((resolve) => {
      const timer = setTimeout(() => {
        // #region agent log
        fetch('http://127.0.0.1:7810/ingest/2e2765a4-321c-48c9-a611-3bbbbd5a96cb',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'ecb1a5'},body:JSON.stringify({sessionId:'ecb1a5',location:'permission-bridge.ts:timeout',message:'Permission request timed out',data:{toolName,requestId},timestamp:Date.now(),hypothesisId:'H3'})}).catch(()=>{});
        // #endregion
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
    // #region agent log
    fetch('http://127.0.0.1:7810/ingest/2e2765a4-321c-48c9-a611-3bbbbd5a96cb',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'ecb1a5'},body:JSON.stringify({sessionId:'ecb1a5',location:'permission-bridge.ts:handleResponse',message:'Received permission response',data:{requestId:msg.requestId,decision:msg.decision,hasPending:this.pending.has(msg.requestId),pendingCount:this.pending.size},timestamp:Date.now(),hypothesisId:'H3'})}).catch(()=>{});
    // #endregion

    const entry = this.pending.get(msg.requestId);
    if (!entry) return false;

    clearTimeout(entry.timer);
    this.pending.delete(msg.requestId);

    if (msg.decision === 'allow_all') {
      this.enableBypass();
      entry.resolve({ behavior: 'allow' });
      return true;
    }

    if (msg.decision === 'allow') {
      entry.resolve({ behavior: 'allow' });
    } else {
      entry.resolve({ behavior: 'deny', message: msg.message ?? 'Permission denied by user' });
    }
    return true;
  }

  enableBypass(): void {
    this._bypassed = true;
    for (const [id, entry] of this.pending) {
      clearTimeout(entry.timer);
      entry.resolve({ behavior: 'allow' });
      this.pending.delete(id);
    }
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
