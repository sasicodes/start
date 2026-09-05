import { readFile, unlink } from 'node:fs/promises';
import { prepareClipboardImage } from '@main/attachments';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clipboard, FakeClipboardItem, nativeImage, setClipboardItems } from '../fakes/electron.js';

vi.unmock('@main/attachments');

const paths: string[] = [];
const jpeg = Buffer.from([0xff, 0xd8, 0xff]);
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jV1sAAAAASUVORK5CYII=',
  'base64'
);

const imageBlob = (bytes: Buffer, type: string) => new Blob([new Uint8Array(bytes)], { type });

const expectAttachment = async () => {
  const attachment = await prepareClipboardImage();
  if (!attachment) throw new Error('Expected a clipboard attachment.');
  paths.push(attachment.path);

  expect(attachment.type).toBe('image');
  expect(attachment.mimeType).toBe('image/png');
  expect(attachment.name).toMatch(/^clipboard-.+\.png$/);
  expect(attachment.data).toBe(png.toString('base64'));
  expect(await readFile(attachment.path)).toEqual(png);
};

describe('prepareClipboardImage', () => {
  beforeEach(() => {
    setClipboardItems([]);
    const image = nativeImage.createFromBuffer(png);
    vi.spyOn(nativeImage, 'createFromBuffer').mockImplementation((buffer) => ({
      ...image,
      toPNG: () => png,
      toJPEG: () => jpeg,
      isEmpty: () => !buffer.equals(png) && !buffer.equals(jpeg)
    }));
  });

  afterEach(async () => {
    await Promise.all(paths.splice(0).map((filePath) => unlink(filePath)));
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
    setClipboardItems([new FakeClipboardItem({ 'image/png': imageBlob(png, 'image/png') })]);

    await expectAttachment();
  });

  it('converts non-png clipboard images to png', async () => {
    setClipboardItems([new FakeClipboardItem({ 'image/jpeg': imageBlob(jpeg, 'image/jpeg') })]);

    await expectAttachment();
  });

  it('uses png when an unsupported image format comes first', async () => {
    setClipboardItems([
      new FakeClipboardItem({
        'image/svg+xml': new Blob(['<svg/>'], { type: 'image/svg+xml' }),
        'image/png': imageBlob(png, 'image/png')
      })
    ]);

    await expectAttachment();
  });

  it('prefers png over jpeg regardless of format order', async () => {
    const item = new FakeClipboardItem({
      'image/jpeg': imageBlob(jpeg, 'image/jpeg'),
      'image/png': imageBlob(png, 'image/png')
    });
    const getType = vi.spyOn(item, 'getType');
    setClipboardItems([item]);

    await expectAttachment();
    expect(getType).toHaveBeenCalledExactlyOnceWith('image/png');
  });

  it('tries jpeg when the png representation cannot be decoded', async () => {
    setClipboardItems([
      new FakeClipboardItem({
        'image/png': imageBlob(Buffer.alloc(0), 'image/png'),
        'image/jpeg': imageBlob(jpeg, 'image/jpeg')
      })
    ]);

    await expectAttachment();
  });

  it('continues to a usable item when retrieving an image fails', async () => {
    const item = new FakeClipboardItem({ 'image/png': imageBlob(png, 'image/png') });
    vi.spyOn(item, 'getType').mockRejectedValue(new Error('clipboard changed'));
    setClipboardItems([item, new FakeClipboardItem({ 'image/png': imageBlob(png, 'image/png') })]);

    await expectAttachment();
  });

  it('returns null when no image representation can be decoded', async () => {
    setClipboardItems([new FakeClipboardItem({ 'image/png': imageBlob(Buffer.alloc(0), 'image/png') })]);

    expect(await prepareClipboardImage()).toBeNull();
  });

  it('returns null when all image reads fail', async () => {
    const item = new FakeClipboardItem({ 'image/png': imageBlob(png, 'image/png') });
    vi.spyOn(item, 'getType').mockRejectedValue(new Error('clipboard unavailable'));
    setClipboardItems([item]);

    expect(await prepareClipboardImage()).toBeNull();
  });

  it('returns null when reading the clipboard fails', async () => {
    vi.spyOn(clipboard, 'read').mockRejectedValue(new Error('clipboard unavailable'));

    expect(await prepareClipboardImage()).toBeNull();
  });
});
