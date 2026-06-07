import { delimiter } from 'node:path';
import type * as Environment from '../../src/main/environment.js';

vi.unmock('@main/environment');

let mergePathValues: typeof Environment.mergePathValues;
let parseShellEnvironment: typeof Environment.parseShellEnvironment;
let shellEnvironmentPayload: typeof Environment.shellEnvironmentPayload;

beforeAll(async () => {
  const environment = await import('../../src/main/environment.js');
  mergePathValues = environment.mergePathValues;
  parseShellEnvironment = environment.parseShellEnvironment;
  shellEnvironmentPayload = environment.shellEnvironmentPayload;
});

describe('main environment', () => {
  it('parses null-separated shell environment output after startup noise', () => {
    const environment = parseShellEnvironment(
      'shell startup text\n__START_SHELL_ENV__\0PATH=/opt/homebrew/bin:/usr/bin\0SHELL=/bin/zsh\0noise\0=empty\0'
    );

    expect(environment.get('PATH')).toBe('/opt/homebrew/bin:/usr/bin');
    expect(environment.get('SHELL')).toBe('/bin/zsh');
    expect(environment.has('noise')).toBe(false);
  });

  it('extracts shell environment payload after the marker', () => {
    expect(shellEnvironmentPayload('startup text\n__START_SHELL_ENV__\0PATH=/opt/homebrew/bin\0')).toBe(
      'PATH=/opt/homebrew/bin\0'
    );
  });

  it('ignores shell output when the marker is missing', () => {
    expect(shellEnvironmentPayload('PATH=/unexpected/bin\0')).toBe('');
    expect(parseShellEnvironment('PATH=/unexpected/bin\0')).toEqual(new Map());
  });

  it('keeps shell PATH entries before launchd fallbacks without duplicates', () => {
    expect(
      mergePathValues(['/opt/homebrew/bin', '/usr/bin'].join(delimiter), ['/usr/bin', '/bin'].join(delimiter))
    ).toBe(['/opt/homebrew/bin', '/usr/bin', '/bin'].join(delimiter));
  });
});
