# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- CHANGELOG.md, a check workflow (type-check + build on every push and PR), and a release workflow that publishes
  a GitHub release for each `vX.Y.Z` tag, refusing tags that don't match package.json or have no CHANGELOG
  section ([#3](https://github.com/lukasgolino/segan-website/issues/2)).
