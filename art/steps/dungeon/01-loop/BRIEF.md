# Sound brief

The long-term memory for this project's audio: what the game is, what it needs, and decisions made along
the way. Agents read this (with SOUND.md) before making or changing any sound, and keep it up to date.
`segan status` lists what exists; this file says what's *wanted* and why.

## The game

- **Title / working name:** untitled dungeon crawler
- **Genre and core loop:** top-down dungeon crawler; explore rooms, fight, find keys
- **Sound style:** chiptune: pulse/triangle/noise voices, mono channels, NES/Game Boy era
- **Mood / references:** tense but not scary; NES-era dungeon themes
- **Engine:** Godot 4 (`../game`, builds into `assets/generated/audio`)

## Key sounds and music

For each: what it is, when it plays, length, looping or one-shot, variations. Example:

- **Dungeon loop** (`music/dungeon.song.yaml`): D harmonic minor, 100 bpm, 8 bars, loops seamlessly; kit `crypt`.

## Wishlist

What's still needed, roughly in priority order. Move items to "Done" with the asset name when made.

- [ ] Boss music
- [ ] Room SFX (doors, keys)

## Done

- (nothing yet)

## Awaiting a listen

Assets an agent made that a human hasn't approved yet (agents can't hear: they check listen sheets and numbers).

- `dungeon`: listen sheet checked (every note within 1 cent, -16 LUFS on target, seam click 0).

## Decisions and feedback log

Dated notes on what the owner asked for and decided, so later sounds stay consistent with it. Example:

- 2026-01-01: "Everything sounds too dry" -> `segan mix adjust --room +0.1` (applies to every asset).
