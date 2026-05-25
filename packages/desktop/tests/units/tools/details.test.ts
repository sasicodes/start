import { toolEventDetail, toolResultTitle } from '@main/tools/details';
import { describe, expect, it } from 'vitest';

describe('tool details', () => {
  it('renders active browser tool labels for the live activity list', () => {
    expect(
      toolEventDetail({
        key: 'tool:1',
        args: {},
        state: 'active',
        toolName: 'browser_snapshot'
      })
    ).toMatchObject({
      title: 'Reading browser'
    });

    expect(
      toolEventDetail({
        key: 'tool:2',
        args: {},
        state: 'active',
        toolName: 'browser_screenshot'
      })
    ).toMatchObject({
      title: 'Capturing browser'
    });
  });

  it('renders browser tool names as product labels', () => {
    expect(
      toolEventDetail({
        key: 'tool:1',
        state: 'done',
        args: { url: 'https://example.com/' },
        toolName: 'browser_open'
      })
    ).toMatchObject({
      title: 'Opened browser',
      detail: 'https://example.com/'
    });

    expect(
      toolEventDetail({
        key: 'tool:2',
        args: {},
        state: 'done',
        toolName: 'browser_snapshot'
      })
    ).toMatchObject({
      title: 'Read browser'
    });
  });

  it('renders browser tool error labels without raw tool names', () => {
    expect(toolResultTitle('browser_open', true)).toBe('Open failed');
    expect(
      toolEventDetail({
        key: 'tool:1',
        args: {},
        state: 'error',
        toolName: 'browser_snapshot'
      })
    ).toMatchObject({
      title: 'Read failed'
    });
  });
});
