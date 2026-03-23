'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Save } from 'lucide-react';

type Config = {
  defaultCwd: string;
  permissionMode: string;
  allowedTools: string[];
  disallowedTools: string[];
};

export function SettingsForm() {
  const [config, setConfig] = useState<Config>({
    defaultCwd: '',
    permissionMode: 'default',
    allowedTools: [],
    disallowedTools: [],
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/config')
      .then((r) => r.json())
      .then(setConfig)
      .catch(() => {});
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 p-4 max-w-lg">
      <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200">Settings</h2>

      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          Working Directory
        </label>
        <input
          type="text"
          value={config.defaultCwd}
          onChange={(e) => setConfig({ ...config, defaultCwd: e.target.value })}
          className="w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 font-mono"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          Permission Mode
        </label>
        <select
          value={config.permissionMode}
          onChange={(e) => setConfig({ ...config, permissionMode: e.target.value })}
          className="w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-1.5 text-sm text-zinc-900 dark:text-zinc-100"
        >
          <option value="default">Default (ask for each tool)</option>
          <option value="acceptEdits">Accept Edits (auto-approve file changes)</option>
          <option value="bypassPermissions">Bypass Permissions (auto-approve all)</option>
          <option value="plan">Plan Only (no tool execution)</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          Allowed Tools (comma-separated)
        </label>
        <input
          type="text"
          value={config.allowedTools.join(', ')}
          onChange={(e) =>
            setConfig({
              ...config,
              allowedTools: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
            })
          }
          placeholder="e.g., Read, Edit, Glob, Grep"
          className="w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 font-mono"
        />
      </div>

      <Button onClick={handleSave} disabled={saving}>
        <Save className="h-3.5 w-3.5" />
        {saving ? 'Saving...' : 'Save'}
      </Button>
    </div>
  );
}
