export const deferred = <T>() => {
  let resolve: (value: T) => void = () => {};
  let reject: (reason: unknown) => void = () => {};
  const promise = new Promise<T>((complete, fail) => {
    reject = fail;
    resolve = complete;
  });
  return { promise, resolve, reject };
};
