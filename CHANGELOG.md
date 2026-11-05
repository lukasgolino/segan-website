# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- CI checks run once per PR, when it's marked ready for review just before merge (and on demand), to save Actions
  minutes.
  Deploys skip pushes that only touch the changelog, README or CI-only workflows.

## [0.1.0] - 2026-11-05

### Added

- Cloudflare Web Analytics beacon on every page (cookieless, production builds only). CI checks that each built
  page has it and is listed in sitemap.xml ([#1](https://github.com/lukasgolino/segan-website/issues/1)).
- CHANGELOG.md, a check workflow (type-check + build on every push and PR), and a release workflow that publishes
  a GitHub release for each `vX.Y.Z` tag, refusing tags that don't match package.json or have no CHANGELOG
  section ([#2](https://github.com/lukasgolino/segan-website/issues/2)).

[Unreleased]: https://github.com/lukasgolino/segan-website/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/lukasgolino/segan-website/releases/tag/v0.1.0
