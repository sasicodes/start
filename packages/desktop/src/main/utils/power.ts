import electron from 'electron';

const { powerSaveBlocker } = electron;

let blockerId = -1;

interface StayAwakeConditions {
  keepAwake: boolean;
  onBattery: boolean;
  relayActive: boolean;
}

export const shouldStayAwake = ({ keepAwake, onBattery, relayActive }: StayAwakeConditions) =>
  keepAwake && relayActive && !onBattery;

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
