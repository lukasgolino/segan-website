# Sound brief

The long-term memory for this project's audio: what the game is, what it needs, and decisions made along
the way. Agents read this (with SOUND.md) before making or changing any sound, and keep it up to date.
`segan status` lists what exists; this file says what's *wanted* and why.

## The game

- **Title / working name:** untitled space shooter
- **Genre and core loop:** arcade space shooter; fly, shoot, dodge, fight a boss
- **Sound style:** synth: filtered saws, square bass, arpeggios, punchy drums (80s arcade)
- **Mood / references:** 80s arcade cabinets, bright and punchy
- **Engine:** Godot 4 (`../game`, builds into `assets/generated/audio`)

## Key sounds and music

For each: what it is, when it plays, length, looping or one-shot, variations. Example:

- **Laser** (`sfx/laser.sfx.yaml`): the player's shot; plays several times a second, so short (0.26 s).
- **Explosion** (`sfx/explosion.sfx.yaml`): an enemy ship blowing up, ~1.3 s.
- **Engine** (`sfx/engine.sfx.yaml`): phases `start` (spin up), `hum` (seamless loop while thrusting), `stop`.

## Wishlist

What's still needed, roughly in priority order. Move items to "Done" with the asset name when made.

- [ ] Boss sounds

## Done

- (nothing yet)

## Awaiting a listen

Assets an agent made that a human hasn't approved yet (agents can't hear: they check listen sheets and numbers).

- `engine`: hum seam click 0.0000; start/stop pitch glides as written.
- `laser`, `explosion`: listen sheets checked (pitch dive as written, loudness on target, no lead-in).

## Decisions and feedback log

Dated notes on what the owner asked for and decided, so later sounds stay consistent with it. Example:

- 2026-01-01: "Everything sounds too dry" -> `segan mix adjust --room +0.1` (applies to every asset).
