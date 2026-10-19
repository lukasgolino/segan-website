# Sound brief

The long-term memory for this project's audio: what the game is, what it needs, and decisions made along
the way. Agents read this (with SOUND.md) before making or changing any sound, and keep it up to date.
`segan status` lists what exists; this file says what's *wanted* and why.

## The game

- **Title / working name:** untitled platformer
- **Genre and core loop:** 2D pixel platformer; run, jump, collect coins, avoid enemies
- **Sound style:** chiptune: pulse/triangle/noise voices, mono channels, NES/Game Boy era
- **Mood / references:** bright NES-era platformers
- **Engine:** Godot 4 (`../game`, builds into `assets/generated/audio`)

## Key sounds and music

For each: what it is, when it plays, length, looping or one-shot, variations. Example:

- **Jump** (`sfx/jump.sfx.yaml`): springy upward sweep, < 0.3 s, plays on every jump; 4 variations.
- **Coin** (`sfx/coin.sfx.yaml`): bright two-note chime, category `pickup`; 4 variations.
- **Hurt** (`sfx/hurt.sfx.yaml`): gritty falling square, readable over music.

## Wishlist

What's still needed, roughly in priority order. Move items to "Done" with the asset name when made.

- [ ] Music (not asked for yet)

## Done

- (nothing yet)

## Awaiting a listen

Assets an agent made that a human hasn't approved yet (agents can't hear: they check listen sheets and numbers).

- `jump`, `coin`, `hurt`: listen sheets checked (pitch, loudness on target, no lead-in, no clipping).

## Decisions and feedback log

Dated notes on what the owner asked for and decided, so later sounds stay consistent with it. Example:

- 2026-01-01: "Everything sounds too dry" -> `segan mix adjust --room +0.1` (applies to every asset).
- 2026-10-19: "Punchier and drier" -> `segan mix adjust --room -0.1 --brightness 2` (room 0.15 -> 0.05, +2 dB tilt; every asset).
- 2026-10-19: "They'll play a lot, vary them a bit" -> `variations` (4 each); Godot plays them through an AudioStreamRandomizer.
