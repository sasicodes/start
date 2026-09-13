import { expect, it } from 'vitest';
import { getSlide } from '../src/components/retro/showcase/utils/navigation';

it.each([
  [3, 'ArrowLeft', 2],
  [3, 'ArrowRight', 4],
  [0, 'ArrowLeft', 7],
  [7, 'ArrowRight', 0],
  [3, 'ArrowDown', null],
  [3, 'Enter', null]
])('navigates from %s with %s to %s', (active, key, expected) => {
  expect(getSlide(active, 8, key)).toBe(expected);
});
