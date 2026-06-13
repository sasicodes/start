type WorkSource = () => boolean;

let source: WorkSource = () => false;

export const workInProgress = () => source();

export const setWorkInProgressSource = (nextSource: WorkSource) => {
  source = nextSource;
};
