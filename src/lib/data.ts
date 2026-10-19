// Build-time access to the demo data written by tools/build_site_assets.py.
import { readFileSync } from "node:fs";

// astro build/dev run from the site root; module URLs move when the build bundles this file
const root = process.cwd().replace(/\/?$/, "/");

export function readJson<T = any>(path: string): T {
  return JSON.parse(readFileSync(root + path, "utf-8")) as T;
}

export function readText(path: string): string {
  return readFileSync(root + path, "utf-8");
}

export const step = (scenario: string, id: string) => readJson(`public/demo/${scenario}/${id}.json`);
export const scenarios = () => readJson<{ id: string; title: string; pitch: string }[]>("public/demo/scenarios.json");
export const asset = (url: string) => import.meta.env.BASE_URL.replace(/\/?$/, "/") + url.replace(/^\//, "");

// --- sounds ------------------------------------------------------------------------------------------

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
  lead_in_ms?: number;
  seam_click?: number;
}
export interface Sound {
  name: string;
  kind: string;
  category: string;
  description: string;
  status: string;
  outputs: Out[];
  timing?: { bpm: number; bars: number; beat_seconds: number; meter: [number, number]; key: string };
  variant_timing?: Record<string, { bpm: number; beat_seconds: number }>;
}
export const SHEET_X: [number, number] = [74 / 1200, 1184 / 1200];

/** JSON for <segan-player data-player=...>: one sound's main output (and its variations, if asked). */
export function playerData(sound: Sound, base: string, opts: Record<string, unknown> = {}): string {
  const main = sound.outputs[0];
  const vars = sound.outputs.filter((o) => o.id.startsWith("variation:"));
  return JSON.stringify({
    base,
    outputs: [main],
    name: sound.name,
    description: sound.description,
    sheetX: SHEET_X,
    ...(vars.length ? { variations: vars } : {}),
    ...opts,
  });
}

export const kb = (bytes: number) => (bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`);
