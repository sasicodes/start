import { stat } from 'node:fs/promises';
import path from 'node:path';
import * as v from 'valibot';

export const cliWorkspaceFlag = '--start-open-workspace';

export interface CliLaunchRequest {
  workspacePath: string;
}

export type CliWorkspaceResolution =
  | { ok: true; workspacePath: string }
  | { ok: false; error: string; workspacePath: string };

const cliLaunchRequestSchema = v.object({
  workspacePath: v.pipe(v.string(), v.trim(), v.minLength(1))
});

const cliAdditionalDataSchema = v.object({
  start: cliLaunchRequestSchema
});

const cliPathArgSchema = v.pipe(v.string(), v.trim(), v.minLength(1));

export const parseCliLaunchArgv = (argv: readonly string[]): CliLaunchRequest | null => {
  const flagIndex = argv.indexOf(cliWorkspaceFlag);
  if (flagIndex < 0) return null;

  const result = v.safeParse(cliPathArgSchema, argv[flagIndex + 1]);
  return result.success ? { workspacePath: result.output } : null;
};

export const parseCliAdditionalData = (value: unknown): CliLaunchRequest | null => {
  const result = v.safeParse(cliAdditionalDataSchema, value);
  return result.success ? result.output.start : null;
};

export const resolveCliWorkspacePath = async (
  workspacePath: string,
  cwd = process.cwd()
): Promise<CliWorkspaceResolution> => {
  const resolvedPath = path.resolve(cwd, workspacePath);
  const details = await stat(resolvedPath).catch(() => null);

  if (details?.isDirectory()) {
    return {
      ok: true,
      workspacePath: resolvedPath
    };
  }

  return {
    ok: false,
    workspacePath: resolvedPath,
    error: `Workspace path does not exist or is not a directory: ${workspacePath}`
  };
};
