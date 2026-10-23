/**
 * ZiniChat Omnichannel Notification Sound Engine
 * Supports:
 * - HTML5 Audio with preloaded audio element
 * - Web Audio API synthesized backup chime
 * - Browser Autoplay Policy unlocking on first user interaction
 * - Tenant sound toggle persistence (localStorage)
 */

let audioUnlocked = false;
let notificationAudio: HTMLAudioElement | null = null;
let audioCtx: AudioContext | null = null;

export const isSoundEnabled = (): boolean => {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem('zinichat_notification_sound') !== 'false';
};

export const setSoundEnabled = (enabled: boolean): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('zinichat_notification_sound', enabled ? 'true' : 'false');
};

export const toggleSound = (): boolean => {
  const next = !isSoundEnabled();
  setSoundEnabled(next);
  if (next) {
    playNotificationSound(true); // Preview sound when turning ON
  }
  return next;
};

/**
 * Initializes and unlocks audio playback on first user touch/click
 * to comply with modern browser autoplay restrictions.
 */
export const initSoundUnlock = (): void => {
  if (typeof window === 'undefined' || audioUnlocked) return;

  const unlock = () => {
    if (audioUnlocked) return;

    try {
      if (!notificationAudio) {
        notificationAudio = new Audio('/sounds/notification.mp3');
        notificationAudio.preload = 'auto';
        notificationAudio.volume = 0.85;
      }

      // Warm up audio element with zero volume briefly
      notificationAudio.play().then(() => {
        notificationAudio?.pause();
        if (notificationAudio) notificationAudio.currentTime = 0;
        audioUnlocked = true;
      }).catch(() => {
        // Autoplay policy still pending
      });

      // Warm up AudioContext for synthesis backup
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass && !audioCtx) {
        audioCtx = new AudioContextClass();
        if (audioCtx.state === 'suspended') {
          audioCtx.resume();
        }
      }
    } catch (e) {}

    window.removeEventListener('click', unlock);
    window.removeEventListener('keydown', unlock);
    window.removeEventListener('touchstart', unlock);
  };

  window.addEventListener('click', unlock, { once: true, passive: true });
  window.addEventListener('keydown', unlock, { once: true, passive: true });
  window.addEventListener('touchstart', unlock, { once: true, passive: true });
};

/**
 * Plays sweet messenger-like "tung" notification chime
 * @param forcePlay If true, plays regardless of user mute preference (e.g. for preview)
 */
export const playNotificationSound = (forcePlay = false): void => {
  if (typeof window === 'undefined') return;
  if (!forcePlay && !isSoundEnabled()) return;

  try {
    if (!notificationAudio) {
      notificationAudio = new Audio('/sounds/notification.mp3');
      notificationAudio.preload = 'auto';
      notificationAudio.volume = 0.85;
    }

    notificationAudio.currentTime = 0;
    const playPromise = notificationAudio.play();

    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // Fallback to Web Audio API synthesis if file playback was prevented
        playSynthesizedChime();
      });
    }
  } catch (err) {
    playSynthesizedChime();
  }
};

/**
 * High-fidelity synthesized marimba/chime backup using Web Audio API
 */
const playSynthesizedChime = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    if (!audioCtx) {
      audioCtx = new AudioContextClass();
    }

    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const now = audioCtx.currentTime;

    // Dual-tone harmonic chime (C6 = 1046.5Hz, G6 = 1568Hz)
    const osc1 = audioCtx.createOscillator();
    const osc2 = audioCtx.createOscillator();
    const gain1 = audioCtx.createGain();
    const gain2 = audioCtx.createGain();
    const masterGain = audioCtx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(1046.5, now);
    osc1.frequency.exponentialRampToValueAtTime(1040, now + 0.35);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1568, now);

    // Fast attack (5ms) + sweet exponential decay (400ms)
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.7, now + 0.005);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    gain2.gain.setValueAtTime(0, now);
    gain2.gain.linearRampToValueAtTime(0.3, now + 0.005);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    masterGain.gain.setValueAtTime(0.4, now);

    osc1.connect(gain1);
    osc2.connect(gain2);
    gain1.connect(masterGain);
    gain2.connect(masterGain);
    masterGain.connect(audioCtx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.45);
    osc2.stop(now + 0.45);
  } catch (e) {
    // Graceful silent fail if audio context blocked
  }
};
