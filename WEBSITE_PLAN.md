# WEBSITE_PLAN.md — the SEGAN website

Brief for the agent that builds the site. Build it **after** the SEGAN library is complete. Goal: an indie
developer or agent builder understands in 30 seconds what SEGAN is, believes the sound is real, and installs
it in one line.

## 0. The rule: a sister of pagan-website

The PAGAN site (`/home/lgolino/repos/pagan-website`, live at `lukasgolino.com/pagan-website/`) is the template.
Read it fully first (README, `src/`, `tools/build_site_assets.py`, `.github/workflows/`, and
`/home/lgolino/repos/PAGAN/WEBSITE_PLAN.md`, the brief it was built from). Then build SEGAN's site to match it:

- **Same architecture**: Astro (same pinned versions unless there's a reason), one long landing page + docs
  generated from SEGAN's own `reference.md` and `CHANGELOG.md`, a few topic pages, `art/` with real SEGAN
  projects, `tools/build_site_assets.py` (deterministic), committed generated assets, a CI `assets.yml` check
  that rebuilds and fails on diff, and `deploy.yml` to GitHub Pages.
- **Same look and feel**: layout, typography (Silkscreen / Inter / JetBrains Mono), spacing, component
  structure, tone of copy. Copy and adapt components rather than reinventing them.
- **Different colours**: PAGAN is red/orange (ember `#e8683a`, glow `#ffa94d`, spark `#ffe08a`, teal accent).
  **SEGAN is blue and purple.** Keep the same CSS token structure (`--ember`, `--glow`, ... renamed to fit,
  e.g. `--violet`, `--wave`, `--ice`) and swap hues. Starting point, to be tuned by eye in the rendered site:
  violet `#8b5cf6`, blue `#4f8cff`, ice `#a5d8ff`, deep indigo panels (tilt PAGAN's near-black neutrals towards
  blue), and one sparing warm complementary accent (amber `#ffb86b`) where PAGAN uses teal. Check contrast (WCAG AA).
  The logo/brand art is made with SEGAN where possible (e.g. a waveform/listen-sheet motif), or with PAGAN
  for pixel brand art, in the blue/purple palette.
- **Sister links**: link to PAGAN prominently ("sister library: pixel art"). Changing pagan-website or PAGAN to
  link back is the owner's call: add it to QUESTIONS.md, don't do it.

## 1. The pitch

**You speak English. Your agent speaks SEGAN.** SEGAN is a language for game audio: instrument kits, sound
effects, music patterns and mix rules, written as plain text. The agent writes SEGAN, SEGAN checks it, renders
it, shows the agent a picture of it (it can't hear, so it reads listen sheets and numbers), and your game gets
engine-ready WAVs, loop points and a manifest. Free, MIT, local, offline, deterministic.

The translation diagram, as on PAGAN's site:
```
 You (English)          Agent (Claude + SEGAN skill/MCP)        SEGAN                Your game
 "a coin pickup,   ->   writes coin.sfx.yaml, lints,       ->   renders 4      ->   coin.1-4.wav
  bright and short"     looks at the listen sheet, fixes         variations         coin.tres (randomizer)
                                                                                    manifest.json
```

## 2. What's unique (research the landscape and date it, factual, no sneering)

Compare against AI audio generators (ElevenLabs SFX, Stable Audio, Suno/Udio-style music), procedural SFX
tools (sfxr/jsfxr/bfxr/ChipTone/ZzFX), trackers (FamiTracker, Furnace) and any audio MCP servers you find.
SEGAN's differentiators, ranked: sound as source code (diffable text in git); one consistent mix for the whole
game (shared kits, room, loudness targets; "make everything warmer" is one command); it checks its own work
(lint: leading silence = input latency, loop clicks, clipping, off-target loudness); engine-ready (sample-exact
loops, randomizers, stems, manifest for any engine, Godot resources); free/open/local; built for agents
(skill + MCP + orchestrator contract). Be honest in the FAQ: it isn't a recording studio or a composer, and
for realistic or orchestral audio a sample library or generator is better.

## 3. Site structure (mirror PAGAN's page)

Hero (tagline, a short YAML source next to a playable sound and its listen sheet) → translation layer →
**scripted interactive demo** (the centrepiece) → orchestrator section → features → comparison → install
(skill / MCP / pip tabs) → open source → gallery → footer/docs.

Feature widgets (each a real SEGAN artefact):
- **Kits**: click an instrument key to audition it (like PAGAN's palette swatches).
- **Variations**: a "play again" button cycling the randomizer variations of one SFX.
- **Loops**: a song that loops seamlessly, with the loop point marked on its listen sheet; a seam-view image.
- **One mix for everything**: A/B toggle before/after `segan mix adjust` (e.g. warmer, more room) across a set of SFX.
- **Loudness consistency**: the gallery's LUFS-by-category chart.
- **Lint**: a real finding (`W005 leading silence 38 ms`) next to the fixed sound.
- **Variants**: song `danger`/`night` variants switchable live, playing in sync where possible.
- **Engine output**: manifest snippet + Godot screenshot.

## 4. The scripted demo

As on PAGAN's site: a scripted chat ("You" / "Agent"), the visitor picks 2-3 suggested replies per step,
**every sound and image real SEGAN output** built from `art/steps/<scenario>/<step>/` (each step a real diff of
the previous). Label it plainly as scripted. Each agent turn shows: the reply, an audio player + listen sheet,
collapsible "what the agent wrote" (source diff + lint line) and "what your game gets" (manifest entry/files).
Scenarios (≤ ~25 states total; branches converge), e.g.: platformer SFX set (jump/coin/hurt → "punchier" →
4 variations); dungeon music loop (→ "add a danger variant" → "night version"); space shooter (laser,
explosion, engine loop with phases); cosy farm UI sounds + shop loop. Pick what showcases SEGAN best; read the
SEGAN library's report/README for its strongest demo assets.

## 5. Audio on the web

- Players: one small shared player component (play/stop, loop toggle, playhead over the listen sheet). No
  autoplay; respect reduced motion; keyboard operable; alt text/captions from each asset's `description`.
- Payload: WAV is large. Keep SFX as WAV (tiny) and convert music to a compressed web format in the asset
  build only if needed to stay under ~8 MB total (pinned encoder, deterministic output, logged in CLAUDE.md;
  otherwise keep loops short). Lazy-load all audio.
- Use the Web Audio API for sample-exact looping (the manifest's loop points), not `<audio loop>`.

## 6. Milestones (commit + push each; keep CI green)

1. Read pagan-website + SEGAN; scaffold the Astro site from pagan-website's structure with the blue/purple brand.
2. `art/` demo projects + `tools/build_site_assets.py` + CI check.
3. Landing page sections, demo with all scenarios, feature widgets, gallery, install, docs from SEGAN's files.
4. Deploy to GitHub Pages (<https://segan.top/>), verify the live site (links, mobile width,
   audio playback, Lighthouse ≥ 90 if measurable), OG image, README with commands as on pagan-website.
5. Final pass: look at screenshots of every section (desktop + phone width) side by side with pagan-website to
   check the family resemblance; fix. Log open questions in QUESTIONS.md.
