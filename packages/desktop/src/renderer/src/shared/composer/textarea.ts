const composerMaxLineCount = 4.25;
const composerMultilineLineCount = 1.6;
const fallbackComposerLineHeight = 24;
const widthTolerancePx = 0.5;

interface ComposerTextareaHeightInput {
  lineHeight: number;
  scrollHeight: number;
}

interface ComposerTextareaMultilineInput {
  value: string;
  lineHeight: number;
  compactScrollHeight: number;
}

export interface ComposerTextareaLayoutState {
  multiline: boolean;
  compactWidth: number;
}

interface ComposerTextareaLayoutInput extends ComposerTextareaMultilineInput {
  state: ComposerTextareaLayoutState;
  renderedWidth: number;
}

export const initialComposerTextareaLayoutState = (): ComposerTextareaLayoutState => ({
  multiline: false,
  compactWidth: 0
});

export const composerTextareaHeight = ({ lineHeight, scrollHeight }: ComposerTextareaHeightInput) =>
  Math.min(scrollHeight, lineHeight * composerMaxLineCount);

export const composerTextareaLineHeight = (value: string) => {
  const lineHeight = Number.parseFloat(value);
  return Number.isFinite(lineHeight) && lineHeight > 0 ? lineHeight : fallbackComposerLineHeight;
};

export const shouldUseComposerMultiline = ({
  value,
  lineHeight,
  compactScrollHeight
}: ComposerTextareaMultilineInput) => {
  if (!value.trim()) return false;
  if (value.includes('\n')) return true;
  return compactScrollHeight > lineHeight * composerMultilineLineCount;
};

const compactComposerTextareaWidth = (state: ComposerTextareaLayoutState, renderedWidth: number) =>
  state.multiline || renderedWidth <= 0 ? state.compactWidth : renderedWidth;

export const nextComposerTextareaLayoutState = ({
  state,
  value,
  lineHeight,
  renderedWidth,
  compactScrollHeight
}: ComposerTextareaLayoutInput): ComposerTextareaLayoutState => ({
  multiline: shouldUseComposerMultiline({ value, lineHeight, compactScrollHeight }),
  compactWidth: compactComposerTextareaWidth(state, renderedWidth)
});

const measureTextareaScrollHeight = (element: HTMLTextAreaElement, width: number) => {
  const clone = element.cloneNode() as HTMLTextAreaElement;
  clone.value = element.value;
  clone.rows = element.rows;
  clone.tabIndex = -1;
  clone.style.position = 'absolute';
  clone.style.visibility = 'hidden';
  clone.style.pointerEvents = 'none';
  clone.style.height = 'auto';
  clone.style.width = `${width}px`;
  clone.style.inset = '0 auto auto -10000px';
  clone.style.overflow = 'hidden';
  element.ownerDocument.body.append(clone);
  const scrollHeight = clone.scrollHeight;
  clone.remove();
  return scrollHeight;
};

export const syncComposerTextareaLayout = (
  element: HTMLTextAreaElement,
  value: string,
  state: ComposerTextareaLayoutState
): ComposerTextareaLayoutState => {
  const hasText = value.trim().length > 0;
  element.style.height = 'auto';

  const lineHeight = composerTextareaLineHeight(getComputedStyle(element).lineHeight);
  const renderedWidth = element.getBoundingClientRect().width;
  const compactWidth = compactComposerTextareaWidth(state, renderedWidth);
  const shouldMeasureCompactWidth =
    state.multiline && compactWidth > 0 && Math.abs(compactWidth - renderedWidth) > widthTolerancePx;
  const compactScrollHeight = shouldMeasureCompactWidth
    ? measureTextareaScrollHeight(element, compactWidth)
    : element.scrollHeight;

  element.style.height = hasText
    ? `${composerTextareaHeight({ lineHeight, scrollHeight: element.scrollHeight })}px`
    : '';

  return nextComposerTextareaLayoutState({ state, value, lineHeight, renderedWidth, compactScrollHeight });
};
