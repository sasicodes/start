let context: AudioContext | null = null;
let isWarmedUp = false;
let cycleBuffer: AudioBuffer | null = null;

const getContext = () => {
  context ??= new AudioContext();
  return context;
};

const createNoise = (audioContext: AudioContext, duration: number, decay: number) => {
  const length = Math.ceil(audioContext.sampleRate * duration);
  const buffer = audioContext.createBuffer(1, length, audioContext.sampleRate);
  const data = buffer.getChannelData(0);

  for (let index = 0; index < length; index += 1) {
    data[index] = (Math.random() * 2 - 1) * Math.exp(-index / decay);
  }

  return buffer;
};

const getCycleBuffer = (audioContext: AudioContext) => {
  cycleBuffer ??= createNoise(audioContext, 0.004, 20);
  return cycleBuffer;
};

const warmUp = () => {
  if (isWarmedUp) return;
  isWarmedUp = true;
  getCycleBuffer(getContext());
  window.removeEventListener('pointerdown', warmUp, true);
  window.removeEventListener('keydown', warmUp, true);
};

window.addEventListener('pointerdown', warmUp, true);
window.addEventListener('keydown', warmUp, true);

const burst = (audioContext: AudioContext, time: number, buffer: AudioBuffer) => {
  const source = audioContext.createBufferSource();
  const filter = audioContext.createBiquadFilter();
  const gain = audioContext.createGain();

  source.buffer = buffer;
  filter.type = 'highpass';
  filter.frequency.value = 4000;
  filter.Q.value = 1;
  gain.gain.value = 0.35;

  source.connect(filter).connect(gain).connect(audioContext.destination);
  source.start(time);
  source.onended = () => {
    source.disconnect();
    filter.disconnect();
    gain.disconnect();
  };
};

const sweep = (audioContext: AudioContext, time: number) => {
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();

  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(1200, time);
  oscillator.frequency.exponentialRampToValueAtTime(800, time + 0.025);
  gain.gain.setValueAtTime(0.1, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.025);

  oscillator.connect(gain).connect(audioContext.destination);
  oscillator.start(time);
  oscillator.stop(time + 0.025);
  oscillator.onended = () => {
    oscillator.disconnect();
    gain.disconnect();
  };
};

export const playCycleSound = () => {
  const audioContext = getContext();
  if (audioContext.state === 'suspended') void audioContext.resume();

  const time = audioContext.currentTime;
  burst(audioContext, time, getCycleBuffer(audioContext));
  sweep(audioContext, time);
};
