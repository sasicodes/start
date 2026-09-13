export type BrowserScrollDirection = 'up' | 'down' | 'left' | 'right';

export interface BrowserScrollDelta {
  x: number;
  y: number;
}

const defaultScrollAmount = 600;
const minScrollAmount = 40;
const maxScrollAmount = 4000;

export const browserScrollDelta = (direction: BrowserScrollDirection, amount?: number): BrowserScrollDelta => {
  const requested = Number.isFinite(amount) && Number(amount) > 0 ? Number(amount) : defaultScrollAmount;
  const distance = Math.round(Math.min(maxScrollAmount, Math.max(minScrollAmount, requested)));

  if (direction === 'up') return { x: 0, y: -distance };
  if (direction === 'down') return { x: 0, y: distance };
  if (direction === 'left') return { x: -distance, y: 0 };
  return { x: distance, y: 0 };
};
