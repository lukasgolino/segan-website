# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Cloudflare Web Analytics beacon on every page (cookieless, production builds only). CI checks that each built
  page has it and is listed in sitemap.xml ([#1](https://github.com/lukasgolino/segan-website/issues/1)).
- CHANGELOG.md, a check workflow (type-check + build on every push and PR), and a release workflow that publishes
  a GitHub release for each `vX.Y.Z` tag, refusing tags that don't match package.json or have no CHANGELOG
  section ([#2](https://github.com/lukasgolino/segan-website/issues/2)).
