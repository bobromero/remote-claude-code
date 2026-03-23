import { test, expect } from '@playwright/test';

test.describe('Chat Flow', () => {
  test('shows the chat interface', async ({ page }) => {
    await page.goto('/chat');
    // Should see the chat input
    await expect(page.locator('textarea[placeholder="Send a message..."]')).toBeVisible();
    // Should see the Claude Code header
    await expect(page.locator('text=Claude Code')).toBeVisible();
  });

  test('shows empty state message', async ({ page }) => {
    await page.goto('/chat');
    await expect(page.locator('text=Start a conversation')).toBeVisible();
  });

  test('has a send button', async ({ page }) => {
    await page.goto('/chat');
    const sendButton = page.locator('button[title="Send (Enter)"]');
    await expect(sendButton).toBeVisible();
    // Should be disabled when input is empty
    await expect(sendButton).toBeDisabled();
  });

  test('enables send button when text is entered', async ({ page }) => {
    await page.goto('/chat');
    const textarea = page.locator('textarea[placeholder="Send a message..."]');
    await textarea.fill('Hello Claude');
    const sendButton = page.locator('button[title="Send (Enter)"]');
    await expect(sendButton).toBeEnabled();
  });
});
