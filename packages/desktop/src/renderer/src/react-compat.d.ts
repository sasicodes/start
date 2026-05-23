import type { ReactElement, ReactNode } from 'react';

declare module 'preact' {
  interface VNode<P = unknown> extends ReactElement<P> {
    children?: ReactNode;
  }
}
