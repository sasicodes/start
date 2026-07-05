const wordCharPattern = /[\p{L}\p{N}]$/u;

export const endsMidWord = (text: string): boolean => wordCharPattern.test(text);
