// The one sound player on the site: a SEGAN listen sheet with a playhead, play/stop, a loop toggle that
// uses the manifest's loop points, and optional output buttons (A/B, variants, phases). Keyboard operable,
// no autoplay, nothing downloads until play is pressed.

import { Voice, audio, claim, fmt, load, release, withBase, type Out } from "./audio";

export interface PlayerOptions {
  /** URL prefix for the outputs' audio/sheet paths, e.g. "demo/platformer/" */
  base: string;
  outputs: Out[];
  /** what the sound is (alt text for the sheet, label for the play button) */
  name: string;
  description: string;
  /** the listen sheet's time axis as fractions of its width */
  sheetX: [number, number];
  /** buttons to switch between outputs, e.g. ["A: before", "B: after"]; undefined = no switcher */
  choices?: string[];
  choiceLabel?: string;
  /** how a switch while playing keeps its place: same time, same bar (tempo variants) or restart */
  keep?: "time" | "bars" | "restart";
  /** seconds per bar of each output (for keep: "bars") */
  barSeconds?: (number | undefined)[];
  /** loop by default when the output has loop points */
  loop?: boolean;
  compact?: boolean;
  /** stems: several outputs started on the same sample; the first output gives the sheet and loop */
  stems?: Out[];
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

export class Player {
  readonly root: HTMLElement;
  index = 0;
  voice: Voice | null = null;
  stemLevels: number[];
  private img: HTMLImageElement | null = null;
  private head: HTMLElement | null = null;
  private pp: HTMLButtonElement;
  private lp: HTMLButtonElement | null = null;
  private time: HTMLElement;
  private note: HTMLElement;
  private choiceButtons: HTMLButtonElement[] = [];
  private looping: boolean;
  private raf = 0;
  private busy = false;
  /** the output the voice plays (variations and phases play outputs the sheet doesn't belong to) */
  private playing: Out | null = null;
  onstate: ((playing: boolean) => void) | null = null;

  constructor(readonly opts: PlayerOptions) {
    this.stemLevels = (opts.stems ?? []).map(() => 1);
    this.looping = opts.loop ?? true;
    const root = (this.root = el("figure", `player${opts.compact ? " compact" : ""}`));
    const out = this.out;
    if (opts.outputs.some((o) => o.sheet)) {
      const sheet = el("div", "sheet");
      const img = (this.img = el("img"));
      img.loading = "lazy";
      img.decoding = "async";
      img.width = 1200;
      img.alt = `SEGAN listen sheet of ${opts.name}: ${opts.description}`;
      const head = (this.head = el("span", "head"));
      head.hidden = true;
      sheet.append(img, head);
      sheet.addEventListener("click", (e) => this.seekFromClick(e, sheet));
      root.append(sheet);
    }
    const bar = el("div", "pbar");
    const pp = (this.pp = el("button", "pp"));
    pp.type = "button";
    bar.append(pp);
    if (opts.choices) {
      const group = el("div", "choices-out");
      group.setAttribute("role", "group");
      group.setAttribute("aria-label", opts.choiceLabel ?? "Version");
      opts.choices.forEach((label, i) => {
        const b = el("button", "", label);
        b.type = "button";
        b.addEventListener("click", () => this.select(i));
        this.choiceButtons.push(b);
        group.append(b);
      });
      bar.append(group);
    }
    if (opts.outputs.some((o) => o.loop) || opts.stems?.some((o) => o.loop)) {
      const lp = (this.lp = el("button", "lp"));
      lp.type = "button";
      lp.addEventListener("click", () => {
        this.looping = !this.looping;
        this.sync();
        if (this.voice && !this.voice.ended) this.restartAt(this.voice.position);
      });
      bar.append(lp);
    }
    this.time = el("span", "time");
    bar.append(this.time);
    root.append(bar);
    this.note = el("p", "pnote");
    this.note.hidden = true;
    root.append(this.note);
    pp.addEventListener("click", () => (this.isPlaying ? this.stop() : void this.play()));
    this.show(out);
    this.sync();
  }

  get out(): Out {
    return this.opts.outputs[this.index];
  }

  get isPlaying(): boolean {
    return !!this.voice && !this.voice.ended;
  }

  private show(out: Out): void {
    if (this.img && out.sheet) {
      const src = withBase(this.opts.base + out.sheet);
      if (this.img.getAttribute("src") !== src) this.img.src = src;
    }
  }

