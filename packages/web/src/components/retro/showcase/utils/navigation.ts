export const getSlide = (active: number, count: number, key: string) => {
  if (key === 'ArrowLeft') return (active + count - 1) % count;
  if (key === 'ArrowRight') return (active + 1) % count;
  return null;
};
