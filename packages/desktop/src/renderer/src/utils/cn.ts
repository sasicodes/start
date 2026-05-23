type ClassValue = string | false | null | undefined;

export const cn = (...values: ClassValue[]) => {
  return values.filter(Boolean).join(' ');
};
