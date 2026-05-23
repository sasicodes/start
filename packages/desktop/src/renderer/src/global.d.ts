import type { PiApi } from '@preload/index';

declare global {
  interface Window {
    pi: PiApi;
  }
}
