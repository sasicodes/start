export interface KeyboardInput {
  key?: string;
  alt?: boolean;
  meta?: boolean;
  code?: string;
  type?: string;
  shift?: boolean;
  control?: boolean;
}

export const isCloseWindowInput = (input: KeyboardInput, isMac: boolean) => {
  const key = input.key?.toLowerCase() ?? '';
  const code = input.code?.toLowerCase() ?? '';
  const isWKey = key === 'w' || code === 'keyw';
  const hasCloseModifier = isMac ? Boolean(input.meta) : Boolean(input.control);

  return input.type === 'keyDown' && isWKey && hasCloseModifier && !input.alt && !input.shift;
};
