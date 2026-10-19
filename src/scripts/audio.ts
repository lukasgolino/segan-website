// Plays SEGAN build output in the browser with the Web Audio API: the game's WAVs (music as Ogg Vorbis
// with the same samples count) and the manifest's loop points in samples, looped sample-exactly
// (AudioBufferSourceNode.loopStart/loopEnd), never with <audio loop>.

export interface Out {
  id: string;
  label: string;
  audio: string;
  rate: number;
  samples: number;
  seconds: number;
  channels: number;
  loop: [number, number] | null;
  sheet: string | null;
  seam?: string | null;
  lufs?: number;
  target?: number | null;
  peak?: number;
  lead_in_ms?: number;
  seam_click?: number;
}

export const reducedMotion = (): boolean =>
  typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

export function withBase(url: string): string {
  const base = (document.documentElement.dataset.base ?? "/").replace(/\/?$/, "/");
  return base + url.replace(/^\//, "");
}

let ctx: AudioContext | null = null;

/** The one AudioContext, created on the first user gesture (browsers block audio before one). */
export function audio(): AudioContext {
  if (!ctx) {
    const C = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new C();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

const buffers = new Map<string, Promise<AudioBuffer>>();

/** Fetch and decode a sound once (lazily: nothing is downloaded until someone presses play). */
export function load(url: string): Promise<AudioBuffer> {
  let p = buffers.get(url);
  if (!p) {
    p = fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`${url}: ${r.status}`);
        return r.arrayBuffer();
      })
      .then((data) => audio().decodeAudioData(data));
    p.catch(() => buffers.delete(url));
    buffers.set(url, p);
  }
  return p;
}

/** Where a looping sound is after `elapsed` seconds of playing from `offset`. */
export function positionOf(elapsed: number, offset: number, out: Out, looping: boolean): number {
  const t = offset + elapsed;
  if (looping && out.loop) {
    const a = out.loop[0] / out.rate;
    const b = out.loop[1] / out.rate;
    if (t >= b) return a + ((t - a) % (b - a));
  }
  return Math.min(t, out.seconds);
}

/** One playing sound (or several started on the same sample, for stems). */
export class Voice {
  readonly started: number;
  private sources: AudioBufferSourceNode[] = [];
  readonly gains: GainNode[] = [];
  ended = false;
  onended: (() => void) | null = null;

  constructor(
    buffers: AudioBuffer[],
    readonly out: Out,
    readonly looping: boolean,
    readonly offset = 0,
    when = 0,
    levels: number[] = [],
  ) {
    const c = audio();
    this.started = Math.max(c.currentTime + 0.02, when);
    buffers.forEach((buffer, i) => {
      const src = c.createBufferSource();
      src.buffer = buffer;
      if (looping && out.loop) {
        src.loop = true;
        // seconds of the buffer; the buffer has exactly out.samples frames at out.rate (resampled to the
        // context rate by the browser), so these are the manifest's sample positions
        src.loopStart = out.loop[0] / out.rate;
        src.loopEnd = out.loop[1] / out.rate;
      }
      const gain = c.createGain();
      gain.gain.value = levels[i] ?? 1;
      src.connect(gain).connect(c.destination);
      src.start(this.started, Math.min(offset, out.seconds - 0.001));
      this.sources.push(src);
      this.gains.push(gain);
    });
    this.sources[0].onended = () => {
      this.ended = true;
      this.onended?.();
    };
  }

  get position(): number {
    return positionOf(Math.max(0, audio().currentTime - this.started), this.offset, this.out, this.looping);
  }

  /** When this voice will finish (context time), or Infinity while it loops. */
  get endsAt(): number {
    return this.looping && this.out.loop ? Infinity : this.started + (this.out.seconds - this.offset);
  }

  setLevel(i: number, level: number): void {
    const g = this.gains[i];
    if (!g) return;
    const t = audio().currentTime;
    g.gain.cancelScheduledValues(t);
    g.gain.setTargetAtTime(level, t, 0.03);
  }

  stop(at = 0): void {
    if (this.ended) return;
    for (const s of this.sources) {
      s.onended = null;
      try {
        s.stop(at);
      } catch {
        /* already stopped */
      }
    }
    if (!at) {
      this.ended = true;
      this.onended?.();
    }
  }
}

// one thing plays at a time across the page: starting a player stops the others
let current: { stop: () => void } | null = null;
export function claim(owner: { stop: () => void }): void {
  if (current && current !== owner) current.stop();
  current = owner;
}
export function release(owner: { stop: () => void }): void {
  if (current === owner) current = null;
}

export function fmt(seconds: number): string {
  return seconds >= 60 ? `${Math.floor(seconds / 60)}:${(seconds % 60).toFixed(1).padStart(4, "0")}` : `${seconds.toFixed(2)}s`;
}
