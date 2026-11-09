# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.3.0] - 2026-11-09

### Added

- Umami analytics alongside Cloudflare Web Analytics: cookieless, so still no consent banner, and it adds
  per-visit page journeys (entry page, pages in order, exit), which Cloudflare's aggregate counts can't show.
  All our sites share one Umami website; the Host filter separates them.

## [0.2.0] - 2026-11-06

### Added

- A standard icon set: `favicon.ico` (16/32/48 px), a 96 px icon, a 180 px apple-touch icon and `site.webmanifest`
  with 192/512 px and maskable icons, so search results, tabs, bookmarks and home-screen shortcuts all show the
  icon ([#9](https://github.com/lukasgolino/segan-website/issues/9)).
- schema.org structured data (JSON-LD) on the home page, an `llms.txt` summary for AI assistants, and robots.txt
  content signals allowing search and AI use; the home page title names what the site is for
  ([#10](https://github.com/lukasgolino/segan-website/issues/10)).

### Changed

- Dependency updates.

## [0.1.1] - 2026-11-06

### Changed

- KILN links point at its own domain, https://kiln3d.dev/ ([#6](https://github.com/lukasgolino/segan-website/issues/6)).
- The site build check runs on every push. The slow asset check runs on the PR once it leaves draft, and again only
  if a commit lands after that, as the last gate before merge.
  Deploys skip pushes that only touch the changelog, README or CI-only workflows.

## [0.1.0] - 2026-11-05

### Added

- Cloudflare Web Analytics beacon on every page (cookieless, production builds only). CI checks that each built
  page has it and is listed in sitemap.xml ([#1](https://github.com/lukasgolino/segan-website/issues/1)).
- CHANGELOG.md, a check workflow (type-check + build on every push and PR), and a release workflow that publishes
  a GitHub release for each `vX.Y.Z` tag, refusing tags that don't match package.json or have no CHANGELOG
  section ([#2](https://github.com/lukasgolino/segan-website/issues/2)).

[Unreleased]: https://github.com/lukasgolino/segan-website/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/lukasgolino/segan-website/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/lukasgolino/segan-website/compare/v0.1.1...v0.2.0
[0.1.1]: https://github.com/lukasgolino/segan-website/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/lukasgolino/segan-website/releases/tag/v0.1.0