  private sync(): void {
    const playing = this.isPlaying;
    this.pp.textContent = playing ? "■ stop" : "▶ play";
    this.pp.setAttribute("aria-label", `${playing ? "Stop" : "Play"} ${this.opts.name}`);
    if (this.lp) {
      this.lp.textContent = "⟲ loop";
      this.lp.setAttribute("aria-pressed", String(this.looping));
      this.lp.title = "Loop between the manifest's loop points (yellow lines on the sheet)";
    }
    this.choiceButtons.forEach((b, i) => b.setAttribute("aria-pressed", String(i === this.index)));
    this.paintTime();
    this.onstate?.(playing);
  }

  private paintTime(): void {
    const out = this.playing ?? this.out;
    const t = this.voice && !this.voice.ended ? this.voice.position : 0;
    this.time.textContent = `${fmt(t)} / ${fmt(out.seconds)}`;
    if (this.head) {
      const showHead = !!this.voice && !this.voice.ended && this.playing === this.out;
      this.head.hidden = !showHead;
      if (showHead) {
        const [a, b] = this.opts.sheetX;
        this.head.style.left = `${(a + (t / out.seconds) * (b - a)) * 100}%`;
      }
    }
  }

  private tick = (): void => {
    this.paintTime();
    if (this.isPlaying) this.raf = requestAnimationFrame(this.tick);
  };

  private fail(out: Out, err: unknown): void {
    this.note.hidden = false;
    this.note.innerHTML = "";
    const a = el("a", "", out.audio.split("/").pop());
    a.href = withBase(this.opts.base + out.audio);
    a.download = "";
    this.note.append(`This browser couldn't play the sound (${String(err).slice(0, 80)}). Download it: `, a);
  }

  /** Start playing (the selected output, or `other`, e.g. one variation) at `offset` seconds. */
  async play(offset = 0, other?: Out, when = 0): Promise<Voice | null> {
    if (this.busy) return null;
    const out = other ?? this.out;
    audio();
    claim(this);
    this.busy = true;
    this.pp.textContent = "… loading";
    try {
      const stems = this.opts.stems;
      const buffers = stems ? await Promise.all(stems.map((s) => load(withBase(this.opts.base + s.audio)))) : [await load(withBase(this.opts.base + out.audio))];
      // detach the old voice before stopping it, so its onended doesn't release this player's claim
      const old = this.voice;
      this.voice = null;
      old?.stop();
      const sheetOut = stems ? { ...stems[0], sheet: out.sheet } : out;
      const voice = new Voice(buffers, sheetOut, this.looping, offset, when, stems ? this.stemLevels : []);
      voice.onended = () => {
        if (this.voice === voice) {
          cancelAnimationFrame(this.raf);
          release(this);
          this.sync();
        }
      };
      this.voice = voice;
      this.playing = other ?? this.out;
      this.note.hidden = true;
      cancelAnimationFrame(this.raf);
      this.raf = requestAnimationFrame(this.tick);
      return voice;
    } catch (err) {
      this.fail(out, err);
      return null;
    } finally {
      this.busy = false;
      this.sync();
    }
  }

  stop(): void {
    this.voice?.stop();
    cancelAnimationFrame(this.raf);
    release(this);
    this.sync();
  }

  private restartAt(t: number): void {
    void this.play(t, this.playing ?? undefined);
  }

  /** Switch output; while playing, keep the place (same time, same bar) or restart. */
  select(i: number): void {
    if (i === this.index) return;
    const was = this.isPlaying && this.playing === this.out ? this.voice!.position : null;
    const from = this.index;
    this.index = i;
    this.show(this.out);
    if (was !== null) {
      let t = 0;
      const keep = this.opts.keep ?? "restart";
      if (keep === "time") t = Math.min(was, this.out.seconds - 0.05);
      if (keep === "bars") {
        const a = this.opts.barSeconds?.[from];
        const b = this.opts.barSeconds?.[i];
        if (a && b) t = (was / a) * b;
      }
      void this.play(t);
    } else this.sync();
  }

  private seekFromClick(e: MouseEvent, sheet: HTMLElement): void {
    const r = sheet.getBoundingClientRect();
    const [a, b] = this.opts.sheetX;
    const f = ((e.clientX - r.left) / r.width - a) / (b - a);
    if (f < 0 || f > 1) return;
    void this.play(f * this.out.seconds);
  }

  setStemLevel(i: number, level: number): void {
    this.stemLevels[i] = level;
    this.voice?.setLevel(i, level);
  }
}
