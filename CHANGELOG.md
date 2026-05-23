# Changelog

All notable changes will be documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased

### Fixed

- Added TypeScript 6 deprecation handling for declaration builds.
- Declared Node.js ambient types for CLI and test type-checking so TypeScript 6 dependency update checks can resolve `node:` imports.
- Replaced Sentry URL trailing-slash regex normalization with a bounded string scan to avoid CodeQL ReDoS noise.

## [0.2.1] - 2026-05-23

### Changed

- Expanded Dependabot version updates to check TypeScript dependencies daily and GitHub Actions weekly.

## [0.2.0] - 2026-05-22

### Changed

- Adjusted advisory Snyk Code and IaC scans to avoid GitHub failure annotations while preserving SARIF upload, IaC reporting, and the enforced Open Source test.
- Constrained GitHub Actions Codecov uploads to the explicit TypeScript LCOV report to avoid irrelevant uploader search warnings.

## [0.1.9] - 2026-05-22

### Added

- Added a CircleCI package-check workflow for rosetta-bridge TypeScript lint/coverage/build/package validation, CLI smoke checks, and trusted `main` Codecov CLI upload when `CODECOV_TOKEN` is configured in CircleCI.
- Added a Snyk Security workflow for Snyk Code SARIF upload, Open Source scanning and monitoring, and IaC reporting with `SNYK_TOKEN`.
- Added a Shields.io CircleCI README badge that matches the project badge style.

### Changed

- Replaced the static Snyk README badge with a realtime Snyk Security workflow status badge.

## [0.1.8] - 2026-05-22

### Added

- Added repository `codecov.yml` with GitHub Actions and CircleCI provider recognition, CI-gated Codecov status, pull request comment configuration, and TypeScript client path fixes.

### Changed

- Updated trusted Package Check Codecov uploads to pass `CODECOV_TOKEN` through the action environment and fail CI when coverage upload fails.

## [0.1.7] - 2026-05-22

### Changed

- Updated primitive deploy automation to sync GitHub repository description, homepage, and topics from TypeScript package metadata.

## [0.1.6] - 2026-05-22

### Changed

- Standardized contributing and code-of-conduct guidance with the shared BabySea OSS documentation standard.
- Upgraded Package Check, Sentry Project Check, and CodeQL workflows to Node 24-compatible GitHub Action majors, including Codecov upload via `codecov/codecov-action@v6`.

### Fixed

- Made the Sentry project check skip cleanly when all Sentry repository secrets are absent, fail partial secret configuration, and treat permission-limited Sentry API responses as advisory when explicitly enabled by CI.

## [0.1.5] - 2026-05-22

### Added

- Added TypeScript coverage generation and Package Check Codecov upload using `client/typescript/coverage/lcov.info`.

## [0.1.4] - 2026-05-21

### Changed

- Update badge icon.

## [0.1.3] - 2026-05-20

### Added

- Added icon packs for button and hero, and provide link for buttons.

## [0.1.2] - 2026-05-19

### Changed

- Expanded the README production-readiness section with enterprise posture, configuration surface, deployment gates, monitoring, backup and recovery, secret rotation, and troubleshooting guidance grounded in the current TypeScript + JSON Schema implementation.
- Strengthened security, contribution, code-of-conduct, SDK, normalization-rule, fixture, and demo docs around strict validation, trusted executable adapters, public-neutral examples, schema-version discipline, replay-safe canonical input, and host-owned provider execution.

### Fixed

- Documented the full TypeScript SDK method/helper surface in the package README, including `toCanonicalInput()`, `convert()`, CLI usage, media helpers, prompt-enhancement helpers, and moderation helpers.

## [0.1.1] - 2026-05-17

### Security

- Hardened `scripts/sentry-project-check.mjs` with normalized config parsing, HTTPS-only Sentry URL validation except localhost, bounded retry handling, strict Sentry API response-shape checks, stronger secret redaction, and stackless failure output. No runtime Sentry SDK, DSN, or telemetry is added.

### Changed

- Bumped the TypeScript package from `0.1.0` to `0.1.1`.

## [0.1.0] - 2026-05-08

### Added

