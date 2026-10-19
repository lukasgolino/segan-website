// The scripted demo: a conversation tree whose every agent turn is a real SEGAN project build
// (public/demo/<scenario>/<step>.json, written by tools/build_site_assets.py).

import { reducedMotion, stopWithin, withBase, type Out } from "./audio";
import { escapeHtml, highlightDiff, highlightLine, highlightSource } from "./highlight";
import { Player } from "./player";
import { phases, stems, variations } from "./widgets";

interface Choice {
  to: string;
  say: string;
}
interface Index {
  id: string;
  title: string;
  pitch: string;
  start: string;
  steps: Record<string, { user: string; next: Choice[]; parents: string[] }>;
}
interface FileDiff {
  path: string;
  status: string;
  added: number;
  removed: number;
  diff: string;
}
interface Finding {
  rule: string;
  severity: string;
  message: string;
  path: string;
  line: number | null;
}
interface Lint {
  errors: number;
  warnings: number;
  findings: Finding[];
}
interface Sound {
  name: string;
  kind: string;
  category: string;
  description: string;
  outputs: Out[];
  timing?: { bpm: number; beat_seconds: number; meter: [number, number] };
  variant_timing?: Record<string, { bpm: number; beat_seconds: number }>;
}
interface Step {
  scenario: string;
  id: string;
  agent: string;
  ran: string[];
  show: { sounds: string[]; compare?: boolean; variations?: boolean; variants?: boolean; stems?: boolean; phases?: boolean; seam?: boolean; before?: string };
  lint: Lint;
  diffs: Record<string, FileDiff[]>;
  sounds: Sound[];
  manifest: Record<string, Record<string, unknown>>;
  files: { path: string; bytes: number }[];
  godot: { path: string; text: string };
  sheet_x: [number, number];
  before?: { lint: Lint; source: string; sound: Sound };
  next: Choice[];
}

const stepCache = new Map<string, Promise<Step>>();
function loadStep(scenario: string, id: string): Promise<Step> {
  const key = `${scenario}/${id}`;
  let p = stepCache.get(key);
  if (!p) {
    p = fetch(withBase(`demo/${key}.json`)).then((r) => {
      if (!r.ok) throw new Error(`${key}: ${r.status}`);
      return r.json() as Promise<Step>;
    });
    p.catch(() => stepCache.delete(key));
    stepCache.set(key, p);
  }
  return p;
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, html?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
}

