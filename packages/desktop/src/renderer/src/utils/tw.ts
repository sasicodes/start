type ClassValue = string | false | null | undefined;

export const tw = (...values: ClassValue[]) => values.filter(Boolean).join(' ');
