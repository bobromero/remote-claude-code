import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('reads ANTHROPIC_API_KEY from env', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-key-123';
    const { getConfig } = await import('@/lib/config');
    expect(getConfig().apiKey).toBe('test-key-123');
  });

  it('defaults to process.cwd() when DEFAULT_CWD is not set', async () => {
    delete process.env.DEFAULT_CWD;
    const { getConfig } = await import('@/lib/config');
    expect(getConfig().defaultCwd).toBe(process.cwd());
  });

  it('reads DEFAULT_CWD from env', async () => {
    process.env.DEFAULT_CWD = '/custom/path';
    const { getConfig } = await import('@/lib/config');
    expect(getConfig().defaultCwd).toBe('/custom/path');
  });

  it('defaults permissionMode to default', async () => {
    delete process.env.PERMISSION_MODE;
    const { getConfig } = await import('@/lib/config');
    expect(getConfig().permissionMode).toBe('default');
  });

  it('parses ALLOWED_TOOLS as comma-separated list', async () => {
    process.env.ALLOWED_TOOLS = 'Read, Edit, Glob';
    const { getConfig } = await import('@/lib/config');
    expect(getConfig().allowedTools).toEqual(['Read', 'Edit', 'Glob']);
  });

  it('returns empty array for unset ALLOWED_TOOLS', async () => {
    delete process.env.ALLOWED_TOOLS;
    const { getConfig } = await import('@/lib/config');
    expect(getConfig().allowedTools).toEqual([]);
  });

  it('updateConfig overrides env values', async () => {
    process.env.ANTHROPIC_API_KEY = 'env-key';
    const { getConfig, updateConfig } = await import('@/lib/config');
    updateConfig({ apiKey: 'runtime-key' });
    expect(getConfig().apiKey).toBe('runtime-key');
  });

  it('defaults port to 3000', async () => {
    delete process.env.PORT;
    const { getConfig } = await import('@/lib/config');
    expect(getConfig().port).toBe(3000);
  });
});
