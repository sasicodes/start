import { randomUUID } from 'node:crypto';
import { mkdir, open, readFile, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import electron from 'electron';
import type { ImageAttachment, PreparedDropFiles } from '@main/types';

const { app, clipboard, nativeImage } = electron;

export type PreparedImageAttachment = ImageAttachment & {
  data: string;
};

export type PreparedFiles = Omit<PreparedDropFiles, 'attachments'> & {
  attachments: PreparedImageAttachment[];
};

const maxImageDimension = 2000;
const maxPreviewDimension = 96;
const imageTypeSniffBytes = 4100;
const maxImageBase64Bytes = 4.5 * 1024 * 1024;
const jpegQualities = [80, 85, 70, 55, 40];
const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

const startsWith = (buffer: Buffer, bytes: number[]) => {
  if (buffer.length < bytes.length) return false;
  return bytes.every((byte, index) => buffer[index] === byte);
};

const startsWithAscii = (buffer: Buffer, offset: number, text: string) => {
  if (buffer.length < offset + text.length) return false;

  for (let index = 0; index < text.length; index++) {
    if (buffer[offset + index] !== text.charCodeAt(index)) return false;
  }

  return true;
};

const readUint32BE = (buffer: Buffer, offset: number) => {
  return (
    (buffer[offset] ?? 0) * 0x1000000 +
    ((buffer[offset + 1] ?? 0) << 16) +
    ((buffer[offset + 2] ?? 0) << 8) +
    (buffer[offset + 3] ?? 0)
  );
};

const isPng = (buffer: Buffer) => {
  return buffer.length >= 16 && readUint32BE(buffer, pngSignature.length) === 13 && startsWithAscii(buffer, 12, 'IHDR');
};

const isAnimatedPng = (buffer: Buffer) => {
  let offset = pngSignature.length;

  while (offset + 8 <= buffer.length) {
    const chunkLength = readUint32BE(buffer, offset);
    const chunkTypeOffset = offset + 4;
    if (startsWithAscii(buffer, chunkTypeOffset, 'acTL')) return true;
    if (startsWithAscii(buffer, chunkTypeOffset, 'IDAT')) return false;

    const nextOffset = offset + 8 + chunkLength + 4;
    if (nextOffset <= offset || nextOffset > buffer.length) return false;
    offset = nextOffset;
  }

  return false;
};

const detectSupportedImageMimeType = (buffer: Buffer) => {
  if (startsWith(buffer, [0xff, 0xd8, 0xff])) return buffer[3] === 0xf7 ? null : 'image/jpeg';
  if (startsWith(buffer, pngSignature)) return isPng(buffer) && !isAnimatedPng(buffer) ? 'image/png' : null;
  if (startsWithAscii(buffer, 0, 'GIF')) return 'image/gif';
  if (startsWithAscii(buffer, 0, 'RIFF') && startsWithAscii(buffer, 8, 'WEBP')) return 'image/webp';
  return null;
};

const base64Size = (byteLength: number) => Math.ceil(byteLength / 3) * 4;

const encodeImage = (buffer: Buffer, mimeType: string) => {
  const data = buffer.toString('base64');
  return { data, mimeType, size: Buffer.byteLength(data, 'utf8') };
};

const imageSizeWithinBounds = (buffer: Buffer) => {
  const image = nativeImage.createFromBuffer(buffer);
  if (image.isEmpty()) return false;

  const { width, height } = image.getSize();
  return width > 0 && height > 0 && width <= maxImageDimension && height <= maxImageDimension;
};

const targetImageSize = (width: number, height: number, maxDimension: number) => {
  const scale = Math.min(1, maxDimension / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale))
  };
};

const resizedImageCandidate = (image: Electron.NativeImage, width: number, height: number) => {
  const resized = image.resize({ width, height, quality: 'best' });
  if (resized.isEmpty()) return;

  const png = encodeImage(resized.toPNG(), 'image/png');
  if (png.size < maxImageBase64Bytes) return { data: png.data, mimeType: png.mimeType };

  for (const quality of jpegQualities) {
    const jpeg = encodeImage(resized.toJPEG(quality), 'image/jpeg');
    if (jpeg.size < maxImageBase64Bytes) return { data: jpeg.data, mimeType: jpeg.mimeType };
  }

  return;
};

