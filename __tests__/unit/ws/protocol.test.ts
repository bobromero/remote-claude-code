import { describe, it, expect } from 'vitest';
import { serializeMessage, parseClientMessage } from '@/lib/ws/protocol';
import type { ServerMessage, ClientMessage } from '@/lib/ws/protocol';

describe('serializeMessage', () => {
  it('serializes a text_delta message', () => {
    const msg: ServerMessage = { type: 'text_delta', text: 'Hello' };
    const json = serializeMessage(msg);
    expect(JSON.parse(json)).toEqual({ type: 'text_delta', text: 'Hello' });
  });

  it('serializes a tool_start message', () => {
    const msg: ServerMessage = {
      type: 'tool_start',
      id: 'abc',
      tool: 'Read',
      args: { file_path: '/test.ts' },
    };
    const json = serializeMessage(msg);
    const parsed = JSON.parse(json);
    expect(parsed.type).toBe('tool_start');
    expect(parsed.tool).toBe('Read');
    expect(parsed.args.file_path).toBe('/test.ts');
  });

  it('serializes a result message with cost', () => {
    const msg: ServerMessage = {
      type: 'result',
      sessionId: 'sess-123',
      text: 'Done',
      cost: { inputTokens: 100, outputTokens: 50, totalCostUsd: 0.01 },
    };
    const json = serializeMessage(msg);
    const parsed = JSON.parse(json);
    expect(parsed.cost.totalCostUsd).toBe(0.01);
  });

  it('serializes a permission_request', () => {
    const msg: ServerMessage = {
      type: 'permission_request',
      requestId: 'req-1',
      tool: 'Bash',
      args: { command: 'rm -rf /' },
    };
    const json = serializeMessage(msg);
    const parsed = JSON.parse(json);
    expect(parsed.tool).toBe('Bash');
  });
});

describe('parseClientMessage', () => {
  it('parses a valid chat message', () => {
    const msg = JSON.stringify({ type: 'chat', text: 'Hello' });
    const parsed = parseClientMessage(msg);
    expect(parsed).toEqual({ type: 'chat', text: 'Hello' });
  });

  it('parses a permission_response message', () => {
    const msg = JSON.stringify({
      type: 'permission_response',
      requestId: 'req-1',
      decision: 'allow',
    });
    const parsed = parseClientMessage(msg);
    expect(parsed?.type).toBe('permission_response');
  });

  it('parses an abort message', () => {
    const msg = JSON.stringify({ type: 'abort' });
    const parsed = parseClientMessage(msg);
    expect(parsed?.type).toBe('abort');
  });

  it('returns null for invalid JSON', () => {
    expect(parseClientMessage('not json')).toBeNull();
  });

  it('returns null for non-object', () => {
    expect(parseClientMessage('"just a string"')).toBeNull();
  });

  it('returns null for object without type', () => {
    expect(parseClientMessage('{"foo":"bar"}')).toBeNull();
  });
});
