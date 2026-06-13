import { logger } from '@main/utils/logger';
import { afterEach, describe, expect, it, vi } from 'vitest';

describe('logger', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('writes the scope and an error stack to stderr', () => {
    const write = vi.spyOn(process.stderr, 'write').mockReturnValue(true);
    const error = new Error('boom');
    logger.error('shell environment', error);

    expect(write).toHaveBeenCalledTimes(1);
    expect(write).toHaveBeenCalledWith(expect.stringContaining('[start] shell environment:'));
    expect(write).toHaveBeenCalledWith(expect.stringContaining(error.stack ?? 'boom'));
    expect(write).toHaveBeenCalledWith(expect.stringMatching(/\n$/));
  });

  it('stringifies non-error values', () => {
    const write = vi.spyOn(process.stderr, 'write').mockReturnValue(true);
    logger.error('storage parse', 'corrupt row');

    expect(write).toHaveBeenCalledWith(
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}T.*\[start\] storage parse: corrupt row\n$/)
    );
  });

  it('writes from utility processes without app-level state', () => {
    const hadParentPort = Reflect.has(process, 'parentPort');
    const parentPort = Reflect.get(process, 'parentPort');
    const write = vi.spyOn(process.stderr, 'write').mockReturnValue(true);

    try {
      Reflect.set(process, 'parentPort', {});
      logger.error('fff load', new Error('native module missing'));
    } finally {
      if (hadParentPort) Reflect.set(process, 'parentPort', parentPort);
      else Reflect.deleteProperty(process, 'parentPort');
    }

    expect(write).toHaveBeenCalledWith(expect.stringContaining('[start] fff load:'));
  });
});