- Documented the always-excluded provider-field convention in `docs/normalization-rules.md` (auto-rewrite/`auto_fix` flags, webhook URLs and signing secrets, API keys/account IDs/region routing) so adopters keep credentials, callback URLs, and provider-policy toggles inside trusted adapter code instead of public `request_*` fields.
- Documented the canonical `mapCore` / `mapOptions` key-ordering authoring convention in `docs/normalization-rules.md` (core fields in public `request_*` order, options alphabetical) to keep adapter diffs, review, and grep-by-field consistent across many bridges as the OSS adopter base grows.
- Added the `rosetta-bridge` CLI with `validate`, `schema`, and `map` commands. Portable JSON manifests now support request validation and public request-schema generation; executable JavaScript bridge modules support provider payload mapping.
- Added an executable fixture companion for the JSON bridge manifest so the same public request can be mapped into Provider A and Provider B payloads from the CLI.
- Added fixture-backed runtime tests for valid minimal requests, declared defaults, URL validation, unknown-field rejection, unsupported enum rejection, provider payload mapping, and union-capability review fixtures.
- Added shared BabySea OSS architecture framing, a 30-second summary, schema-drift examples, before/after provider payload examples, adapter author checklist, and fail-before-dispatch guidance to the README.
- Added security guidance for untrusted input validation, trusted executable bridge modules, provider-field isolation, SSRF-aware URL handling, and fixture hygiene.
- Added standalone external-repo workflows under `.github/workflows/` for CodeQL and package publish checks, including the CLI smoke path.
- Added an explicit README status note explaining that this is a production-grade v0.x OSS primitive with validated behavior and evolving pre-1.0 public contracts.
- Added the upcoming `execution-arrow` primitive to the shared README architecture map with its temporary `/#` launch link and `/v1/generate/image` + `/v1/generate/video` scope.
- Added README workflow badges for the standalone CodeQL and Package Check workflows.
- Added Sentry code-guard wording to `SECURITY.md` for the public `babysea-community/rosetta-bridge` OSS repository.
- Added `scripts/sentry-project-check.mjs`, a README badge, ignored local `.sentryclirc` support, and a scheduled `Sentry Project Check` workflow. The workflow reads Sentry org/project configuration from GitHub Actions secrets, verifies the configured project slug, active status, `other` platform, ownership, and Code Guard rules, and does not add runtime tracking.
- Added production-derived schema-discipline documentation that maps BabySea's real `_SCHEMA_RULES.md`, `createModelConverter(...)`, `RAW_SCHEMA`, `specificSchema`, `toProviderInput`, prompt-enhancement converters, moderation converters, provider-order sentinel, pricing-sensitive core fields, URL handling, and complete canonical envelopes into public JSON + TypeScript terms.
- Added TypeScript definition-validation coverage for unsupported field spec types, malformed enum values, duplicate enum values, invalid integer bounds, lowercase snake-case `request_*` naming, and JSON Schema parity for HTTP(S)-only URL arrays and unique enum values.
- Initial public scaffold for `rosetta-bridge` as BabySea's third OSS primitive.
- TypeScript normalization engine with public request-field validation, provider adapters, strict unknown-field rejection, and provider payload conversion.
- Helper semantics for provider-capability intersection, aspect-ratio sorting, prompt enhancement, and safety-filter mapping.
- JSON Schemas for bridge-definition and normalization-result envelopes.
- Architecture and normalization-rule documentation with public-neutral provider examples.

### Changed

- Added a bullet-point table of contents after the BabySea OSS architecture section for quick navigation.
- Numbered all H2 sections after BabySea OSS architecture for consistent cross-primitive README structure.
- Reordered workflow badges for OSS primitive status consistency.
- Replaced the public status badge and security-policy wording from alpha/working to production-grade v0.x, matching the validated production-derived implementation.
- Aligned public terminology with BabySea's verified schema pipeline while keeping the OSS scope to TypeScript adapters and JSON Schema contracts.
- Renamed public moderation and prompt-enhancement examples to `request_moderation` and `request_enhance_prompt`, matching the production-inspired `generation_moderation` and `generation_enhance_prompt` concepts.
- Standardized the provider-order sentinel on `fastest` and removed public `auto` examples.
- Tightened canonical `request_*` field-name validation to lowercase snake-case across the TypeScript validator and JSON Schema contracts.
- Hardened CLI portable-manifest loading to require `schema_version: bridge-definition.v1`, reject unsupported top-level properties, and reject unsupported field spec types before constructing a bridge; hardened runtime bridge construction to validate `schemaVersion` when provided, reject malformed defaults/bounds/enums before normalization, and keep duplicate enum values out of both TypeScript and JSON Schema manifests.
- Aligned CLI-generated JSON Schema and versioned schemas with runtime validation by restricting URL strings to `http://` and `https://` where URL field specs are used.
- Clarified that the portable JSON manifest is not a raw provider schema; provider-native names, defaults, exclusions, credentials, callbacks, private routing state, provider SDK calls, persistence, billing, queues, webhooks, telemetry, and private catalogs stay outside this primitive.
- Clarified that duration, resolution, audio mode, and input-asset limits are core request fields because BabySea's schema-hardening layer exposes pricing/routing-sensitive dimensions before dispatch.
- Clarified `mapCore`, `mapOptions`, and `mapStructured` responsibilities so public tuning helpers map after core fields and structured payload assembly remains an explicit exception.

### Removed

- Removed legacy public helper exports for `request_safety_filter` and `request_prompt_enhancement` so the SDK vocabulary uses only the production-inspired public terms.

### Validated

- Ran TypeScript lint, Vitest, build, package dry-run, and CLI smoke tests for `validate`, `schema`, and `map`.
- Confirmed unversioned portable JSON manifests are rejected instead of being silently accepted.
- Re-validated on 2026-05-07 against BabySea's `_SCHEMA_RULES.md`, `model-registry.ts`, `zod-to-fields.ts`, `enhance-prompt.ts`, `moderation.ts`, and representative refine schemas for Google Veo, Runway, BytePlus, and BFL models.
- Re-ran focused validation on 2026-05-07: `npm test` (23 Vitest tests), `npm run lint` (`tsc --noEmit`), `npm run build`, `npm pack --dry-run`, CLI smoke tests for `validate`, `schema`, and `map`, and workspace diagnostics for the primitive.