function kb(bytes: number): string {
  return bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`;
}

const barSeconds = (beat: number | undefined, meter: [number, number] | undefined) => (beat && meter ? beat * meter[0] : undefined);

function numbers(o: Out): string {
  const parts = [`${o.seconds.toFixed(2)} s`];
  if (o.lufs !== undefined) parts.push(`${o.lufs.toFixed(1)} LUFS${o.target !== undefined && o.target !== null ? ` (target ${o.target})` : ""}`);
  if (o.lead_in_ms !== undefined) parts.push(`lead-in ${o.lead_in_ms.toFixed(1)} ms`);
  if (o.loop) parts.push(`loop ${o.loop[0]}..${o.loop[1]} samples`);
  if (o.seam_click !== undefined && o.loop) parts.push(`seam click ${o.seam_click.toFixed(4)}`);
  return parts.join(" · ");
}

/** The manifest entry, shortened for reading: lists cut to two items, nested timing dropped. */
function manifestExcerpt(name: string, entry: Record<string, unknown>): string {
  const cut = (v: unknown, depth = 0): unknown => {
    if (Array.isArray(v)) {
      const items = v.slice(0, 2).map((x) => cut(x, depth + 1));
      return v.length > 2 && typeof v[0] === "object" ? [...items, `… ${v.length - 2} more`] : v.length > 2 ? v : items;
    }
    if (v && typeof v === "object") {
      const out: Record<string, unknown> = {};
      const items = Object.entries(v as Record<string, unknown>);
      const many = depth > 0 && items.length > 3 && items.every(([, x]) => x && typeof x === "object");
      for (const [k, x] of many ? items.slice(0, 2) : items) {
        if (k === "description" || (depth > 0 && ["arrangement", "sections", "markers", "variants"].includes(k))) continue;
        out[k] = cut(x, depth + 1);
      }
      if (many) out["…"] = `${items.length - 2} more`;
      return out;
    }
    return v;
  };
  const short = cut(entry) as Record<string, unknown>;
  for (const k of ["arrangement", "sections"]) if (Array.isArray(entry[k]) || (entry[k] && typeof entry[k] === "object")) {
    const v = entry[k] as unknown[] | Record<string, unknown>;
    const n = Array.isArray(v) ? v.length : Object.keys(v).length;
    short[k] = `… ${n} section${n === 1 ? "" : "s"} with start/end in samples, seconds and bars`;
  }
  return JSON.stringify({ [name]: short }, null, 1).replace(/\[\n\s*([^\[\]{}]*?)\n\s*\]/g, (_, inner: string) => `[${inner.replace(/\s*\n\s*/g, " ")}]`);
}

// --- the sounds of one agent turn --------------------------------------------------------------

function soundBlock(step: Step, sound: Sound, parent: Step | null): HTMLElement {
  const box = el("div", "sound");
  const base = "demo/";
  const show = step.show;
  const main = sound.outputs[0];
  const head = el("div", "sname", `<b>${escapeHtml(sound.name)}</b> <span>${escapeHtml(sound.kind)}${sound.category && sound.category !== sound.kind ? ` · ${escapeHtml(sound.category)}` : ""}</span>`);
  box.append(head);
  const common = { base, name: sound.name, description: sound.description, sheetX: step.sheet_x };

  if (show.phases && sound.outputs.some((o) => o.id.startsWith("phase:"))) {
    const outs = sound.outputs.filter((o) => o.id.startsWith("phase:"));
    const verb = sound.name === "charge" ? "Hold to charge" : "Hold to thrust";
    box.append(phases({ ...common, outputs: outs }, verb).root);
    const looped = outs.find((o) => o.loop && o.seam);
    if (looped?.seam) box.append(figure(base + looped.seam, `The ${looped.label} loop's seam: its last half second spliced onto its start, as the player hears it, and ±10 ms around the splice.`, "seam"));
  } else if (show.stems) {
    const stemOuts = sound.outputs.filter((o) => o.id.startsWith("stem:"));
    const player = new Player({ ...common, outputs: [main], stems: stemOuts });
    box.append(player.root, stems(player, stemOuts.map((o) => o.label)));
    box.append(el("p", "note", "The stems play from one start sample and loop on the manifest's loop points; muting one is what a game does with <code>stream_N/volume</code>."));
  } else if (show.variants && sound.outputs.some((o) => o.id.startsWith("variant:"))) {
    const outs = [main, ...sound.outputs.filter((o) => o.id.startsWith("variant:"))];
    const bars = outs.map((o) => {
      if (o.id === "main") return barSeconds(sound.timing?.beat_seconds, sound.timing?.meter);
      const t = sound.variant_timing?.[o.label];
      return barSeconds(t?.beat_seconds, sound.timing?.meter);
    });
    const labels = outs.map((o) => (o.id === "main" ? `normal ${sound.timing?.bpm ?? ""} bpm` : `${o.label} ${sound.variant_timing?.[o.label]?.bpm ?? ""} bpm`));
    const player = new Player({ ...common, outputs: outs, choices: labels, choiceLabel: "Variant", keep: "bars", barSeconds: bars });
    box.append(player.root, el("p", "note", "Switching while it plays jumps to the same bar of the other version, using the bar positions in manifest.json."));
  } else if (show.compare && parent) {
    const before = parent.sounds.find((s) => s.name === sound.name);
    if (before) {
      const outs = [before.outputs[0], main];
      const player = new Player({ ...common, outputs: outs, choices: ["A: before", "B: after"], choiceLabel: "Compare", keep: "time" });
      player.select(1);
      box.append(player.root);
    } else box.append(new Player({ ...common, outputs: [main] }).root);
  } else {
    const player = new Player({ ...common, outputs: [main] });
    box.append(player.root);
    if (show.variations) {
      const vars = sound.outputs.filter((o) => o.id.startsWith("variation:"));
      const mv = (step.manifest[sound.name]?.variations ?? []) as { pitch_offset_semitones?: number }[];
      if (vars.length) box.append(variations(player, vars, mv.map((v) => v.pitch_offset_semitones)));
    }
  }
  box.append(el("p", "nums", escapeHtml(numbers(main))));
  if (show.seam && main.seam) {
    box.append(figure(base + main.seam, "SEGAN's seam view: the loop's last second spliced onto its first, as the player hears it at the loop point, plus ±10 ms around the splice. Seam click 0.0000.", "seam"));
  }
  return box;
}

