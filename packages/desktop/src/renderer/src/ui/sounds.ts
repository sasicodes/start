import { createThrottle } from '@renderer/ui/throttle';
import { signal } from '@preact/signals';

const soundsEnabledStorageKey = 'start:sounds-enabled';

export const soundsEnabled = signal(window.localStorage.getItem(soundsEnabledStorageKey) !== 'false');

export const setSoundsEnabled = (enabled: boolean) => {
  soundsEnabled.value = enabled;
  window.localStorage.setItem(soundsEnabledStorageKey, `${enabled}`);
};

let context: AudioContext | null = null;
let isWarmedUp = false;
let cycleBuffer: AudioBuffer | null = null;
let toggleBuffer: AudioBuffer | null = null;

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

const getToggleBuffer = (audioContext: AudioContext) => {
  toggleBuffer ??= createNoise(audioContext, 0.012, 80);
  return toggleBuffer;
};

const warmUp = () => {
  if (isWarmedUp) return;
  isWarmedUp = true;
  const audioContext = getContext();
  getCycleBuffer(audioContext);
  getToggleBuffer(audioContext);
  window.removeEventListener('pointerdown', warmUp, true);
  window.removeEventListener('keydown', warmUp, true);
};

window.addEventListener('pointerdown', warmUp, true);
window.addEventListener('keydown', warmUp, true);

interface BurstOptions {
  type: BiquadFilterType;
  frequency: number;
  volume: number;
  q: number;
}

const burst = (audioContext: AudioContext, time: number, buffer: AudioBuffer, options: BurstOptions) => {
  const source = audioContext.createBufferSource();
  const filter = audioContext.createBiquadFilter();
  const gain = audioContext.createGain();

  source.buffer = buffer;
  filter.type = options.type;
  filter.frequency.value = options.frequency;
  filter.Q.value = options.q;
  gain.gain.value = options.volume;

  source.connect(filter).connect(gain).connect(audioContext.destination);
  source.start(time);
  source.onended = () => {
    source.disconnect();
    filter.disconnect();
    gain.disconnect();
  };
};

interface SweepOptions {
  duration: number;
  volume: number;
  from: number;
  to: number;
}

const sweep = (audioContext: AudioContext, time: number, options: SweepOptions) => {
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();

  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(options.from, time);
  oscillator.frequency.exponentialRampToValueAtTime(options.to, time + options.duration);
  gain.gain.setValueAtTime(options.volume, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + options.duration);

  oscillator.connect(gain).connect(audioContext.destination);
  oscillator.start(time);
  oscillator.stop(time + options.duration);
  oscillator.onended = () => {
    oscillator.disconnect();
    gain.disconnect();
  };
};

const resumedContext = () => {
  const audioContext = getContext();
  if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
  return audioContext;
};

export const playCycleSound = () => {
  if (!soundsEnabled.value) return;
  const audioContext = resumedContext();
  const time = audioContext.currentTime;
  burst(audioContext, time, getCycleBuffer(audioContext), { type: 'highpass', frequency: 4000, volume: 0.35, q: 1 });
  sweep(audioContext, time, { duration: 0.025, volume: 0.1, from: 1200, to: 800 });
};

export const playToggleSound = () => {
  if (!soundsEnabled.value) return;
  const audioContext = resumedContext();
  const time = audioContext.currentTime;
  burst(audioContext, time, getToggleBuffer(audioContext), { type: 'bandpass', frequency: 2500, volume: 0.4, q: 3 });
  sweep(audioContext, time, { duration: 0.04, volume: 0.15, from: 800, to: 400 });
};

interface ToneOptions {
  type?: OscillatorType;
  frequency: number;
  duration: number;
  volume: number;
}

const tone = (audioContext: AudioContext, time: number, options: ToneOptions) => {
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();

  oscillator.type = options.type ?? 'sine';
  oscillator.frequency.value = options.frequency;
  gain.gain.setValueAtTime(0, time);
  gain.gain.linearRampToValueAtTime(options.volume, time + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.001, time + options.duration);

  oscillator.connect(gain).connect(audioContext.destination);
  oscillator.start(time);
  oscillator.stop(time + options.duration);
  oscillator.onended = () => {
    oscillator.disconnect();
    gain.disconnect();
  };
};

type AgentSound = 'done' | 'attention' | 'error';

const agentSoundThrottled = createThrottle(400);

const agentSoundBlocked = (name: AgentSound) => !soundsEnabled.value || agentSoundThrottled(name);

export const playDoneSound = () => {
  if (agentSoundBlocked('done')) return;
  const audioContext = resumedContext();
  const time = audioContext.currentTime;
  tone(audioContext, time, { frequency: 523, duration: 0.15, volume: 0.09 });
  tone(audioContext, time + 0.1, { frequency: 659, duration: 0.18, volume: 0.09 });
  tone(audioContext, time + 0.2, { frequency: 784, duration: 0.22, volume: 0.08 });
};

export const playAttentionSound = () => {
  if (agentSoundBlocked('attention')) return;
  const audioContext = resumedContext();
  const time = audioContext.currentTime;
  tone(audioContext, time, { frequency: 880, duration: 0.12, volume: 0.08 });
  tone(audioContext, time + 0.15, { frequency: 880, duration: 0.12, volume: 0.08 });
};

export const playErrorSound = () => {
  if (agentSoundBlocked('error')) return;
  const audioContext = resumedContext();
  const time = audioContext.currentTime;
  tone(audioContext, time, { type: 'triangle', frequency: 440, duration: 0.2, volume: 0.09 });
  tone(audioContext, time + 0.15, { type: 'triangle', frequency: 349, duration: 0.25, volume: 0.08 });
};
