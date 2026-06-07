import electron from 'electron';

const { powerSaveBlocker } = electron;

let blockerId = -1;

export const setStayAwake = (awake: boolean) => {
  const active = blockerId >= 0 && powerSaveBlocker.isStarted(blockerId);
  if (awake === active) return;

  if (awake) {
    blockerId = powerSaveBlocker.start('prevent-app-suspension');
    return;
  }

  powerSaveBlocker.stop(blockerId);
  blockerId = -1;
};
