import { readFile } from 'node:fs/promises';
import { prepareClipboardImage } from '@main/attachments';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clipboard, FakeClipboardItem, setClipboardItems } from '../fakes/electron.js';

vi.unmock('@main/attachments');

const imageBlob = (bytes: number[], type: string) => new Blob([new Uint8Array(bytes)], { type });

describe('prepareClipboardImage', () => {
  beforeEach(() => {
    setClipboardItems([]);
  });

  it('returns null when the clipboard is empty', async () => {
    expect(await prepareClipboardImage()).toBeNull();
  });

  it('returns null when no clipboard item carries an image type', async () => {
    setClipboardItems([new FakeClipboardItem({ 'text/plain': new Blob(['hello'], { type: 'text/plain' }) })]);

    expect(await prepareClipboardImage()).toBeNull();
  });

  it('writes a png clipboard image verbatim and returns an attachment', async () => {
    const bytes = [0x89, 0x50, 0x4e, 0x47, 0x01, 0x02, 0x03, 0x04];
    setClipboardItems([new FakeClipboardItem({ 'image/png': imageBlob(bytes, 'image/png') })]);

    const attachment = await prepareClipboardImage();
    if (!attachment) throw new Error('Expected a clipboard attachment.');

    expect(attachment.type).toBe('image');
    expect(attachment.mimeType).toBe('image/png');
    expect(attachment.name).toMatch(/^clipboard-.+\.png$/);
    expect(attachment.data).toBe(Buffer.from(bytes).toString('base64'));
    expect(Array.from(await readFile(attachment.path))).toEqual(bytes);
  });

  it('converts non-png clipboard images to png', async () => {
    setClipboardItems([new FakeClipboardItem({ 'image/jpeg': imageBlob([0xff, 0xd8, 0xff], 'image/jpeg') })]);

    const attachment = await prepareClipboardImage();
    if (!attachment) throw new Error('Expected a clipboard attachment.');

    expect(attachment.mimeType).toBe('image/png');
    expect(attachment.name).toMatch(/\.png$/);
  });

  it('returns null when reading the clipboard fails', async () => {
    const read = clipboard.read;
    clipboard.read = async () => {
      throw new Error('clipboard unavailable');
    };

    try {
      expect(await prepareClipboardImage()).toBeNull();
    } finally {
      clipboard.read = read;
    }
  });
});
