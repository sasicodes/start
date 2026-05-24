const initialBufferBytes = 1024;
const encoder = new TextEncoder();
const surrogatePattern = /[\uD800-\uDFFF]/;
const decoder = new TextDecoder('utf-8', { ignoreBOM: true });

let buffer = new Uint8Array(initialBufferBytes);

export const detachString = (value: string) => {
  if (value.length === 0) return value;
  if (surrogatePattern.test(value)) return JSON.parse(JSON.stringify(value)) as string;

  const requiredBytes = value.length * 3;
  if (buffer.length < requiredBytes) buffer = new Uint8Array(requiredBytes);

  const { written } = encoder.encodeInto(value, buffer);
  return decoder.decode(buffer.subarray(0, written));
};

export const releaseDetachStringBuffer = () => {
  buffer = new Uint8Array(initialBufferBytes);
};
