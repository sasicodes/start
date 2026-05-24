export const effectiveOpen = (toggled: ReadonlyMap<string, boolean>, key: string, byDefault: boolean) =>
  toggled.get(key) ?? byDefault;

export const toggleOpen = (toggled: ReadonlyMap<string, boolean>, key: string, currentlyOpen: boolean) => {
  const next = new Map(toggled);
  next.set(key, !currentlyOpen);
  return next;
};
