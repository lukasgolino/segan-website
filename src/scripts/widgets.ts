// Extra controls around a Player, one per SEGAN feature: variations (a randomizer), stems (a mixer),
// phases (hold to play: start -> loop -> release), and the <segan-player> element for static pages.

import { Voice, audio, claim, load, release, withBase, type Out } from "./audio";
import { Player, type PlayerOptions } from "./player";

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

/** "Play again": a different variation each press, never the same twice in a row (like Godot's randomizer). */
export function variations(player: Player, outs: Out[], pitches: (number | undefined)[] = []): HTMLElement {
  const box = el("div", "vary");
  const b = el("button", "again", "▶ play again");
  b.type = "button";
  const label = el("span", "vlabel", `${outs.length} variations`);
  label.setAttribute("aria-live", "polite");
  const dots = el("span", "dots");
  outs.forEach(() => dots.append(el("i")));
  let last = -1;
  b.addEventListener("click", () => {
    let i = Math.floor(Math.random() * outs.length);
    if (outs.length > 1 && i === last) i = (i + 1 + Math.floor(Math.random() * (outs.length - 1))) % outs.length;
    last = i;
    const p = pitches[i];
    label.textContent = `variation ${i + 1}/${outs.length}` + (p !== undefined ? ` · ${p >= 0 ? "+" : "−"}${Math.abs(p).toFixed(2)} semitones` : "");
    [...dots.children].forEach((d, k) => d.classList.toggle("on", k === i));
    void player.play(0, outs[i]);
  });
  box.append(b, dots, label);
  return box;
}

/** A mute button per stem; the stems start on the same sample and keep playing while you mix. */
export function stems(player: Player, names: string[]): HTMLElement {
  const box = el("div", "stems");
  box.setAttribute("role", "group");
  box.setAttribute("aria-label", "Stems");
  names.forEach((name, i) => {
    const b = el("button", "", name);
    b.type = "button";
    b.setAttribute("aria-pressed", "true");
    b.title = `Mute or unmute the ${name} stem`;
    b.addEventListener("click", () => {
      const on = b.getAttribute("aria-pressed") !== "true";
      b.setAttribute("aria-pressed", String(on));
      player.setStemLevel(i, on ? 1 : 0);
    });
    box.append(b);
  });
  return box;
}

/** Phases: one listen sheet per phase, plus a hold button that plays them as a game would:
 *  [start] then the loop while held, then [stop/release] on let-go, each on the sample the last one ends. */
export function phases(opts: PlayerOptions, holdLabel: string): { root: HTMLElement; player: Player } {
  const outs = opts.outputs;
  const loopAt = outs.findIndex((o) => o.loop);
  const player = new Player({ ...opts, choices: outs.map((o) => o.label), choiceLabel: "Phase", keep: "restart" });
  const hold = el("button", "hold", holdLabel);
  hold.type = "button";
  hold.title = "Press and hold (mouse, touch, Space or Enter)";
  const pre = loopAt > 0 ? outs[loopAt - 1] : null;
  const post = loopAt >= 0 && loopAt < outs.length - 1 ? outs[loopAt + 1] : null;
  const loopOut = outs[loopAt];
  let voices: Voice[] = [];
  let timer = 0;
  let held = false;
  const owner = { stop: () => void end(false), root: player.root };
  const url = (o: Out) => withBase(opts.base + o.audio);

  async function begin(): Promise<void> {
    if (held || loopAt < 0) return;
    held = true;
    hold.setAttribute("aria-pressed", "true");
    player.stop();
    claim(owner);
    audio();
    const [a, b, c] = await Promise.all([pre ? load(url(pre)) : null, load(url(loopOut)), post ? load(url(post)) : null]);
    void c;
    if (!held) return;
    let at = 0;
    if (pre && a) {
      const v = new Voice([a], pre, false);
      voices.push(v);
      at = v.endsAt;
      player.select(loopAt - 1);
      timer = window.setTimeout(() => player.select(loopAt), Math.max(0, (at - audio().currentTime) * 1000));
    } else player.select(loopAt);
    voices.push(new Voice([b], loopOut, true, 0, at));
  }

  async function end(playPost = true): Promise<void> {
    if (!held) return;
    held = false;
    hold.setAttribute("aria-pressed", "false");
    clearTimeout(timer);
    for (const v of voices) v.stop();
    voices = [];
    if (playPost && post) {
      const buffer = await load(url(post));
      player.select(loopAt + 1);
      voices.push(new Voice([buffer], post, false));
    }
    release(owner);
  }

  hold.addEventListener("pointerdown", (e) => {
    hold.setPointerCapture(e.pointerId);
    void begin();
  });
  hold.addEventListener("pointerup", () => void end());
  hold.addEventListener("pointercancel", () => void end());
  hold.addEventListener("keydown", (e) => {
    if ((e.key === " " || e.key === "Enter") && !e.repeat) {
      e.preventDefault();
      void begin();
    }
  });
  hold.addEventListener("keyup", (e) => {
    if (e.key === " " || e.key === "Enter") void end();
  });
  hold.addEventListener("contextmenu", (e) => e.preventDefault());
  const root = el("div", "phased");
  const row = el("div", "holdrow");
  row.append(hold, el("span", "vlabel", `${pre ? `${pre.label}, then ` : ""}${loopOut?.label ?? ""} loops while held${post ? `, ${post.label} on release` : ""}`));
  root.append(player.root, row);
  return { root, player };
}

/** <segan-player data-player='{PlayerOptions as JSON}'>: a player on a static page. */
class SeganPlayer extends HTMLElement {
  connectedCallback(): void {
    if (this.firstChild) return;
    const opts = JSON.parse(this.dataset.player!) as PlayerOptions & { variations?: Out[]; pitches?: number[] };
    const player = new Player(opts);
    this.append(player.root);
    if (opts.variations?.length) this.append(variations(player, opts.variations, opts.pitches));
  }
}
if (!customElements.get("segan-player")) customElements.define("segan-player", SeganPlayer);
