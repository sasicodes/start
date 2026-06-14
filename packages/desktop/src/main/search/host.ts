import {
  findWorkspacePaths,
  grepWorkspace,
  multiGrepWorkspace,
  refreshWorkspaceFinder,
  searchWorkspacePaths,
  warmWorkspaceFinder
} from '@main/search/fff';
import type { SearchHostRequest, SearchHostResponse } from '@main/search/types';

const port = process.parentPort;

const runRequest = async (request: SearchHostRequest): Promise<unknown> => {
  switch (request.op) {
    case 'find':
      return findWorkspacePaths(request.args);
    case 'grep':
      return grepWorkspace(request.args);
    case 'search':
      return searchWorkspacePaths(request.args);
    case 'multiGrep':
      return multiGrepWorkspace(request.args);
    case 'refresh':
      return refreshWorkspaceFinder(request.args.workspaceRoot);
    case 'warm':
      warmWorkspaceFinder(request.args.workspaceRoot);
      return true;
  }
};

const handleRequest = async (request: SearchHostRequest) => {
  let value: unknown = null;

  try {
    value = await runRequest(request);
  } catch {
    value = null;
  }

  port.postMessage({ id: request.id, value } satisfies SearchHostResponse);
};

port.on('message', (event) => {
  handleRequest(event.data as SearchHostRequest);
});
