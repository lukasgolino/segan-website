# SEGAN reference

Everything an agent needs to write SEGAN files, one section per `segan docs` topic.

## Setup

Setup check, first-time setup, project layout.

### Setup check

1. `segan --version`. If it's missing, install it the way the project pins it (its requirements file / tag,
   e.g. `pip install "git+https://github.com/lukasgolino/segan.git@v0.4.1"`). Never swap a pinned install for an
   editable checkout unless you are developing SEGAN itself.
2. Find the audio project: `segan status` (it says so if there's no `segan.toml` here or above), or
   `find . -name segan.toml -not -path '*/node_modules/*'`. That folder is the game's **audio home**:
   - `BRIEF.md` - what the game is, its key sounds and music, the wishlist, what awaits a listen, a dated feedback log
   - `SOUND.md` - how the game must sound (kits, keys, tempos, loudness, do/don't), with a versioned changelog
   - `segan.toml` - default kit, the shared `[mix]` (room, crush, oversample...), `[loudness]` targets, output dir
   - `kits/`, `music/`, `sfx/` - the sources; every asset has a `description`
3. **Always read BRIEF.md and SOUND.md and run `segan status` before making or changing anything.** They are
   your memory between sessions. `segan status` also lists every kit with its instrument keys and names, and says
   when BRIEF.md or SOUND.md is missing: then write short ones (what the game needs; which kit and instrument
   does what, keys and tempos per mood, loudness) from what you know, and list your assumptions for the owner.
4. No `segan.toml` yet -> first-time setup (below).

**SEGAN as MCP tools:** if you have SEGAN tools (`status`, `write_asset`, `preview`...), use them instead of
the CLI; the workflow is the same (`write_asset` lints and returns the listen sheet image).

**Who you work for:** often an orchestrator agent building the game. Batch questions into ONE message, each
with a recommended default, and proceed on the defaults if nobody answers. Report results a program can use:
asset name, files and loop points from `manifest.json`, the listen sheet path, the WAV path, decisions made.


### First-time setup (a new game)

Ask once, in one message, with defaults:
1. **The game**: genre, mood, setting (for BRIEF.md).
2. **The sound, in words**: what it should feel like ("cold ship, warm crew", "dusty lo-fi jazz", "bright 8-bit",
   "eerie folk horror"). Not a menu: synths, the instrument models (plucked and bowed strings, choirs, mallets,
   organs, FM, wavetables), effects and real recorded instruments (pianos, guitars, strings, brass, winds, world
   percussion, drum kits: sample libraries fetched on request) can all sit in one kit.
3. **The identity**: 2-3 signature instruments or sounds every song should share (default: the rolled kit's
   `identity` group), and any motif the game has.
4. **References**: games or soundtracks it should evoke.
5. **Engine**: Godot 4 (default; path to the project) or plain WAVs + manifest.
6. **Mix**: dry or roomy (`[mix] room`, default 0.15), lo-fi crush or clean (default clean).

Then: `segan init audio --style "<the words>" [--godot <godot project>]` (writes `segan.toml` with a random project
`seed`, BRIEF.md, SOUND.md and a kit `core` rolled from the seed and the words; `--style chiptune|synth|orchestral`
gives a fixed starter kit instead). Two projects with the same brief get different kits, by design: don't copy
another project's kit. `segan kit show core` and **look at the kit sheet**; adjust the kit (`segan docs kits`) until every
instrument is distinct and in a sensible range (`segan kit roll core --style ... --take 1 --force` rolls again), then
ask the owner to listen to `previews/kits/<kit>.wav`. Fill in BRIEF.md (game, key sounds, music list) and SOUND.md
(the identity, which instrument does what, how songs vary, loudness). Log the owner's answers in BRIEF.md's
feedback log.


### Project layout

```
segan.toml   BRIEF.md   SOUND.md
kits/<name>.kit.yaml     music/<name>.song.yaml     sfx/<name>.sfx.yaml     music/<name>.soundtrack.yaml
previews/  (scratch: WAVs, listen sheets; gitignored)    .segan-cache/ (render cache; gitignored)
```

Notes are written like `A4` (= 440 Hz, MIDI 69), `C#5`, `Bb2`, `C-1`. Keys are a root and a scale:
`A minor`, `C major`, `D dorian`, `E phrygian`, `F lydian`, `G mixolydian`, `B locrian`, `A harmonic_minor`,
`A melodic_minor`, `C pentatonic_major`, `A pentatonic_minor`, `A blues`, `C whole_tone`, `C chromatic`.

## Kits

Kits: the palette, identity vs variation, kit notation.

### Kits (the palette)

A kit maps one-character keys to instruments; songs write those keys in their grids. Think of a game's sound as
two layers:
- **Identity** (fixed for the game, in SOUND.md and the kit's `identity` group): 2-3 signature instruments and the
  game's motifs. This is what makes every song sound like the same game.
- **Variation** (per song): 1-2 extra instruments drawn from the wider palette, its own key, mode, tempo, meter,
  register and texture. This is what keeps 20 songs from sounding like one.

So a game has a core kit and more around it: `segan kit roll <name> --style "<words for this part of the game>"
--around core` keeps the identity instruments and rolls the rest (a combat kit, a town kit); or put more
instruments in one kit than any song uses. A song uses its kit's identity instruments plus its own extras: songs
that all play the same 6 instruments blur together (lint W023). Give each instrument a job: one or two leads, a
bass, harmony (pad, strings, choir, organ, keys), colour (pluck, mallet, bell, arpeggio, texture), 3-5 drums.
- **The palette** (`segan docs kits`, `segan docs models`): basic oscillators, models (`pluck` guitar/harp/koto, `bowed` strings with
  real bodies, `formant` voices and choirs, `modal` marimba/vibes/glass/bells/metal, `additive` organs and bells,
  `wavetable`, `supersaw`, 3-4 operator `fm`), `sync`, `sub`, filter LFOs, brass `mute`s, and per-instrument `fx`
  (chorus, ensemble, phaser, flanger, tempo-synced delay, reverb, drive, crush, comb, ring, tremolo, autopan).
  "Strings" are `bowed` or samples, not a detuned saw; a choir is `formant` (or `neosound/voice_oohs`).
- `range` on melodic instruments keeps notes where they sound good (bass: E1-C4; leads: C4-C7); lint E007
  enforces it.
- `voices: 1` (default) is a chip channel: a new note cuts the old. Chords need `voices: 3` or more (E014).
- Arpeggio instruments (`arp:`) use fixed semitone offsets, so make them mode-neutral (`[0, 7, 12]`) unless
  every song is in a major key.
- **Sampled instruments** (`sample: vsco2/violins_sus`, `vcsl/grand_piano`, `karoryfer/brush`, `.sfz`, `.sf2`,
  `.wav`; `segan docs samples`): any kit may mix them with synths. `segan samples list` shows the libraries (vsco2
  orchestra; vcsl keys, mallets, winds, world percussion; karoryfer guitars, basses, erhu, a drum kit; neosound
  voice, steel guitar, flute), `segan samples fetch <library> <instruments>` downloads only what the kit uses into
  the user cache (lint names any that are missing). Sections need `voices` for chords; `_sus` instruments hold while the note does
  (W014 if a note outlasts its sample: re-strike long notes), `pizz`/`stac`/harp/percussion ring by themselves.
  Mix them like an orchestra: strings hold chords, one lead line (horn, flute, solo violin), harp or pizz for
  motion, timpani and crash only on downbeats; a bigger room (`[mix] room = 0.3`, `room_decay = 1.6`).
- After any kit edit: `segan kit show <kit>`, look at the sheet (each instrument's segment: pitch lines on the
  white targets, attack/decay shape, no red), check `W010` aliasing, then a human listens.


### Kit - `kits/<name>.kit.yaml`

```yaml
name: nes
description: "2A03-flavoured: pulse leads, triangle bass, noise drums."
instruments:                  # key = ONE letter or digit (any Unicode letter works too); "." "-" "|" are reserved
  p: { name: pulse_lead, osc: pulse, duty: 0.25, env: [0.004, 0.08, 0.65, 0.09], gain: -7, range: [C4, C7] }
  q: { name: pulse_soft, osc: pulse, duty: 0.5, env: [0.02, 0.2, 0.5, 0.2], gain: -10, vibrato: [5.5, 0.12, 0.15] }
  b: { name: tri_bass, osc: triangle, env: [0.002, 0.05, 0.95, 0.04], gain: -2, range: [E1, C4] }
  w: { name: strings, osc: bowed, unison: 5, detune: 6, env: [0.3, 0, 1, 0.6], voices: 4, fx: [ensemble] }
  k: { name: kick, drum: kick, tune: 50, decay: 0.22 }
  s: { name: snare, drum: snare, noise: 0.7, decay: 0.14, gain: -5 }
  h: { name: hat, drum: hat, decay: 0.035, gain: -13 }
groups:                       # instrument families, for group_swap variants
  leads: [p, q]
```

Instrument fields (a source is required; everything else optional):

| Field | Meaning |
|---|---|
| `osc` | `sine`, `triangle`, `saw`, `pulse` (all band-limited), `noise` (white), `bitnoise` (sample-and-hold noise pitched by the note: NES/sfxr crunch), `fm` (2-operator, or 3-4 operators), `impulses` (sparse random clicks, ticks or bubbles: crackle, debris, fizz; below), and the models `pluck`, `bowed`, `additive`, `wavetable`, `formant`, `modal`, `supersaw` (below) |
| `drum` | `kick`, `snare`, `hat`, `clap`, `tom`, `cymbal`, `rim`, `shaker`, `cowbell`, `block` (wood block), `conga`, `brush` (brush swish), `metal` (struck scrap metal/anvil) - macros with `tune` (Hz), `decay` (s), `tone` (Hz), `noise` (0-1 mix), `click` (0-1), `punch` (semitones of pitch drop) |
| `sample` | recorded sound instead of a synth (see Samples below): `vsco2/violins_sus` (library), `samples/x.sfz`, `samples/gm.sf2` + `preset`, `samples/hit.wav` + `root` |
| `duty` | pulse width 0.01-0.99 (0.5 square, 0.25 and 0.125 thinner, NES-like) |
| `pwm` | `[rate_hz, depth]` pulse-width modulation |
| `fm` | `{ ratio, index, env }`: modulator frequency ratio (whole numbers = harmonic, e.g. 1, 2; 3.5 = bell-like), modulation index (brightness), optional index envelope. 3-4 operators: `{ algorithm: stack\|pairs\|branch\|stack3\|parallel, ops: [{ ratio, index, out, env, detune, mod }, ...] }` (op 1 is heard; `stack` = 4 -> 3 -> 2 -> 1, `pairs` = 2 -> 1 + 4 -> 3, `branch` = 2 -> 1 <- 3 <- 4, `stack3` = 3 -> 2 -> 1 + 4, `parallel` = all heard; an op's `mod: [3, 4]` overrides the routing) |
| `sub` | sub-oscillator: `-1` / `-2` (octaves) or `{ octave, wave: sine\|square\|triangle, level: dB }` |
| `impulses` | for `osc: impulses`: `{ density: 30 (per second, random Poisson timing), shape: click\|tick\|bubble, pitch: [300, 3000] (low, high: Hz or notes, picked per impulse, log-uniform), decay: 0.02 (s per impulse), level: [0.5, 1] (amplitude range per impulse) }`. `click` = a 1-2 ms noise burst (fire crackle, gravel, sparks; `pitch` and `decay` unused), `tick` = a short decaying sine at the picked pitch (debris, ticking metal), `bubble` = a sine rising ~30% over its decay (water, boiling, sinking). The note's pitch doesn't move it; in an SFX layer the `gain` keyframes scale both the level and the density (a fade thins the impulses out). Seeded like `noise`: every variation gets its own pattern |
| `sync` | hard sync for `saw`/`pulse`: a ratio (`2.6`) or `{ ratio, env_amount: octaves, env }` (the classic sync sweep) |
| `mute` | brass mute tone: `straight` (thin, bright), `cup` (soft, covered), `harmon` (buzzy, nasal; add `filter: { lfo }` for wah-wah) |
| `fx` | per-instrument effects, in order: `[{ chorus: {...} }, { delay: {...} }]` (see Effects below) |
| `max_ring` | seconds a note may ring after it ends (gate), then a 50 ms fade: chokes long one-shots and releases (timpani rolls, tam-tam, crash, low harp) so a loop file doesn't grow by bars (W019) |
| `env` | `[attack, decay, sustain, release]` (seconds, seconds, 0-1, seconds) or `{attack, decay, sustain, release, curve}`; decay/release are (1 - x)^3 and stop at zero; `[..., exp]` / `curve: exp` = exponential: decay = time to fall 60 dB and it rings on (bells, plucks), release = time to -60 dB then zero |
| `pitch_env` | `[semitones, seconds]` (start that far off and glide to the note) or keyframes `[[t, semitones], ...]` |
| `vibrato` | `[rate_hz, depth_semitones]` or `[rate, depth, delay_s]` |
| `tremolo` | `[rate_hz, depth 0-1]` |
| `arp` | semitone offsets cycled while the note holds, e.g. `[0, 7, 12]`; `arp_rate` notes per second (default 20) |
| `unison`, `detune` | 1-8 stacked voices spread over +/- `detune` cents (with `unison: 1`, `detune` just shifts the pitch) |
| `filter` | `{ type: lp\|hp\|bp\|notch, cutoff: Hz, resonance: 0-1, bandwidth: octaves, env_amount: octaves, env: [...], keytrack: 0-1, lfo: [rate_hz, octaves], slope: 12\|24 }` (`lfo` sweeps the cutoff up and back from each note's start; `bandwidth` (bp/notch only, 0.05-4) is the width between the -3 dB points and overrides `resonance`: `bandwidth: 0.3, slope: 24` is a narrow, steep band for zips and whistles) |
| `gain` | dB (relative level inside the kit) |
| `pan` | -1 left .. 1 right (stereo music only) |
| `range` | `[lowest, highest]` notes it may play (E007 outside) |
| `voices` | notes at once (default 1: a new note cuts the previous one, like a chip channel; E014 if a track stacks more) |
| `crush` | `{ bits: 1-16, rate: Hz }` lo-fi for this instrument only |
| `note` | the pitch it plays as a one-shot (drum lanes, SFX layers without `pitch`); default C4 |

## Sfx

Making a sound effect: presets, layers, recipes, SFX notation.

### Making a sound effect

0. **Synthesise or record?** Read `[sfx] source` in segan.toml (`segan config get sfx.source`): `synth` = never
   record (W020), `recorded` = prefer recordings, `auto` (default) = decide per sound:
   - **Synthesise**: UI, coins and pickups, retro/arcade sounds, lasers, magic, sci-fi, musical stingers. Steps 1-4.
   - **Record**: anything real-world: animals, voices, footsteps, material impacts (wood, metal, glass, gravel),
     weapons (swords, guns, bows), fire, water, weather, vehicles, ambience. "Recorded SFX" below.
   - **Hybrid**: a recording with synth layers for what it lacks: a sub thump under an explosion or a cannon, a
     shimmer on a magic impact, a tail.
   A request that doesn't say: realistic (record) or stylised (synthesise)? Use the game's style in SOUND.md.
1. Start from the closest **preset**: `segan new sfx <name> --preset <coin|jump|laser|explosion|hit|hurt|powerup|blip|select|door|step> --description "..."`
   (no preset fits: `segan new sfx <name>` gives a one-layer starter). Presets are good starting points;
   change one preset layer by its `id` (only the fields you give change; the scaffold lists the preset's layer
   ids), add layers, drop layers with `remove: [id]`, or `segan bake sfx <name> --in-place` to write every field
   out and edit freely.
2. Think in layers: a **body** (pitched tone: pulse/saw/triangle/sine/fm) + a **transient** (short noise
   burst for the attack) + sometimes a **tail** or **sub** (low drum/sine thump). Recipes:
   | Sound | Recipe |
   |---|---|
   | pickup/coin | square, two quick rising notes (pitch keyframes, no slide), short release |
   | jump | square sweeping up (slide) over ~0.15 s |
   | laser/shot | bright square diving 1-2 octaves fast (slide) + a ring-modulated or noisy fizz |
   | explosion | `bitnoise` with falling pitch through a closing low-pass (`cutoff` keyframes) + a deep kick thump |
   | hit/impact | band-passed noise crack + a falling low square knock + a short tom body |
   | hurt | square falling a fifth with fast vibrato + grit |
   | power-up | fast `arp: [0, 4, 7, 12]` climbing an octave + a sparkle |
   | UI blip/confirm | one or two tiny soft tones, category `ui` |
   | footstep | low-passed noise tap + tiny tom, category `foley`, `variations` |
   | door | noise latch click + band-passed saw creak with vibrato + tom thud |
   | fire crackle / debris / bubbles | `osc: impulses` with `shape: click` / `tick` / `bubble` (one layer of random impulses, not many hand-placed ones); `gain` keyframes fade the density too |
   | engine/hum/alarm | `loop: true` with a `crossfade`, steady layers (or a `phases` loop) |
   | charge-up + release | `phases: { charge: { loop: true, ... }, release: { ... } }` |
3. Things that always matter for SFX:
   - **Start at once**: the main layer at `start: 0` with a fast attack; W005 flags lead-in silence (input lag).
   - `duration` is the hard end of the dry sound; anything still sounding is cut (W011): lengthen it or shorten
     `length`/release.
   - Sounds that repeat a lot (steps, shots, hits) get `variations: { count: 4, pitch: 1, timbre: 0.3 }`;
     Godot gets an AudioStreamRandomizer that cycles them. When the jitter still sounds samey, add `takes:` (other
     layer mixes, envelopes and lengths of the same sound, merged by layer `id`): one asset, one randomizer over all.
   - The file is `duration` plus the shared room's tail (the sheet shows "1.10s + 0.26s room tail"). Short,
     frequent sounds (UI clicks) can go dry: `room: 0` on the SFX or `[room] ui = 0` in segan.toml.
   - `category` picks the loudness target: `sfx` -14, `ui` -20, `foley` -22 LUFS (segan.toml `[loudness]`).
     A sound too short and spiky to reach its target gets W001: `segan preview <name> --json` lists each layer's
     peak/loudness/crest (`layers`); stagger layer starts by 3-9 ms, saturate or lower the peakiest layer, give it
     more body, or use a quieter category.
4. `segan lint <file>` -> fix every error and every warning that's a real problem (a warning you keep on
   purpose goes in the file's `lint: { disable: [...] }` with a comment why); hand over with a clean lint.
   `segan preview <name>` -> **open the listen sheet** and check: the pitch
   movement you wanted (white lines, cyan dots), the attack is instant, the tail decays smoothly, LUFS on
   target, nothing red. Iterate (about 4 rounds at most), then hand the WAV to a human.


### SFX - `sfx/<name>.sfx.yaml`

```yaml
name: coin
description: "Bright two-note pickup chime, short, no tail."
category: pickup              # loudness target: [loudness] in segan.toml (unlisted categories use sfx)
preset: coin                  # optional starting point: coin jump laser explosion hit hurt powerup blip select door step
kit: nes                      # optional: layers can use `instrument: <key>`
duration: 0.42                # seconds of dry sound; still sounding at this point = cut (W011); the room tail is added after
layers:
  - id: tone                  # ids let presets/templates be changed one layer at a time
    osc: pulse
    duty: 0.5
    pitch: [[0, B5], [0.07, E6]]   # keyframes [seconds from the layer's start, note or Hz]; one value: `pitch: A5` / `pitch: 440`
    slide: false              # true: glide between keyframes; false: jump
    env: [0.001, 0.08, 0.55, 0.22]
    length: 0.16              # seconds held before the release (default: so the release ends at duration)
    gain: -6                  # dB, or keyframes [[t, dB], ...] (multiplied with the envelope, not replacing it)
  - { id: click, osc: noise, filter: { type: hp, cutoff: 6000 }, env: [0, 0.02, 0, 0.01], gain: -18 }
variations: { count: 4, seed: 7, pitch: 0.5, timbre: 0.1, gain: 1 }   # -> coin.1.wav ... coin.4.wav (+ Godot randomizer)
```

Layer fields = instrument fields (above) plus: `id`, `instrument` (a kit key to start from), `start` (s),
`length` (s), `pitch` (note, Hz or keyframes; a note can carry a cents offset, `A4+15c` / `C6-30c`, for detuned
copies of a layer) (+ `slide`), `gain` keyframes, `cutoff` keyframes (`[[t, Hz], ...]`; adds a low-pass if the
layer has no filter), `distort` (0-1; the layer's `gain` applies after it, so gain never changes the grit), `ring` (`{ freq: Hz, mix: 0-1 }` ring modulation), `delay`
(`{ time: s, feedback: 0-0.95, mix: 0-1 }`).

More SFX fields:
- `variations`: `count` 1-32, `seed` (change it for a different set), `pitch` (+/- semitones), `timbre` (0-1:
  duty, filter, envelope jitter), `gain` (+/- dB), `timing` (+/- seconds each layer's start moves, 0-0.5; the
  earliest layer stays put, so the attack stays instant, and no layer moves before it: bursts and bubbles land at
  different moments), `envelope` (0-1: each layer's attack/decay/release up to
  2x longer or shorter), `length` (0-0.5: the whole sound - duration, starts, lengths, keyframe times - up to that
  much longer or shorter). Each variation is its own WAV, all normalised to the target
  (a +dB variation aims above the target: near the limiter cap it gets W001). `include_main: false` builds only
  `<name>.1..N.wav` (no `<name>.wav`) when the game plays the randomizer.
- `takes`: structurally different takes of the same sound under one asset (more variety than `variations`' jitter):
  `takes: [{ duration: 0.4, layers: [{ id: crack, gain: -3 }, { id: thud, remove: true }, { id: snap, osc: noise, ... }] }, ...]`.
  Take 1 is the SFX as written; each listed take (2, 3, ...) starts from the SFX's layers and changes them by `id`
  (fields you give change, the rest stays), adds layers with a new id (or none), and drops one with
  `{ id: <id>, remove: true }`. `duration` defaults to the SFX's; `loop`/`crossfade` are the SFX's. Every take gets the
  SFX's `variations` on top (3 takes x 4 variations = 12 files); a take's own `variations:` merges over the SFX's
  (`variations: null`: none for that take; `include_main` applies per take). Files: `<name>.t<k>.wav` and
  `<name>.t<k>.<n>.wav`; one manifest entry and one Godot randomizer over every take. Takes don't apply to phases.
- `room: 0-1`: this SFX's room send (x `[mix] room`; 0 = dry, no tail). Default: its category's `[room]` entry, else 1.
- `playback: { max_instances, min_gap_s, repeat_attenuation_db }`: hints for the game, copied into the manifest
  as given (the render ignores them): at most `max_instances` (1-64) copies at once (the oldest stops), plays
  closer than `min_gap_s` (0-10 s) to the last start dropped, each copy still sounding makes a new one
  `repeat_attenuation_db` (0-24 dB) quieter. For frequent sounds (gunfire, footsteps, pickups in a burst):
  `playback: { max_instances: 4, min_gap_s: 0.03, repeat_attenuation_db: 2 }`. `segan_sfx.gd` honours them (Godot).
- `phases`: `{ <name>: { duration, loop, crossfade, layers } }` - each phase is its own output `<name>.<phase>.wav`
  (layers default to the SFX's own); e.g. a looping `charge` and a one-shot `release`.
- `loop: true` + `crossfade` (s, default 0.05): a seamless loop (engine hum, alarm): the end blends into the start.
  For a seam you can't hear: give held layers a `length:` past the loop end (so nothing releases inside the loop),
  and make every keyframe curve (pitch, gain, cutoff) end on the value it starts with; check W007 and the seam view.
- `normalize: false`: keep the level as written (W013 if it's more than 1 LU off its target).
- `extends: <template>`: start from a file with `template: true` in sfx/ (templates aren't built). Layers merge by
  `id` (fields you give change, the rest stays), other layers are added, `remove: [ids]` drops template layers.
  Own fields (name, description, tags, status, style_version) aren't inherited.
- `preset` works like `extends` with a built-in template (layers merge by id, `remove: [ids]` drops preset layers;
  `segan new sfx --preset P` lists the preset's layer ids). `segan bake sfx <name> [--in-place]` writes everything out.
- The output is `duration` plus the room tail (cut at `[mix] tail_trim_db`, default -70 dB below the peak). Every output is normalised to its category
  target, however quiet or loud the layers are written (`normalisation_gain_db` in the analysis); write gains for
  the balance between layers, not for the absolute level.

## Songs

Making a song: suggest, rows, patterns, craft, loops, variants, stems; song notation.

### Making a song

1. **Start somewhere new**: `segan suggest song <name> --mood "<words>"` proposes key and mode, tempo, meter,
   an opening texture (pad, ostinato, arpeggio, pulse, drone and melody, drums first, solo line, chorale, bass riff,
   call and response), the opening voicing (chord, inversion, spread, register), a progression and the instruments
   (the identity plus extras), steered away from the project's songs and seeded by the project seed (`--take 1`
   for another). Use it, or decide yourself from SOUND.md, but **vary key, mode, tempo, meter, register, texture and
   instrumentation between songs**: if the last three songs were D minor / F major at 60-72 bpm on a pad, this one
   isn't. Moods: major bright, minor sad/tense, dorian adventurous, mixolydian heroic, phrygian menacing, lydian
   dreamy, harmonic minor exotic; slow isn't always minor, and 3/4, 6/8 or 5/4 change the feel more than tempo.
   **No two songs open the same way**: different first chord, inversion, register or texture (W021).
2. `segan new song <name> [--key "E dorian"] [--tempo 96] [--meter 6/8] --bars 2 --description "..."` gives tracks
   with labelled empty rows (without `--key`/`--tempo` it takes the suggestion). Rows are the scale's notes, highest first, so **you can't write a wrong note**: pick rows, not
   pitches. Keep the trailing labels on every row (E011 catches a missing or extra row).
3. Write **short patterns** (1-2 bars = 16-32 steps) and reuse them: derived patterns (`from: a` with
   `transpose`, `mute`, `swap`, `shift`, `reverse`, or one lane replaced) and sections (`main: [a, b, a, c]`).
   A 16-bar loop is typically 3-5 written patterns. This keeps files small and the song coherent.
4. Writing music that works (you can't hear it, so follow the craft):
   - Pick a chord per bar (e.g. i VI III VII = Am F C G in A minor; `segan.api.progression` lists the notes).
   - **Bass**: chord roots on the beats (steps 1, 5, 9, 13 of a 16-step bar), octave or fifth hops between.
   - **Melody**: mostly steps between neighbouring rows, a leap now and then followed by a step back; chord
     tones on strong beats (steps 1 and 9); phrases of 2 or 4 bars that answer each other (`transpose` a
     phrase for the answer); rests between phrases. End the loop on a note that leads back to the start.
   - **Harmony/arpeggio**: chord tones in eighths, quieter (track `gain: -3`).
   - **Drums**: kick on 1 and 3 (or every beat for driving music), snare on 2 and 4 (steps 5 and 13), hats in
     eighths; `X` accents and `o` ghosts give groove; a fill in the last bar of a section. Not every song needs a
     kit: hand percussion, a brush, a shaker or no drums at all are textures too.
   - **Dynamics**: roll notes get `velocity:` rows (`X` accent, `o` ghost, `1`-`9`) and `dynamics:` ramps
     (crescendos, swells): a phrase without dynamics sounds mechanical. `humanize: { timing: 8, velocity: 0.1 }` on
     the song loosens the grid (seeded: the same every render; change `seed` for another take).
   - W009 flags minor-second/tritone clashes between tracks on a beat (the meter's beat: a dotted quarter in 6/8;
     notes held from earlier count while still above -30 dB): fix them
     unless you want the tension. A dominant seventh (V7, e.g. C7 going to F) contains a tritone on purpose:
     there it's a judgement call between shortening a note and `lint: { disable: [W009] }`.
   - Many similar patterns, or tired of counting dots: generate lanes with `segan.api` (`segan docs api` has a worked
     example) instead of an ad-hoc script. A generator that writes several songs must vary them: `api.Rng(seed,
     song_name)` for seeded choices, `api.voicing(chord, inversion, spread, octave)` for voicings, different
     progressions, textures and instruments per song. One template with the chords swapped is one song 20 times.
5. **Loops**: `loop: main` (from the start of that section to the end). The file is the whole song **plus the
   first bar(s) of the loop again**, and the loop points sit that many whole bars later (`loop.offset` in the
   manifest; usually one bar: enough bars to cover the longest release + the room tail). So the loop's own end
   rings into its start, the seam is clean and the intro flows naturally into the first pass. The file is
   therefore longer than the arrangement (8 bars at 100 bpm = 19.2 s, the file 21.6 s): that's expected; engines
   use the loop points. Check `seam_click` and the seam view (`<name>.seam.png`). Intros are their own section
   before the loop.
   **Music the player hears for minutes (exploration, towns, combat) must not be one 8-16 bar loop**: players
   tire of it fast. Write 5-10 contrasting sections (derive most with section changes: `{ from: verse,
   semitones: 2 }`, `{ from: chorus, mute: [drums], velocity: 0.7 }`, a breakdown, a bridge) and a `flow:` graph
   so the game picks the next section at run time; preview `--output walk` and look at the whole walk. Plan the
   game's music as a soundtrack (`music/<name>.soundtrack.yaml`): states with song pools, play times and
   silence gaps (silence between songs is what keeps music fresh), and transitions (sync point, fades,
   stingers). A pool of short loops: group same-key loops into `families` and give the state a `crossfade`
   so they flow into each other. `segan docs long-form` and `segan docs soundtrack`.
6. **Variants** in one line each: `danger: { tempo: 150, instrument_swap: { q: r } }`, `calm: { kit: soft_kit }`,
   `night: { semitones: -2 }`, `major: { key: A major }`; combinations with `variant_axes`. Adaptive layering:
   add `"stems"` to `export` (one WAV per track, Godot AudioStreamSynchronized), or a `stems:` block with `groups`
   (one WAV per layer) and `mixes` (the layer combinations the game plays: normalised over the loudest of them;
   each quieter mix gets a `trim_db` the game adds to the stem volumes while it plays that mix).
   Size: many long songs add up (a 3-minute stereo WAV is 30 MB). `"ogg"` in `export` writes music as Ogg
   Vorbis (~10x smaller); a simple chip song can set `sample_rate: 22050` and `channels: mono` for itself.
7. `segan lint`, then `segan preview <song>`: look at the piano roll (is it what you meant?), the spectrogram
   (busy where you expect, bass at the bottom, no smear of clashing notes), the LUFS curve (no holes or spikes),
   `pitch_check` (every note within 50 cents), the seam, and `closest_song` (the most similar song in the project
   and among SEGAN's examples). Long songs: `--from 9 --to 16` (bars) shows a window. Then a human listens to the WAV.
8. **Before you call a soundtrack done**: `segan similarity` (or the MCP `similarity` tool). No pair should share
   an opening (W021) or score over `lint.max_similarity` in its first bars (W024); most songs shouldn't share a
   pitch set or tempo band (W022), and the songs shouldn't all play the same instruments (W023). A song close to
   SEGAN's own examples (W025) means you started from a default: move away from it. Report the similarity numbers
   with the soundtrack.
9. Existing music as MIDI: `segan import midi file.mid --kit <kit>` (quantized, snapped to the key, mapped to
   the kit, with a report of every change); then lint, preview and tidy the patterns.


### Song - `music/<name>.song.yaml`

```yaml
name: overworld
description: "Upbeat exploration loop, A minor, 120 bpm."
kit: nes                      # or segan.toml default_kit; open mode may define `instruments:` inline
tempo: 120                    # bpm (beats of the meter's unit)
meter: [4, 4]
steps_per_beat: 4             # grid: 4 = sixteenth notes in 4/4
swing: 0.0                    # 0-0.5: delays every off-step by that many steps
key: A minor
tracks:                       # order = mix order
  lead:  { roll: [A4, A5] }               # rows = the key's notes from A4 to A5, highest first
  bass:  { roll: [E2, E3], gain: -2 }
  keys:  { roll: [C4, C5], chromatic: true }   # all 12 semitones as rows
  drums: { drums: [k, s, h] }             # rows = these kit keys, in this order
patterns:
  a:
    length: 16                # steps per row (`|` and spaces between the grid and its label don't count)
    lead: |
      ....|....|....|....  A5
      ....|....|..p-|....  G5
      ....|..p-|....|....  F5
      ....|....|....|p---  E5
      ....|....|....|....  D5
      ..p-|....|....|....  C5
      ....|....|....|....  B4
      p-..|....|....|....  A4
    drums: |
      x...|....|x.x.|....  k
      ....|X...|....|X..o  s
      x.x.|x.x.|x.x.|x.x.  h
  b: { from: a, transpose: { lead: 2 } }   # derived pattern
sections:
  intro: [a]
  main: [a, b, a, b]
arrangement: [intro, main]    # play order
loop: main                    # loop from the start of main to the end (true = the whole song; omit = no loop)
markers: { drop: [main, 3] }  # name: [section, bar within it] -> manifest + WAV cue
variants:
  danger: { tempo: 144, instrument_swap: { q: r } }
```

Grid rules:
- **Roll lanes**: a kit key starts a note on that row, `-` holds it (one more step), `.` rests. `pp` = two notes,
  `p-` = one note two steps long. Several rows at once = a chord (needs `voices`). Rows are the scale notes
  inside the track's `roll` range, highest first (all 12 semitones with `chromatic: true`).
- **Drum lanes**: `x` hit, `X` accent (+3.5 dB), `o` ghost (-9 dB), `.` rest.
- Every row has exactly `length` steps; `|` anywhere in a row is ignored (use it to mark beats).
- The label after the row (`A5`, `k`) is optional but checked: write it every time (E011 catches shifted rows).
- A lane left out of a pattern is silent. `-` at the start of a row or after a rest is E015.
- **Dynamics** (any track, mostly rolls): `velocity: { lead: "X...o...|x.3.5..." }` sets the velocity of the notes
  starting at each step: `X` accent (1.5, +3.5 dB), `x` plain, `o` ghost (0.35), `1`-`9` = 0.2-1.8 (`5` = plain),
  `.`/`-` unchanged; one mark per step (`|` ignored). `dynamics: { strings: [[1, -12], [16, 0]] }` then scales a
  track's notes by a ramp in dB (steps from 1, linear between points, held outside them): crescendos, swells,
  fades. Velocity picks sample layers (accent = MIDI 120, ghost 28) and scales synth notes. A derived pattern keeps
  its source's velocities unless it sets its own.
- **Release** (roll tracks): `release: { pad: 3.0 }` in a pattern makes every note of that track in that pattern
  release over that many seconds (0-30) instead of its instrument's release; `release: 3.0` = every roll track. So
  a sting's last chord, in a pattern of its own, rings longer than the kit allows. On a track (`pad: { roll: [C3,
  C5], release: 3.0 }`) it applies to all of the track's notes; a pattern's overrides the track's. A derived
  pattern keeps its source's unless it sets its own. The longer ring counts for the loop offset (W019), flow clips
  and the render cache; an instrument's `max_ring` shorter than the override is lifted to it. Drums keep their decay.

```yaml
  swell:
    length: 16
    strings: |
      v---------------  A4
      ...
    velocity: { horn: "X.......o...o..." }
    dynamics: { strings: [[1, -15], [12, 0], [16, -3]] }
```

Derived patterns: `{ from: <pattern>, ... }` with
`transpose` (scale steps; a number for every roll track or `{ track: steps }`), `semitones` (must land on rows of
the track), `shift` (steps later (+) or earlier (-); notes pushed off the end are E010, tails cut are W012),
`reverse` (true or a list of tracks), `mute` (list of tracks), `swap` (`{ p: q }` instrument keys), and any lane
written out in full to replace that track's lane. The length stays the source's.

Variants (each becomes `<song>.<variant>.wav`): `tempo`, `swing`, `instrument_swap` (`{ q: p }`), `group_swap`
(`{ leads: pads }`, groups of the same size), `kit` (another kit with the same keys), `transpose` (scale steps),
`semitones`, `key` (same notes by scale degree in another key/mode, e.g. `A major`). `variant_axes`:
`{ intensity: { calm: {...}, combat: {...} }, time: { day: {...}, night: {...} } }` makes every combination,
named `calm+day` etc.

Stems (adaptive layers): with `"stems"` in `export` every track is a stem WAV. A `stems:` block (stems for this
song whatever `export` says) groups tracks and names the combinations the game plays:

```yaml
stems:
  groups: { base: [drums, bass], calm: [calm_*], combat: [combat_*] }   # track names or globs; each track in one group
  mixes: { calm: [base, calm], combat: [base, combat] }                 # normalised so the loudest mix hits the target
  main_mix: false                                                       # build only the stems (no full-mix WAV)
```

`segan preview <song> --output mix:calm --output stem:base` renders once and shows each; the main analysis
lists every mix's LUFS (`stem_mixes_lufs`). Without `mixes` the stems follow the full mix's gain (they add up to it).
A quieter mix (a bed without drums can sit 10+ dB under the loudest) gets a `trim_db` in the manifest
(`stem_mixes_trim_db` in the analysis): add it to every stem's volume while the game plays that mix and it is on
target too; it's capped so the mix's true peak stays under `[mix] limiter`. W017: a mix too peaky to reach its
target even with its trim.

More song fields: `humanize: { timing: ms (0-40), velocity: 0-0.5 }` (every note a little early or late and
louder or softer, seeded: the same nudge each time a section plays, in loops and flow clips; `humanize: 8` = timing
only), `seed` (the song's own seed: change it for another take of the humanize; default from the name), `fade_in` /
`fade_out` (seconds; songs that play once: a smooth rise from the start, a fall to silence at the end of the
arrangement, before the room, so the room still rings out),
`category` (default `music`: loudness target), `normalize: false`, `sample_rate` (22050 |
32000 | 44100 | 48000) and `channels` (`mono` | `stereo`): this song's own output format over `[mix]`'s (a chip
loop at 22050 Hz mono is a quarter of the size; it aliases more, which lint checks at that rate), `extends` (a
song with `template: true`; tracks, patterns, sections, variants merge by name), and the common fields below.

## Soundtrack

Soundtracks: states, song pools, transitions, families.

### Soundtrack - `music/<name>.soundtrack.yaml`

Which songs a game plays in which state, and how it moves between states (played by the Godot director):

```yaml
name: main
start: explore
states:
  explore: { songs: { overworld: 2, village: 1, cave: 1 }, play: [120, 240], gap: [10, 40], fade_out: 3, crossfade: 4 }
  combat: { songs: [combat, overworld.danger] }      # `song.variant`
  menu: [title]                                      # a list = songs only
families:                                            # songs that cross-fade into each other inside a state
  a_minor: [overworld, village]                      # (`overworld` is the main version; list variants as `song.variant`)
transitions:                                         # most specific wins: "from>to", "from>*", "*>to", "*"
  "*": { at: bar, fade: 2 }                          # the default is { at: bar, fade: 2 }
  explore>combat: { at: beat, fade: 0.5, stinger: hit, start: main }
  combat>explore: { at: section, fade: 4, fade_in: 2 }
```

State: `songs` (list, or weights; never the same song twice in a row when there are others), `play` (seconds a
song plays before it ends, a number or [min, max]; a flow song then finishes its section and plays `end` or
its tail, a looping song fades out over `fade_out`; default: forever when the state has one song and no gap,
else [120, 240]), `gap` (seconds of silence between songs, number or [min, max]: silence makes music last),
`crossfade` (seconds; when the next song is in the same family as the one ending, it comes in on the next bar
and the two overlap this long, no gap; songs of different families still fade out, wait the gap and start;
default 0 = never). `families`: family -> songs (each song in one family; a song in none is its own family).
A big shuffled pool of short loops: put the loops of one key/tempo in a family, give the state a `crossfade`
and a short `play` (e.g. [30, 60]), and they flow into each other; changing family gets a breath of silence.
Transition: `at` (`now`, `beat`, `bar`, `section`, `end`: when the switch happens, on the old song's grid),
`fade` (seconds the old song fades out; 0 with `at: section` lets a flow song ring out naturally), `fade_in`,
`stinger` (an SFX played at the switch), `start` (a section of the new song to start at). E018: unknown
state/song/variant/SFX/section or family member, or a bad field; W016: a cross-fade between songs whose keys
clash, in a transition or a family (keep fades between related keys, or use a short fade with a stinger).

## Long form

Long-form music: section changes and flow graphs.

### Long-form music: section changes and `flow`

An 8-bar loop on repeat wears players out within minutes. Write more material cheaply, and let the game walk it:

**Section changes.** A section is a pattern list or a mapping that changes its patterns' notes as they play:

```yaml
sections:
  verse: [a, b, a, c]
  verse_up: { from: verse, semitones: 2 }                  # same section a tone higher (a key change)
  chorus: { patterns: [d, d, e, f] }
  chorus_soft: { from: chorus, mute: [drums], velocity: 0.7, instrument_swap: { p: q } }
  breakdown: { patterns: [a, b], mute: [lead, harmony] }
  bridge: { patterns: [g, h], key: A major }               # same scale degrees in another key/mode
```

`patterns` or `from` (another section: its patterns and changes, then this one's fields over them), `transpose`
(scale steps), `semitones`, `key`, `instrument_swap`, `group_swap`, `mute` (tracks), `velocity` (0.05-2, or
`{ track: scale }`). Pitch changes apply at play time, so `semitones: 2` doesn't need the rows to exist; a song
variant applies first, the section's changes on top. Ranges (E007) and voices (E014) are checked per section.

**Flow (the game picks the next section).** Without `flow`, a song is one arrangement with one loop. With it,
the game (SEGAN's Godot director, or your own player from the manifest) chains sections at run time:

```yaml
arrangement: [intro, verse, chorus, verse_up, chorus, bridge, chorus]   # still the linear version (preview, simple games)
flow:
  start: intro                       # or a list: one is picked
  next:                              # which sections may follow which: a list, or weights
    intro: [verse]
    verse: { chorus: 3, breakdown: 1 }
    verse_up: [chorus]
    chorus: { verse: 2, verse_up: 1, bridge: 1, chorus_soft: 1 }
    chorus_soft: [verse, bridge]
    breakdown: [chorus]
    bridge: { chorus: 1, verse_up: 1 }
  end: outro                         # optional: played when the game ends the song (any section may go to it)
  no_repeat: true                    # never the same section twice in a row unless it's the only way on (default)
  variants: [danger]                 # variants that get flow clips too (default: none)
```

Every flow section must be whole bars (E017); every section reachable from `start` and able to go on (or be
the `end`). Each section is built as clips: `flow/<song>/<section>.head.wav` (its first bar(s), cold),
`<section>.from.<prev>.wav` (the same bars with the previous section's ring-out baked in), `<section>.wav` (the
rest) and `<section>.tail.wav` (its ring-out when the music stops after it). Chained back to back they equal a
linear render of that path, so every seam is clean whatever order the game picks. W015: a section shorter than
the ring-out before it (that ring-out gets cut).

Writing for flow: 5-10 sections of 4-8 bars with real contrast (a breakdown, a bridge, a key change, a soft
chorus) give minutes before an order repeats; derive most of them with section changes. Keep each section's
first bar playable after any of its predecessors (the harmony joins), and end each section on a cadence that
can lead into all of its `next` sections. `segan preview <song> --output walk` (or `walk:<seed>`) renders a
3-minute seeded walk from the clips (`<song>.walk1.wav`, sections marked on the sheet, `join_error` in
the analysis: max difference from a straight render of the path, < 0.001): listen to that, not just the arrangement.

## Samples

Sampled instruments: libraries, sample:, SFZ/SF2/WAV, fetching.

### Samples (recorded instruments: any kit can mix them with synths)

`sample:` replaces `osc`/`drum`; envelope, filter, vibrato, pitch keyframes, gain, voices, crush, `mute` and `fx` still
apply. A sampled instrument is an ordinary kit instrument: a synth kit can have a real piano, an erhu or a brush kit
next to its pulse lead.

```yaml
instruments:
  v: { name: violins, sample: vsco2/violins_sus, voices: 4, env: [0.04, 0, 1, 0.35] }   # library instrument
  r: { name: harp, sample: vsco2/harp, voices: 8 }                                        # one-shot: rings to its end
  T: { name: timpani, sample: vsco2/timpani, voices: 2 }
  B: { name: bass_drum, sample: vsco2/bass_drum }                                        # unpitched: drum lanes
  g: { sample: { sf2: samples/GeneralUser.sf2, preset: 48, bank: 0 } }                   # SoundFont preset (number or name)
  k: { sample: { sfz: samples/keys.sfz, velocity: 100 } }                                # always that velocity layer
  z: { sample: { wav: samples/zap.wav, root: A4, loop: true } }                           # one WAV, pitched from root
```

- **Libraries** (all CC0; `segan samples list` shows every instrument with its size and range):
  - `vcsl` = Versilian Community Sample Library: keys (`grand_piano`, `fm_piano` electric piano, `clavisynth`,
    `harpsichord`, `pipe_organ`, `pipe_organ_loud`), plucked (`folk_harp`, `dan_tranh` zither/koto-like, `strumstick`),
    mallets and bells (`vibraphone`, `vibraphone_hard`, `tubular_bells`, `hand_chimes`, `balafon`, `kalimba`, `mbira`),
    winds (`harmonica`, `tenor_sax`, `recorder`, `ocarina`, `bowed_psaltery`), hand and world percussion (`conga`,
    `conga_mute`, `quinto`, `tumba`, `bongo_high`/`_low`, `cajon_1`-`_3`, `darbuka_1`/`_3`/`_5`, `frame_drum`,
    `frame_drum_small`, `shaker`, `cowbell`, `woodblock`, `claves`, `agogo_high`/`_low`, `clap`, `cabasa`, `guiro`,
    `slit_drum_high`/`_low`, `sleigh_bells`, `finger_cymbals`), kit pieces (`snare_drum`, `snare_off`, `hihat`,
    `hihat_open`, `tom_high`, `tom_low`) and found metal (`anvil`, `brake_drum`).
  - `karoryfer` = Karoryfer Lecolds: guitars (`clean_guitar`, `gretsch`, `gretsch_mute` palm-muted, `hofner`), basses
    (`bass_guitar`, `bass_guitar_dark`, `upright_pizz`, `upright_arco`), `erhu`, `erhu_stac`, and a drum kit (`kick`,
    `cajon_kick`, `snare`, `snare_edge`, `brush` (a brush stirred on the snare), `hat_closed`, `hat_tight`, `hat_half`,
    `hat_open`, `hat_foot`, `tom_floor`, `tom_low`, `tom_mid`, `tom_high`, `tom_very_high`, `crash`, `ride`, `splash`,
    `china`, `djembe`).
  - `neosound` = NeoSoundFonts (Simone Piervergili): `voice_oohs` (a male "ooh": stack `voices` for a small choir, or
    use the `formant` model), `steel_guitar`, `bamboo_flute`.
  - `vsco2` = VSCO 2 Community Edition (CC0, Versilian Studios): strings (sections: `violins_`, `violas_`,
  `cellos_` `sus|trem|pizz|spic`, `basses_sus|pizz`, `violin_solo`, `harp`), brass (`horn_`, `trumpet_`, `trombone_`,
  `tuba_` `sus|stac`), woodwinds (`flute_`, `oboe_`, `clarinet_`, `bassoon_` `sus|stac`, `piccolo`), percussion
  (`timpani`, `timpani_roll`, `glockenspiel`, `marimba`, `xylophone`, `bass_drum`, `snare`, `crash`, `sus_cymbal`,
  `tam_tam`, `triangle`, `tambourine`), `piano` (upright).
  The audio isn't in SEGAN: `segan samples fetch <library> <instrument...>` downloads only those (pinned commits, checked)
  into a user cache shared by every project. Lint says what to fetch if a kit needs more. Every library instrument is
  levelled to the same loudness (plain notes), so kit `gain` is pure balance. Unpitched ones (hits) play in drum lanes.
- Paths (wav/sfz/sf2) are relative to the project folder (the one with segan.toml). WAV: PCM 8-32-bit or float,
  any rate, mono or stereo (mixed to mono; tracks pan and the room widens). `smpl` loops are used.
- `env` defaults to the file's own (SFZ `ampeg_*`, SF2 volume envelope); `range` defaults to the mapped keys
  (E007 outside). Note velocity picks the layer: plain notes 80 (mf), accents `X` 120, ghosts `o` 28.
- Sustained samples (`_sus`) play while the note is held, then release; a note held longer than its sample
  is silent at the end (W014: shorten it or re-strike). One-shots (`pizz`, `stac`, `harp`, percussion, SFZ
  `loop_mode=one_shot`, `one_shot: true`) ring to their natural end whatever the note length; `voices` caps how
  many ring at once. In an SFX layer, `length:` chokes a one-shot (then its `env` release).
- SFZ subset: `<control> <global> <master> <group> <region>`, `sample default_path key lokey hikey
  pitch_keycenter lovel hivel tune transpose volume amplitude offset end loop_mode loop_start loop_end
  seq_length seq_position lorand hirand trigger ampeg_*`, `#define`. SF2: key/velocity zones, root key, tuning,
  loops, attenuation, volume envelope (modulators, filters and effects are ignored).
  `segan samples list file.sf2` lists a SoundFont's presets.
- Sampled songs render slower than synth ones (a 30 s orchestral loop ~20 s cold); renders are cached.

## Recorded

Recorded SFX: Freesound search, licences, sounds.lock, recorded layers.

### Recorded SFX

Real-world sounds start from recordings that are processed and layered, the way film sound is made (a film lion
is often a tiger pitched down, stretched and layered with a sub growl). Synth recipes can't get there.

1. **Find candidates** (needs `FREESOUND_API_KEY`): `segan sounds search "lion roar" --max-seconds 4 --json`.
   Only CC0 and CC BY sounds come back (never non-commercial). Pick 3-5 by name, tags, duration and rating, then
   `segan sounds inspect freesound:<id> ...` compares them without hearing: length, loudness, peak, brightness
   (`centroid_hz`), pitch, onsets (one clean hit or a clatter of several?). Prefer clean, close, dry recordings:
   a room can be added, never removed.
   **No key?** Search freesound.org on the web, then `segan sounds add https://freesound.org/people/<user>/sounds/<id>/`
   (or `freesound:<id>`): without a key SEGAN reads the licence, author and HQ preview from the public page and applies
   the same CC0 / CC BY rule. From another site with a clear CC0 / CC BY licence: check the licence on its page,
   download it into the project (`sounds/`) and `segan sounds add <file> --licence ... --source <page> --author ...`.
   Never use a sound whose licence you couldn't check.
2. **Keep it**: `segan sounds add freesound:<id>`: checks the licence, fetches the preview into the user cache
   (not the repo) and records it in `sounds.lock` (commit sounds.lock; builds fetch and check the file).
3. **Write the layer**: `sample: freesound:<id>` (or a file path, or a list: one per variation), then shape it:
   `trim: [start, end]` (seconds of the file), `shift: -7` (semitones, length stays), `stretch: 1.5` (x length,
   pitch stays), `reverse`, `fade: [in, out]`, plus the usual `gain`, `filter`, `cutoff` keyframes, `distort`,
   `start`, `length`. Bigger and heavier = shift down a few semitones and stretch a little; distant = low-pass
   (`filter: { type: lp, cutoff: 2500 }`), quieter transient, more room. Add synth layers for weight (a `sine`
   sub or `drum: kick` thump) or sparkle. Variations: a list of 2-4 similar recordings beats pitch jitter.
4. `segan lint` (E019 a missing/changed file, E020 a licence problem), `segan preview` and check the sheet as
   for any SFX (W011 if the recording runs past `duration`: `trim` it or `fade` it out).
5. **Credits**: CC BY requires attribution. `segan sounds credits` writes `SOUND_CREDITS.md`; tell the game
   agent/owner to ship it with the game's credits. `segan sounds vendor` copies the sounds in use into the
   project, only when asked (offline builds).

**What a game agent should put in a sound request** (tell your orchestrator, or ask): what it is and what
makes it ("a lion roar"), realistic or stylised, length ("~2 s"), distance and context ("distant, in a canyon";
"close, UI feedback"), how often it plays (frequent sounds get variations), and the game's style reference.


### Recorded layers (realistic SFX)

```yaml
name: lion_roar
description: "Big cat roar, distant, ~2 s: a CC BY recording pitched down and stretched, with a sub growl."
duration: 2.2
layers:
  - id: roar
    sample: freesound:123456       # in sounds.lock (`segan sounds add freesound:123456`); or a file: sounds/roar.wav
    trim: [0.12, 2.0]              # seconds of the file: [start, end] (or just the start)
    shift: -4                      # semitones, the length stays (-24..24)
    stretch: 1.15                  # x the length, the pitch stays (0.25-4)
    fade: [0, 0.4]                 # seconds: [in, out]
    filter: { type: lp, cutoff: 3000 }
  - { id: sub, osc: sine, pitch: [[0, A1], [1.6, E1]], slide: true, env: [0.05, 0.6, 0.4, 0.5], gain: -8 }
variations: { count: 3, seed: 1, gain: 1 }
```

`sample:` in an SFX layer makes it a **recorded layer** when it is a sound file path (`.wav`, `.ogg`, `.flac`,
`.mp3`; relative to the project; ogg/flac/mp3 need `pip install "segan-gen[ogg]"`), `freesound:<id>`, or a list of
them (one is picked per variation, from the seed; the same every render). A recorded layer plays its file as
recorded: one-shot, mixed to mono, peak-normalised (so `gain` is the balance against the other layers, whatever
level it was recorded at). Its own fields: `trim`, `reverse: true`, `fade: [in, out]`, `shift` (semitones) and
`stretch` (x length): pitch and length change **independently** (phase vocoder with phase locking; transients
soften a little at big stretches). Applied in that order: trim, reverse, stretch/shift, fades. Every other layer
field works too: `pitch` keyframes are varispeed (C4 = as recorded: `pitch: [[0, C4], [1, G3]]` slows down like
tape), `gain`/`cutoff` keyframes, `filter`, `env` (default: plays as recorded), `length` (chokes it, then
`env`'s release), `distort`, `ring`, `delay`, `start`. `osc`/`drum`/`instrument` can't be on a recorded layer:
synth sounds go on their own layers (they mix freely). The mapping form `sample: { wav: x.wav, root: A4 }` stays
a pitched sampled instrument.

**Licences** (E020): only CC0 and CC BY (any version), never non-commercial, share-alike or unknown. A Freesound
sound's licence, author and page come from `sounds.lock`; a local file needs `licence:` (`CC0`, `CC-BY-4.0`, or the
creativecommons.org URL), `source:` (the page it came from, or "own recording") and, for CC BY, `author:` on
the layer, or a sounds.lock entry (`segan sounds add sounds/x.wav --licence CC-BY-4.0 --source URL --author NAME`).
A project that has cleared another licence itself (a royalty-free library under its own terms, e.g. the GDC bundles)
names it in segan.toml: `[sounds] extra_licences = ["Sonniss-GDC"]`; its sounds then need `licence: Sonniss-GDC` and a
`source`, and `segan sounds credits` lists them under "Other licences". Only the owner clears a licence: don't add
one on your own.

**sounds.lock** (next to segan.toml; commit it): one `[sounds."<ref>"]` table per sound with `name`, `author`,
`licence`, `licence_url`, `url` (the Freesound page) or `source`, `file` (`preview-hq-ogg`, `local`), `download`,
`sha256`. Freesound files live in the user cache (`$SEGAN_SOUNDS`, else `~/.cache/segan/sounds`), fetched on first
use and checked against the sha256 (a mismatch is E019); `segan sounds vendor` copies them into
`<project>/sounds/freesound/`, which builds use first. SEGAN fetches Freesound's HQ Ogg preview (~192 kbit/s;
the API key alone allows it); originals need an OAuth2 login and aren't supported.

## Models

Instrument models (pluck, bowed, formant, modal, additive, wavetable, supersaw, fm) and effects (fx).

### Instrument models

An `osc` model takes a block named after it; a string picks a preset; no block = the defaults.

| Model | What it is | Block (defaults) | Presets |
|---|---|---|---|
| `pluck` | plucked string (Karplus-Strong): guitar, harp, koto, pizzicato, harpsichord | `{ decay: 3 (s, C4 to -60 dB), brightness: 0.5, pick: 0.15 (0-0.5), damping: 0.5 (high notes shorter), body: none\|guitar\|violin\|viola\|cello\|bass }` | `guitar nylon steel harp koto pizz bass muted harpsichord` |
| `bowed` | bowed strings: per player a saw with its own pitch drift and onset, bow noise, the body's resonances; `unison` = players (4-8 = a section) | `{ body: auto\|violin\|viola\|cello\|bass, bow: 0.3, drift: 5 (cents) }` | a body name |
| `additive` | sum of partials: organs, flutes, clarinet, bells, glass | `{ partials: preset \| [1, 0.5, 0.3] (harmonic amps) \| [[ratio, amp], [ratio, amp, decay_s]], drawbars: "888000000", stretch: 0 (inharmonicity) }` | `organ organ_full organ_soft flute clarinet hollow warm bright bell glass chime` |
| `wavetable` | single-cycle frames morphed by position, envelope or LFO | `{ table, position: 0-1, env, env_amount: -1..1, lfo: [rate, depth] }` | tables `analog pulse vocal glass digital organ harmonic sync` |
| `formant` | a voice: five formants of a vowel; `unison` = a choir (#22) | `{ vowel: a\|e\|i\|o\|u (ah eh ee oh oo) or [ah, oh] or [[0, ah], [0.8, oh]], voice: auto\|soprano\|alto\|tenor\|bass, breath: 0.1, drift: 4 }` | a vowel |
| `modal` | struck resonator: mallets, bells, metal | `{ material, strike: 0.5 (mallet hardness), decay: s at C4 }` | `marimba vibraphone xylophone glass bell tubular kalimba steel_drum wood metal membrane` |
| `supersaw` | seven detuned saws (trance, hoover with `pitch_env` + chorus) | `{ spread: 30 (cents), mix: 0.6 }` | - |

`pluck` and `modal` ring by themselves: their default `env` holds while the note does and damps on release (0.3 s,
modal 1 s). `bowed`/`formant` take `vibrato` like any instrument (a section: `vibrato: [5.2, 0.12, 0.3]`). `auto`
bodies and voices follow the instrument's `range`.

```yaml
  g: { name: nylon, osc: pluck, pluck: nylon, voices: 6, range: [E2, B5] }
  v: { name: strings, osc: bowed, unison: 6, detune: 6, voices: 6, env: [0.25, 0, 1, 0.6], vibrato: [5.2, 0.1, 0.3], range: [G3, E6], fx: [ensemble] }
  c: { name: choir_ah, osc: formant, formant: { vowel: [ah, oh], voice: bass }, unison: 5, detune: 8, voices: 4, env: [0.4, 0, 1, 0.8], range: [E2, C4] }
  m: { name: marimba, osc: modal, modal: { material: marimba, strike: 0.4 }, voices: 4, range: [C3, C6] }
  o: { name: organ, osc: additive, additive: { drawbars: "888000000" }, voices: 4, fx: [{ chorus: { rate: 6, depth: 1.5, mix: 0.4 } }] }
  w: { name: glassy, osc: wavetable, wavetable: { table: glass, env: [0.5, 1.0, 0.3, 1.0], env_amount: 0.6 }, voices: 4 }
  t: { name: muted_trumpet, sample: vsco2/trumpet_sus, mute: harmon }
```

### Effects (`fx`)

Applied in order to each note after it's rendered (and after a mono voice is cut, so echoes ring on); LFOs start
with the note, so a note sounds the same wherever it's played (loops and flow clips stay exact). Rates and times
take Hz/seconds or a **note value** that follows the song's tempo: `"1/4"`, dotted `"1/8."`, triplet `"1/8t"`, bars
`"2"` (SFX count them at 120 bpm). In stereo songs `chorus`, `ensemble`, `autopan`, `reverb` and a `pingpong` delay
make the note stereo. A shorthand `fx: [chorus]` uses the defaults.

| Effect | Settings (defaults) |
|---|---|
| `chorus` | `rate: 0.8, depth: 3 (ms), delay: 12 (ms), mix: 0.5, voices: 2, width: 1` |
| `ensemble` | `depth: 0.5, mix: 0.6, width: 1` (the string-machine ensemble: lush strings and pads) |
| `flanger` | `rate: 0.25, depth: 2 (ms), delay: 1.5 (ms), feedback: 0.5, mix: 0.5` |
| `phaser` | `rate: 0.4, depth: 0.8, stages: 4, center: 900 (Hz), mix: 0.5` |
| `delay` | `time: 0.3, feedback: 0.35, mix: 0.3, damp: 5000 (Hz, each echo darker), pingpong: false` |
| `reverb` | `mix: 0.3, decay: 1.5` (its own space, on top of the project room) |
| `drive` | `amount: 0.5, tone: 8000 (Hz), mix: 1` (saturation, oversampled) |
| `crush` | `bits: 8, rate: 0 (Hz)` |
| `comb` | `ratio: 1 (x the note), feedback: 0.7, mix: 0.4` (metallic resonance) |
| `ring` | `ratio: 2 (x the note) or freq: Hz, mix: 0.5` |
| `tremolo` | `rate: 5, depth: 0.5, shape: sine\|square` |
| `autopan` | `rate: 0.5, depth: 0.7` |
| `filter` | `type, cutoff: 1200, resonance: 0.3, bandwidth: octaves (bp/notch; overrides resonance), lfo: [rate, octaves]` (auto-wah, tempo-synced sweeps) |

Echoes and reverb lengthen a song's loop file like a long release does (W019 if it runs more than 2 bars past the song).

## Listening

You can't hear: the listen sheet and the numbers, in full.

### You can't hear. Read this first.

You will never hear what you make. SEGAN gives you two substitutes, and you must use both every time:

1. **The listen sheet** (`previews/<asset>/<output>.listen.png`, open it with the Read tool). Top to bottom,
   on one time axis:
   - header: length, peak, true peak, **LUFS vs. target**, limiter reduction, lead-in (SFX), **seam click** (loops);
   - sections/patterns strip and a **piano roll per track drawn from your source** (songs): what you wrote;
   - waveform (red = clipped): attack shape, decay, gaps, how dense it is;
   - log-frequency **spectrogram** with octave lines (C1...C9): bright horizontal lines = pitched tones, their
     overtones stacked above; vertical smears = noise/percussion; **white lines = the pitch you asked for,
     cyan dots = the pitch SEGAN detected** (SFX). Lines that run the wrong way (falling when your sweep rises)
     or faint mirrored lines high up are aliasing (lint W010);
   - LUFS curve (songs): loudness over time; the green line is the target.
2. **The numbers** (`segan preview --json`): `lufs` vs. `target_lufs`, `true_peak_dbtp`, `leading_silence_ms`,
   `seam_click`, `onsets_s` (when each hit starts), `pitch_hz` (SFX start/end/min/max), `pitch_check` (songs:
   every note's detected pitch vs. the written one, in cents; only tracks that play one note at a time; low notes
   are also read as their 3rd/5th harmonic; `detune_cents` = an instrument whose notes all share one offset, e.g. a sample
   recorded slightly sharp: its notes count as off only relative to that; `notes_skipped` and `skipped_because` say
   which notes couldn't be measured and why: very short notes, arpeggios, one-shots, chords),
   `notes_per_pattern` (songs: compare with what you meant to write; a dropped note shows here first),
   `centroid_hz` (brightness), `clipped_samples`, `normalisation_gain_db` (how much the build had to raise or
   lower it: large values are fine, the level is set by the target either way).

What the sheet and numbers **can** show: timing, rhythm, pitch and pitch movement, envelope shape, noise vs.
tone, loudness, clicks, aliasing, silence, a wrong row. What they **cannot** show: whether a melody is good,
whether a sound is pleasant or fits the game, whether the mix balance feels right. So:

- Never call a sound or a song "good" or "approved". Say what you checked ("pitch rises B5 -> E6 as asked,
  -14.0 LUFS on target, no lead-in, no clicks").
- Every asset stays `status: draft` until a **human** listens: give them the WAV path. Only they run
  `segan mark <asset> --status approved` (or tell you to).
- Keep a list of what awaits a listen in BRIEF.md ("Awaiting a listen").

## Config

segan.toml settings and fields common to songs and SFX.

### Common fields (songs and SFX)

`description` (always), `tags: [...]`, `status: draft|approved` (approved only after a human listened),
`style_version` (set by `segan mark --current`), `template: true` (never built; for `extends`),
`lint: { disable: [W009] }` (warnings that are wrong by design for this asset).


### `segan.toml`

```toml
mode = "strict"               # strict: kits only; open: inline instruments allowed
default_kit = "nes"
output_dir = "build/audio"    # e.g. ../game/assets/generated/audio (apart from PAGAN's output: both write manifest.json)
preview_dir = "previews"
export = ["wav"]              # + "godot" (.import loops/compression, randomizer/synchronized .tres), "stems",
                              #   "ogg" (music as Ogg Vorbis, ~10x smaller; SFX stay WAV; pip install "segan-gen[ogg]"),
                              #   "web" (segan_audio.js, a Web Audio player; not with "godot")
style_version = 1
seed = 4417312093             # the project seed (`segan init` picks one): suggestions and rolled kits branch from it; renders don't use it

[mix]                         # shared by every asset; any change re-renders everything
sample_rate = 44100           # 22050 | 32000 | 44100 | 48000
oversample = 2                # 1 | 2 | 4 | 8: synthesis rate multiplier (anti-aliasing; 4 for very high leads)
music_channels = "stereo"
sfx_channels = "mono"
tuning = 440.0
room = 0.15                   # shared reverb amount
room_decay = 0.6              # seconds to fall 60 dB
crush_bits = 0                # 0 off; e.g. 8
crush_rate = 0                # Hz, 0 off
declick = true                # micro-fades at note edges
limiter = -1.0                # true-peak ceiling, dBFS
brightness = 0.0              # dB tilt
warmth = 0.0                  # dB low-mid
tail_trim_db = -70.0          # room tail cut this far below the peak (-40 = shorter files)

[room]                        # room send per category, 0-1 x mix.room (unlisted: 1); e.g. ui = 0 (dry, no tail)

[bus.pickup]                  # mix bus per category (optional; unlisted categories play on Master)
bus = "SFX"                   #   engine bus name: a letter, then letters, digits or '_'
volume_db = -3                #   the category's default playback volume, -60..12 dB (the bus stays at 0 dB)
                              # same TOML: [bus] pickup = { bus = "SFX", volume_db = -3 }; `segan config set bus.pickup.volume_db -3`

[loudness]                    # LUFS per category, -60..-5 (songs: integrated; SFX: loudest 400 ms; unlisted categories, songs too, use sfx)
music = -16.0
sfx = -14.0
ui = -20.0
foley = -22.0                 # add any category: boss = -12
# short_sfx = "duration"      # opt-in: one-shots shorter than 400 ms are measured over their own length, not 400 ms
                              # zero-padded (default "window": a 60 ms click comes out about 8 dB hotter than it sounds)

[godot]
compress = "qoa"              # qoa | ima | none

[sfx]
source = "auto"               # auto: synthesise stylised sounds, record real-world ones (the skill's rule);
                              # synth: no recordings (W020); recorded: prefer recordings
                              # `init --style chiptune|synth` (and plain `init`) write "synth"

[ogg]
quality = 0.4                 # Vorbis quality 0-1 (0.4 is about 128 kbit/s stereo)

[lint]
disable = []
max_seam_click = 0.02         # W007
max_leading_silence_ms = 5    # W005
max_instruments = 8           # W003
max_aliasing_db = -50.0       # W010
max_limiting_db = 3.0         # W001: the most the limiter may take off before the target counts as out of reach
max_dc_offset = 0.01          # W008
loudness_tolerance = 1.0      # W001/W013, LU
max_similarity = 0.85         # W024-W026: how alike (0-1) two songs' first 8 bars may be

[similarity]
local_store = false           # true: keep song fingerprints in ~/.cache/segan/fingerprints (on build and `segan similarity`)
                              #   and compare with your other projects on this machine (W026)
shipped = true                # compare with SEGAN's own examples (W025)
```

## Commands

Every command and its flags.

### Commands (all accept `--json`; non-zero exit on errors)

Songs and SFX render in several processes (`-j N` on lint/build, or `SEGAN_JOBS=N`; default: the CPU count up to 8;
`1` = one process); the output is identical. Renders are cached per asset and keyed on the kit instruments the
asset actually plays, so editing one instrument re-renders only what uses it.

| Command | Purpose |
|---|---|
| `segan init [dir] [--open] [--style chiptune\|synth\|orchestral\|"<words>"] [--godot DIR]` | create a project with a random project `seed` and a starter kit (words, e.g. `--style "cold ship, warm crew"`: a kit `core` rolled from the seed, with an `identity` group); `--godot` builds into `DIR/assets/generated/audio`, or `DIR/assets/audio` when a PAGAN project there already builds into `assets/generated`; warns when the two output folders are the same or nested |
| `segan new kit <name>` / `new song <name> [--kit K] [--key "A minor"] [--tempo 120] [--meter 3/4] [--bars 2]` / `new sfx <name> [--preset P] [--kit K]` | starter files (always pass `--description`); a song without `--key`/`--tempo` gets the seeded suggestion (below), away from the project's songs |
| `segan suggest song <name> [--mood "words"] [--take N]` | a plan for a new song away from the project's songs: key and mode, tempo, meter, opening texture, opening voicing (inversion, spread, register), progression, instruments (the kit's identity + extras, maybe a new one), a `seed`, and the `segan new song` command; seeded by the project seed (`--take` = another plan) |
| `segan kit roll <name> --style "words" [--around KIT] [--samples\|--no-samples] [--take N] [--dry-run] [--force]` | a kit from style words and the project seed: `identity` group (2-3 signature instruments), bass, harmony, colour, 3-5 drums, from the models, effects and drums above (samples when the words ask for acoustic/orchestral, or `--samples`); `--around` keeps another kit's identity instruments |
| `segan samples list [library\|file.sf2]` / `segan samples fetch <library> <instrument...> [--all]` | sample libraries: instruments, key ranges and what's downloaded / download instruments |
| `segan sounds search "<query>" [--max-seconds N] [--licence cc0\|cc-by] [--limit 15] [--sort score\|rating_desc\|...]` | Freesound search (needs `FREESOUND_API_KEY`): ref, name, author, licence, duration, rating, tags; only CC0 / CC BY |
| `segan sounds add freesound:<id>` (or the sound's page URL; without `FREESOUND_API_KEY` the public page is read) / `add <file> --licence L --source URL [--author A]` | check the licence, fetch the HQ preview into the user cache, record it in `sounds.lock` (a local file: its licence, source, author) |
| `segan sounds inspect <ref...>` | length, peak, loudness, brightness (centroid), pitch, onsets of recordings (a Freesound ref is fetched into the cache, not recorded) |
| `segan sounds credits [--out FILE]` | `SOUND_CREDITS.md`: attribution for every recorded sound (required for CC BY) |
| `segan sounds remove <ref...> [--force]` / `segan sounds prune [--dry-run]` | drop sounds from `sounds.lock` (remove refuses while an SFX plays them; prune drops every entry no SFX plays: lint W028) |
| `segan sounds vendor [--all]` | copy the Freesound sounds in use into `<project>/sounds/` (offline builds; off by default) |
| `segan kit show [kits]` | every instrument playing a test phrase: `previews/kits/<kit>.listen.png` + WAVs; `--json` gives each instrument's `range` |
| `segan lint [paths] [--warnings-as-errors] [--no-render] [-j N]` | errors + warnings (audio warnings render the asset; cached); exits 1 on errors, 0 when there are only warnings, 1 on warnings too with `--warnings-as-errors` (CI) |
| `segan preview <asset...> [--output main\|variant:X\|variation:N\|take:K\|take:K:variation:N\|phase:X\|stem:T\|mix:M\|flow:CLIP\|walk[:SEED] ...] [--from 5 --to 8] [--summary]` | WAV + listen sheet (+ seam view for loops) per output in `previews/<asset>/`; `--summary` prints one flat row per output (asset, output, seconds, dry, LUFS, target, peak, true peak; `--json`: a `summary` list); analysis in `--json` (SFX: `layers` = each layer dry on its own, `peak_db`/`lufs`/`crest_db`, recorded layers' `ends_s` (where they end
uncut, after trim/stretch/varispeed), plus the dry mix); flow songs also get a walk; `--output reel` (an SFX): the main sound, every variation and every take back to back, 0.4 s apart, to judge the variety; `--format ogg\|mp3` also writes each preview compressed, to share (needs `segan-gen[ogg]`) |
| `segan render <asset...> [--output main\|stem:T\|mix:M\|variant:X ...]` | WAVs only, from the render cache (no analysis or sheets: fast for long stemmed songs); `--json` lists each output's WAV, length and loop |
| `segan gallery` | every asset's waveform + spectrum and a loudness chart by category |
| `segan bake sfx <name> [--in-place]` | expand a preset/template into every field |
| `segan import midi <file.mid> [--kit K] [--key K] [--quantize 16] [--bars-per-pattern 2]` | MIDI -> song + change report |
| `segan similarity [songs] [--shipped] [--machine] [--top 15]` | how alike songs are: pairs by `overall` with `harmony` (chroma per bar), `rhythm` (onsets), `timbre` (instruments), `register`, `tempo` (0-1 each), `same_opening`, `same_pitch_set`, `opening_score` (what W024 compares); `closest` per song. `--shipped` adds SEGAN's examples, `--machine` other projects (local_store) |
| `segan build [--verify-godot] [-j N]` | final WAVs + manifest (+ Godot files); `--verify-godot` loads and plays everything headless |
| `segan status [--fast]` | catalogue + what needs attention |
| `segan mark <asset...> [--status approved\|draft] [--current] [--outdated]` | record reviews |
| `segan style bump "note"` | new style version; flags older assets (W006) |
| `segan config show` / `get <key>` / `set <key> <value>` / `unset <key>` | every setting with its default and meaning |
| `segan mix adjust [--brightness dB] [--warmth dB] [--room d] [--crush bits] [--loudness LU] [--dry-run]` | change the whole project's sound |
| `segan docs [topic...] [--search words]` | these docs: list the topics, print one, or find the paragraphs you need |
| `segan skill install [dir]` | install this skill into a repo's `.claude/skills/segan/` |
| `segan mcp [--project DIR] [--allow-godot]` | MCP server over stdio (`uvx segan-gen mcp` without an install) |

Slow steps print `segan: ...` progress lines on stderr (`--quiet` or `SEGAN_QUIET=1` turns them off).

**MCP tools** (same JSON as the commands): `status`, `docs` (these topics), `read_docs`, `write_doc`, `log_feedback`, `config_show`/
`config_set`/`config_unset`, `kit_list`, `kit_show` (image), `kit_write`, `mix_adjust` (dry run by default),
`scaffold`, `read_asset`, `write_asset` (writes + lints + listen sheet image), `lint`, `preview` (image: sheet or
seam; `audio: true` adds the WAV), `gallery` (image), `mark`, `style_bump`, `import_midi` (path or base64),
`sounds_search`, `sounds_add`, `sounds_inspect`, `sounds_credits` (recorded sounds; search needs `FREESOUND_API_KEY`),
`build` (`verify_godot` needs `--allow-godot`), `manifest`. Resources: `segan://workflow`, `segan://docs/{topic}`,
`segan://brief`, `segan://sound`, `segan://manifest`, `segan://kit/{name}`, `segan://asset/{name}`,
`segan://audio/{name}`. Prompts: `setup_new_game`, `make_sound`, `change_the_sound`, `review_asset`.

## Lint

Lint rules E001-E0xx and W0xx: what each means and how to fix it.

### Lint rules

Errors (the build stops): E000 command/usage, E001 YAML/field problem, E002 unknown character in a lane,
E003 row width or row count wrong, E004 missing pattern/section/marker target, E005 kit problem, E006 variant
problem (unknown key/group, group sizes differ, a key with no instrument), E007 note outside an instrument's
range (also in variants), E008 bad loop/phase/crossfade, E009 inline instruments in strict mode, E010 derived
pattern problem, E011 row label doesn't match its row, E012 duplicate asset name, E013 SFX problem, E014 more
notes at once than an instrument's voices, E015 hold with nothing to hold, E016 `stems:` problem (a track in no
group or two, unknown stem in a mix), E017 `flow:` problem (unknown or unreachable section, dead end, bad weight,
a section that isn't whole bars), E018 soundtrack problem (unknown state, song, variant, stinger SFX or start
section; a bad field), E019 recorded sound can't be used (file missing or undecodable, not in sounds.lock, sha256
mismatch, fetch failed), E020 recorded sound's licence (missing, not CC0/CC BY, no source, CC BY without an author).

Warnings: W001 loudness target out of reach without more limiting than `max_limiting_db` (too short/spiky:
stagger layer starts 3-9 ms, tame the peakiest layer (`preview --json` `layers`), give it body, or a quieter category; for a percussive song: `category: music_soft` + `music_soft = -19` under
`[loudness]`), W002 unused pattern or section, W003 too many instruments in one song (with `stems.mixes`: in one mix),
W004 silent pattern or sound, W005 lead-in silence in an SFX, W006 made under an older style version, W007
click at a loop point, W008 DC offset, W009 tracks clash (minor 2nd/tritone) on a beat (the felt beat: every 3 units in 6/8, 9/8, 12/8; a held note counts while above -30 dB), W010 aliasing (raise
`[mix] oversample` or play lower), W011 SFX still sounding at `duration`, W012 note cut at the end of its
pattern, W013 loudness off target with `normalize: false`, W014 a note held longer than its sample (no loop):
it goes silent before it ends, W015 a flow section shorter than the ring-out of a section before it, W016 a
soundtrack cross-fade between songs in clashing keys, W017 a stem mix that can't reach its target even with its
trim, W018 an SFX noise layer whose filter removes more than 12 dB of its level and that ends up more than 12 dB under the
loudest layer (a narrow band-pass, a low cutoff; a filtered bed on its own never warns): raise its gain,
W019 a looping song's file runs more than 2 bars past the song because its last notes ring that long: give those
instruments `max_ring`, W020 a recorded layer in a project with `[sfx] source = "synth"`, W028 a `sounds.lock` entry no SFX plays (`segan sounds prune`), W027 a transient inside a
looping SFX's (or phase's) first `crossfade` seconds: the seam blend fades it (start it later or shorten the crossfade).
Sameness (songs are compared with every other song of the project; `segan similarity` shows the numbers): W021 two
songs open on the same notes (step 1, two or more notes), W022 more than half of the songs share one pitch set (D minor
= F major) or sit within 10 bpm, W023 every song plays one kit with nearly the same instruments, W024 two songs' first 8
bars score over `lint.max_similarity` (harmony, rhythm, instruments), W025 a song close to SEGAN's own examples (the
demo, the generator example in `segan docs api`), W026 a song close to one from another project on this machine (`[similarity]
local_store`). W022/W023 are reported on segan.toml.
Turn warnings off for one asset with `lint: { disable: [...] }`, for every asset of a category with
`[lint.<category>] disable = ["W017"]` (e.g. `[lint.battle_music]`), project-wide with `[lint] disable`.

## Build

After approval: build, manifest.json and what to report.

### After approval: build and report

`segan build` (add `--verify-godot` when a Godot binary is available) writes WAVs, `manifest.json` and Godot
resources into `output_dir`. Report what the game needs, from `manifest.json`:
- the file (`res://...` in Godot), length, `loop` `{start, end}` in samples (end exclusive);
- songs: `bpm`, `sections` and `markers` in samples, seconds and bars (for syncing game events), `variants`,
  `stems` (+ `godot_stems`, an AudioStreamSynchronized: set each stream's volume to bring layers in and out);
- SFX: `variations`, `takes` (+ `godot_randomizer`: play that one stream, it picks a variation or take each time), `phases`,
  `playback` hints; with `[bus]` in segan.toml, each asset's `bus` and the top-level `buses` (category volumes).
Frequent sounds (gunfire, footsteps, bursts of pickups) get `playback: { max_instances, min_gap_s,
repeat_attenuation_db }` and quiet categories a `[bus.<category>] volume_db`, so the game doesn't invent its own
dB table; `segan_sfx.gd` (autoload `SeganSfx`, `SeganSfx.play("coin")`) applies both (`segan docs godot`).
In Godot, loops already loop (SEGAN writes the loop points into each WAV's `.import`); play SFX with an
AudioStreamPlayer/2D/3D on an "SFX" bus and music on a "Music" bus. Flow songs and soundtracks are played by
the director `segan_music.gd` (written next to the manifest): autoload it as `SeganMusic`, then
`SeganMusic.play_soundtrack("main")` / `set_state("combat")` / `play_song(...)` / `stop(...)` (`segan docs godot`).


### Build output (any engine)

`manifest.json` in `output_dir` is the contract with the game. Per asset: `kind`, `category`, `description`,
`tags`, `status`, `style_version`, `sample_rate`, and
- every audio file as `{ file, seconds, samples, channels, loop }` (`loop` = `{start, end}` in samples, end
  exclusive, or null), `lufs`, `target_lufs`, `limiting_db`;
- with `[bus]`: `bus` on every asset whose category is listed;
- SFX: `playback` (the SFX's hints, when it has them); `lufs`/`target_lufs`/`limiting_db` on the main sound and on each variation; `dry_seconds` on every one-shot file entry (the sound without its room tail: how long a voice pool should
  count it busy; `seconds` includes the tail), `variations` (list, + `pitch_offset_semitones`), `godot_randomizer`, `phases` (name -> file entry);
  with `takes:`, the entry itself is take 1 and `takes` lists the others: `{ take: k, file..., lufs..., variations: [...] }`
  (no `file` when that take's `include_main` is false);
- songs: `bpm`, `meter`, `steps_per_beat`, `key`, `beat_seconds`, `beat_count`, `bars`, `sections` (name ->
  start/end in samples, seconds and bars, first occurrence), `arrangement` (every section in order), `markers`
  (name -> sample, seconds, bar), `loop` (`start`/`end` in the file + `offset`: the loop points sit that many
  samples (whole bars, usually one) after the loop section's start and the song's end, because the file carries
  that much of the loop's start again with the end's tail ringing into it; `section`), `variants` (name -> file entry + timing),
  `stems` (stem -> file entry + `tracks`), `stem_mixes` (mix -> `stems`, `lufs`, `trim_db`), `stems_normalised_over` and
  `godot_stems`. With `main_mix: false` / `include_main: false` the entry has no `file` (timing and loop stay).
- flow songs: `flow` = `start`, `next` (section -> {successor: weight}), `end`, `no_repeat`, `head_bars`, `sections`
  (name -> `samples` (its length: play the next section exactly this many samples after it starts), `seconds`,
  `bars`, `head_samples`, `head`/`rest`/`tail` files and `from` (previous section -> head file; when the previous
  section isn't listed, the cold `head`)), `variants` (variant -> the same clips). A walk plays, per section, the
  head (`from[prev]` or `head`) for `head_samples` samples, then `rest` for `samples - head_samples`; after the
  last section, its `tail`. Clip files carry 32 extra samples (Godot stops a WAV a few samples before its end):
  play each for its stated length, not to its end.
Top level: `buses` (with `[bus]` only: category -> `bus`, `volume_db`), `godot_bus_layout` (with `[bus]` and
export "godot": `segan_buses.tres`), `soundtracks` (name -> `start`, `states` (state -> `songs` [{song, variant, weight, family}], `play`,
`gap`, `fade_out`, `crossfade`), `families`, `transitions` ("from>to" -> `at`, `fade`, `fade_in`, `stinger`,
`start`), `default_transition`).
Files: `music/<song>.wav`, `music/<song>.<variant>.wav`, `stems/<song>/<track>.wav`, `flow/<song>[.<variant>]/<clip>.wav`,
`sfx/<name>.wav`, `sfx/<name>.<n>.wav`, `sfx/<name>.t<k>.wav`, `sfx/<name>.t<k>.<n>.wav`, `sfx/<name>.<phase>.wav`. WAVs are 16-bit PCM with a `smpl` loop chunk and `cue` markers.
With `"ogg"` in `export`, every music file (songs, variants, stems, flow clips) is `.ogg` instead (same samples
count; a looping file ends exactly at its loop end, the loop restarts at `loop.start`); SFX stay `.wav`.
The build only rewrites files that changed and deletes outputs (and their `.import`) it no longer produces.

## Godot

Godot: imports, randomizers, stems, the music director and SFX player.

### Godot

With `export = ["wav", "godot"]` and `output_dir` inside a Godot 4 project, SEGAN writes each WAV's loop points
and compression into its `.import` (Godot keeps the rest; an `.ogg` gets `loop` and `loop_offset`), `sfx/<name>.tres` (AudioStreamRandomizer over the
variations, and with `takes:` over every take's variations, or the take itself when it has none: play it and Godot
picks one, never the same twice in a row) and `stems/<song>.tres`
(AudioStreamSynchronized: all stems in sync; change `stream_N/volume` to layer them).
A new file gets a minimal `.import` (importer, type, SEGAN's params); Godot adds `uid`, `path` and `dest_files` the
first time it imports it, so the first commit after a build is followed by one more `.import` diff once the editor
(or `segan build --verify-godot`) has run. Commit that too; it doesn't recur, and SEGAN keeps Godot's additions.

```gdscript
$Music.stream = load("res://assets/generated/audio/music/overworld.wav")   # loops by itself
$Music.play()
$Coin.stream = load("res://assets/generated/audio/sfx/coin.tres")          # a random variation each play
$Coin.play()
```

**Music director** (`segan_music.gd`, written next to `manifest.json` when the project has a flow song or a
soundtrack). Add it as an autoload named `SeganMusic` (Project Settings > Globals > Autoload), then:

```gdscript
SeganMusic.play_soundtrack("main")             # the soundtrack's start state
SeganMusic.set_state("combat")                 # its transitions decide when and how (beat/bar/section, fades, stinger)
SeganMusic.play_song("overworld", "danger")    # one song directly; a flow song walks its sections until stopped
SeganMusic.queue_section("bridge")             # a flow song's next section, instead of a random pick
SeganMusic.stop(2.0)                           # fade out over 2 s (stop(0.0, "section") lets a flow song ring out)
SeganMusic.section_started.connect(func(song, section): print(song, " ", section))
```

Signals: `song_started(song, variant)`, `section_started(song, section)`, `song_finished(song)`,
`state_changed(state)`. Properties: `bus` (default `Master`), `buffer_seconds` (0.3: audio queued ahead; changes
land after it), `random_seed` (0 = a different walk every run). It chains sections sample-exactly (an
AudioStreamGenerator fed from the clips); a new song starts on the old one's grid within one audio mix chunk.
Native `AudioStreamInteractive`/`AudioStreamPlaylist` aren't generated: in Godot 4.7 the first switches a mix
chunk early and cuts tails, the second clicks at every seam.

**SFX player** (`segan_sfx.gd`, written next to `manifest.json` when the project has a `[bus]` table or any SFX
has `playback` hints). Add it as an autoload named `SeganSfx`, then:

```gdscript
SeganSfx.play("coin")                        # its randomizer (or file), on its category's bus at its volume_db
SeganSfx.play_2d("hit", global_position)     # / play_3d(name, Vector3): positional players
var hum = SeganSfx.play("engine", -6.0)      # extra dB on top; returns the player (null: dropped by min_gap_s)
SeganSfx.stop("engine")
```

It applies `playback` hints (min gap, instance cap stealing the oldest, repeat attenuation) and adds any bus the
manifest names that the game's layout lacks (`add_missing_buses`, default on). `segan_buses.tres` is an
AudioBusLayout with those buses (0 dB, sending to Master); SEGAN never writes `default_bus_layout.tres`. To use
it: `AudioServer.set_bus_layout(load("res://.../segan_buses.tres"))`, or copy its buses into your own layout.
`bus_for(name)`, `volume_db_for(name)` and `stream_for(name)` serve a game that plays through its own players.

## Engines

Other engines (Unity, Unreal, web, ...).

### Other engines

The audio files are plain 16-bit PCM WAV (and Ogg Vorbis for music with export "ogg"): every engine imports them.
What differs per engine is the import settings (loop points, compression, streaming), how variations, buses and
playback hints are expressed, and the runtime helper. `manifest.json` carries all of it engine-neutrally; for an
engine other than Godot, build with `output_dir` outside any Godot project (manifest paths are then relative to
`output_dir`) and read the manifest in the game. Two rules hold everywhere:

- **Loop points come from the manifest**, not the WAV: only Godot gets them written into its import settings. A
  song's loop starts after its intro (`loop.start` > 0), so an engine that loops a whole clip (below) needs the
  song played as intro, then the loop region, sample-exactly; one-shot SFX don't loop, and looping SFX loop from
  frame 1 to the end (frame 0 is a lead-in copy of the last frame: start playback at frame 1 or ignore it).
- **One SFX = a pool of files**: `variations` (and `takes`); play a random one, not the same twice in a row. The
  main `file` is in the pool only when there are no variations (`sfx/<name>.tres` in Godot does the same).

| | import | loops | variations | buses / volume | playback hints |
|---|---|---|---|---|---|
| Web | `fetch` + `decodeAudioData` (`segan_audio.js`) | `loopStart`/`loopEnd` from the manifest (handled) | handled | a GainNode per bus | handled |
| Unity | AudioClip; Load Type: Decompress On Load (SFX), Streaming (music); Force To Mono off (SEGAN sets channels) | `AudioSource.loop` loops the whole clip: schedule intro + loop (`PlayScheduled`, `timeSamples`) | a script, or an Audio Random Container (Unity 6) | AudioMixer groups by `bus`; `volume_db` on the source | a script (max instances, min gap, repeat attenuation) |
| Unreal | SoundWave (import WAV) | the SoundWave's Looping flag loops the whole wave: intro + loop needs a MetaSound or two waves | Sound Cue Random node or a MetaSound | Sound Class / Submix by `bus` | a Sound Concurrency (max count, stop oldest, volume scale) |
| Defold | sound component (`.sound`: `sound`, `looping`, `group`, `gain`); WAV or Ogg | `looping` repeats the whole file: no loop points | pick a component per variation in a script | `group` = `bus`, `sound.set_group_gain` | a script |

Only Godot and the web have a SEGAN helper; for the others, what verifying them needs is tracked in https://github.com/lukasgolino/segan/issues/34.

**Web** (`export = ["wav", "web"]`): `segan build` writes `segan_audio.js` (an ES module, no dependencies) next to
`manifest.json`. It plays SFX by name (random variation, never twice in a row; category bus and `volume_db`;
`playback` hints) and songs looping at their manifest loop points, with the Web Audio API:

```js
import { SeganAudio } from "./audio/segan_audio.js";
const audio = await SeganAudio.open("./audio/manifest.json");   // create it after a user gesture
await audio.load();                    // decode every SFX
audio.play("coin");                    // returns { source, gain } or null (dropped by min_gap_s)
await audio.playSong("overworld");     // or playSong("overworld", { variant: "danger" })
audio.stop("overworld");
audio.bus("SFX").gain.value = 0.5;
```

Flow songs, soundtracks and stems aren't played by it (the manifest has their timing). Browsers differ in which
compressed formats they decode: WAV works everywhere; check Ogg Vorbis on the browsers you target. "web" can't be
combined with "godot" (Godot writes `res://` paths into the manifest).

## Evolve

Changing the sound over time: mix adjust, config, style bump.

### Changing the sound over time

Global changes go through the shared mix, so **every asset changes at once** and the set stays consistent:

| Owner says | Do |
|---|---|
| "too dry" / "too much echo" | `segan mix adjust --room 0.1` / `--room -0.1` |
| "brighter" / "darker", "muddy" | `segan mix adjust --brightness 2` / `-2` |
| "warmer" / "thinner" | `segan mix adjust --warmth 2` / `-2` |
| "more retro / lo-fi" | `segan mix adjust --crush 8` (`0` = off) |
| "everything too loud" | `segan mix adjust --loudness -2` (all targets) or `segan config set loudness.sfx -16` |
| "UI too loud" | `segan config set loudness.ui -23` |
| "short clicks/lasers too hot" (peak as high as an explosion) | `segan config set loudness.short_sfx duration` (one-shots under 400 ms measured over their own length); `segan gallery` shows peaks and that level in brackets |
| "high notes sound harsh/buzzy" | `segan config set mix.oversample 4` (less aliasing) |
| "the lead should be softer" | edit the kit instrument (every song using it changes); `segan kit show` |
| "make the music more tense" | variants (`tempo`, `key`, `instrument_swap`) or new sections |

Always `--dry-run` first, then `segan gallery` (every asset side by side + a loudness chart by category) and
log the change in BRIEF.md. When existing sources must be rewritten (a new kit, new drum style):
`segan style bump "what changed"`, update SOUND.md, go through the assets `segan status` flags (W006), and
`segan mark <name> --current` each one after a human listened.

## Api

Generator scripts: the segan.api Python API with a worked example.

### Generator scripts: `segan.api`

For many similar sounds or procedural music, write a Python script with `segan.api` (stable, `API_VERSION`):
`note("A4")`, `scale(key, low, high)`, `chord(degree, key, octave, size=3)`, `progression("i VI III VII", key)`,
`euclid(hits, steps, rotate)`, `arpeggiate(notes, steps, rate, order)`, `humanize(row, seed, amount)`,
`invert(notes, inversion)`, `voicing(notes, inversion, spread="close"|"open"|"wide", octave, bass)`, `Rng(seed, ...)`
(seeded `random()`, `choice()`, `range()`, `weighted()`: the same on every machine),
`Track.roll(name, key, low, high)`, `Track.drums(name, keys)`, `Pattern(length).note(track, step, pitch, length,
key, velocity=None)` (written as a `velocity:` row) / `.hit(track, step, drum, mark)` / `.row(track, drum, "x...x...")` / `.lane(track)`,
`song_yaml(name, tracks=..., patterns=..., sections=..., arrangement=..., key=..., tempo=..., loop=...)` (any other
song field as a keyword with its YAML value: `meter=[3, 4]`, `category=`, `status=`, `stems={...}`, `lint={"disable":
[...]}`, `variants={...}`, `flow={...}`, `humanize={...}`, `seed=`),
`sfx_yaml(name, layers=[...], ...)` (both take `comments={"patterns.chorus": "text", ...}`: `#` lines above
those keys). `dedupe(patterns, sections)` merges identical patterns (sections follow); `derive("a", a, b, tracks)`
writes `b` as `{from: a, transpose, mute, shift}` when it is one (else None). Write the result to a file, then lint and preview it like any other.

```python
from pathlib import Path
from segan import api

key = "E dorian"
rng = api.Rng(11, "market")                 # seeded choices: the same file every run, another seed = another take
lead = api.Track.roll("lead", key, "C4", "C6")
keys = api.Track.roll("keys", key, "C3", "A5")
bass = api.Track.roll("bass", key, "C2", "C4")
perc = api.Track.drums("perc", ["k", "s", "h"])
patterns = {}
for name, numeral in zip("abcd", ["i", "IV", "VII", "IV"]):
    p = api.Pattern(12)                     # 3/4: 12 sixteenths per bar
    triad = api.progression(numeral, key, octave=3)[0]
    for m in api.voicing(triad, inversion=rng.choice([0, 1, 2])):
        p.note(keys, 0, m, 12, "e", velocity=0.8)
    for step, midi, length in api.arpeggiate([m + 12 for m in triad], 12, rate=2, order=rng.choice(["up", "down", "updown"])):
        p.note(lead, step, midi, length, "f", velocity=1.5 if step == 0 else 1.0)
    low = api.progression(numeral, key, octave=2)[0]
    p.note(bass, 0, low[0], 6, "a").note(bass, 6, low[2], 6, "a")
    p.row(perc, "k", "x.....x.....").row(perc, "h", api.humanize("..x...x...x.", name))
    patterns[name] = p
text = api.song_yaml("market", kit="fm_soft", key=key, tempo=96, meter=[3, 4], tracks=[lead, keys, bass, perc], patterns=patterns,
                     sections={"main": ["a", "b", "c", "d"]}, arrangement=["main"], loop="main",
                     humanize={"timing": 6, "velocity": 0.1}, description="busy market at dusk, 3/4")
Path("music/market.song.yaml").write_text(text)
```

## Report

Reporting what got in your way (GitHub issues).

### Help us improve SEGAN: report what got in your way

SEGAN is young, and it gets better mostly through reports from agents like you using it on real games. When
something gets in your way, please tell us in a GitHub issue at https://github.com/lukasgolino/segan/issues. It
is the most useful thing you can do for the project. Whether you do is entirely up to you and your user.

Worth reporting: a crash or traceback; a wrong or misleading message or lint rule; output that looks or behaves
wrong; a workaround you had to invent; a feature you needed and didn't have; this skill or its topics
misleading you.

1. Note it as you go; don't interrupt the task for it.
2. At a natural break (the end of the task, your report), draft the issue: a one-line title; `segan --version`;
   what you did (commands, a minimal source snippet); what you expected and what you got; the workaround, if
   any. End the body with "Reported by an agent using SEGAN." Keep it to a minimal repro: no game names, private
   asset content, paths or anything else from the user's project unless they OK it.
3. Look for an existing issue first: `gh issue list --repo lukasgolino/segan --search "<keywords>"`; if one
   fits, offer a comment on it instead.
4. Show the user the draft and ask whether to file it. Issues are public and posted under their GitHub account,
   so **never file without their OK**. If they agree:
   `gh issue create --repo lukasgolino/segan --title "..." --body-file <draft>`, or give them the link
   https://github.com/lukasgolino/segan/issues/new?template=agent-report.md to file it themselves. If they
   decline, drop it.
