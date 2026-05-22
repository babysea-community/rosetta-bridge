# Contributing

Thanks for improving Rosetta Bridge.

Rosetta Bridge is a TypeScript request-normalization primitive for keeping public `request_*` inputs separate from provider-native payloads. Good contributions preserve strict validation, public-neutral examples, and host-owned provider execution.

## Contribution guidelines

- Keep all contributions under Apache 2.0. By submitting a PR you agree to license it under Apache 2.0.
- Preserve v1 schemas. If a change requires breaking `schemas/bridge-definition.v1.json` or `schemas/normalization-result.v1.json`, publish a v2 alongside it.
- Validate canonical input before dispatch. Provider payloads must never be emitted from invalid public input.
- Keep boundary discipline. Core fields belong in `mapCore`; option fields belong in `mapOptions`; nested payload exceptions must use `mapStructured` and be documented.
- Keep the public surface neutral: placeholder provider IDs, lowercase snake-case `request_*` examples, and no private provider settings.
- Keep auth, billing, persistence, queues, provider SDK calls, webhooks, telemetry, and routing services application-owned.
- Prefer focused changes. Avoid unrelated refactors in runtime validation, fixture shape, schemas, or CLI docs.

## Documentation standard

Rosetta Bridge docs are part of the public contract for this primitive. Keep them factual, operator-ready, and tied to behavior that exists in this repository.

- Start from the README contract: what the primitive is, what it is not, how to deploy it, how to validate it, and how to recover it.
- Use exact schema names, command names, fixture paths, public field names, provider placeholders, and file paths.
- Keep the public surface to TypeScript adapters and JSON Schema contracts. Auth, billing, persistence, queues, provider SDK calls, webhooks, telemetry, and routing services stay application-owned.
- Use lowercase snake-case `request_*` examples and placeholder provider IDs in OSS docs.
- Do not document private provider IDs, credentials, production field names, internal file names, route handlers, or customer payloads.
- Update `CHANGELOG.md` for user-visible docs, configuration, security, SDK behavior, schema, fixture, or CLI changes.
- Avoid roadmap language in the public contract. New features stay out of README claims until implemented, documented, and validated for this stack.

When a change touches these areas, update the matching docs before opening a PR:

| Change area                    | Required docs to review                                      |
| :----------------------------- | :----------------------------------------------------------- |
| Runtime validation             | README validation flow, TypeScript tests, fixture contracts  |
| Public request field semantics | README examples, schemas, normalization rules, fixtures      |
| Provider mapping behavior      | README adapter examples, executable fixtures, expected output |
| CLI behavior                   | README CLI section, fixture docs, package README             |
| Security or trust boundary     | README production readiness, SECURITY.md, normalization docs |
| Sentry or CI workflows         | README release gates, SECURITY.md, this guide                |
| Schema or envelope shape       | JSON Schemas, README contracts, changelog                    |

## Development flow

The published SDK targets Node.js 18+ at runtime. Local TypeScript SDK development uses the Vitest/Vite toolchain and requires Node.js 20.19+ or 22.12+.

```bash
git clone https://github.com/babysea-community/rosetta-bridge
cd rosetta-bridge/client/typescript
npm install
npm run lint
npm run test:coverage
npm run build
```

Run CLI smoke checks when adapter, fixture, or schema behavior changes:

```bash
node dist/cli.mjs validate ../../examples/fixtures/bridge-definition.valid.json ../../examples/fixtures/request.valid-minimal.json
node dist/cli.mjs schema ../../examples/fixtures/bridge-definition.valid.json
node dist/cli.mjs map ../../examples/fixtures/bridge-definition.executable.mjs ../../examples/fixtures/request.valid-provider-mapping.json --provider provider_b
```

## Before opening a pull request

Run these checks:

```bash
cd client/typescript
npm run lint
npm run test:coverage
npm run build
npm pack --dry-run
```

If you touched schemas or fixtures, validate the examples and expected provider payloads before opening the PR.

## Issue triage

- `bug` - reproducible defect, with logs, a failing test, or a minimal reproduction.
- `proposal` - scoped design idea with the user problem, implementation sketch, and validation path.
- `good first issue` - small, well-scoped change that can be validated without production credentials.

## Conduct

See [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md). Be respectful, assume good faith, and keep discussion focused on the work and the people using it.

## Security-sensitive changes

Open security fixes privately through the process in [`SECURITY.md`](SECURITY.md). Do not include private provider credentials, customer prompts, signed asset URLs, production provider payloads, internal provider IDs, route handlers, unreleased vulnerability details, or live production data in public issues, pull requests, test fixtures, logs, or screenshots.