function figure(src: string, caption: string, cls: string): HTMLElement {
  const fig = el("figure", cls);
  const img = el("img");
  img.src = withBase(src);
  img.loading = "lazy";
  img.alt = caption;
  fig.append(img, el("figcaption", "", caption));
  return fig;
}

function beforeBlock(step: Step): HTMLElement | null {
  const b = step.before;
  if (!b) return null;
  const d = el("details", "more first");
  d.append(el("summary", "", `The first version <span>lint: ${b.lint.warnings} warnings</span>`));
  const body = el("div", "more-body");
  body.append(el("pre", "code lintout", `<code>${escapeHtml(b.lint.findings.map((x) => `${x.path}: ${x.severity} ${x.rule}: ${x.message}`).join("\n"))}</code>`));
  const s = b.sound;
  const p = new Player({ base: "demo/", outputs: [s.outputs[0]], name: `${s.name} (first version)`, description: s.description, sheetX: step.sheet_x });
  body.append(p.root, el("p", "nums", escapeHtml(numbers(s.outputs[0]))));
  body.append(el("h4", "", "Its source"));
  body.append(el("pre", "code", `<code>${highlightSource(b.source.trimEnd())}</code>`));
  d.append(body);
  return d;
}

// --- the "what the agent wrote" / "what your game gets" panels ----------------------------------

function wrotePanel(step: Step, parent: string | null): HTMLElement {
  const d = el("details", "more");
  const diffs = step.diffs[parent ?? ""] ?? Object.values(step.diffs)[0] ?? [];
  const lint = step.lint;
  const lintLine = `segan lint: ${lint.errors} error${lint.errors === 1 ? "" : "s"}, ${lint.warnings} warning${lint.warnings === 1 ? "" : "s"}`;
  d.append(el("summary", "", `What the agent wrote <span>${diffs.length} file${diffs.length === 1 ? "" : "s"} · ${lintLine}</span>`));
  const body = el("div", "more-body");
  body.append(el("h4", "", "Commands it ran"));
  body.append(el("pre", "code", `<code>${step.ran.map((c) => `<span class="t-punc">$</span> ${escapeHtml(c)}`).join("\n")}</code>`));
  body.append(el("h4", "", parent ? "Source changes" : "Source files"));
  for (const f of diffs) {
    const fd = el("details", "file");
    if (f.path.startsWith("sfx/") || f.path.startsWith("music/") || (f.path === "segan.toml" && parent)) fd.open = true;
    fd.append(
      el(
        "summary",
        "",
        `<code>${escapeHtml(f.path)}</code> <span class="st ${f.status}">${f.status}</span> <span class="n"><b class="a">+${f.added}</b> <b class="r">−${f.removed}</b></span>`,
      ),
    );
    fd.append(el("pre", "code diff", `<code>${highlightDiff(f.diff)}</code>`));
    body.append(fd);
  }
  body.append(el("h4", "", "Lint"));
  const lintText = lint.findings.length ? lint.findings.map((x) => `${x.path}: ${x.severity} ${x.rule}: ${x.message}`).join("\n") : lintLine;
  body.append(el("pre", "code", `<code>${escapeHtml(lintText)}</code>`));
  d.append(body);
  return d;
}

function gamePanel(step: Step): HTMLElement {
  const d = el("details", "more");
  const total = step.files.reduce((n, f) => n + f.bytes, 0);
  d.append(el("summary", "", `What your game gets <span>${step.files.length} files · ${kb(total)}</span>`));
  const body = el("div", "more-body");
  body.append(el("h4", "", "Files written by <code>segan build</code>"));
  body.append(
    el("pre", "code", `<code>${step.files.map((f) => `${escapeHtml(f.path.padEnd(52))} <span class="t-com">${kb(f.bytes)}</span>`).join("\n")}</code>`),
  );
  const name = step.show.sounds[0];
  body.append(el("h4", "", "<code>manifest.json</code>: the contract with any engine (shortened)"));
  body.append(el("pre", "code", `<code>${manifestExcerpt(name, step.manifest[name]).split("\n").map(highlightLine).join("\n")}</code>`));
  body.append(el("h4", "", `Godot: <code>${escapeHtml(step.godot.path)}</code>`));
  body.append(el("pre", "code", `<code>${escapeHtml(step.godot.text)}</code>`));
  d.append(body);
  return d;
}

