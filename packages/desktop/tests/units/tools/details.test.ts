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
      title: 'Reading Browser'
    });

    expect(
      toolEventDetail({
        key: 'tool:2',
        args: {},
        state: 'active',
        toolName: 'browser_screenshot'
      })
    ).toMatchObject({
      title: 'Capturing Browser'
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
      title: 'Opened Browser',
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
      title: 'Read Browser'
    });

    expect(
      toolEventDetail({
        key: 'tool:3',
        state: 'done',
        args: { ref: 'e1' },
        toolName: 'browser_click'
      })
    ).toMatchObject({
      title: 'Clicked Browser'
    });
  });

  it('renders browser tool error labels without raw tool names', () => {
    expect(toolResultTitle('browser_open', true)).toBe('Open failed');
    expect(toolResultTitle('browser_type', true)).toBe('Type failed');
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

  it('renders web search labels and query detail', () => {
    expect(toolResultTitle('web_search', false)).toBe('Searched Web');
    expect(toolResultTitle('web_search', true)).toBe('Web search failed');
    expect(
      toolEventDetail({
        key: 'tool:1',
        state: 'active',
        toolName: 'web_search',
        args: { query: 'package release notes' }
      })
    ).toMatchObject({
      detail: 'package release notes',
      title: 'Searching Web for package release notes'
    });
    expect(
      toolEventDetail({
        key: 'tool:2',
        state: 'done',
        toolName: 'web_search',
        args: { query: 'package release notes' },
        result: { details: { resultCount: 2 }, content: [{ type: 'text', text: 'Done' }] }
      })
    ).toMatchObject({
      metric: '2 results',
      title: 'Searched Web for package release notes'
    });
  });

  it('renders find no-results as a normal tool detail', () => {
    expect(
      toolEventDetail({
        key: 'tool:1',
        state: 'error',
        args: { pattern: '*' },
        toolName: 'find',
        result: {
          content: [{ type: 'text', text: 'No files found matching pattern' }]
        }
      })
    ).toMatchObject({
      kind: 'tool',
      state: 'done',
      title: 'Found files matching *'
    });
  });
});
