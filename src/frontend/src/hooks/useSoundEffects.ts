import { useCallback, useRef } from "react";

let sharedAudioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let _isMuted = false;

function getAudioContext(): { ctx: AudioContext; master: GainNode } {
  if (!sharedAudioCtx) {
    sharedAudioCtx = new AudioContext();
    masterGain = sharedAudioCtx.createGain();
    masterGain.gain.value = 0.5;
    masterGain.connect(sharedAudioCtx.destination);
  }
  return { ctx: sharedAudioCtx, master: masterGain! };
}

export function useSoundEffects() {
  const forestAmbientRef = useRef<{ stop: () => void } | null>(null);
  const tribalDrumsRef = useRef<{ stop: () => void } | null>(null);
  const conquestDroneRef = useRef<{ stop: () => void } | null>(null);
  const mutedRef = useRef(false);

  const playTone = useCallback(
    (
      freq: number,
      duration: number,
      type: OscillatorType = "sine",
      volume = 0.3,
    ) => {
      if (mutedRef.current) return;
      try {
        const { ctx, master } = getAudioContext();
        if (ctx.state === "suspended") ctx.resume();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(volume, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(
          0.001,
          ctx.currentTime + duration,
        );
        osc.connect(gain);
        gain.connect(master);
        osc.start();
        osc.stop(ctx.currentTime + duration);
      } catch {}
    },
    [],
  );

  const playUnitSelect = useCallback(() => {
    playTone(440, 0.15, "sine", 0.2);
    setTimeout(() => playTone(550, 0.1, "sine", 0.15), 80);
  }, [playTone]);

  const playUnitMove = useCallback(() => {
    playTone(300, 0.1, "triangle", 0.15);
    setTimeout(() => playTone(350, 0.08, "triangle", 0.1), 60);
  }, [playTone]);

  const playAttack = useCallback(() => {
    playTone(200, 0.2, "sawtooth", 0.3);
    setTimeout(() => playTone(150, 0.15, "square", 0.2), 50);
  }, [playTone]);

  const playCaptureStart = useCallback(() => {
    playTone(330, 0.3, "sine", 0.25);
    setTimeout(() => playTone(440, 0.3, "sine", 0.2), 150);
  }, [playTone]);

  const playCaptureComplete = useCallback(() => {
    [440, 550, 660, 880].forEach((freq, i) => {
      setTimeout(() => playTone(freq, 0.3, "sine", 0.3), i * 100);
    });
  }, [playTone]);

  const playFortify = useCallback(() => {
    playTone(220, 0.4, "triangle", 0.2);
    setTimeout(() => playTone(330, 0.3, "triangle", 0.15), 200);
  }, [playTone]);

  const playGameOverFanfare = useCallback(() => {
    if (mutedRef.current) return;
    try {
      const { ctx, master } = getAudioContext();
      if (ctx.state === "suspended") ctx.resume();
      const notes = [523, 659, 784, 1047];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        const startTime = ctx.currentTime + i * 0.25;
        gain.gain.setValueAtTime(0.4, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.5);
        osc.connect(gain);
        gain.connect(master);
        osc.start(startTime);
        osc.stop(startTime + 0.5);
      });
    } catch {}
  }, []);

  const playMusketFire = useCallback(() => {
    if (mutedRef.current) return;
    try {
      const { ctx, master } = getAudioContext();
      if (ctx.state === "suspended") ctx.resume();
      // Sharp crack using noise burst
      const bufferSize = ctx.sampleRate * 0.15;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.05));
      }
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.8, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = 800;
      filter.Q.value = 0.5;
      source.connect(filter);
      filter.connect(gain);
      gain.connect(master);
      source.start();
    } catch {}
  }, []);

  const playConstructionSound = useCallback(() => {
    if (mutedRef.current) return;
    try {
      const { ctx, master } = getAudioContext();
      if (ctx.state === "suspended") ctx.resume();
      // Wood tapping sound
      for (let i = 0; i < 3; i++) {
        setTimeout(() => {
          const bufferSize = ctx.sampleRate * 0.08;
          const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
          const data = buffer.getChannelData(0);
          for (let j = 0; j < bufferSize; j++) {
            data[j] =
              (Math.random() * 2 - 1) * Math.exp(-j / (bufferSize * 0.1));
          }
          const source = ctx.createBufferSource();
          source.buffer = buffer;
          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0.4, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
          const filter = ctx.createBiquadFilter();
          filter.type = "bandpass";
          filter.frequency.value = 300;
          filter.Q.value = 2;
          source.connect(filter);
          filter.connect(gain);
          gain.connect(master);
          source.start();
        }, i * 150);
      }
    } catch {}
  }, []);

  const playForestAmbient = useCallback(() => {
    if (mutedRef.current) return;
    if (forestAmbientRef.current) return; // already playing
    try {
      const { ctx, master } = getAudioContext();
      if (ctx.state === "suspended") ctx.resume();

      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 1);
      gainNode.connect(master);

      // Wind noise
      const bufferSize = ctx.sampleRate * 2;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
      const windSource = ctx.createBufferSource();
      windSource.buffer = buffer;
      windSource.loop = true;
      const windFilter = ctx.createBiquadFilter();
      windFilter.type = "lowpass";
      windFilter.frequency.value = 400;
      windSource.connect(windFilter);
      windFilter.connect(gainNode);
      windSource.start();

      let stopped = false;
      forestAmbientRef.current = {
        stop: () => {
          if (stopped) return;
          stopped = true;
          gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
          setTimeout(() => {
            try {
              windSource.stop();
            } catch {}
            forestAmbientRef.current = null;
          }, 600);
        },
      };
    } catch {}
  }, []);

  const stopForestAmbient = useCallback(() => {
    forestAmbientRef.current?.stop();
  }, []);

  const playTribalDrums = useCallback(() => {
    if (mutedRef.current) return;
    if (tribalDrumsRef.current) return;
    try {
      const { ctx, master } = getAudioContext();
      if (ctx.state === "suspended") ctx.resume();

      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 1);
      gainNode.connect(master);

      let stopped = false;
      let beatCount = 0;

      const playBeat = () => {
        if (stopped) return;
        const osc = ctx.createOscillator();
        const beatGain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(
          80 + (beatCount % 4 === 0 ? 20 : 0),
          ctx.currentTime,
        );
        beatGain.gain.setValueAtTime(0.6, ctx.currentTime);
        beatGain.gain.exponentialRampToValueAtTime(
          0.001,
          ctx.currentTime + 0.3,
        );
        osc.connect(beatGain);
        beatGain.connect(gainNode);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
        beatCount++;
        if (!stopped) setTimeout(playBeat, beatCount % 4 === 0 ? 600 : 300);
      };

      playBeat();

      tribalDrumsRef.current = {
        stop: () => {
          stopped = true;
          gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
          setTimeout(() => {
            tribalDrumsRef.current = null;
          }, 600);
        },
      };
    } catch {}
  }, []);

  const stopTribalDrums = useCallback(() => {
    tribalDrumsRef.current?.stop();
  }, []);

  const playConquestDrone = useCallback(() => {
    if (mutedRef.current) return;
    if (conquestDroneRef.current) return;
    try {
      const { ctx, master } = getAudioContext();
      if (ctx.state === "suspended") ctx.resume();

      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 1);
      gainNode.connect(master);

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      osc1.type = "sawtooth";
      osc2.type = "sawtooth";
      osc1.frequency.setValueAtTime(100, ctx.currentTime);
      osc1.frequency.linearRampToValueAtTime(200, ctx.currentTime + 10);
      osc2.frequency.setValueAtTime(105, ctx.currentTime);
      osc2.frequency.linearRampToValueAtTime(205, ctx.currentTime + 10);

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      osc1.start();
      osc2.start();

      let stopped = false;
      conquestDroneRef.current = {
        stop: () => {
          if (stopped) return;
          stopped = true;
          gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
          setTimeout(() => {
            try {
              osc1.stop();
              osc2.stop();
            } catch {}
            conquestDroneRef.current = null;
          }, 600);
        },
      };
    } catch {}
  }, []);

  const stopConquestDrone = useCallback(() => {
    conquestDroneRef.current?.stop();
  }, []);

  const setMuted = useCallback((muted: boolean) => {
    mutedRef.current = muted;
    _isMuted = muted;
    if (muted) {
      forestAmbientRef.current?.stop();
      tribalDrumsRef.current?.stop();
      conquestDroneRef.current?.stop();
    }
    if (masterGain) {
      masterGain.gain.value = muted ? 0 : 0.5;
    }
  }, []);

  return {
    playUnitSelect,
    playUnitMove,
    playAttack,
    playCaptureStart,
    playCaptureComplete,
    playFortify,
    playGameOverFanfare,
    playMusketFire,
    playConstructionSound,
    playForestAmbient,
    stopForestAmbient,
    playTribalDrums,
    stopTribalDrums,
    playConquestDrone,
    stopConquestDrone,
    setMuted,
  };
}