// --- the conversation ----------------------------------------------------------------------------

export function mountDemo(root: HTMLElement): void {
  const indices: Index[] = JSON.parse(root.dataset.indices!);
  const log = root.querySelector(".log") as HTMLElement;
  const choices = root.querySelector(".choices") as HTMLElement;
  let index: Index | null = null;
  let run = 0;

  const bubble = (who: "you" | "agent", html: string) => {
    const m = el("div", `msg ${who}`);
    m.append(el("span", "who", who === "you" ? "You" : "Agent"));
    const b = el("div", "body", html);
    m.append(b);
    log.append(m);
    return b;
  };

  const restart = el("button", "choice restart", "↺ Start over");
  restart.type = "button";
  restart.addEventListener("click", () => pick(true));
  const setChoices = (...nodes: Node[]) => choices.replaceChildren(...(index ? [restart] : []), ...nodes);

  const showChoices = (step: Step) => {
    setChoices();
    const list = step.next.map((c) => ({ label: c.say, act: () => say(c.say, c.to, step) }));
    for (const c of list) {
      const b = el("button", "choice", escapeHtml(c.label));
      b.type = "button";
      b.addEventListener("click", c.act);
      choices.append(b);
    }
  };

  const agentTurn = async (scenario: Index, id: string, parent: Step | null, my: number, scroll: boolean) => {
    const index = scenario;
    setChoices(el("span", "typing", "Agent is working…"));
    let step: Step;
    try {
      step = await loadStep(index.id, id);
    } catch {
      if (my !== run) return;
      const retry = el("button", "choice", "Couldn't load this turn. Try again");
      retry.type = "button";
      retry.addEventListener("click", () => void agentTurn(scenario, id, parent, my, scroll));
      setChoices(retry);
      return;
    }
    if (my !== run) return;
    const parentStep = parent && index.steps[id].parents.includes(parent.id) ? parent : null;
    const body = bubble("agent", "");
    body.append(el("p", "", escapeHtml(step.agent).replace(/`([^`]+)`/g, "<code>$1</code>")));
    const sounds = el("div", `sounds n${step.sounds.length}`);
    for (const s of step.sounds) sounds.append(soundBlock(step, s, parentStep));
    body.append(sounds);
    const first = beforeBlock(step);
    if (first) body.append(first);
    body.append(wrotePanel(step, parentStep?.id ?? null), gamePanel(step));
    showChoices(step);
    if (scroll) (body.parentElement!.previousElementSibling ?? body.parentElement!).scrollIntoView({ behavior: reducedMotion() ? "auto" : "smooth", block: "start" });
  };

  const say = (text: string, to: string, from: Step) => {
    bubble("you", escapeHtml(text));
    void agentTurn(index!, to, from, run, true);
  };

  const start = (i: Index) => {
    index = i;
    run++;
    stopWithin(log);
    log.replaceChildren();
    bubble("you", escapeHtml(i.steps[i.start].user));
    void agentTurn(i, i.start, null, run, true);
  };

  // the opening: one speech bubble per scenario; "Start over" comes back here
  const pick = (scroll = false) => {
    index = null;
    run++;
    stopWithin(log);
    log.replaceChildren();
    bubble("agent", "<p>What are you building? Pick one. You can start over at any point and take another path.</p>");
    setChoices(
      ...indices.map((i) => {
        const b = el("button", "choice", escapeHtml(i.steps[i.start].user));
        b.type = "button";
        b.addEventListener("click", () => start(i));
        return b;
      }),
    );
    if (scroll) root.scrollIntoView({ behavior: reducedMotion() ? "auto" : "smooth", block: "start" });
  };
  pick();

  // fetch the first turns once the demo scrolls near, so the page loads light
  const kick = () => indices.forEach((i) => void loadStep(i.id, i.start).catch(() => {}));
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (es) => {
        if (es.some((e) => e.isIntersecting)) {
          io.disconnect();
          kick();
        }
      },
      { rootMargin: "400px" },
    );
    io.observe(root);
  } else kick();
}
