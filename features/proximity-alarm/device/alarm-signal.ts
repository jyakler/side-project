/**
 * Repeating sound and vibration for a ringing alarm, within what the web allows.
 * Do-not-disturb and silent-mode handling belong to the native app.
 */
export function createAlarmSignal() {
  let context: AudioContext | null = null;
  let timer: ReturnType<typeof setInterval> | null = null;

  function beep() {
    if (!context) return;
    const now = context.currentTime;
    for (const offset of [0, 0.25]) {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "square";
      oscillator.frequency.value = 880;
      gain.gain.setValueAtTime(0.25, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.2);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(now + offset);
      oscillator.stop(now + offset + 0.2);
    }
    navigator.vibrate?.([400, 200, 400]);
  }

  return {
    /** Call from a user gesture (e.g. the start button) so audio may play later. */
    unlock() {
      context ??= new AudioContext();
      void context.resume();
    },
    start() {
      if (timer) return;
      beep();
      timer = setInterval(beep, 1500);
    },
    stop() {
      if (timer) clearInterval(timer);
      timer = null;
      navigator.vibrate?.(0);
    },
    get ringing() {
      return timer !== null;
    },
  };
}
