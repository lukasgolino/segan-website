# CLAUDE.md

Website for SEGAN (Sound Effect Grammar And Notation), PAGAN's sister library. It mirrors
`/home/lgolino/repos/pagan-website` (read-only reference: structure, components, build tooling, CI, tone),
with a blue/purple brand instead of PAGAN's red/orange. Brief: [WEBSITE_PLAN.md](WEBSITE_PLAN.md).
Library: `/home/lgolino/repos/SEGAN` (read-only from here).

## Commands

See README.md: `npm ci && npm run build`; assets: `python tools/build_site_assets.py --segan-repo ../SEGAN [--check]`
in a `.venv` with `pip install -r requirements.txt` (pinned segan, pagan, numpy, scipy, pillow, soundfile).

## Conventions

- Every sound and image on the site is real SEGAN output, built from sources in `art/` by a deterministic
  script; CI fails if committed assets differ from a rebuild.
- Commits: plain `git commit` under the owner's identity, imperative subject. NEVER AI attribution (no
  Co-Authored-By trailers, no "Generated with" lines). Push to origin main is allowed (owner, 2026-10-19).
- Open questions for the owner go in QUESTIONS.md with a recommended default; never block on them.

## Decisions log

- 2026-10-19: Separate repo `lukasgolino/segan-website` (public), like pagan-website; GitHub Pages.
- 2026-10-19: Structure, components, build tooling and CI copied from pagan-website and adapted; same pinned Astro
  7.3.8 / fonts; CSS tokens renamed (ember→violet, glow→wave, spark→ice, teal→amber).
- 2026-10-19: Logo/icon are PAGAN v0.6.1 sprites (art/brand); every sound and sheet is SEGAN v0.1.0 output.
- 2026-10-19: Music, stems and kit auditions are published as Ogg Vorbis (soundfile==0.14.0 / libsndfile 1.2.2,
  compression_level 0.6, Ogg serial rewritten to a constant for reproducible bytes); SFX as the game's WAVs.
  Vorbis keeps the sample count, so manifest loop points are exact in Web Audio.
- 2026-10-19: Listen sheets published as lossless WebP (pixel-identical); identical outputs across steps are shared.
- 2026-10-19: `--check` compares with tolerance (WAV ±2 LSB, Ogg decoded RMS diff ≤ -60 dB, images ≤0.2% pixels
  off, JSON floats ±0.05) because SEGAN guarantees ±1 LSB across machines, not identical bytes.
- 2026-10-19: One shared Web Audio player (src/scripts/player.ts): playhead over the sheet's time axis
  (segan.listen LEFT/PLOT), loop toggle on the manifest's loop points, A/B, variants switching at the same bar,
  stems, hold-to-play phases. One sound plays at a time.
