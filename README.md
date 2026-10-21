# SEGAN website

The website for [SEGAN](https://github.com/lukasgolino/segan) (Sound Effect Grammar And Notation), the sister
library of [PAGAN](https://github.com/lukasgolino/PAGAN): one long page (hero, scripted demo, features,
comparison, install, gallery, FAQ), docs generated from SEGAN's own files, and three short topic pages.
Static Astro site, no backend, deployed to GitHub Pages at <https://segan.top/> (custom domain).
Its sister site is [pagan-website](https://github.com/lukasgolino/pagan-website): same structure, red/orange
instead of blue/violet.

**Every sound and listen sheet on the site is real SEGAN output**, built from the SEGAN projects in `art/`.
The logo and icon are PAGAN sprites.

## Layout

```
art/
  scenarios/<scenario>.yaml   the demo's conversation tree: user prompts, agent replies, commands, what each turn shows
  steps/<scenario>/<step>/    one real SEGAN project per agent turn (copied forward and edited, so each is a real diff)
  steps/features/stomp-v1/    the stomp's first, lint-failing version (W005 lead-in, shown in the demo and features)
  hero/                       the hero's theme song and the sound logo (sfx/jingle)
  showcase/                   SEGAN's own examples/demo at v0.4.1 (output_dir changed): kits, songs, SFX, gallery
  gallery.yaml                which projects' sounds the gallery lists
  brand/                      the logo and icon, PAGAN sprites (generators/logo.py)
tools/build_site_assets.py    builds every project with SEGAN -> public/demo, public/brand, public/og, src/content/docs
public/demo/                  generated: step JSON (reply, diffs, lint, manifest, files, sounds) + audio + listen sheets
src/                          the Astro site (components/, scripts/ for the Web Audio player and the demo)
```

## Commands

```sh
npm ci
npm run dev                  # http://localhost:4321
npm run build                # -> dist/

# after changing anything in art/ (needs Python 3.11+ and the pinned SEGAN and PAGAN releases)
python -m venv .venv && . .venv/bin/activate && pip install -r requirements.txt
python tools/build_site_assets.py --segan-repo ../SEGAN           # a SEGAN checkout, for CHANGELOG.md
python tools/build_site_assets.py --segan-repo ../SEGAN --check   # what CI runs (~8 min)
```

The asset build is deterministic: rerunning it changes nothing unless the art or SEGAN changed. Commit
`public/demo`, `public/brand`, `public/og` and `src/content/docs` with the art. `--check` compares audio and
images with a small tolerance (SEGAN guarantees ±1 LSB across machines, not identical bytes).

## Audio on the page

- SFX are the game's own WAVs. Music, stems and kit auditions are encoded to Ogg Vorbis (libsndfile from the
  pinned `soundfile` wheel, a fixed stream serial so output is reproducible). Vorbis keeps the exact length in
  samples, so the manifest's loop points hold.
- `src/scripts/audio.ts` plays everything with the Web Audio API and loops on the manifest's loop points
  (`AudioBufferSourceNode.loopStart/loopEnd`), never `<audio loop>`. Nothing downloads before play is pressed.
- Listen sheets are published as lossless WebP (pixel-identical to SEGAN's PNGs, about half the bytes).
  Identical outputs across demo steps are published once.

## Changing the demo

- A new turn: copy the previous step's folder, make the change the way an agent would (edit the source,
  `segan lint`, `segan preview`), add it to the scenario YAML (`next:` of the turn before), rebuild.
- `show:` in the scenario says what the turn displays: `sounds` (asset names), and `compare` (A/B against the
  previous turn), `variations` (play again), `variants` (switch at the same bar), `stems` (mute buttons),
  `phases` (hold to play), `seam` (the loop seam view), `before` (a first version from `steps/features/`).
- Upgrading SEGAN: bump the tag in `requirements.txt`, rebuild, look at the diff of `public/demo`.

## Sound review

All demo sounds are `status: draft`: no human has listened to them. Approve one with
`segan mark <asset> --status approved` in its step folder, then rebuild. The gallery says "draft" until then.

## Deploy

`.github/workflows/deploy.yml` builds and publishes to GitHub Pages on every push to `main` (Pages source:
GitHub Actions). The base path comes from the Pages settings. `.github/workflows/assets.yml` rebuilds the
sounds on every push and PR and fails if they're out of date.

## License

MIT, like SEGAN: see [LICENSE](LICENSE).