const resizeImage = (buffer: Buffer) => {
  const image = nativeImage.createFromBuffer(buffer);
  if (image.isEmpty()) return null;

  const size = image.getSize();
  if (size.width <= 0 || size.height <= 0) return null;

  let { width, height } = targetImageSize(size.width, size.height, maxImageDimension);

  while (true) {
    const candidate = resizedImageCandidate(image, width, height);
    if (candidate) return candidate;
    if (width === 1 && height === 1) return null;

    const nextWidth = width === 1 ? 1 : Math.max(1, Math.floor(width * 0.75));
    const nextHeight = height === 1 ? 1 : Math.max(1, Math.floor(height * 0.75));
    if (nextWidth === width && nextHeight === height) return null;

    width = nextWidth;
    height = nextHeight;
  }
};

const previewUrl = (buffer: Buffer, fallback: { data: string; mimeType: string }) => {
  const image = nativeImage.createFromBuffer(buffer);
  if (image.isEmpty()) return `data:${fallback.mimeType};base64,${fallback.data}`;

  const size = image.getSize();
  if (size.width <= 0 || size.height <= 0) return `data:${fallback.mimeType};base64,${fallback.data}`;

  const target = targetImageSize(size.width, size.height, maxPreviewDimension);
  const preview = image.resize({ ...target, quality: 'best' });
  if (preview.isEmpty()) return `data:${fallback.mimeType};base64,${fallback.data}`;

  return `data:image/jpeg;base64,${preview.toJPEG(62).toString('base64')}`;
};

const tempAttachmentPath = async (name: string) => {
  const directory = path.join(app.isReady() ? app.getPath('temp') : tmpdir(), 'start-attachments');
  await mkdir(directory, { recursive: true });
  return path.join(directory, name);
};

const prepareImageBuffer = async (filePath: string, buffer: Buffer, mimeType: string) => {
  const needsNativeBounds = mimeType === 'image/jpeg' || mimeType === 'image/png';
  const originalMightFit = base64Size(buffer.byteLength) < maxImageBase64Bytes;
  const originalUsable = originalMightFit && (!needsNativeBounds || imageSizeWithinBounds(buffer));
  let encoded: ReturnType<typeof encodeImage> | undefined;
  if (originalUsable) encoded = encodeImage(buffer, mimeType);
  const image = encoded ? { data: encoded.data, mimeType: encoded.mimeType } : resizeImage(buffer);
  if (!image) return;

  return {
    ...image,
    id: randomUUID(),
    path: filePath,
    type: 'image' as const,
    name: path.basename(filePath),
    previewUrl: previewUrl(buffer, image),
    mimeType: image.mimeType
  };
};

const sniffImageMimeType = async (filePath: string) => {
  const fileHandle = await open(filePath, 'r').catch(() => {});
  if (!fileHandle) return null;

  try {
    const buffer = Buffer.alloc(imageTypeSniffBytes);
    const { bytesRead } = await fileHandle.read(buffer, 0, imageTypeSniffBytes, 0);
    return detectSupportedImageMimeType(buffer.subarray(0, bytesRead));
  } finally {
    await fileHandle.close();
  }
};

const prepareImageAttachment = async (filePath: string) => {
  const fileStat = await stat(filePath).catch(() => {});
  if (!fileStat?.isFile()) return;

  const mimeType = await sniffImageMimeType(filePath);
  if (!mimeType) return;

  const buffer = await readFile(filePath).catch(() => {});
  if (!buffer) return;
  return prepareImageBuffer(filePath, buffer, mimeType);
};

const toPosixPath = (filePath: string) => filePath.split(path.sep).join(path.posix.sep);

export const stripAttachmentData = (attachment: PreparedImageAttachment): ImageAttachment => ({
  id: attachment.id,
  name: attachment.name,
  path: attachment.path,
  type: attachment.type,
  mimeType: attachment.mimeType,
  previewUrl: attachment.previewUrl
});

export const prepareClipboardImage = async () => {
  const image = clipboard.readImage();
  if (image.isEmpty()) return null;

  const name = `clipboard-${randomUUID()}.png`;
  const filePath = await tempAttachmentPath(name);
  const buffer = image.toPNG();
  await writeFile(filePath, buffer);
  return prepareImageBuffer(filePath, buffer, 'image/png');
};

export const prepareDroppedFiles = async (paths: string[]): Promise<PreparedFiles> => {
  const seenPaths = new Set<string>();
  const pathTokens: string[] = [];
  const attachments: PreparedImageAttachment[] = [];

  for (const rawPath of paths) {
    const filePath = path.resolve(rawPath);
    if (seenPaths.has(filePath)) continue;
    seenPaths.add(filePath);

    const attachment = await prepareImageAttachment(filePath);
    if (attachment) {
      attachments.push(attachment);
    } else {
      pathTokens.push(toPosixPath(filePath));
    }
  }

  return { attachments, pathTokens };
};
