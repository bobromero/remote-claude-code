import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PermissionBridge } from '@/lib/ws/permission-bridge';
import type { PermissionRequestMessage } from '@/lib/ws/protocol';

describe('PermissionBridge', () => {
  let sentMessages: PermissionRequestMessage[];
  let bridge: PermissionBridge;

  beforeEach(() => {
    sentMessages = [];
    bridge = new PermissionBridge(
      (msg) => sentMessages.push(msg),
      500, // short timeout for tests
    );
  });

  it('sends a permission request to the client', async () => {
    const promise = bridge.requestPermission('Bash', { command: 'ls' });

    expect(sentMessages).toHaveLength(1);
    expect(sentMessages[0].tool).toBe('Bash');
    expect(sentMessages[0].args).toEqual({ command: 'ls' });

    // Respond to unblock
    bridge.handleResponse({
      type: 'permission_response',
      requestId: sentMessages[0].requestId,
      decision: 'allow',
    });

    const result = await promise;
    expect(result.behavior).toBe('allow');
  });

  it('resolves with deny when user denies', async () => {
    const promise = bridge.requestPermission('Bash', { command: 'rm -rf /' });

    bridge.handleResponse({
      type: 'permission_response',
      requestId: sentMessages[0].requestId,
      decision: 'deny',
      message: 'Too dangerous',
    });

    const result = await promise;
    expect(result.behavior).toBe('deny');
    if (result.behavior === 'deny') {
      expect(result.message).toBe('Too dangerous');
    }
  });

  it('auto-denies on timeout', async () => {
    const promise = bridge.requestPermission('Bash', { command: 'sleep 999' });
    const result = await promise;
    expect(result.behavior).toBe('deny');
    if (result.behavior === 'deny') {
      expect(result.message).toContain('timed out');
    }
  });

  it('handles multiple concurrent requests', async () => {
    const promise1 = bridge.requestPermission('Read', { file: 'a.ts' });
    const promise2 = bridge.requestPermission('Edit', { file: 'b.ts' });

    expect(sentMessages).toHaveLength(2);
    expect(bridge.pendingCount).toBe(2);

    bridge.handleResponse({
      type: 'permission_response',
      requestId: sentMessages[0].requestId,
      decision: 'allow',
    });
    bridge.handleResponse({
      type: 'permission_response',
      requestId: sentMessages[1].requestId,
      decision: 'deny',
    });

    const [r1, r2] = await Promise.all([promise1, promise2]);
    expect(r1.behavior).toBe('allow');
    expect(r2.behavior).toBe('deny');
    expect(bridge.pendingCount).toBe(0);
  });

  it('denyAll clears all pending requests', async () => {
    const promise1 = bridge.requestPermission('Read', { file: 'a.ts' });
    const promise2 = bridge.requestPermission('Edit', { file: 'b.ts' });

    bridge.denyAll();

    const [r1, r2] = await Promise.all([promise1, promise2]);
    expect(r1.behavior).toBe('deny');
    expect(r2.behavior).toBe('deny');
    expect(bridge.pendingCount).toBe(0);
  });

  it('returns false for unknown requestId', () => {
    const result = bridge.handleResponse({
      type: 'permission_response',
      requestId: 'nonexistent',
      decision: 'allow',
    });
    expect(result).toBe(false);
  });

  it('uses toolUseID as requestId when provided', async () => {
    const promise = bridge.requestPermission('Bash', { command: 'ls' }, { toolUseID: 'custom-id' });

    expect(sentMessages[0].requestId).toBe('custom-id');

    bridge.handleResponse({
      type: 'permission_response',
      requestId: 'custom-id',
      decision: 'allow',
    });

    const result = await promise;
    expect(result.behavior).toBe('allow');
  });
});
