# QUESTIONS.md — for the owner

Open questions and decisions made by default while building the SEGAN website unattended. Answer inline;
the recommendation is listed first. Everything below already works with the default.

## Setup (from the initial session, 2026-10-19)

1. ~~Public repo + GitHub Pages~~: decided, live at <https://segan.top/> (custom domain, owner 2026-10-19).
2. **Cross-links**: add a "sister library" link to SEGAN on pagan-website (and in PAGAN's README)? Nothing outside the
   SEGAN repos was changed. This site links to PAGAN in the nav ("PAGAN ↗"), hero, open-source section, docs and footer.
   (Recommended: yes, a one-line link both ways.)

## Needs your ears

3. **Every sound on the site is an unheard draft** (agents can't hear). The demo music (`dungeon`, `theme`) and the
   demo SFX were written by the agent that built the site, checked only by listen sheets and numbers (pitch within
   1 cent, loudness on target, no lead-in, seam click 0). Listen on the site; approve with `segan mark` in the step
   folders, or tell me what to change. The FAQ says plainly that nobody has listened. (Recommended: listen to the
   hero `theme`, `dungeon` and the platformer set first: they're the first impression.)

## Decided by default (say if you disagree)

4. **Music as Ogg Vorbis** (q 0.6 ≈ 110-150 kbps), SFX as the game's WAVs. Encoder: libsndfile 1.2.2 inside the
   pinned `soundfile==0.14.0` wheel; the random Ogg stream serial is rewritten to a constant so builds reproduce.
   Vorbis keeps the exact sample count (verified in Chromium), so loops are sample-exact.
   Risk: Safari only decodes Ogg Vorbis in recent versions; older Safari shows "couldn't play, download it".
   (Recommended: keep; alternative is AAC/MP3, whose encoder padding breaks sample-exact loops.)
5. **Payload**: public/demo is ~13 MB (audio ~7 MB, listen sheets ~5 MB as lossless WebP), above the plan's ~8 MB,
   but nothing downloads until a play button or demo turn needs it; the first page load is small. (Recommended:
   keep; to cut further, drop the 3 kit listen sheets and the showcase variants.)
6. **Listen sheets as lossless WebP** (same pixels as SEGAN's PNGs, about half the bytes). (Recommended: keep.)
7. **Logo and icon drawn with PAGAN v0.6.1** (same 5x7 pixel font as PAGAN's wordmark, violet→ice gradient; the icon
   is PAGAN's speech bubble holding a waveform). The sound logo (`art/hero/sfx/jingle`) is made with SEGAN.
   (Recommended: keep.)
8. **Palette**: violet `#8b5cf6` (buttons), wave blue `#6b9dff` (headings accents), ice `#a5d8ff` (focus/hover),
   amber `#ffb86b` where PAGAN uses teal (links, bullets, agent label). All text pairs pass WCAG AA (≥ 4.5:1).
9. **Scenarios**: platformer SFX (5 states), dungeon music (4), space shooter (4) = 13 states. The demo's
   SEGAN projects are in `art/steps/`; SEGAN's own demo project is copied unchanged (except `output_dir`) to
   `art/showcase/` for the kits, gallery, footsteps and loudness chart.
10. **No Godot screenshot** in "Engine-ready" (the plan asked for one): rendering Godot needs a GPU/display.
    The card shows the manifest and GDScript instead, like pagan-website. (Recommended: keep.)
11. **Lighthouse** not run (no Lighthouse in this environment); checked instead: no console errors, no horizontal
    scroll at 390 px, every player decodes and plays in headless Chromium.

## SEGAN issues found (no blockers)

12. Cosmetic: at tempos where a bar isn't a whole number of samples (e.g. 128 bpm), the listen sheet's loop note
    says "played from 1.00001 bar(s) later (bars 2.00001-6.00001)". Repro: `art/hero`, `segan preview theme`.
    (Recommended: round bar counts to 3 decimals in the sheet text.)
