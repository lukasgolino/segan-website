# CLAUDE.md

Website for SEGAN (Sound Effect Grammar And Notation), PAGAN's sister library. It mirrors
`/home/lgolino/repos/pagan-website` (read-only reference: structure, components, build tooling, CI, tone),
with a blue/purple brand instead of PAGAN's red/orange. Brief: [WEBSITE_PLAN.md](WEBSITE_PLAN.md).
Library: `/home/lgolino/repos/SEGAN` (read-only from here).

## Conventions

- Every sound and image on the site is real SEGAN output, built from sources in `art/` by a deterministic
  script; CI fails if committed assets differ from a rebuild.
- Commits: plain `git commit` under the owner's identity, imperative subject. NEVER AI attribution (no
  Co-Authored-By trailers, no "Generated with" lines). Push to origin main is allowed (owner, 2026-10-19).
- Open questions for the owner go in QUESTIONS.md with a recommended default; never block on them.

## Decisions log

- 2026-10-19: Separate repo `lukasgolino/segan-website` (public), like pagan-website; GitHub Pages.
